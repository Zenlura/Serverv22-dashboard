import { useState, useEffect } from 'react'
import { Bike, Plus, Minus, UserPlus, X } from 'lucide-react'

/**
 * VermietungModal V3.2 - BUGFIX: PREISE KORREKT
 * 
 * ✅ GEFIXT:
 * 1. Staffelpreise korrekt: 1-2 Tage = 25€, 3-4 Tage = 22€, 5+ Tage = 20€
 * 2. Preis-Preview zeigt RICHTIGEN Staffelpreis (nicht immer preis_1tag)
 * 3. Keine komischen Dezimalzahlen mehr (25.333333...)
 * 
 * ✨ Features:
 * - Räder nach Typ buchen (2× E-Bike + 1× Normal)
 * - Verfügbarkeit & Preise pro Typ
 * - Automatische Preisberechnung
 * - Neukunde direkt anlegen
 */
function VermietungModalTyp({ onClose, onSave, vorauswahl }) {
  // Basis-Daten
  const [formData, setFormData] = useState({
    kunde_id: null,
    von_datum: '',
    von_zeit: '10:00',
    bis_datum: '',
    bis_zeit: '18:00',
    kaution: '0.00',
    notizen: ''
  })

  // ✨ Typ-basierte Positionen
  const [typPositionen, setTypPositionen] = useState({})  // { "E-Bike": 2, "Normal": 1 }
  const [typVerfuegbarkeit, setTypVerfuegbarkeit] = useState(null)
  const [preisInfo, setPreisInfo] = useState(null)
  
  // Kunden
  const [kundenListe, setKundenListe] = useState([])
  const [loading, setLoading] = useState(false)
  
  // ✨ Neukunde anlegen
  const [neukundeMode, setNeukundeMode] = useState(false)
  const [neukundeData, setNeukundeData] = useState({
    vorname: '',
    nachname: '',
    telefon: '',
    email: '',
    strasse: '',
    plz: '',
    ort: ''
  })
  const [neukudeSaving, setNeukudeSaving] = useState(false)

  // Initial: Datum setzen
  useEffect(() => {
    const datum = vorauswahl 
      ? vorauswahl.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    
    setFormData(prev => ({
      ...prev,
      von_datum: datum,
      bis_datum: datum
    }))
  }, [vorauswahl])

  // Lade Typ-Verfügbarkeit
  useEffect(() => {
    loadTypVerfuegbarkeit()
  }, [])

  // Lade Kunden
  useEffect(() => {
    loadKunden()
  }, [])

  // Preis neu berechnen wenn sich was ändert
  useEffect(() => {
    if (formData.von_datum && formData.bis_datum) {
      berechnePreis()
    }
  }, [formData.von_datum, formData.bis_datum, typPositionen])

  const loadTypVerfuegbarkeit = async () => {
    try {
      const response = await fetch('/api/vermietungen/verfuegbarkeit-pro-typ/')
      if (response.ok) {
        const data = await response.json()
        setTypVerfuegbarkeit(data)
      }
    } catch (err) {
      console.error('Fehler beim Laden der Typ-Verfügbarkeit:', err)
    }
  }

  const loadKunden = async () => {
    try {
      const response = await fetch('/api/kunden/?limit=100')
      if (response.ok) {
        const data = await response.json()
        setKundenListe(data.items || [])
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err)
    }
  }

  // ✨ Neukunde speichern
  const saveNeukunde = async () => {
    // Validierung
    if (!neukundeData.vorname || !neukundeData.nachname) {
      alert('Bitte Vor- und Nachname eingeben')
      return
    }

    setNeukudeSaving(true)

    try {
      // Nur gefüllte Felder senden (Backend mag keine leeren Strings bei optionalen Feldern)
      const payload = {
        vorname: neukundeData.vorname,
        nachname: neukundeData.nachname
      }
      
      // Optional: Nur hinzufügen wenn ausgefüllt
      if (neukundeData.telefon?.trim()) payload.telefon = neukundeData.telefon.trim()
      if (neukundeData.email?.trim()) payload.email = neukundeData.email.trim()
      if (neukundeData.strasse?.trim()) payload.strasse = neukundeData.strasse.trim()
      if (neukundeData.plz?.trim()) payload.plz = neukundeData.plz.trim()
      if (neukundeData.ort?.trim()) payload.ort = neukundeData.ort.trim()

      const response = await fetch('/api/kunden/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Fehler beim Anlegen')
      }

      const neuerKunde = await response.json()
      
      // Kunde zur Liste hinzufügen
      setKundenListe(prev => [...prev, neuerKunde])
      
      // Kunde auswählen
      setFormData(prev => ({ ...prev, kunde_id: neuerKunde.id }))
      
      // Neukunde-Mode schließen
      setNeukundeMode(false)
      setNeukundeData({ vorname: '', nachname: '', telefon: '', email: '', strasse: '', plz: '', ort: '' })
      
    } catch (err) {
      alert(`Fehler: ${err.message}`)
    } finally {
      setNeukudeSaving(false)
    }
  }

  // Anzahl ändern für einen Typ
  const changeTypAnzahl = (typ, delta) => {
    setTypPositionen(prev => {
      const current = prev[typ] || 0
      const neu = Math.max(0, current + delta)
      
      if (neu === 0) {
        // Entferne Typ wenn 0
        const { [typ]: _, ...rest } = prev
        return rest
      }
      
      return { ...prev, [typ]: neu }
    })
  }

  // ✅ BUGFIX: Korrekte Staffelpreis-Ermittlung
  const getStaffelpreis = (typInfo, tage) => {
    // Für Normal-Räder und Lastenrad: immer gleicher Preis
    if (typInfo.preis_1tag === typInfo.preis_3tage && typInfo.preis_3tage === typInfo.preis_5tage) {
      return typInfo.preis_1tag
    }
    
    // Für E-Bikes: Staffelung
    // 1-2 Tage → preis_1tag (25€)
    // 3-4 Tage → preis_3tage (22€)
    // 5+ Tage → preis_5tage (20€)
    if (tage >= 5) return typInfo.preis_5tage
    if (tage >= 3) return typInfo.preis_3tage
    return typInfo.preis_1tag
  }

  // Preis berechnen
  const berechnePreis = () => {
    if (!formData.von_datum || !formData.bis_datum || !typVerfuegbarkeit) {
      setPreisInfo(null)
      return
    }

    const von = new Date(formData.von_datum)
    const bis = new Date(formData.bis_datum)
    const diffTime = Math.abs(bis - von)
    const tage = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (tage < 1) {
      setPreisInfo({ error: 'Ungültiger Zeitraum' })
      return
    }

    let gesamtpreis = 0
    const positionen = []

    Object.entries(typPositionen).forEach(([typ, anzahl]) => {
      const typInfo = typVerfuegbarkeit[typ]
      if (!typInfo) return

      // ✅ BUGFIX: Verwende korrekte Staffelpreis-Funktion
      const tagespreis = getStaffelpreis(typInfo, tage)
      const subtotal = tagespreis * tage * anzahl

      positionen.push({
        typ,
        anzahl,
        tagespreis,
        tage,
        subtotal
      })

      gesamtpreis += subtotal
    })

    setPreisInfo({
      tage,
      positionen,
      gesamtpreis
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validierung
    if (!formData.kunde_id) {
      alert('Bitte Kunde auswählen')
      return
    }

    if (Object.keys(typPositionen).length === 0) {
      alert('Bitte mindestens einen Rad-Typ auswählen')
      return
    }

    if (!preisInfo || preisInfo.error) {
      alert('Ungültige Preisberechnung')
      return
    }

    setLoading(true)

    try {
      // ✅ BUGFIX: Sende korrekten Durchschnittspreis (für alte Backend-Kompatibilität)
      const gesamtAnzahl = Object.values(typPositionen).reduce((sum, n) => sum + n, 0)

      const vermietungData = {
        kunde_id: formData.kunde_id,
        anzahl_raeder: gesamtAnzahl,
        von_datum: formData.von_datum,
        von_zeit: formData.von_zeit,
        bis_datum: formData.bis_datum,
        bis_zeit: formData.bis_zeit,
        // ✅ BUGFIX: Runde auf 2 Dezimalstellen
        tagespreis: parseFloat((preisInfo.gesamtpreis / (preisInfo.tage * gesamtAnzahl)).toFixed(2)),
        anzahl_tage: preisInfo.tage,
        gesamtpreis: preisInfo.gesamtpreis,
        kaution: parseFloat(formData.kaution),
        notizen: formData.notizen,
        status: 'reserviert'
      }

      const response = await fetch('/api/vermietungen/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vermietungData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Fehler beim Erstellen der Vermietung')
      }

      const vermietung = await response.json()
      
      if (onSave) {
        onSave(vermietung)
      }
      
      onClose()
      
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      alert(`Fehler: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const gesamtRaeder = Object.values(typPositionen).reduce((sum, anzahl) => sum + anzahl, 0)

  const selectedKunde = kundenListe.find(k => k.id === formData.kunde_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">✨ Neue Vermietung</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Kunde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Kunde *
            </label>
            
            {!neukundeMode ? (
              <div className="space-y-2">
                <select
                  id="kunde_id"
                  name="kunde_id"
                  value={formData.kunde_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, kunde_id: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">-- Kunde auswählen --</option>
                  {kundenListe.map(kunde => (
                    <option key={kunde.id} value={kunde.id}>
                      {kunde.vorname} {kunde.nachname} (K-{kunde.kundennummer})
                    </option>
                  ))}
                </select>
                
                <button
                  type="button"
                  onClick={() => setNeukundeMode(true)}
                  className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  <span>Neukunde anlegen</span>
                </button>
              </div>
            ) : (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-900">👤 Neukunde anlegen</span>
                  <button
                    type="button"
                    onClick={() => setNeukundeMode(false)}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Abbrechen
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Vorname *
                    </label>
                    <input
                      type="text"
                      id="neukunde_vorname"
                      name="vorname"
                      autoComplete="given-name"
                      value={neukundeData.vorname}
                      onChange={(e) => setNeukundeData(prev => ({ ...prev, vorname: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nachname *
                    </label>
                    <input
                      type="text"
                      id="neukunde_nachname"
                      name="nachname"
                      autoComplete="family-name"
                      value={neukundeData.nachname}
                      onChange={(e) => setNeukundeData(prev => ({ ...prev, nachname: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="Mustermann"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      id="neukunde_telefon"
                      name="telefon"
                      autoComplete="tel"
                      value={neukundeData.telefon}
                      onChange={(e) => setNeukundeData(prev => ({ ...prev, telefon: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      E-Mail
                    </label>
                    <input
                      type="email"
                      id="neukunde_email"
                      name="email"
                      autoComplete="email"
                      value={neukundeData.email}
                      onChange={(e) => setNeukundeData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="max@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Straße
                  </label>
                  <input
                    type="text"
                    id="neukunde_strasse"
                    name="strasse"
                    autoComplete="street-address"
                    value={neukundeData.strasse}
                    onChange={(e) => setNeukundeData(prev => ({ ...prev, strasse: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Musterstraße 123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      PLZ
                    </label>
                    <input
                      type="text"
                      id="neukunde_plz"
                      name="plz"
                      autoComplete="postal-code"
                      value={neukundeData.plz}
                      onChange={(e) => setNeukundeData(prev => ({ ...prev, plz: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ort
                    </label>
                    <input
                      type="text"
                      id="neukunde_ort"
                      name="ort"
                      autoComplete="address-level2"
                      value={neukundeData.ort}
                      onChange={(e) => setNeukundeData(prev => ({ ...prev, ort: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="Musterstadt"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveNeukunde}
                  disabled={neukudeSaving || !neukundeData.vorname || !neukundeData.nachname}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {neukudeSaving ? 'Speichern...' : '✓ Kunde anlegen'}
                </button>
              </div>
            )}
          </div>

          {/* Zeitraum */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Von Datum *
              </label>
              <input
                type="date"
                id="von_datum"
                name="von_datum"
                value={formData.von_datum}
                onChange={(e) => setFormData(prev => ({ ...prev, von_datum: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🕐 Von Zeit
              </label>
              <input
                type="time"
                id="von_zeit"
                name="von_zeit"
                value={formData.von_zeit}
                onChange={(e) => setFormData(prev => ({ ...prev, von_zeit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Bis Datum *
              </label>
              <input
                type="date"
                id="bis_datum"
                name="bis_datum"
                value={formData.bis_datum}
                onChange={(e) => setFormData(prev => ({ ...prev, bis_datum: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🕐 Bis Zeit
              </label>
              <input
                type="time"
                id="bis_zeit"
                name="bis_zeit"
                value={formData.bis_zeit}
                onChange={(e) => setFormData(prev => ({ ...prev, bis_zeit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* ✨ TYP-AUSWAHL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🚲 Räder nach Typ
            </label>
            
            {typVerfuegbarkeit && (
              <div className="space-y-3">
                {Object.entries(typVerfuegbarkeit).map(([typ, info]) => {
                  if (!info.vermietbar && info.vermietbar !== undefined) return null
                  
                  const anzahl = typPositionen[typ] || 0
                  const prozent = info.gesamt > 0 ? (info.verfuegbar / info.gesamt) * 100 : 0
                  let colorClass = 'border-green-200 bg-green-50'
                  if (prozent < 30) colorClass = 'border-red-200 bg-red-50'
                  else if (prozent < 60) colorClass = 'border-yellow-200 bg-yellow-50'

                  // ✅ BUGFIX: Korrekte Staffelpreis-Anzeige
                  const aktuellerPreis = preisInfo ? getStaffelpreis(info, preisInfo.tage) : info.preis_1tag

                  return (
                    <div key={typ} className={`border rounded-lg p-4 ${colorClass}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Bike size={18} />
                            <span className="font-bold">{typ}</span>
                            {info.special && <span className="text-sm">🎉</span>}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {info.preis_1tag > 0 ? `${info.preis_1tag.toFixed(0)}€/Tag` : 'GRATIS'} · 
                            {info.verfuegbar}/{info.gesamt} verfügbar
                          </div>
                        </div>

                        {/* +/- Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => changeTypAnzahl(typ, -1)}
                            disabled={anzahl === 0}
                            className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-bold">{anzahl}</span>
                          <button
                            type="button"
                            onClick={() => changeTypAnzahl(typ, 1)}
                            disabled={anzahl >= info.verfuegbar}
                            className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* ✅ BUGFIX: Preis-Preview mit KORREKTEM Staffelpreis */}
                      {anzahl > 0 && preisInfo && (
                        <div className="text-sm text-gray-700 mt-2 pt-2 border-t border-gray-300">
                          {anzahl} × {aktuellerPreis.toFixed(0)}€ × {preisInfo.tage} Tag{preisInfo.tage > 1 ? 'e' : ''} = 
                          <span className="font-bold ml-1">
                            {(anzahl * aktuellerPreis * preisInfo.tage).toFixed(2)}€
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!typVerfuegbarkeit && (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Lade Verfügbarkeit...</p>
              </div>
            )}
          </div>

          {/* Preis-Zusammenfassung */}
          {preisInfo && !preisInfo.error && gesamtRaeder > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-bold text-lg mb-2">
                💰 Gesamtpreis: {preisInfo.gesamtpreis.toFixed(2)}€
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <div>{gesamtRaeder} Räder für {preisInfo.tage} Tag{preisInfo.tage > 1 ? 'e' : ''}</div>
                {preisInfo.positionen.map((pos, i) => (
                  <div key={i} className="text-xs text-gray-600">
                    · {pos.anzahl}× {pos.typ} ({pos.tagespreis.toFixed(0)}€/Tag) = {pos.subtotal.toFixed(2)}€
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Notizen
            </label>
            <textarea
              id="notizen"
              name="notizen"
              value={formData.notizen}
              onChange={(e) => setFormData(prev => ({ ...prev, notizen: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="Optional..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || gesamtRaeder === 0 || !formData.kunde_id}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Speichern...' : 'Vermietung erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VermietungModalTyp
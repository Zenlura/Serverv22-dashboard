import { useState, useEffect } from 'react'
import Toast from './Toast'
import KundenModal from './KundenModal'

/**
 * VermietungModal V2 - Kalender V2 Update
 * 
 * Neue Features:
 * - Anzahl Räder eingeben
 * - Uhrzeiten für Abholung/Rückgabe
 * - Verfügbarkeits-Check in Echtzeit
 * - Preis-Berechnung für mehrere Räder
 * - Kaution optional
 */
function VermietungModal({ leihrad, vorauswahl, onClose, onSave }) {
  const [formData, setFormData] = useState({
    kunde_id: null,
    anzahl_raeder: 1,              // NEU: Kalender V2
    ausweis_abgeglichen: false,
    von_datum: '',
    von_zeit: '10:00',             // NEU: Kalender V2
    bis_datum: '',
    bis_zeit: '18:00',             // NEU: Kalender V2
    kaution: '0.00',               // NEU: Optional
    zustand_bei_ausgabe: '',
    notizen: ''
  })
  
  const [preisInfo, setPreisInfo] = useState(null)
  const [verfuegbarkeit, setVerfuegbarkeit] = useState(null)  // NEU: Kalender V2
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  
  // Kunden-Suche
  const [kundenSuche, setKundenSuche] = useState('')
  const [kundenErgebnisse, setKundenErgebnisse] = useState([])
  const [selectedKunde, setSelectedKunde] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Status-Check
  const [statusCheck, setStatusCheck] = useState(null)
  const [showWarnings, setShowWarnings] = useState(false)
  
  // Neuer Kunde Modal
  const [showNeuerKundeModal, setShowNeuerKundeModal] = useState(false)

  useEffect(() => {
    // Vorauswahl-Datum setzen wenn vorhanden
    if (vorauswahl) {
      const dateStr = vorauswahl.toISOString().split('T')[0]
      setFormData(prev => ({
        ...prev,
        von_datum: dateStr,
        bis_datum: dateStr
      }))
    } else {
      // Heute als Standardwert
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({
        ...prev,
        von_datum: today,
        bis_datum: today
      }))
    }
  }, [vorauswahl])

  // NEU: Verfügbarkeit prüfen wenn sich Daten ändern
  useEffect(() => {
    if (formData.von_datum && formData.bis_datum) {
      checkVerfuegbarkeit()
    }
  }, [formData.von_datum, formData.bis_datum, formData.von_zeit, formData.bis_zeit, formData.anzahl_raeder])

  // Kunden suchen (Autocomplete)
  const searchKunden = async (query) => {
    if (query.length < 2) {
      setKundenErgebnisse([])
      return
    }

    setSearchLoading(true)
    try {
      const res = await fetch(`/api/kunden/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setKundenErgebnisse(data)
    } catch (error) {
      showToast('Fehler bei Kunden-Suche', 'error')
    } finally {
      setSearchLoading(false)
    }
  }

  // Kunde auswählen
  const handleSelectKunde = async (kunde) => {
    setSelectedKunde(kunde)
    setKundenSuche(kunde.display_name)
    setKundenErgebnisse([])
    setFormData(prev => ({ ...prev, kunde_id: kunde.id }))

    // Status-Check durchführen
    try {
      const res = await fetch(`/api/kunden/${kunde.id}/check-status`)
      const check = await res.json()
      setStatusCheck(check)
      
      if (!check.can_rent || check.warnings.length > 0) {
        setShowWarnings(true)
      }
    } catch (error) {
      showToast('Fehler beim Status-Check', 'error')
    }
  }

  // Kunde abwählen
  const handleDeselectKunde = () => {
    setSelectedKunde(null)
    setKundenSuche('')
    setFormData(prev => ({ ...prev, kunde_id: null }))
    setStatusCheck(null)
    setShowWarnings(false)
  }

  // Neuer Kunde wurde angelegt
  const handleNeuerKundeSaved = async (neuerKunde) => {
    setShowNeuerKundeModal(false)
    
    // Kunde automatisch auswählen
    await handleSelectKunde({
      id: neuerKunde.id,
      display_name: `${neuerKunde.vorname || ''} ${neuerKunde.nachname} (${neuerKunde.kundennummer})`.trim(),
      telefon: neuerKunde.telefon,
      status: neuerKunde.status
    })
    
    showToast('Kunde angelegt und ausgewählt!', 'success')
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Toast-Nachricht anzeigen
  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // NEU: Verfügbarkeit prüfen
  const checkVerfuegbarkeit = async () => {
    if (!formData.von_datum || !formData.bis_datum) {
      setVerfuegbarkeit(null)
      return
    }

    try {
      const params = new URLSearchParams({
        von_datum: formData.von_datum,
        bis_datum: formData.bis_datum
      })

      if (formData.von_zeit) params.append('von_zeit', formData.von_zeit)
      if (formData.bis_zeit) params.append('bis_zeit', formData.bis_zeit)

      const response = await fetch(`/api/vermietungen/verfuegbarkeit/?${params}`)
      if (!response.ok) throw new Error('Verfügbarkeits-Check fehlgeschlagen')

      const data = await response.json()
      setVerfuegbarkeit(data)
      
      // Automatisch Preisberechnung aktualisieren
      berechnePreis()
    } catch (error) {
      console.error('Verfügbarkeits-Check Fehler:', error)
      setVerfuegbarkeit(null)
    }
  }

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (kundenSuche && !selectedKunde) {
        searchKunden(kundenSuche)
      }
    }, 300)
    return () => clearTimeout(delaySearch)
  }, [kundenSuche])

  // Preisberechnung (UPDATED für mehrere Räder)
  const berechnePreis = () => {
    if (!formData.von_datum || !formData.bis_datum) {
      setPreisInfo(null)
      return
    }

    const von = new Date(formData.von_datum)
    const bis = new Date(formData.bis_datum)
    const diffTime = Math.abs(bis - von)
    const tage = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (tage < 1) {
      setPreisInfo({ error: 'Rückgabe muss nach Abholung liegen' })
      return
    }

    // Staffelpreis ermitteln
    // Kalender V2: Wenn kein Rad ausgewählt, nutze Standard-Preise
    const defaultPreise = {
      preis_1tag: 25,
      preis_3tage: 22,
      preis_5tage: 20
    }
    const preisQuelle = leihrad || defaultPreise

    let tagespreis, staffel
    if (tage === 1) {
      tagespreis = parseFloat(preisQuelle.preis_1tag)
      staffel = '1 Tag'
    } else if (tage <= 3) {
      tagespreis = parseFloat(preisQuelle.preis_3tage)
      staffel = '2-3 Tage'
    } else {
      tagespreis = parseFloat(preisQuelle.preis_5tage)
      staffel = '5+ Tage'
    }

    // NEU: Preis für mehrere Räder berechnen
    const anzahl = parseInt(formData.anzahl_raeder) || 1
    const gesamtpreis = tagespreis * tage * anzahl

    setPreisInfo({
      tage,
      anzahl_raeder: anzahl,
      tagespreis,
      staffel,
      gesamtpreis,
      preis_pro_rad: tagespreis * tage
    })
  }

  // Automatische Preisberechnung wenn sich Daten ändern
  useEffect(() => {
    if (formData.von_datum && formData.bis_datum) {
      berechnePreis()
    }
  }, [formData.von_datum, formData.bis_datum, formData.anzahl_raeder])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validierung
    if (!selectedKunde) {
      showToast('Bitte Kunde auswählen', 'error')
      return
    }

    // NEU: Verfügbarkeits-Check
    if (verfuegbarkeit && verfuegbarkeit.verfuegbar < formData.anzahl_raeder) {
      const proceed = window.confirm(
        `⚠️ Warnung: Nur ${verfuegbarkeit.verfuegbar} Räder verfügbar!\n\n` +
        `Sie versuchen ${formData.anzahl_raeder} Räder zu buchen.\n\n` +
        `Trotzdem fortfahren?`
      )
      if (!proceed) return
    }

    // Gesperrter Kunde?
    if (statusCheck && !statusCheck.can_rent) {
      const proceed = window.confirm(
        '⚠️ Dieser Kunde ist gesperrt!\n\n' +
        'Trotzdem fortfahren?'
      )
      if (!proceed) return
    }

    if (!preisInfo || preisInfo.error) {
      showToast('Bitte gültigen Zeitraum wählen', 'error')
      return
    }

    setSaving(true)

    try {
      // Pre-flight validation
      if (!formData.kunde_id) {
        throw new Error('Keine Kunden-ID gesetzt')
      }
      if (!formData.von_datum || !formData.bis_datum) {
        throw new Error('Von/Bis Datum fehlt')
      }
      if (!preisInfo || !preisInfo.tagespreis || !preisInfo.tage || !preisInfo.gesamtpreis) {
        throw new Error('Preisberechnung unvollständig')
      }

      const vermietungData = {
        kunde_id: formData.kunde_id,
        anzahl_raeder: parseInt(formData.anzahl_raeder),
        von_datum: formData.von_datum,
        bis_datum: formData.bis_datum,
        ausweis_abgeglichen: formData.ausweis_abgeglichen,
        tagespreis: preisInfo.tagespreis,
        anzahl_tage: preisInfo.tage,
        gesamtpreis: preisInfo.gesamtpreis,
        kaution: parseFloat(formData.kaution) || 0,
        status: 'reserviert',  // NEU: Pflichtfeld!
      }

      // Optional: nur senden wenn Wert vorhanden
      if (leihrad?.id) {
        vermietungData.leihrad_id = leihrad.id
      }
      if (formData.von_zeit) {
        vermietungData.von_zeit = formData.von_zeit
      }
      if (formData.bis_zeit) {
        vermietungData.bis_zeit = formData.bis_zeit
      }
      if (formData.zustand_bei_ausgabe) {
        vermietungData.zustand_bei_ausgabe = formData.zustand_bei_ausgabe
      }
      if (formData.notizen) {
        vermietungData.notizen = formData.notizen
      }

      console.log('📤 Sende Vermietung:', vermietungData)
      console.log('📋 Validierung:')
      console.log('  - Kunde ID:', formData.kunde_id)
      console.log('  - Anzahl Räder:', parseInt(formData.anzahl_raeder))
      console.log('  - Von:', formData.von_datum, formData.von_zeit)
      console.log('  - Bis:', formData.bis_datum, formData.bis_zeit)
      console.log('  - Preisinfo:', preisInfo)

      const response = await fetch('/api/vermietungen/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vermietungData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Backend-Fehler:', errorData)
        console.error('📤 Gesendete Daten waren:', vermietungData)
        throw new Error(errorData.detail || JSON.stringify(errorData) || `Fehler: ${response.status}`)
      }

      const newVermietung = await response.json()
      console.log('✅ Vermietung erstellt:', newVermietung)
      showToast('Vermietung erfolgreich angelegt!', 'success')
      
      setTimeout(() => {
        onSave(newVermietung)
      }, 1000)

    } catch (err) {
      console.error('❌ Fehler beim Speichern:', err)
      showToast('Fehler: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const statusConfig = {
    normal: { color: 'text-green-600', icon: '✅' },
    warnung: { color: 'text-yellow-600', icon: '⚠️' },
    gesperrt: { color: 'text-red-600', icon: '🚨' }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
            <h2 className="text-2xl font-bold">✨ Neue Vermietung</h2>
            <p className="text-green-100 text-sm mt-1">
              Kalender V2 - Gruppenbuchung
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Kunden-Auswahl */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg border-b pb-2">👤 Kunde</h3>
              
              {!selectedKunde ? (
                <>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kunde suchen <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={kundenSuche}
                      onChange={(e) => setKundenSuche(e.target.value)}
                      placeholder="Name, Telefon oder Kundennummer..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-9 text-gray-400">
                        ⏳
                      </div>
                    )}

                    {/* Suchergebnisse */}
                    {kundenErgebnisse.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {kundenErgebnisse.map(kunde => {
                          const config = statusConfig[kunde.status] || statusConfig.normal
                          return (
                            <button
                              key={kunde.id}
                              type="button"
                              onClick={() => handleSelectKunde(kunde)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {kunde.display_name}
                                  </div>
                                  {kunde.telefon && (
                                    <div className="text-sm text-gray-500">
                                      📞 {kunde.telefon}
                                    </div>
                                  )}
                                </div>
                                <span className={`text-lg ${config.color}`}>
                                  {config.icon}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNeuerKundeModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <span>+</span>
                      <span>Neuer Kunde</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 text-lg">
                        {selectedKunde.display_name}
                      </div>
                      {selectedKunde.telefon && (
                        <div className="text-sm text-gray-600 mt-1">
                          📞 {selectedKunde.telefon}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className={`text-sm font-medium ${statusConfig[selectedKunde.status]?.color || 'text-gray-600'}`}>
                          {statusConfig[selectedKunde.status]?.icon || '•'} {selectedKunde.status === 'normal' ? 'Normal' : selectedKunde.status === 'warnung' ? 'Warnung' : 'Gesperrt'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeselectKunde}
                      className="text-gray-500 hover:text-gray-700"
                      title="Kunde abwählen"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Warnungs-Banner */}
              {showWarnings && statusCheck && statusCheck.warnings.length > 0 && (
                <div className={`rounded-lg p-4 border-2 ${
                  statusCheck.can_rent 
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {statusCheck.can_rent ? '⚠️' : '🚨'}
                    </span>
                    <div className="flex-1">
                      <h4 className={`font-bold mb-2 ${
                        statusCheck.can_rent ? 'text-yellow-900' : 'text-red-900'
                      }`}>
                        {statusCheck.can_rent ? 'Warnung' : 'Kunde gesperrt'}
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {statusCheck.warnings.map((warning, idx) => (
                          <li key={idx} className={
                            statusCheck.can_rent ? 'text-yellow-800' : 'text-red-800'
                          }>
                            • {warning.grund}
                            {warning.betrag && ` (${warning.betrag.toFixed(2)} €)`}
                          </li>
                        ))}
                      </ul>
                      {statusCheck.can_rent && (
                        <p className="text-xs text-yellow-700 mt-2">
                          💡 <strong>Sie können trotzdem fortfahren</strong>, wenn Sie eine Ausnahme machen möchten.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="ausweis_abgeglichen"
                  checked={formData.ausweis_abgeglichen}
                  onChange={(e) => handleChange('ausweis_abgeglichen', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="ausweis_abgeglichen" className="text-sm font-medium text-blue-900 cursor-pointer">
                  ✓ Ausweis abgeglichen
                </label>
              </div>
            </div>

            {/* NEU: Anzahl Räder */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg border-b pb-2">🚲 Anzahl Räder</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wie viele Räder? <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.anzahl_raeder}
                  onChange={(e) => handleChange('anzahl_raeder', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Räder werden bei Abholung nach Körpergröße zugewiesen
                </p>
              </div>
            </div>

            {/* NEU: Zeitraum mit Uhrzeiten */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg border-b pb-2">📅 Miet-Zeitraum</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Abholung */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Abholung <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.von_datum}
                    onChange={(e) => handleChange('von_datum', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <input
                    type="time"
                    value={formData.von_zeit}
                    onChange={(e) => handleChange('von_zeit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Rückgabe */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Rückgabe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.bis_datum}
                    onChange={(e) => handleChange('bis_datum', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <input
                    type="time"
                    value={formData.bis_zeit}
                    onChange={(e) => handleChange('bis_zeit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* NEU: Verfügbarkeits-Info + Preisberechnung */}
            {verfuegbarkeit && preisInfo && !preisInfo.error && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-6 space-y-4">
                {/* Verfügbarkeit */}
                <div className={`p-4 rounded-lg border-2 ${
                  verfuegbarkeit.verfuegbar >= formData.anzahl_raeder
                    ? 'bg-green-50 border-green-400'
                    : verfuegbarkeit.verfuegbar > 0
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-red-50 border-red-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Verfügbarkeit:</span>
                    <span className={`text-xl font-bold ${
                      verfuegbarkeit.verfuegbar >= formData.anzahl_raeder
                        ? 'text-green-700'
                        : verfuegbarkeit.verfuegbar > 0
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}>
                      {verfuegbarkeit.verfuegbar >= formData.anzahl_raeder ? '✅' : verfuegbarkeit.verfuegbar > 0 ? '⚠️' : '❌'}
                      {' '}{verfuegbarkeit.verfuegbar}/{verfuegbarkeit.gesamt} Räder frei
                    </span>
                  </div>
                  {verfuegbarkeit.warnung && (
                    <p className="text-sm text-yellow-700 mt-2">
                      ⚠️ {verfuegbarkeit.warnung}
                    </p>
                  )}
                </div>

                {/* Preisberechnung */}
                <div>
                  <h3 className="font-bold text-green-900 text-lg mb-3">💰 Preisberechnung</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Anzahl Räder:</span>
                      <span className="font-bold text-gray-900">{preisInfo.anzahl_raeder} Rad/Räder</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Anzahl Tage:</span>
                      <span className="font-bold text-gray-900">{preisInfo.tage} Tag{preisInfo.tage !== 1 ? 'e' : ''}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Tarif:</span>
                      <span className="text-sm text-green-700 font-medium">{preisInfo.staffel}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Preis pro Tag/Rad:</span>
                      <span className="font-bold text-gray-900">{preisInfo.tagespreis.toFixed(2)} €</span>
                    </div>

                    <div className="border-t-2 border-green-300 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {preisInfo.anzahl_raeder} Räder × {preisInfo.tagespreis.toFixed(2)}€ × {preisInfo.tage} Tag{preisInfo.tage !== 1 ? 'e' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-lg font-bold text-green-900">Gesamtpreis:</span>
                        <span className="text-2xl font-bold text-green-700">{preisInfo.gesamtpreis.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {preisInfo?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                ⚠️ {preisInfo.error}
              </div>
            )}

            {/* NEU: Kaution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                💶 Kaution (optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.kaution}
                onChange={(e) => handleChange('kaution', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Standard: 0.00 € (keine Kaution)
              </p>
            </div>

            {/* Zustand bei Ausgabe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📝 Zustand bei Ausgabe
              </label>
              <textarea
                value={formData.zustand_bei_ausgabe}
                onChange={(e) => handleChange('zustand_bei_ausgabe', e.target.value)}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="z.B. Einwandfrei, leichte Kratzer am Rahmen..."
              />
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📌 Notizen
              </label>
              <textarea
                value={formData.notizen}
                onChange={(e) => handleChange('notizen', e.target.value)}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Interne Notizen zur Vermietung..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold disabled:bg-gray-400"
                disabled={saving || !selectedKunde || !preisInfo || preisInfo.error}
              >
                {saving ? '💾 Wird gespeichert...' : '✅ Reservierung erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Neuer Kunde Modal */}
      {showNeuerKundeModal && (
        <KundenModal
          onClose={() => setShowNeuerKundeModal(false)}
          onSave={handleNeuerKundeSaved}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

export default VermietungModal
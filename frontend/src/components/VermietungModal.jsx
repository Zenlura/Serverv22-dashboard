import { useState, useEffect } from 'react'
import Toast from './Toast'
import KundenModal from './KundenModal'

function VermietungModal({ leihrad, vorauswahl, onClose, onSave }) {
  const [formData, setFormData] = useState({
    kunde_id: null,
    ausweis_abgeglichen: false,
    von_datum: '',
    bis_datum: '',
    zustand_bei_ausgabe: '',
    notizen: ''
  })
  const [preisInfo, setPreisInfo] = useState(null)
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

  useEffect(() => {
    berechnePreis()
  }, [formData.von_datum, formData.bis_datum, leihrad])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

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
    setStatusCheck(null)
    setShowWarnings(false)
    setFormData(prev => ({ ...prev, kunde_id: null }))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (kundenSuche && !selectedKunde) {
        searchKunden(kundenSuche)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [kundenSuche])

  const berechnePreis = () => {
    if (!formData.von_datum || !formData.bis_datum || !leihrad) {
      setPreisInfo(null)
      return
    }

    const von = new Date(formData.von_datum)
    const bis = new Date(formData.bis_datum)
    
    if (bis < von) {
      setPreisInfo({ error: 'Enddatum muss nach Startdatum liegen' })
      return
    }

    // Tage berechnen (inklusiv)
    const diffTime = bis.getTime() - von.getTime()
    const tage = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    // Preis je nach Dauer
    let tagespreis
    if (tage >= 5) {
      tagespreis = parseFloat(leihrad.preis_5tage || leihrad.preis_1tag || 0)
    } else if (tage >= 3) {
      tagespreis = parseFloat(leihrad.preis_3tage || leihrad.preis_1tag || 0)
    } else {
      tagespreis = parseFloat(leihrad.preis_1tag || 0)
    }

    const gesamtpreis = tagespreis * tage

    setPreisInfo({
      tage,
      tagespreis,
      gesamtpreis,
      staffel: tage >= 5 ? '5+ Tage Rabatt' : tage >= 3 ? '3+ Tage Rabatt' : 'Tagespreis'
    })
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!selectedKunde) {
      showToast('Bitte Kunde auswählen', 'warning')
      return
    }

    if (!preisInfo || preisInfo.error) {
      showToast('Bitte gültige Daten eingeben', 'warning')
      return
    }

    // Wenn Kunde gesperrt ist und keine Override-Bestätigung
    if (statusCheck && !statusCheck.can_rent && showWarnings) {
      if (!confirm('Kunde ist gesperrt! Trotzdem fortfahren?')) {
        return
      }
    }

    try {
      setSaving(true)

      // Backend-Schema mit kunde_id
      const vermietungData = {
        leihrad_id: leihrad.id,
        kunde_id: formData.kunde_id,
        ausweis_abgeglichen: formData.ausweis_abgeglichen,
        von_datum: formData.von_datum,
        bis_datum: formData.bis_datum,
        tagespreis: preisInfo.tagespreis,
        anzahl_tage: preisInfo.tage,
        gesamtpreis: preisInfo.gesamtpreis,
        kaution: 0,
        zustand_bei_ausgabe: formData.zustand_bei_ausgabe || null,
        notizen: formData.notizen || null
      }

      console.log('📤 Sende Vermietung:', vermietungData)

      const response = await fetch('/api/vermietungen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vermietungData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Backend-Fehler:', errorData)
        throw new Error(errorData.detail || `Fehler: ${response.status}`)
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
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
            <h2 className="text-2xl font-bold">🚴 Neue Vermietung</h2>
            <p className="text-green-100 text-sm mt-1">
              {leihrad.inventarnummer} - {leihrad.marke} {leihrad.modell} ({leihrad.typ})
            </p>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
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
                  <div className="font-bold mb-2 flex items-center gap-2">
                    {statusCheck.can_rent ? (
                      <>
                        <span className="text-xl">⚠️</span>
                        <span className="text-yellow-800">Warnung</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🚨</span>
                        <span className="text-red-800">Kunde gesperrt!</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    {statusCheck.warnings.map((warning, idx) => (
                      <div key={idx} className={`text-sm ${
                        warning.level === 'error' ? 'text-red-700' :
                        warning.level === 'warning' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        • {warning.message}
                      </div>
                    ))}
                  </div>
                  {!statusCheck.can_rent && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-sm text-red-700">
                        💡 <strong>Sie können trotzdem fortfahren</strong>, wenn Sie eine Ausnahme machen möchten.
                      </p>
                    </div>
                  )}
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

            {/* Zeitraum */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg border-b pb-2">📅 Miet-Zeitraum</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Von <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.von_datum}
                    onChange={(e) => handleChange('von_datum', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.bis_datum}
                    onChange={(e) => handleChange('bis_datum', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Preisberechnung */}
            {preisInfo && !preisInfo.error && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-6">
                <h3 className="font-bold text-green-900 text-lg mb-4">💰 Preisberechnung</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Anzahl Tage:</span>
                    <span className="font-bold text-gray-900">{preisInfo.tage} Tag{preisInfo.tage !== 1 ? 'e' : ''}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Tarif:</span>
                    <span className="text-sm text-green-700 font-medium">{preisInfo.staffel}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Preis pro Tag:</span>
                    <span className="font-bold text-gray-900">{preisInfo.tagespreis.toFixed(2)} €</span>
                  </div>

                  <div className="border-t-2 border-green-300 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-green-900">Gesamtpreis:</span>
                      <span className="text-2xl font-bold text-green-700">{preisInfo.gesamtpreis.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Zahlung bei Abholung</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {preisInfo?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                ⚠️ {preisInfo.error}
              </div>
            )}

            {/* Zustand bei Ausgabe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zustand bei Ausgabe
              </label>
              <textarea
                value={formData.zustand_bei_ausgabe}
                onChange={(e) => handleChange('zustand_bei_ausgabe', e.target.value)}
                placeholder="Z.B. kleiner Kratzer am Rahmen, Bremsen quietschen leicht..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen (optional)
              </label>
              <textarea
                value={formData.notizen}
                onChange={(e) => handleChange('notizen', e.target.value)}
                placeholder="Besondere Wünsche, Hinweise..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !selectedKunde || !preisInfo || preisInfo.error}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
            >
              {saving ? '⏳ Speichere...' : '✓ Vermietung anlegen'}
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </div>

      {/* Neuer Kunde Modal */}
      {showNeuerKundeModal && (
        <KundenModal
          kunde={null}
          onClose={() => setShowNeuerKundeModal(false)}
          onSave={async () => {
            setShowNeuerKundeModal(false)
            showToast('Kunde angelegt! Bitte erneut suchen.', 'success')
          }}
        />
      )}
    </>
  )
}

export default VermietungModal

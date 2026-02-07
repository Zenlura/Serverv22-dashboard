import { useState, useEffect } from 'react'
import Toast from './Toast'

function VermietungModal({ leihrad, vorauswahl, onClose, onSave }) {
  const [formData, setFormData] = useState({
    kunde_name: '',
    kunde_telefon: '',
    kunde_email: '',
    kunde_adresse: '',
    ausweis_abgeglichen: false,
    von_datum: '',
    bis_datum: '',
    zustand_bei_ausgabe: '',
    notizen: ''
  })
  const [preisInfo, setPreisInfo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

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
    if (!formData.kunde_name.trim()) {
      showToast('Bitte Kundennamen eingeben', 'warning')
      return
    }

    if (!preisInfo || preisInfo.error) {
      showToast('Bitte gültige Daten eingeben', 'warning')
      return
    }

    try {
      setSaving(true)

      // ✅ Backend-Schema konform (VermietungBase)
      const vermietungData = {
        leihrad_id: leihrad.id,
        kunde_name: formData.kunde_name,
        kunde_telefon: formData.kunde_telefon || null,
        kunde_email: formData.kunde_email || null,
        kunde_adresse: formData.kunde_adresse || null,
        ausweis_abgeglichen: formData.ausweis_abgeglichen,
        von_datum: formData.von_datum,
        bis_datum: formData.bis_datum,
        tagespreis: preisInfo.tagespreis,
        anzahl_tage: preisInfo.tage,
        gesamtpreis: preisInfo.gesamtpreis,
        kaution: 0, // Immer 0 - keine Kaution
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

  return (
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
          {/* Kundendaten */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-2">👤 Kundendaten</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.kunde_name}
                onChange={(e) => handleChange('kunde_name', e.target.value)}
                placeholder="Max Mustermann"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.kunde_telefon}
                  onChange={(e) => handleChange('kunde_telefon', e.target.value)}
                  placeholder="0123 456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={formData.kunde_email}
                  onChange={(e) => handleChange('kunde_email', e.target.value)}
                  placeholder="max@beispiel.de"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse
              </label>
              <input
                type="text"
                value={formData.kunde_adresse}
                onChange={(e) => handleChange('kunde_adresse', e.target.value)}
                placeholder="Musterstraße 123, 12345 Musterstadt"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

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
            disabled={saving || !formData.kunde_name || !preisInfo || preisInfo.error}
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
  )
}

export default VermietungModal
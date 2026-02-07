import React, { useState, useEffect } from 'react'

export default function KundenModal({ kunde, onClose, onSave }) {
  const [formData, setFormData] = useState({
    vorname: '',
    nachname: '',
    telefon: '',
    email: '',
    strasse: '',
    plz: '',
    ort: '',
    status: 'normal',
    gesperrt_grund: '',
    sprache: 'Deutsch',
    sprache_notiz: '',
    offene_rechnungen: 0,
    notizen: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (kunde) {
      setFormData({
        vorname: kunde.vorname || '',
        nachname: kunde.nachname || '',
        telefon: kunde.telefon || '',
        email: kunde.email || '',
        strasse: kunde.strasse || '',
        plz: kunde.plz || '',
        ort: kunde.ort || '',
        status: kunde.status || 'normal',
        gesperrt_grund: kunde.gesperrt_grund || '',
        sprache: kunde.sprache || 'Deutsch',
        sprache_notiz: kunde.sprache_notiz || '',
        offene_rechnungen: kunde.offene_rechnungen || 0,
        notizen: kunde.notizen || ''
      })
    }
  }, [kunde])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // Validierung
    if (!formData.nachname.trim()) {
      setError('Nachname ist erforderlich')
      setSaving(false)
      return
    }

    try {
      const url = kunde 
        ? `/api/kunden/${kunde.id}`
        : '/api/kunden/'
      
      const method = kunde ? 'PUT' : 'POST'

      // Daten vorbereiten: Leere Strings zu null konvertieren
      const cleanData = {
        vorname: formData.vorname.trim() || null,
        nachname: formData.nachname.trim(),
        telefon: formData.telefon.trim() || null,
        email: formData.email.trim() || null,
        strasse: formData.strasse.trim() || null,
        plz: formData.plz.trim() || null,
        ort: formData.ort.trim() || null,
        sprache: formData.sprache || null,
        sprache_notiz: formData.sprache_notiz.trim() || null,
        notizen: formData.notizen.trim() || null
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      })

      if (res.ok) {
        onSave?.()
      } else {
        const errorData = await res.json()
        // Handle different error formats
        if (typeof errorData.detail === 'string') {
          setError(errorData.detail)
        } else if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors
          const messages = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(' | ')
          setError(messages)
        } else {
          setError('Fehler beim Speichern')
        }
      }
    } catch (err) {
      setError('Netzwerkfehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: 'normal', label: '✅ Normal', color: 'text-green-600' },
    { value: 'warnung', label: '⚠️ Warnung', color: 'text-yellow-600' },
    { value: 'gesperrt', label: '🚨 Gesperrt', color: 'text-red-600' }
  ]

  const sprachOptions = ['Deutsch', 'Englisch', 'Niederländisch']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">
            {kunde ? '✏️ Kunde bearbeiten' : '➕ Neuer Kunde'}
          </h2>
          {kunde && (
            <p className="text-blue-100 text-sm mt-1">
              Kundennummer: {kunde.kundennummer}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                ⚠️ {error}
              </div>
            )}

            {/* Stammdaten */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>👤</span>
                <span>Stammdaten</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={formData.vorname}
                    onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Max (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nachname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nachname}
                    onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mustermann"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Kontakt */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📞</span>
                <span>Kontaktdaten (alles optional)</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0171-1234567 (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="max@example.com (optional)"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Nicht alle Kunden haben Telefon/Email - das ist OK!
              </p>
            </div>

            {/* Adresse */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🏠</span>
                <span>Adresse (optional)</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Straße & Hausnummer
                  </label>
                  <input
                    type="text"
                    value={formData.strasse}
                    onChange={(e) => setFormData({ ...formData, strasse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Musterstraße 42"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PLZ
                    </label>
                    <input
                      type="text"
                      value={formData.plz}
                      onChange={(e) => setFormData({ ...formData, plz: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="46395"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ort
                    </label>
                    <input
                      type="text"
                      value={formData.ort}
                      onChange={(e) => setFormData({ ...formData, ort: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bocholt"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sprache */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🌐</span>
                <span>Sprache</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hauptsprache
                  </label>
                  <select
                    value={formData.sprache}
                    onChange={(e) => setFormData({ ...formData, sprache: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {sprachOptions.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                {formData.sprache !== 'Deutsch' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sprachnotiz
                    </label>
                    <input
                      type="text"
                      value={formData.sprache_notiz}
                      onChange={(e) => setFormData({ ...formData, sprache_notiz: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. Spricht kein Deutsch"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notizen */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📝</span>
                <span>Notizen</span>
              </h3>
              <textarea
                value={formData.notizen}
                onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="z.B. Stammkunde, bevorzugt E-Bikes, immer pünktlich..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Hinweis:</strong> Status & Warnungen können nach dem Anlegen über die Kundenliste verwaltet werden.
                Offene Rechnungen werden automatisch bei Vermietungen berechnet.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Speichere...' : kunde ? 'Aktualisieren' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
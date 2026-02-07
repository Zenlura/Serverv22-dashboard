import { useState, useEffect } from 'react'

function LeihradModal({ leihrad, onClose, onSave }) {
  const isEdit = !!leihrad
  
  const [formData, setFormData] = useState({
    inventarnummer: '',
    marke: '',
    modell: '',
    rahmennummer: '',
    farbe: '',
    rahmenhoehe: '',
    typ: 'Normal',
    preis_1tag: '25.00',
    preis_3tage: '22.00',
    preis_5tage: '20.00',
    kontrollstatus: 'ok',
    status: 'verfuegbar',
    zustand: '',
    notizen: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (leihrad) {
      setFormData({
        inventarnummer: leihrad.inventarnummer || '',
        marke: leihrad.marke || '',
        modell: leihrad.modell || '',
        rahmennummer: leihrad.rahmennummer || '',
        farbe: leihrad.farbe || '',
        rahmenhoehe: leihrad.rahmenhoehe || '',
        typ: leihrad.typ || 'Normal',
        preis_1tag: leihrad.preis_1tag || '25.00',
        preis_3tage: leihrad.preis_3tage || '22.00',
        preis_5tage: leihrad.preis_5tage || '20.00',
        kontrollstatus: leihrad.kontrollstatus || 'ok',
        status: leihrad.status || 'verfuegbar',
        zustand: leihrad.zustand || '',
        notizen: leihrad.notizen || ''
      })
    }
  }, [leihrad])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = isEdit 
        ? `/api/leihraeder/${leihrad.id}`
        : '/api/leihraeder'
      
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Fehler beim Speichern')
      }

      onSave()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? '✏️ Leihrad bearbeiten' : '➕ Neues Leihrad anlegen'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Grunddaten */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📋 Grunddaten
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inventarnummer *
                  </label>
                  <input
                    type="text"
                    name="inventarnummer"
                    value={formData.inventarnummer}
                    onChange={handleChange}
                    required
                    disabled={isEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="z.B. LR-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marke *
                  </label>
                  <input
                    type="text"
                    name="marke"
                    value={formData.marke}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. Trek, Cube, Giant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modell
                  </label>
                  <input
                    type="text"
                    name="modell"
                    value={formData.modell}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. FX 3 Disc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rahmennummer
                  </label>
                  <input
                    type="text"
                    name="rahmennummer"
                    value={formData.rahmennummer}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Seriennummer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Farbe
                  </label>
                  <input
                    type="text"
                    name="farbe"
                    value={formData.farbe}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. Schwarz, Rot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rahmenhöhe
                  </label>
                  <input
                    type="text"
                    name="rahmenhoehe"
                    value={formData.rahmenhoehe}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. M, L, 54cm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ
                  </label>
                  <select
                    name="typ"
                    value={formData.typ}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="E-Bike">E-Bike</option>
                    <option value="Citybike">Citybike</option>
                    <option value="MTB">MTB</option>
                    <option value="Werkstatt">Werkstatt</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preise */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                💰 Staffelpreise
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preis 1 Tag
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="preis_1tag"
                      value={formData.preis_1tag}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">€</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preis ab 3 Tagen (pro Tag)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="preis_3tage"
                      value={formData.preis_3tage}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">€</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preis ab 5 Tagen (pro Tag)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="preis_5tage"
                      value={formData.preis_5tage}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">€</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                💡 Tipp: Günstigere Preise bei längerer Mietdauer incentivieren längere Buchungen
              </p>
            </div>

            {/* Status & Zustand */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🔧 Status & Zustand
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verfügbarkeit
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="verfuegbar">✅ Verfügbar</option>
                    <option value="verliehen">🔴 Verliehen</option>
                    <option value="wartung">🔧 Wartung</option>
                    <option value="defekt">⚠️ Defekt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kontrollstatus
                  </label>
                  <select
                    name="kontrollstatus"
                    value={formData.kontrollstatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ok">✅ OK</option>
                    <option value="faellig">⚠️ Fällig</option>
                    <option value="ueberfaellig">🔴 Überfällig</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zustand / Mängel
                  </label>
                  <textarea
                    name="zustand"
                    value={formData.zustand}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Beschreibung des Zustands oder bekannter Mängel"
                  />
                </div>
              </div>
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📝 Notizen
              </label>
              <textarea
                name="notizen"
                value={formData.notizen}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Zusätzliche Informationen zum Leihrad"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Speichere...' : isEdit ? '💾 Änderungen speichern' : '➕ Leihrad anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LeihradModal

import { useState } from 'react'

export default function ReparaturErstellenModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    // Fahrrad
    fahrradmarke: '',
    fahrradmodell: '',
    rahmennummer: '',
    schluesselnummer: '',
    fahrrad_anwesend: false,

    // Kunde
    kunde_name: '',
    kunde_telefon: '',
    kunde_email: '',

    // Reparatur
    maengelbeschreibung: '',
    status: 'angenommen',
    fertig_bis: '',
    kostenvoranschlag: '',
    notizen: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Prepare data
      const submitData = {
        ...formData,
        kostenvoranschlag: formData.kostenvoranschlag ? parseFloat(formData.kostenvoranschlag) : null,
        fertig_bis: formData.fertig_bis || null,
        positionen: []
      }

      console.log('Sende Reparatur-Daten:', submitData)

      const response = await fetch('/api/reparaturen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      console.log('Response Status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Erfolgreich erstellt:', result)
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Fehler vom Backend:', errorData)
        setError(errorData.detail || 'Fehler beim Erstellen')
      }
    } catch (err) {
      console.error('Netzwerkfehler:', err)
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">🔧 Neue Reparatur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Fahrrad-Daten */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">🚲 Fahrrad-Daten</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marke *
                </label>
                <input
                  type="text"
                  name="fahrradmarke"
                  value={formData.fahrradmarke}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Cube, Trek, Specialized"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modell
                </label>
                <input
                  type="text"
                  name="fahrradmodell"
                  value={formData.fahrradmodell}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Acid 240"
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Rahmennummer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schlüsselnummer
                </label>
                <input
                  type="text"
                  name="schluesselnummer"
                  value={formData.schluesselnummer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Schlüsselnummer"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="fahrrad_anwesend"
                    checked={formData.fahrrad_anwesend}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Fahrrad ist anwesend
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Kunden-Daten */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-4">👤 Kunden-Daten</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="kunde_name"
                  value={formData.kunde_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Max Mustermann"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  name="kunde_telefon"
                  value={formData.kunde_telefon}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0123 456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  name="kunde_email"
                  value={formData.kunde_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="max@example.com"
                />
              </div>
            </div>
          </div>

          {/* Reparatur-Daten */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-900 mb-4">🔧 Reparatur-Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mängelbeschreibung *
                </label>
                <textarea
                  name="maengelbeschreibung"
                  value={formData.maengelbeschreibung}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Bremse schleift, Kette springt, Plattfuß vorne..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="angenommen">Angenommen</option>
                    <option value="in_arbeit">In Arbeit</option>
                    <option value="wartet_auf_teile">Wartet auf Teile</option>
                    <option value="fertig">Fertig</option>
                    <option value="abgeholt">Abgeholt</option>
                    <option value="storniert">Storniert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fertig bis (optional)
                  </label>
                  <input
                    type="date"
                    name="fertig_bis"
                    value={formData.fertig_bis}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kostenvoranschlag (€)
                  </label>
                  <input
                    type="number"
                    name="kostenvoranschlag"
                    value={formData.kostenvoranschlag}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notizen
                </label>
                <textarea
                  name="notizen"
                  value={formData.notizen}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Zusätzliche Informationen..."
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {loading ? 'Erstelle...' : 'Reparatur erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
import { useState } from 'react'
import KundenAutocomplete from './KundenAutocomplete'
import KundenModal from './KundenModal'

export default function ReparaturErstellenModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    // Fahrrad
    fahrradmarke: '',
    fahrradmodell: '',
    rahmennummer: '',
    schluesselnummer: '',
    fahrrad_anwesend: false,

    // Kunde (NEU)
    kunde_id: null,  // Aus Datenbank
    kunde_name: '',  // Freitext-Fallback
    kunde_telefon: '',  // Freitext-Fallback
    kunde_email: '',  // Freitext-Fallback

    // Reparatur
    maengelbeschreibung: '',
    status: 'angenommen',
    fertig_bis: '',
    kostenvoranschlag: '',
    notizen: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [kundenModalOpen, setKundenModalOpen] = useState(false)
  const [useLegacy, setUseLegacy] = useState(false)  // Freitext-Modus

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleKundeSelect = (kunde) => {
    setFormData(prev => ({
      ...prev,
      kunde_id: kunde.id,
      kunde_name: '',  // Freitext löschen
      kunde_telefon: '',
      kunde_email: ''
    }))
    setUseLegacy(false)
  }

  const handleKundeClear = () => {
    setFormData(prev => ({
      ...prev,
      kunde_id: null
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
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800">✏️ Neue Reparatur</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
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

          {/* Kunden-Daten (NEU) */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-green-900">👤 Kunden-Daten</h3>
              <button
                type="button"
                onClick={() => setUseLegacy(!useLegacy)}
                className="text-sm text-green-600 hover:text-green-700 underline"
              >
                {useLegacy ? '→ Kunde aus Datenbank' : '→ Freitext-Eingabe'}
              </button>
            </div>

            {useLegacy ? (
              /* Freitext-Modus (Einmalkunden) */
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
            ) : (
              /* Kunden-Autocomplete (Standard) */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kunde auswählen
                </label>
                <KundenAutocomplete
                  value={formData.kunde_id}
                  onSelect={handleKundeSelect}
                  onClear={handleKundeClear}
                  onNewCustomer={() => setKundenModalOpen(true)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tipp: Kunde nicht gefunden? Klick auf "Neuen Kunde anlegen"
                </p>
              </div>
            )}
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
                  placeholder="Was ist kaputt? Was soll gemacht werden?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fertig bis
                  </label>
                  <input
                    type="date"
                    name="fertig_bis"
                    value={formData.fertig_bis}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kostenvoranschlag (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="kostenvoranschlag"
                    value={formData.kostenvoranschlag}
                    onChange={handleChange}
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
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Interne Notizen..."
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Erstelle...' : 'Reparatur erstellen'}
            </button>
          </div>
        </form>
      </div>

      {/* Kunden-Modal (zum Anlegen neuer Kunden) */}
      {kundenModalOpen && (
        <KundenModal
          onClose={() => setKundenModalOpen(false)}
          onSuccess={(neuerKunde) => {
            setKundenModalOpen(false)
            // Neuen Kunde direkt auswählen
            handleKundeSelect(neuerKunde)
          }}
        />
      )}
    </div>
  )
}

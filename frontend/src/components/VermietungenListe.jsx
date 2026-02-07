import React, { useState, useEffect } from 'react'

export default function VermietungenListe({ showToast }) {
  const [vermietungen, setVermietungen] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('aktiv')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [selectedVermietung, setSelectedVermietung] = useState(null)

  useEffect(() => {
    loadVermietungen()
  }, [statusFilter])

  const loadVermietungen = async () => {
    try {
      let url = '/api/vermietungen/'
      if (statusFilter !== 'alle') {
        url += `?status=${statusFilter}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setVermietungen(data.items || [])
    } catch (error) {
      showToast('Fehler beim Laden der Vermietungen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = (vermietung) => {
    setSelectedVermietung(vermietung)
    setShowCheckinModal(true)
  }

  const handleStornieren = async (id) => {
    if (!confirm('Vermietung wirklich stornieren?')) return
    try {
      const res = await fetch(`/api/vermietungen/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('Vermietung storniert', 'success')
        loadVermietungen()
      }
    } catch (error) {
      showToast('Fehler beim Stornieren', 'error')
    }
  }

  const handleBezahlt = async (id, bezahlt) => {
    try {
      const res = await fetch(`/api/vermietungen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bezahlt: bezahlt,
          bezahlt_am: bezahlt ? new Date().toISOString() : null
        })
      })
      if (res.ok) {
        showToast('Zahlungsstatus aktualisiert', 'success')
        loadVermietungen()
      }
    } catch (error) {
      showToast('Fehler beim Aktualisieren', 'error')
    }
  }

  const filteredVermietungen = vermietungen.filter(v => {
    if (searchTerm === '') return true
    return v.kunde_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           v.leihrad?.inventarnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
           v.leihrad?.marke.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const statusColors = {
    aktiv: 'bg-green-100 text-green-800',
    abgeschlossen: 'bg-gray-100 text-gray-800',
    storniert: 'bg-red-100 text-red-800'
  }

  const statusLabels = {
    aktiv: 'Aktiv',
    abgeschlossen: 'Abgeschlossen',
    storniert: 'Storniert'
  }

  if (loading) return <div className="p-8 text-center">Laden...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Vermietungen</h1>
        <p className="text-gray-600 mt-1">{filteredVermietungen.length} Vermietungen</p>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-4 items-center bg-white p-4 rounded shadow">
        <input
          type="text"
          placeholder="Suche nach Kunde, Inventarnr., Marke..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="aktiv">Nur Aktive</option>
          <option value="abgeschlossen">Abgeschlossen</option>
          <option value="storniert">Storniert</option>
          <option value="alle">Alle</option>
        </select>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Fahrrad</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Kunde</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Zeitraum</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Preis</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Bezahlt</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredVermietungen.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{v.leihrad?.marke} {v.leihrad?.modell}</div>
                  <div className="text-sm text-gray-500 font-mono">{v.leihrad?.inventarnummer}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{v.kunde_name}</div>
                  {v.kunde_telefon && (
                    <div className="text-sm text-gray-500">{v.kunde_telefon}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div>{new Date(v.von_datum).toLocaleDateString('de-DE')} - {new Date(v.bis_datum).toLocaleDateString('de-DE')}</div>
                  <div className="text-gray-500">{v.anzahl_tage} Tage</div>
                  {v.rueckgabe_datum && (
                    <div className="text-green-600">Zurück: {new Date(v.rueckgabe_datum).toLocaleDateString('de-DE')}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{parseFloat(v.gesamtpreis).toFixed(2)} €</div>
                  <div className="text-sm text-gray-500">Kaution: {parseFloat(v.kaution).toFixed(2)} €</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${statusColors[v.status]}`}>
                    {statusLabels[v.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {v.status === 'aktiv' ? (
                    <button
                      onClick={() => handleBezahlt(v.id, !v.bezahlt)}
                      className={`px-2 py-1 rounded text-sm ${
                        v.bezahlt 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {v.bezahlt ? '✓ Bezahlt' : 'Unbezahlt'}
                    </button>
                  ) : (
                    <span className={v.bezahlt ? 'text-green-600' : 'text-gray-400'}>
                      {v.bezahlt ? '✓ Bezahlt' : 'Unbezahlt'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {v.status === 'aktiv' && (
                      <>
                        <button
                          onClick={() => handleCheckin(v)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Check-in
                        </button>
                        <button
                          onClick={() => handleStornieren(v.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Stornieren
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredVermietungen.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Keine Vermietungen gefunden
          </div>
        )}
      </div>

      {/* Check-in Modal */}
      {showCheckinModal && selectedVermietung && (
        <CheckinModal
          vermietung={selectedVermietung}
          onClose={() => {
            setShowCheckinModal(false)
            setSelectedVermietung(null)
          }}
          onSuccess={() => {
            setShowCheckinModal(false)
            setSelectedVermietung(null)
            loadVermietungen()
            showToast('Check-in erfolgreich', 'success')
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ========== CHECK-IN MODAL ==========
function CheckinModal({ vermietung, onClose, onSuccess, showToast }) {
  const [formData, setFormData] = useState({
    rueckgabe_datum: new Date().toISOString().split('T')[0],
    zustand: 'Gut',
    schaeden: '',
    kaution_zurueck: true
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/vermietungen/${vermietung.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        // Auch Kaution zurückgeben Status setzen
        await fetch(`/api/vermietungen/${vermietung.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kaution_zurueck: formData.kaution_zurueck })
        })
        onSuccess()
      } else {
        const error = await res.json()
        showToast(error.detail || 'Fehler beim Check-in', 'error')
      }
    } catch (error) {
      showToast('Fehler beim Check-in', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-xl w-full">
        <h2 className="text-2xl font-bold mb-4">Check-in: {vermietung.kunde_name}</h2>
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="font-semibold">{vermietung.leihrad?.marke} {vermietung.leihrad?.modell}</div>
          <div className="text-sm text-gray-600">
            Verliehen: {new Date(vermietung.von_datum).toLocaleDateString('de-DE')} - {new Date(vermietung.bis_datum).toLocaleDateString('de-DE')}
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rückgabedatum</label>
              <input
                type="date"
                value={formData.rueckgabe_datum}
                onChange={(e) => setFormData({...formData, rueckgabe_datum: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zustand bei Rückgabe</label>
              <input
                type="text"
                value={formData.zustand}
                onChange={(e) => setFormData({...formData, zustand: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Schäden</label>
              <textarea
                value={formData.schaeden}
                onChange={(e) => setFormData({...formData, schaeden: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                rows="3"
                placeholder="Beschädigungen oder Mängel..."
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.kaution_zurueck}
                onChange={(e) => setFormData({...formData, kaution_zurueck: e.target.checked})}
                className="mr-2"
              />
              <label>Kaution zurückgegeben ({parseFloat(vermietung.kaution).toFixed(2)} €)</label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Check-in abschließen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
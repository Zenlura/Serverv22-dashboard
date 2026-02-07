import { useState, useEffect } from 'react'
import ReparaturErstellenModal from './ReparaturErstellenModal'
import ReparaturBearbeitenModal from './ReparaturBearbeitenModal'
import Toast from './Toast'

export default function ReparaturenListe() {
  const [reparaturen, setReparaturen] = useState([])
  const [loading, setLoading] = useState(true)
  const [showErstellenModal, setShowErstellenModal] = useState(false)
  const [selectedReparatur, setSelectedReparatur] = useState(null)
  const [statusFilter, setStatusFilter] = useState('alle')
  const [bezahltFilter, setBezahltFilter] = useState('alle')
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadReparaturen()
  }, [])

  const loadReparaturen = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reparaturen')
      if (response.ok) {
        const data = await response.json()
        console.log('Geladene Reparaturen:', data)
        // Backend gibt {items: [], total: X} zurück
        const items = data.items || data
        setReparaturen(Array.isArray(items) ? items : [])
      } else {
        console.error('Fehler beim Laden, Status:', response.status)
        showToast('Fehler beim Laden der Reparaturen', 'error')
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
      showToast('Fehler beim Laden der Reparaturen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const handleDelete = async (id) => {
    if (!confirm('Reparatur wirklich löschen?')) return

    try {
      const response = await fetch(`/api/reparaturen/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        showToast('Reparatur gelöscht', 'success')
        loadReparaturen()
      }
    } catch (error) {
      showToast('Fehler beim Löschen', 'error')
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`/api/reparaturen/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (response.ok) {
        showToast('Status geändert', 'success')
        loadReparaturen()
      }
    } catch (error) {
      showToast('Fehler beim Ändern des Status', 'error')
    }
  }

  // Filter
  const filteredReparaturen = reparaturen.filter(rep => {
    const matchesStatus = statusFilter === 'alle' || rep.status === statusFilter
    const matchesBezahlt = bezahltFilter === 'alle' || 
      (bezahltFilter === 'bezahlt' && rep.bezahlt) ||
      (bezahltFilter === 'unbezahlt' && !rep.bezahlt)
    const matchesSearch = searchTerm === '' ||
      rep.auftragsnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.kunde_name && rep.kunde_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rep.fahrradmarke.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesBezahlt && matchesSearch
  })

  const getStatusBadge = (status) => {
    const styles = {
      angenommen: 'bg-blue-100 text-blue-800',
      in_arbeit: 'bg-yellow-100 text-yellow-800',
      wartet_auf_teile: 'bg-orange-100 text-orange-800',
      fertig: 'bg-green-100 text-green-800',
      abgeholt: 'bg-gray-100 text-gray-800',
      storniert: 'bg-red-100 text-red-800'
    }
    const labels = {
      angenommen: 'Angenommen',
      in_arbeit: 'In Arbeit',
      wartet_auf_teile: 'Wartet auf Teile',
      fertig: 'Fertig',
      abgeholt: 'Abgeholt',
      storniert: 'Storniert'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE')
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('de-DE')
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Lädt...</div>
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Reparaturen</h1>
        <p className="text-gray-600">Reparaturaufträge verwalten</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Suche */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suchen... (Auftragsnr., Kunde, Marke)"
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="alle">Alle Status</option>
            <option value="angenommen">Angenommen</option>
            <option value="in_arbeit">In Arbeit</option>
            <option value="wartet_auf_teile">Wartet auf Teile</option>
            <option value="fertig">Fertig</option>
            <option value="abgeholt">Abgeholt</option>
            <option value="storniert">Storniert</option>
          </select>

          {/* Bezahlt Filter */}
          <select
            value={bezahltFilter}
            onChange={(e) => setBezahltFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="alle">Alle</option>
            <option value="bezahlt">Bezahlt</option>
            <option value="unbezahlt">Unbezahlt</option>
          </select>

          {/* Neu Button */}
          <button
            onClick={() => setShowErstellenModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Neue Reparatur
          </button>
        </div>

        {/* Ergebnis-Anzeige */}
        {(statusFilter !== 'alle' || bezahltFilter !== 'alle' || searchTerm) && (
          <div className="mt-4 text-sm text-gray-600">
            {filteredReparaturen.length} {filteredReparaturen.length === 1 ? 'Reparatur' : 'Reparaturen'} gefunden
          </div>
        )}
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Auftragsnr.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fahrrad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kunde</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mängel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Termin</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Preis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Anwesend</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReparaturen.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    Keine Reparaturen gefunden
                  </td>
                </tr>
              ) : (
                filteredReparaturen.map(rep => (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    {/* Auftragsnr */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-blue-600">{rep.auftragsnummer}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(rep.created_at)}</div>
                    </td>

                    {/* Fahrrad */}
                    <td className="px-4 py-3">
                      <div className="font-medium">{rep.fahrradmarke}</div>
                      {rep.fahrradmodell && (
                        <div className="text-sm text-gray-600">{rep.fahrradmodell}</div>
                      )}
                    </td>

                    {/* Kunde */}
                    <td className="px-4 py-3">
                      {rep.kunde_name ? (
                        <>
                          <div className="font-medium">{rep.kunde_name}</div>
                          {rep.kunde_telefon && (
                            <div className="text-sm text-gray-600">📞 {rep.kunde_telefon}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Mängel */}
                    <td className="px-4 py-3">
                      <div className="text-sm max-w-xs truncate" title={rep.maengelbeschreibung}>
                        {rep.maengelbeschreibung}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <select
                        value={rep.status}
                        onChange={(e) => handleStatusChange(rep.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="angenommen">Angenommen</option>
                        <option value="in_arbeit">In Arbeit</option>
                        <option value="wartet_auf_teile">Wartet auf Teile</option>
                        <option value="fertig">Fertig</option>
                        <option value="abgeholt">Abgeholt</option>
                        <option value="storniert">Storniert</option>
                      </select>
                    </td>

                    {/* Termin */}
                    <td className="px-4 py-3 text-sm">
                      {rep.fertig_bis ? (
                        <div>
                          <div className="text-gray-600">Bis: {formatDate(rep.fertig_bis)}</div>
                          {rep.fertig_am && (
                            <div className="text-green-600">✓ {formatDate(rep.fertig_am)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Preis */}
                    <td className="px-4 py-3 text-right">
                      {rep.endbetrag ? (
                        <div>
                          <div className="font-semibold">{rep.endbetrag.toFixed(2)} €</div>
                          {rep.bezahlt ? (
                            <span className="text-xs text-green-600">✓ Bezahlt</span>
                          ) : (
                            <span className="text-xs text-red-600">Offen</span>
                          )}
                        </div>
                      ) : rep.kostenvoranschlag ? (
                        <div className="text-sm text-gray-600">
                          KVA: {rep.kostenvoranschlag.toFixed(2)} €
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Anwesend */}
                    <td className="px-4 py-3">
                      {rep.fahrrad_anwesend ? (
                        <span className="text-green-600 font-semibold">✓ Ja</span>
                      ) : (
                        <span className="text-red-600">✗ Nein</span>
                      )}
                    </td>

                    {/* Aktionen */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedReparatur(rep)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(rep.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showErstellenModal && (
        <ReparaturErstellenModal
          onClose={() => setShowErstellenModal(false)}
          onSuccess={() => {
            setShowErstellenModal(false)
            loadReparaturen()
            showToast('Reparatur erstellt', 'success')
          }}
        />
      )}

      {selectedReparatur && (
        <ReparaturBearbeitenModal
          reparatur={selectedReparatur}
          onClose={() => setSelectedReparatur(null)}
          onSuccess={() => {
            setSelectedReparatur(null)
            loadReparaturen()
            showToast('Änderungen gespeichert', 'success')
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
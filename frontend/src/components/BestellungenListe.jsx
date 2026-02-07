import { useState, useEffect } from 'react'
import BestellungBearbeitenModal from '../components/BestellungBearbeitenModal'
import Toast from '../components/Toast'

function BestellungenListe() {
  const [bestellungen, setBestellungen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('alle')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedBestellung, setSelectedBestellung] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [editingBestellung, setEditingBestellung] = useState(null)
  const [toast, setToast] = useState(null)

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    fetchBestellungen()
  }, [filterStatus, searchTerm, sortBy, sortOrder])

  const fetchBestellungen = async () => {
    try {
      setLoading(true)
      
      // Build query params
      const params = new URLSearchParams()
      if (filterStatus !== 'alle') {
        params.append('status', filterStatus)
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (sortBy) {
        params.append('sort_by', sortBy)
        params.append('sort_order', sortOrder)
      }
      
      const url = `/api/bestellungen${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      
      const data = await response.json()
      setBestellungen(data.items || data || [])
      setError(null)
    } catch (err) {
      setError('Fehler beim Laden: ' + err.message)
      console.error('Fehler:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to desc
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return '↕️'
    }
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const handleWareneingang = async (bestellungId) => {
    if (!confirm('Wareneingang für diese Bestellung buchen?\nDies erhöht die Bestände automatisch!')) {
      return
    }

    try {
      const response = await fetch(`/api/bestellungen/${bestellungId}/wareneingang`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Fehler: ${response.status}`)
      }

      showToast('Wareneingang erfolgreich gebucht! Bestände wurden aktualisiert.', 'success')
      fetchBestellungen()
      
      if (selectedBestellung?.id === bestellungId) {
        setShowDetails(false)
        setSelectedBestellung(null)
      }
    } catch (err) {
      showToast('Fehler beim Buchen: ' + err.message, 'error')
    }
  }

  const handleStatusChange = async (bestellungId, newStatus) => {
    try {
      const response = await fetch(`/api/bestellungen/${bestellungId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          bestelldatum: newStatus === 'bestellt' ? new Date().toISOString() : undefined
        })
      })

      if (!response.ok) {
        throw new Error(`Fehler: ${response.status}`)
      }

      showToast('Status erfolgreich geändert!', 'success')
      fetchBestellungen()
    } catch (err) {
      showToast('Fehler beim Aktualisieren: ' + err.message, 'error')
    }
  }

  const handleDelete = async (bestellungId) => {
    if (!confirm('Bestellung wirklich löschen?')) return

    try {
      const response = await fetch(`/api/bestellungen/${bestellungId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Fehler: ${response.status}`)
      }

      showToast('Bestellung erfolgreich gelöscht!', 'success')
      fetchBestellungen()
    } catch (err) {
      showToast('Fehler beim Löschen: ' + err.message, 'error')
    }
  }

  const handleUpdateBestellung = (updated) => {
    if (!updated) {
      // Bestellung wurde gelöscht
      fetchBestellungen()
    } else {
      // Bestellung wurde aktualisiert
      fetchBestellungen()
    }
    setEditingBestellung(null)
  }

  const formatPreis = (preis) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(preis || 0)
  }

  const formatDatum = (datum) => {
    if (!datum) return '-'
    return new Date(datum).toLocaleDateString('de-DE')
  }

  const getStatusBadge = (status) => {
    const badges = {
      entwurf: 'bg-gray-100 text-gray-800',
      bestellt: 'bg-blue-100 text-blue-800',
      teilgeliefert: 'bg-yellow-100 text-yellow-800',
      geliefert: 'bg-green-100 text-green-800',
      storniert: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      entwurf: '📝 Entwurf',
      bestellt: '📦 Bestellt',
      teilgeliefert: '📦 Teilgeliefert',
      geliefert: '✅ Geliefert',
      storniert: '❌ Storniert'
    }

    return (
      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${badges[status] || badges.entwurf}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Lade Bestellungen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-red-800">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold">Fehler</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchBestellungen}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">📦 Bestellungen</h2>
              <p className="text-gray-600 text-sm mt-1">
                {bestellungen.length} Bestellungen {searchTerm ? 'gefunden' : 'insgesamt'}
              </p>
            </div>

            {/* Suchfeld */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Suche nach Bestellnummer, Lieferant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('alle')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'alle' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilterStatus('entwurf')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'entwurf' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Entwürfe
            </button>
            <button
              onClick={() => setFilterStatus('bestellt')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'bestellt' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📦 Bestellt
            </button>
            <button
              onClick={() => setFilterStatus('geliefert')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'geliefert' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Geliefert
            </button>
          </div>
        </div>
      </div>

      {/* Bestellungen Liste */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {bestellungen.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? (
              <div>
                <p className="text-lg mb-2">🔍 Keine Ergebnisse</p>
                <p className="text-sm">Keine Bestellungen gefunden für "{searchTerm}"</p>
              </div>
            ) : filterStatus === 'alle' ? (
              'Noch keine Bestellungen'
            ) : (
              `Keine ${filterStatus} Bestellungen`
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    onClick={() => handleSort('bestellnummer')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      Bestellnummer
                      <span className="text-sm">{getSortIcon('bestellnummer')}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lieferant
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Status
                      <span className="text-sm">{getSortIcon('status')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('gesamtpreis')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Gesamtpreis
                      <span className="text-sm">{getSortIcon('gesamtpreis')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      Erstellt
                      <span className="text-sm">{getSortIcon('created_at')}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bestellungen.map((bestellung) => (
                  <tr key={bestellung.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {bestellung.bestellnummer}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {bestellung.lieferant?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(bestellung.status)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatPreis(bestellung.gesamtpreis)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDatum(bestellung.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBestellung(bestellung)
                            setShowDetails(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Details
                        </button>
                        
                        {/* Bearbeiten für alle Status */}
                        <button
                          onClick={() => setEditingBestellung(bestellung)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Bearbeiten
                        </button>
                        
                        {/* Zurück zu Entwurf - für Nicht-Entwürfe */}
                        {bestellung.status !== 'entwurf' && bestellung.status !== 'geliefert' && (
                          <button
                            onClick={() => handleStatusChange(bestellung.id, 'entwurf')}
                            className="text-orange-600 hover:text-orange-800 font-medium"
                            title="Zurück zu Entwurf (dann löschbar)"
                          >
                            ↩️ Entwurf
                          </button>
                        )}
                        
                        {/* Löschen nur bei Entwürfen */}
                        {bestellung.status === 'entwurf' && (
                          <button
                            onClick={() => handleDelete(bestellung.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Löschen
                          </button>
                        )}
                        
                        {bestellung.status === 'bestellt' && (
                          <button
                            onClick={() => handleWareneingang(bestellung.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                          >
                            ✅ Wareneingang
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedBestellung && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">Bestellung {selectedBestellung.bestellnummer}</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {selectedBestellung.lieferant?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetails(false)
                    setSelectedBestellung(null)
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                
                {/* Status & Preise */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedBestellung.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Gesamtpreis</label>
                    <div className="mt-1 text-2xl font-bold text-gray-900">
                      {formatPreis(selectedBestellung.gesamtpreis)}
                    </div>
                  </div>
                </div>

                {/* Positionen */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Bestellte Artikel</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Artikel</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Menge</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Einzelpreis</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Gesamt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedBestellung.positionen?.map((pos) => (
                          <tr key={pos.id}>
                            <td className="px-4 py-3 text-sm">
                              {pos.artikel?.bezeichnung || 'Artikel ' + pos.artikel_id}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {pos.geliefert ? (
                                <span className="text-green-600">✅ {pos.menge}</span>
                              ) : (
                                pos.menge
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">{formatPreis(pos.einzelpreis)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatPreis(pos.gesamtpreis)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notizen */}
                {(selectedBestellung.notizen || selectedBestellung.interne_notizen) && (
                  <div className="space-y-3">
                    {selectedBestellung.notizen && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Notizen für Lieferant</label>
                        <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {selectedBestellung.notizen}
                        </p>
                      </div>
                    )}
                    {selectedBestellung.interne_notizen && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Interne Notizen</label>
                        <p className="mt-1 text-sm text-gray-600 bg-yellow-50 p-3 rounded">
                          {selectedBestellung.interne_notizen}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
              <button
                onClick={() => {
                  setShowDetails(false)
                  setSelectedBestellung(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Schließen
              </button>
              
              {selectedBestellung.status === 'entwurf' && (
                <button
                  onClick={() => handleStatusChange(selectedBestellung.id, 'bestellt')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📦 Als bestellt markieren
                </button>
              )}
              
              {selectedBestellung.status === 'bestellt' && (
                <button
                  onClick={() => handleWareneingang(selectedBestellung.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  ✅ Wareneingang buchen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bearbeiten Modal */}
      {editingBestellung && (
        <BestellungBearbeitenModal
          bestellung={editingBestellung}
          onClose={() => setEditingBestellung(null)}
          onUpdate={handleUpdateBestellung}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default BestellungenListe
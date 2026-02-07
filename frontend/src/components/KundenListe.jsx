import React, { useState, useEffect } from 'react'
import KundenModal from './KundenModal'
import WarnungsModal from './WarnungsModal'

export default function KundenListe({ showToast }) {
  const [kunden, setKunden] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedKunde, setSelectedKunde] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [showWarnungsModal, setShowWarnungsModal] = useState(false)
  const [warnungsKunde, setWarnungsKunde] = useState(null)

  useEffect(() => {
    loadKunden()
  }, [])

  const loadKunden = async () => {
    try {
      const res = await fetch('/api/kunden/')
      const data = await res.json()
      setKunden(data.items || [])
    } catch (error) {
      showToast?.('Fehler beim Laden der Kunden', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (kunde) => {
    setSelectedKunde(kunde)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Kunde wirklich löschen?\n\nAlle Verknüpfungen zu Vermietungen gehen verloren!')) return
    
    try {
      const res = await fetch(`/api/kunden/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast?.('Kunde gelöscht', 'success')
        loadKunden()
      } else {
        const error = await res.json()
        showToast?.(error.detail || 'Fehler beim Löschen', 'error')
      }
    } catch (error) {
      showToast?.('Fehler beim Löschen', 'error')
    }
  }

  const handleRechnungBezahlt = async (kundeId) => {
    try {
      const res = await fetch(`/api/kunden/${kundeId}/rechnung-bezahlt`, {
        method: 'POST'
      })
      if (res.ok) {
        showToast?.('Rechnung als bezahlt markiert', 'success')
        loadKunden()
      }
    } catch (error) {
      showToast?.('Fehler beim Aktualisieren', 'error')
    }
  }

  // Filtern
  const filteredKunden = kunden.filter(kunde => {
    // Suchbegriff
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || 
      kunde.vorname?.toLowerCase().includes(searchLower) ||
      kunde.nachname.toLowerCase().includes(searchLower) ||
      kunde.telefon?.toLowerCase().includes(searchLower) ||
      kunde.email?.toLowerCase().includes(searchLower) ||
      kunde.kundennummer.toLowerCase().includes(searchLower)
    
    // Status-Filter
    const matchesStatus = statusFilter === 'alle' || kunde.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Statistiken
  const stats = {
    gesamt: kunden.length,
    normal: kunden.filter(k => k.status === 'normal').length,
    warnung: kunden.filter(k => k.status === 'warnung').length,
    gesperrt: kunden.filter(k => k.status === 'gesperrt').length,
    offeneRechnungen: kunden.filter(k => k.offene_rechnungen > 0).length
  }

  const statusConfig = {
    normal: {
      badge: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      label: 'Normal'
    },
    warnung: {
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⚠️',
      label: 'Warnung'
    },
    gesperrt: {
      badge: 'bg-red-100 text-red-800 border-red-200',
      icon: '🚨',
      label: 'Gesperrt'
    }
  }

  if (loading) return <div className="p-8 text-center">Laden...</div>

  return (
    <div className="flex gap-6">
      {/* SIDEBAR - Schnellfilter & Stats */}
      <div className="w-64 flex-shrink-0 space-y-4">
        {/* Statistiken */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-3">📊 Übersicht</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Gesamt:</span>
              <span className="font-bold">{stats.gesamt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">✅ Normal:</span>
              <span className="font-bold text-green-600">{stats.normal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">⚠️ Warnung:</span>
              <span className="font-bold text-yellow-600">{stats.warnung}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">🚨 Gesperrt:</span>
              <span className="font-bold text-red-600">{stats.gesperrt}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="text-gray-600">💰 Off. Rechn.:</span>
              <span className="font-bold text-orange-600">{stats.offeneRechnungen}</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-3">🔍 Filter</h3>
          <div className="space-y-2">
            <button
              onClick={() => setStatusFilter('alle')}
              className={`w-full text-left px-3 py-2 rounded transition ${
                statusFilter === 'alle'
                  ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              📋 Alle Kunden
            </button>
            <button
              onClick={() => setStatusFilter('normal')}
              className={`w-full text-left px-3 py-2 rounded transition ${
                statusFilter === 'normal'
                  ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              ✅ Nur Normale
            </button>
            <button
              onClick={() => setStatusFilter('warnung')}
              className={`w-full text-left px-3 py-2 rounded transition ${
                statusFilter === 'warnung'
                  ? 'bg-yellow-50 text-yellow-700 font-medium border border-yellow-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              ⚠️ Nur Warnungen
            </button>
            <button
              onClick={() => setStatusFilter('gesperrt')}
              className={`w-full text-left px-3 py-2 rounded transition ${
                statusFilter === 'gesperrt'
                  ? 'bg-red-50 text-red-700 font-medium border border-red-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              🚨 Nur Gesperrte
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h3 className="font-bold text-blue-800 mb-2 text-sm">💡 Tipp</h3>
          <p className="text-xs text-blue-700">
            Gesperrte Kunden können trotzdem ein Rad mieten - das System zeigt dann eine Warnung.
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">👥 Kundenkartei</h2>
              <p className="text-gray-600 text-sm mt-1">
                {filteredKunden.length} von {kunden.length} Kunden
                {statusFilter !== 'alle' && ` (Filter: ${statusConfig[statusFilter]?.label})`}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedKunde(null)
                setShowModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span>+</span>
              <span>Neuer Kunde</span>
            </button>
          </div>

          {/* Suchfeld */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="🔍 Suche nach Name, Telefon, Email oder Kundennummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabelle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nr.</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Kontakt</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Rechnungen</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredKunden.map(kunde => {
                const config = statusConfig[kunde.status] || statusConfig.normal
                const hatOffeneRechnung = parseFloat(kunde.offene_rechnungen || 0) > 0
                
                return (
                  <tr key={kunde.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-600">
                      {kunde.kundennummer}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {kunde.vorname} {kunde.nachname}
                      </div>
                      {kunde.sprache && kunde.sprache !== 'Deutsch' && (
                        <div className="text-xs text-blue-600 mt-1">
                          🌐 {kunde.sprache}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {kunde.telefon && (
                        <div className="text-gray-700">📞 {kunde.telefon}</div>
                      )}
                      {kunde.email && (
                        <div className="text-gray-500 text-xs">✉️ {kunde.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${config.badge}`}>
                        {config.icon} {config.label}
                      </span>
                      {kunde.status === 'gesperrt' && kunde.gesperrt_grund && (
                        <div className="text-xs text-red-600 mt-1" title={kunde.gesperrt_grund}>
                          {kunde.gesperrt_grund.substring(0, 30)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hatOffeneRechnung ? (
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-red-600">
                            {parseFloat(kunde.offene_rechnungen).toFixed(2)} €
                          </div>
                          <button
                            onClick={() => handleRechnungBezahlt(kunde.id)}
                            className="text-xs text-green-600 hover:text-green-700 underline"
                          >
                            Als bezahlt markieren
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setWarnungsKunde(kunde)
                            setShowWarnungsModal(true)
                          }}
                          className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                          title="Status & Warnungen verwalten"
                        >
                          ⚙️ Status
                        </button>
                        <button
                          onClick={() => handleEdit(kunde)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(kunde.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredKunden.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || statusFilter !== 'alle' 
                ? '🔍 Keine Kunden gefunden - Filter anpassen?'
                : 'Noch keine Kunden angelegt'
              }
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <KundenModal
          kunde={selectedKunde}
          onClose={() => {
            setShowModal(false)
            setSelectedKunde(null)
          }}
          onSave={() => {
            setShowModal(false)
            setSelectedKunde(null)
            loadKunden()
            showToast?.(selectedKunde ? 'Kunde aktualisiert' : 'Kunde angelegt', 'success')
          }}
        />
      )}

      {/* Warnungs-Modal */}
      {showWarnungsModal && warnungsKunde && (
        <WarnungsModal
          kunde={warnungsKunde}
          onClose={() => {
            setShowWarnungsModal(false)
            setWarnungsKunde(null)
          }}
          onSave={() => {
            setShowWarnungsModal(false)
            setWarnungsKunde(null)
            loadKunden()
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

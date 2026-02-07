import React, { useState, useEffect } from 'react'
import LeihradModal from './LeihradModal'

export default function LeihraederListe({ showToast, onReload }) {
  const [leihraeder, setLeihraeder] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedLeihrad, setSelectedLeihrad] = useState(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadLeihraeder()
  }, [])

  const loadLeihraeder = async () => {
    try {
      const res = await fetch('/api/leihraeder/')
      const data = await res.json()
      setLeihraeder(data.items || [])
      onReload?.() // Parent informieren
    } catch (error) {
      showToast?.('Fehler beim Laden der Leihräder', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncStatus = async () => {
    if (!confirm('Status aller Leihräder synchronisieren?\n\nRäder ohne aktive Vermietung werden auf "verfügbar" gesetzt.')) {
      return
    }
    
    setSyncing(true)
    try {
      const res = await fetch('/api/leihraeder/sync-status', {
        method: 'POST'
      })
      
      if (res.ok) {
        const data = await res.json()
        showToast?.(`✅ ${data.synced} Räder synchronisiert`, 'success')
        loadLeihraeder()
      } else {
        showToast?.('Fehler beim Sync', 'error')
      }
    } catch (error) {
      showToast?.('Fehler beim Sync', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleEdit = (leihrad) => {
    setSelectedLeihrad(leihrad)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Leihrad wirklich löschen?')) return
    
    try {
      const res = await fetch(`/api/leihraeder/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast?.('Leihrad gelöscht', 'success')
        loadLeihraeder()
      } else {
        const error = await res.json()
        showToast?.(error.detail || 'Fehler beim Löschen', 'error')
      }
    } catch (error) {
      showToast?.('Fehler beim Löschen', 'error')
    }
  }

  const statusColors = {
    verfuegbar: 'bg-green-100 text-green-800',
    verliehen: 'bg-red-100 text-red-800',
    wartung: 'bg-yellow-100 text-yellow-800',
    defekt: 'bg-gray-100 text-gray-800'
  }

  const statusLabels = {
    verfuegbar: 'Verfügbar',
    verliehen: 'Verliehen',
    wartung: 'Wartung',
    defekt: 'Defekt'
  }

  if (loading) return <div className="p-8 text-center">Laden...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Leihräder Übersicht</h2>
            <p className="text-gray-600 text-sm mt-1">{leihraeder.length} Räder im System</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSyncStatus}
              disabled={syncing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? '🔄 Synce...' : '🔄 Status Sync'}
            </button>
            <button
              onClick={() => {
                setSelectedLeihrad(null)
                setShowModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + Neues Leihrad
            </button>
          </div>
        </div>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Inventarnr.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Marke / Modell</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Typ</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Preise</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leihraeder.map(rad => (
              <tr key={rad.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold">{rad.inventarnummer}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{rad.marke}</div>
                  <div className="text-sm text-gray-500">{rad.modell}</div>
                </td>
                <td className="px-4 py-3">{rad.typ}</td>
                <td className="px-4 py-3 text-sm">
                  <div>1 Tag: {parseFloat(rad.preis_1tag).toFixed(2)} €</div>
                  <div className="text-gray-500">3+ Tage: {parseFloat(rad.preis_3tage).toFixed(2)} €</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${statusColors[rad.status]}`}>
                    {statusLabels[rad.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(rad)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(rad.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leihraeder.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Keine Leihräder gefunden
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <LeihradModal
          leihrad={selectedLeihrad}
          onClose={() => {
            setShowModal(false)
            setSelectedLeihrad(null)
          }}
          onSave={() => {
            setShowModal(false)
            setSelectedLeihrad(null)
            loadLeihraeder()
            showToast?.(selectedLeihrad ? 'Leihrad aktualisiert' : 'Leihrad angelegt', 'success')
          }}
        />
      )}
    </div>
  )
}
import { useState, useEffect } from 'react'
import LeihraederBulkImport from './LeihraederBulkImport'
import LeihraederKalender from './LeihraederKalender'
import VermietungModal from './VermietungModal'
import LeihradModal from './LeihradModal'
import Toast from './Toast'

function LeihraederListe() {
  const [leihraeder, setLeihraeder] = useState([])
  const [vermietungen, setVermietungen] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kalender') // 'kalender' oder 'liste'
  const [toast, setToast] = useState(null)
  const [selectedLeihrad, setSelectedLeihrad] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedVermietung, setSelectedVermietung] = useState(null)
  const [showLeihradModal, setShowLeihradModal] = useState(false)
  const [editLeihrad, setEditLeihrad] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [leihraderResp, vermietungenResp] = await Promise.all([
        fetch('/api/leihraeder'),
        fetch('/api/vermietungen')
      ])

      if (leihraderResp.ok) {
        const data = await leihraderResp.json()
        setLeihraeder(data.items || data || [])
      }

      if (vermietungenResp.ok) {
        const data = await vermietungenResp.json()
        setVermietungen(data.items || data || [])
      }

    } catch (err) {
      showToast('Fehler beim Laden: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (leihrad, date) => {
    setSelectedLeihrad(leihrad)
    setSelectedDate(date)
  }

  const handleVermietungClick = (vermietung) => {
    setSelectedVermietung(vermietung)
    showToast('Vermietungs-Details in Entwicklung', 'info')
  }

  const handleVermietungSave = () => {
    setSelectedLeihrad(null)
    setSelectedDate(null)
    loadData()
    showToast('Vermietung erfolgreich gespeichert!', 'success')
  }

  const handleLeihradSave = () => {
    loadData()
    showToast(editLeihrad ? 'Leihrad erfolgreich aktualisiert!' : 'Leihrad erfolgreich angelegt!', 'success')
  }

  const handleEdit = (leihrad) => {
    setEditLeihrad(leihrad)
    setShowLeihradModal(true)
  }

  const handleDelete = async (leihrad) => {
    if (!confirm(`Leihrad "${leihrad.inventarnummer}" wirklich löschen?`)) {
      return
    }

    try {
      const response = await fetch(`/api/leihraeder/${leihrad.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Fehler beim Löschen')
      }

      showToast('Leihrad erfolgreich gelöscht', 'success')
      loadData()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const getStatistik = () => {
    const verfuegbar = leihraeder.filter(l => l.status === 'verfuegbar').length
    const verliehen = leihraeder.filter(l => l.status === 'verliehen').length
    const wartung = leihraeder.filter(l => l.status === 'wartung').length
    const aktiveVermietungen = vermietungen.filter(v => v.status === 'aktiv' || v.status === 'reserviert').length

    return { verfuegbar, verliehen, wartung, aktiveVermietungen }
  }

  const stats = getStatistik()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Leihräder...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header mit Statistik */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🚲 Leihräder Verwaltung</h1>
            <p className="text-gray-600 mt-1">Übersicht und Kalender für alle Leihräder</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditLeihrad(null)
                setShowLeihradModal(true)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              ➕ Neues Leihrad
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Aktualisieren
            </button>
          </div>
        </div>

        {/* Statistik Karten */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-700 font-medium">Gesamt</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">{leihraeder.length}</div>
            <div className="text-xs text-blue-600 mt-1">Leihräder</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-700 font-medium">Verfügbar</div>
            <div className="text-3xl font-bold text-green-900 mt-1">{stats.verfuegbar}</div>
            <div className="text-xs text-green-600 mt-1">Bereit zum Verleih</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-red-700 font-medium">Verliehen</div>
            <div className="text-3xl font-bold text-red-900 mt-1">{stats.verliehen}</div>
            <div className="text-xs text-red-600 mt-1">Aktuell unterwegs</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="text-sm text-yellow-700 font-medium">Wartung</div>
            <div className="text-3xl font-bold text-yellow-900 mt-1">{stats.wartung}</div>
            <div className="text-xs text-yellow-600 mt-1">In Bearbeitung</div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mt-6 border-t pt-6">
          <button
            onClick={() => setView('kalender')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
              view === 'kalender'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Kalenderansicht
          </button>
          <button
            onClick={() => setView('liste')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
              view === 'liste'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Listenansicht
          </button>
        </div>
      </div>

      {/* Bulk Import wenn keine Räder vorhanden */}
      {leihraeder.length === 0 && (
        <LeihraederBulkImport onImportComplete={loadData} />
      )}

      {/* Kalender View */}
      {view === 'kalender' && (
        <LeihraederKalender
          leihraeder={leihraeder}
          vermietungen={vermietungen}
          onVermietungClick={handleVermietungClick}
          onDateClick={handleDateClick}
        />
      )}

      {/* Listen View */}
      {view === 'liste' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inventar-Nr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marke/Modell</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rahmennummer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontrolle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leihraeder.map(leihrad => (
                  <tr key={leihrad.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {leihrad.inventarnummer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        leihrad.typ === 'E-Bike' ? 'bg-purple-100 text-purple-800' :
                        leihrad.typ === 'Normal' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {leihrad.typ}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leihrad.marke} {leihrad.modell}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {leihrad.rahmennummer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        leihrad.status === 'verfuegbar' ? 'bg-green-100 text-green-800' :
                        leihrad.status === 'verliehen' ? 'bg-red-100 text-red-800' :
                        leihrad.status === 'wartung' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {leihrad.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leihrad.preis_1tag}€/Tag
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        leihrad.kontrollstatus === 'ok' ? 'bg-green-100 text-green-800' :
                        leihrad.kontrollstatus === 'faellig' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {leihrad.kontrollstatus || 'ok'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(leihrad)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          title="Bearbeiten"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(leihrad)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          title="Löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leihraeder.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">Keine Leihräder vorhanden</p>
              <p className="text-sm">Klicke auf "Neues Leihrad" um zu starten</p>
            </div>
          )}
        </div>
      )}

      {/* Leihrad Modal (Anlegen/Bearbeiten) */}
      {showLeihradModal && (
        <LeihradModal
          leihrad={editLeihrad}
          onClose={() => {
            setShowLeihradModal(false)
            setEditLeihrad(null)
          }}
          onSave={handleLeihradSave}
        />
      )}

      {/* Vermietung Modal */}
      {selectedLeihrad && (
        <VermietungModal
          leihrad={selectedLeihrad}
          vorauswahl={selectedDate}
          onClose={() => {
            setSelectedLeihrad(null)
            setSelectedDate(null)
          }}
          onSave={handleVermietungSave}
        />
      )}

      {/* Toast */}
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

export default LeihraederListe

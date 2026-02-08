import React, { useState, useEffect } from 'react'
import { List, Calendar, CalendarDays, Plus, RefreshCw } from 'lucide-react'
import LeihraederListe from './LeihraederListe'
import LeihraederKalender from './LeihraederKalender'
import LeihraederTimeline from './LeihraederTimeline'
import VermietungModal from './VermietungModal'

export default function Leihraeder({ showToast }) {
  const [activeTab, setActiveTab] = useState('timeline') // ✅ Timeline als Default
  const [leihraeder, setLeihraeder] = useState([])
  const [vermietungen, setVermietungen] = useState([])
  const [loading, setLoading] = useState(true)
  const [showVermietungModal, setShowVermietungModal] = useState(false)
  const [selectedLeihrad, setSelectedLeihrad] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editVermietung, setEditVermietung] = useState(null) // ✅ Für Timeline Edit

  useEffect(() => {
    loadData()
    // Tab aus URL lesen (falls vorhanden)
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    if (tab === 'kalender' || tab === 'liste' || tab === 'timeline') {
      setActiveTab(tab)
    }
  }, [])

  const loadData = async () => {
    try {
      const [raederRes, vermietungenRes] = await Promise.all([
        fetch('/api/leihraeder/'),
        fetch('/api/vermietungen/')
      ])
      
      const raederData = await raederRes.json()
      const vermietungenData = await vermietungenRes.json()
      
      setLeihraeder(raederData.items || [])
      setVermietungen(vermietungenData.items || [])
    } catch (error) {
      showToast?.('Fehler beim Laden', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    // Tab in URL speichern
    const url = new URL(window.location)
    url.searchParams.set('tab', tab)
    window.history.pushState({}, '', url)
  }

  const handleDateClick = (leihrad, date) => {
    setSelectedLeihrad(leihrad)
    setSelectedDate(date)
    setEditVermietung(null) // ✅ Reset edit mode
    setShowVermietungModal(true)
  }

  const handleVermietungClick = (vermietung) => {
    showToast?.('Vermietung Details - TODO', 'info')
  }

  // ✅ NEU: Timeline Callbacks
  const handleNewBuchung = () => {
    setEditVermietung(null)
    setSelectedLeihrad(null)
    setSelectedDate(null)
    setShowVermietungModal(true)
  }

  const handleEditBuchung = (vermietung) => {
    setEditVermietung(vermietung)
    setSelectedLeihrad(null)
    setSelectedDate(null)
    setShowVermietungModal(true)
  }

  const handleDetailsClick = (vermietung) => {
    // Optional: Details-Modal öffnen
    // Für jetzt: Toast
    showToast?.(`Details: ${vermietung.kunde_name || 'Unbekannt'} - ${vermietung.anzahl_raeder || 1} Räder`, 'info')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Daten...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          {/* ✅ Timeline Tab (NEU) */}
          <button
            onClick={() => handleTabChange('timeline')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
              activeTab === 'timeline'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <CalendarDays size={20} />
            <span>Timeline</span>
            <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
              Neu
            </span>
          </button>

          {/* Liste Tab */}
          <button
            onClick={() => handleTabChange('liste')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
              activeTab === 'liste'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <List size={20} />
            <span>Liste</span>
            <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
              {leihraeder.length}
            </span>
          </button>
          
          {/* Jahreskalender Tab */}
          <button
            onClick={() => handleTabChange('kalender')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
              activeTab === 'kalender'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Calendar size={20} />
            <span>Jahreskalender</span>
          </button>

          {/* Refresh Button rechts */}
          <div className="ml-auto flex items-center px-4">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <RefreshCw size={16} />
              Aktualisieren
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {/* ✅ Timeline View (NEU) */}
      {activeTab === 'timeline' && (
        <LeihraederTimeline
          onNewBuchung={handleNewBuchung}
          onEditBuchung={handleEditBuchung}
          onDetailsClick={handleDetailsClick}
        />
      )}

      {/* Liste View (unverändert) */}
      {activeTab === 'liste' && (
        <LeihraederListe 
          showToast={showToast}
          onReload={loadData}
        />
      )}

      {/* Jahreskalender View (unverändert) */}
      {activeTab === 'kalender' && (
        <LeihraederKalender
          leihraeder={leihraeder}
          vermietungen={vermietungen}
          onVermietungClick={handleVermietungClick}
          onDateClick={handleDateClick}
        />
      )}

      {/* Vermietung Modal V2 */}
      {showVermietungModal && (
        <VermietungModal
          leihrad={selectedLeihrad}
          vonDatum={selectedDate}
          vermietung={editVermietung} // ✅ Für Edit-Mode
          onClose={() => {
            setShowVermietungModal(false)
            setSelectedLeihrad(null)
            setSelectedDate(null)
            setEditVermietung(null)
          }}
          onSave={() => {
            setShowVermietungModal(false)
            setSelectedLeihrad(null)
            setSelectedDate(null)
            setEditVermietung(null)
            loadData()
            showToast?.('Vermietung gespeichert', 'success')
          }}
        />
      )}
    </div>
  )
}
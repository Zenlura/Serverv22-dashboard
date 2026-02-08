import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ArtikelListe from './components/ArtikelListe'
import BestellungenListe from './components/BestellungenListe'
import BestellungErstellenModal from './components/BestellungErstellenModal'
import BestellungBearbeitenModal from './components/BestellungBearbeitenModal'
import { WareneingangModal } from './components/BestellungModals'
import ReparaturenListe from './components/ReparaturenListe'
import Leihraeder from './components/Leihraeder'
import VermietungenListe from './components/VermietungenListe'
import KundenListe from './components/KundenListe'
import LagerorteVerwaltung from './components/LagerorteVerwaltung'
import ConnectScreen from './components/ConnectScreen'

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [toastMessage, setToastMessage] = useState(null)
  const [showBestellungModal, setShowBestellungModal] = useState(false)
  const [bestellungRefreshKey, setBestellungRefreshKey] = useState(0)
  const [wareneingangBestellung, setWareneingangBestellung] = useState(null)
  const [editBestellung, setEditBestellung] = useState(null)

  // Navigation aus URL lesen beim Start
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')
    if (view && ['dashboard', 'kunden', 'artikel', 'lagerorte', 'bestellungen', 'reparaturen', 'leihraeder', 'vermietungen', 'connect'].includes(view)) {
      setActiveView(view)
    }
  }, [])

  // Navigation ändern und in URL speichern
  const handleNavigate = (view) => {
    setActiveView(view)
    const url = new URL(window.location)
    url.searchParams.set('view', view)
    // Tabs zurücksetzen wenn man die Hauptansicht wechselt
    url.searchParams.delete('tab')
    window.history.pushState({}, '', url)
  }

  // Toast System
  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Bestellungen Modal Handlers
  const handleNewBestellung = () => {
    setShowBestellungModal(true)
  }

  const handleEditBestellung = async (bestellung) => {
    // Validierung: Nur offene Bestellungen bearbeitbar
    if (bestellung.status !== 'offen') {
      showToast('Nur offene Bestellungen können bearbeitet werden!', 'warning')
      return
    }
    
    // Bestellung mit Positionen laden
    try {
      const response = await fetch(`/api/bestellungen/${bestellung.id}`)
      if (!response.ok) throw new Error('Fehler beim Laden der Bestellung')
      
      const data = await response.json()
      setEditBestellung(data)
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error')
      console.error('Fehler beim Laden:', err)
    }
  }

  const handleEditSuccess = (updated) => {
    setEditBestellung(null)
    setBestellungRefreshKey(prev => prev + 1)
    showToast(`Bestellung ${updated.bestellnummer} aktualisiert!`, 'success')
  }

  const handleWareneingangClick = async (bestellung) => {
    // Bestellung mit Positionen laden
    try {
      const response = await fetch(`/api/bestellungen/${bestellung.id}`)
      if (!response.ok) throw new Error('Fehler beim Laden der Bestellung')
      
      const data = await response.json()
      setWareneingangBestellung(data)
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error')
      console.error('Fehler beim Laden:', err)
    }
  }

  const handleWareneingangSave = () => {
    setWareneingangBestellung(null)
    setBestellungRefreshKey(prev => prev + 1)
    showToast('Wareneingang erfasst!', 'success')
  }

  const handleBestellungSuccess = (bestellung) => {
    showToast(`Bestellung ${bestellung.bestellnummer} erstellt!`, 'success')
    setBestellungRefreshKey(prev => prev + 1)
  }

  const handleStatusChange = async (bestellungId, newStatus, bestellnummer) => {
    try {
      const response = await fetch(`/api/bestellungen/${bestellungId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Fehler beim Status-Update')
      }

      const statusLabels = {
        'bestellt': 'Als bestellt markiert',
        'abgeschlossen': 'Abgeschlossen'
      }

      showToast(`${bestellnummer}: ${statusLabels[newStatus] || 'Status aktualisiert'}`, 'success')
      setBestellungRefreshKey(prev => prev + 1)
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error')
      console.error('Status-Update Fehler:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🚴 Radstation Warenwirtschaft</h1>
          <p className="text-blue-100 mt-1">Komplette Verwaltung - Artikel, Bestellungen, Reparaturen & Leihräder</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="container mx-auto px-4">
          <div className="flex gap-1 border-b border-blue-500 overflow-x-auto">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'dashboard'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => handleNavigate('kunden')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'kunden'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              👥 Kunden
            </button>
            <button
              onClick={() => handleNavigate('artikel')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'artikel'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              📦 Artikel
            </button>
            <button
              onClick={() => handleNavigate('lagerorte')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'lagerorte'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              🗃️ Lagerorte
            </button>
            <button
              onClick={() => handleNavigate('bestellungen')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'bestellungen'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              🛒 Bestellungen
            </button>
            <button
              onClick={() => handleNavigate('reparaturen')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'reparaturen'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              🔧 Reparaturen
            </button>
            <button
              onClick={() => handleNavigate('leihraeder')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'leihraeder'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              🚲 Leihräder
            </button>
            <button
              onClick={() => handleNavigate('vermietungen')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'vermietungen'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              📋 Vermietungen
            </button>
            <button
              onClick={() => handleNavigate('connect')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'connect'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              📱 Connect
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={activeView === 'connect' ? '' : 'container mx-auto px-4 py-8'}>
        {activeView === 'dashboard' && <Dashboard onNavigate={handleNavigate} showToast={showToast} />}
        {activeView === 'kunden' && <KundenListe showToast={showToast} />}
        {activeView === 'artikel' && <ArtikelListe showToast={showToast} />}
        {activeView === 'lagerorte' && <LagerorteVerwaltung showToast={showToast} />}
        {activeView === 'bestellungen' && (
          <BestellungenListe 
            showToast={showToast} 
            onNewBestellung={handleNewBestellung}
            onEditBestellung={handleEditBestellung}
            onWareneingangClick={handleWareneingangClick}
            onStatusChange={handleStatusChange}
            refreshKey={bestellungRefreshKey}
          />
        )}
        {activeView === 'reparaturen' && <ReparaturenListe showToast={showToast} />}
        {activeView === 'leihraeder' && <Leihraeder showToast={showToast} />}
        {activeView === 'vermietungen' && <VermietungenListe showToast={showToast} />}
        {activeView === 'connect' && <ConnectScreen showToast={showToast} />}
      </main>

      {/* Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`px-6 py-3 rounded-lg shadow-lg text-white ${
            toastMessage.type === 'success' ? 'bg-green-600' :
            toastMessage.type === 'error' ? 'bg-red-600' :
            toastMessage.type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
          }`}>
            {toastMessage.message}
          </div>
        </div>
      )}

      {/* Bestellung Erstellen Modal */}
      {showBestellungModal && (
        <BestellungErstellenModal
          onClose={() => setShowBestellungModal(false)}
          onSuccess={handleBestellungSuccess}
        />
      )}

      {/* Bestellung Bearbeiten Modal */}
      {editBestellung && (
        <BestellungBearbeitenModal
          bestellung={editBestellung}
          onClose={() => setEditBestellung(null)}
          onSave={handleEditSuccess}
        />
      )}

      {/* Wareneingang Modal */}
      {wareneingangBestellung && (
        <WareneingangModal
          bestellung={wareneingangBestellung}
          onClose={() => setWareneingangBestellung(null)}
          onSave={handleWareneingangSave}
        />
      )}

      {/* Footer */}
      {activeView !== 'connect' && (
        <footer className="bg-gray-800 text-gray-400 mt-12">
          <div className="container mx-auto px-4 py-4 text-center text-sm">
            Radstation v2 - Vollständige Warenwirtschaft - Netzwerkfähig
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
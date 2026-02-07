import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ArtikelListe from './components/ArtikelListe'
import BestellungenListe from './components/BestellungenListe'
import ReparaturenListe from './components/ReparaturenListe'
import Leihraeder from './components/Leihraeder'
import VermietungenListe from './components/VermietungenListe'
import KundenListe from './components/KundenListe'
import ConnectScreen from './components/ConnectScreen'

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [toastMessage, setToastMessage] = useState(null)

  // Navigation aus URL lesen beim Start
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')
    if (view && ['dashboard', 'kunden', 'artikel', 'bestellungen', 'reparaturen', 'leihraeder', 'vermietungen', 'connect'].includes(view)) {
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
        {activeView === 'bestellungen' && <BestellungenListe showToast={showToast} />}
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

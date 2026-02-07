import { useState } from 'react'
import Dashboard from './components/Dashboard'
import ArtikelListe from './components/ArtikelListe'
import BestellungenListe from './components/BestellungenListe'
import ReparaturenListe from './components/ReparaturenListe'
import LeihraederListe from './components/LeihraederListe'
import VermietungenListe from './components/VermietungenListe'
import ConnectScreen from './components/ConnectScreen'

function App() {
  const [activeView, setActiveView] = useState('dashboard')

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
              onClick={() => setActiveView('dashboard')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'dashboard'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveView('artikel')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'artikel'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              📦 Artikel
            </button>
            <button
              onClick={() => setActiveView('bestellungen')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'bestellungen'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              🛒 Bestellungen
            </button>
            <button
              onClick={() => setActiveView('reparaturen')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'reparaturen'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              🔧 Reparaturen
            </button>
            <button
              onClick={() => setActiveView('leihraeder')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'leihraeder'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              🚲 Leihräder
            </button>
            <button
              onClick={() => setActiveView('vermietungen')}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeView === 'vermietungen'
                  ? 'bg-white text-blue-600 rounded-t-lg'
                  : 'text-white hover:bg-blue-500 rounded-t-lg'
              }`}
            >
              📋 Vermietungen
            </button>
            <button
              onClick={() => setActiveView('connect')}
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
        {activeView === 'dashboard' && <Dashboard onNavigate={setActiveView} />}
        {activeView === 'artikel' && <ArtikelListe />}
        {activeView === 'bestellungen' && <BestellungenListe />}
        {activeView === 'reparaturen' && <ReparaturenListe />}
        {activeView === 'leihraeder' && <LeihraederListe />}
        {activeView === 'vermietungen' && <VermietungenListe />}
        {activeView === 'connect' && <ConnectScreen />}
      </main>

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
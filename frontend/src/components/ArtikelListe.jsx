import { useState, useEffect } from 'react'
import ArtikelDetailsModal from './ArtikelDetailsModal'
import BestellungErstellenModal from './BestellungErstellenModal'
import Toast from './Toast'

function ArtikelListe() {
  const [artikel, setArtikel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArtikel, setSelectedArtikel] = useState(null)
  const [bestellArtikel, setBestellArtikel] = useState(null)
  const [toast, setToast] = useState(null)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [pageSize] = useState(25) // 25 Artikel pro Seite

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Artikel von API laden
  useEffect(() => {
    fetchArtikel()
  }, [currentPage, searchTerm]) // Reagiere auf Seiten- und Suchwechsel

  const fetchArtikel = async () => {
    try {
      setLoading(true)
      
      // Build URL mit Pagination und Suche
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        nur_aktive: 'false' // Alle Artikel anzeigen (auch inaktive)
      })
      
      if (searchTerm) {
        params.append('suche', searchTerm)
      }
      
      const response = await fetch(`/api/artikel?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // API gibt {items: [...], total: ..., pages: ...} zurück
      setArtikel(data.items || [])
      setTotalItems(data.total || 0)
      setTotalPages(data.pages || 1)
      setError(null)
    } catch (err) {
      setError('Fehler beim Laden der Artikel: ' + err.message)
      console.error('Fehler:', err)
    } finally {
      setLoading(false)
    }
  }

  // Suche Handler (mit Verzögerung)
  const handleSearchChange = (value) => {
    setSearchTerm(value)
    setCurrentPage(1) // Zurück zu Seite 1 bei neuer Suche
  }

  // Bestand berechnen (Lager + Werkstatt)
  const getBestand = (artikel) => {
    return (artikel.bestand_lager || 0) + (artikel.bestand_werkstatt || 0)
  }

  // Preis formatieren
  const formatPreis = (preis) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(preis || 0)
  }

  // Modal-Handler
  const handleArtikelClick = (artikel) => {
    setSelectedArtikel(artikel)
  }

  const handleModalClose = () => {
    setSelectedArtikel(null)
  }

  const handleArtikelSave = (updatedArtikel) => {
    // Artikel in der Liste aktualisieren
    setArtikel(prev => 
      prev.map(a => a.id === updatedArtikel.id ? updatedArtikel : a)
    )
    setSelectedArtikel(null)
    // Optionally: Liste neu laden
    // fetchArtikel()
  }

  const handleNachbestellen = (artikel) => {
    setBestellArtikel(artikel)
  }

  const handleBestellungSuccess = (bestellung) => {
    showToast(`Bestellung ${bestellung.bestellnummer} erfolgreich erstellt!`, 'success')
    setBestellArtikel(null)
    // Optional: Artikel neu laden um aktualisierte Daten zu haben
    // fetchArtikel()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="text-gray-500 mt-4">Lade Artikel...</p>
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
          onClick={fetchArtikel}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header mit Suchfeld */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Artikelübersicht</h2>
            <p className="text-gray-600 text-sm mt-1">
              {totalItems} Artikel insgesamt · Seite {currentPage} von {totalPages}
            </p>
          </div>
          
          {/* Suchfeld */}
          <div className="relative">
            <input
              type="text"
              placeholder="Suche nach Nummer oder Bezeichnung..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full md:w-80 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            {searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Artikel Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Artikel-Nr.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bezeichnung
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bestand
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EK
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hauptlieferant
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {artikel.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'Keine Artikel gefunden' : 'Keine Artikel vorhanden'}
                  </td>
                </tr>
              ) : (
                artikel.map((art) => {
                  // Typ-Badge-Konfiguration
                  const typConfig = {
                    material: { emoji: '🔩', text: 'Material', color: 'bg-blue-100 text-blue-800' },
                    dienstleistung: { emoji: '⚙️', text: 'Service', color: 'bg-purple-100 text-purple-800' },
                    werkzeug: { emoji: '🔧', text: 'Werkzeug', color: 'bg-gray-100 text-gray-800' },
                    sonstiges: { emoji: '📦', text: 'Sonstiges', color: 'bg-gray-100 text-gray-600' }
                  }
                  const typ = typConfig[art.typ] || typConfig.material
                  
                  return (
                    <tr 
                      key={art.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {art.artikelnummer}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{art.bezeichnung}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${typ.color}`}>
                          <span>{typ.emoji}</span>
                          <span>{typ.text}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          getBestand(art) > 10 
                            ? 'bg-green-100 text-green-800'
                            : getBestand(art) > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getBestand(art)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatPreis(art.einkaufspreis)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatPreis(art.verkaufspreis)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {art.lieferanten && art.lieferanten.length > 0 
                          ? art.lieferanten.find(l => l.bevorzugt)?.lieferant?.name || art.lieferanten[0]?.lieferant?.name || '-'
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-800 font-medium transition"
                            onClick={() => handleArtikelClick(art)}
                          >
                            📝
                          </button>
                          <button
                            className={`px-3 py-1 rounded-lg font-medium transition ${
                              getBestand(art) <= (art.mindestbestand || 0)
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            onClick={() => handleNachbestellen(art)}
                            title="Artikel nachbestellen"
                          >
                            📦 Nachbestellen
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Info */}
          <div className="text-sm text-gray-600">
            Zeige {artikel.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, totalItems)} von {totalItems} Artikeln
          </div>
          
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              ‹ Zurück
            </button>
            
            {/* Seiten-Nummern */}
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1
                // Zeige nur bestimmte Seiten (erste, letzte, aktuelle +/- 2)
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                } else if (
                  pageNum === currentPage - 3 ||
                  pageNum === currentPage + 3
                ) {
                  return <span key={pageNum} className="px-2 text-gray-400">...</span>
                }
                return null
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Weiter ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              »»
            </button>
          </div>
        </div>
      </div>

      {/* Statistik Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Gesamt Artikel</div>
          <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Auf dieser Seite</div>
          <div className="text-2xl font-bold text-blue-600">{artikel.length}</div>
        </div>
      </div>

      {/* Artikel-Details-Modal */}
      {selectedArtikel && (
        <ArtikelDetailsModal
          artikel={selectedArtikel}
          onClose={handleModalClose}
          onSave={handleArtikelSave}
        />
      )}

      {/* Bestellung-Erstellen-Modal */}
      {bestellArtikel && (
        <BestellungErstellenModal
          artikel={bestellArtikel}
          onClose={() => setBestellArtikel(null)}
          onSuccess={handleBestellungSuccess}
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

export default ArtikelListe
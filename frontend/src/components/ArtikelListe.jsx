import { useState, useEffect } from 'react'
import ArtikelDetailsModal from './ArtikelDetailsModal'
import BestellungErstellenModal from './BestellungErstellenModal'
import Toast from './Toast'

function ArtikelListe() {
  const [artikel, setArtikel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // WICHTIG: Input-Wert GETRENNT von API-Suche
  const [inputValue, setInputValue] = useState('') // Lokaler Input (behält Focus)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('') // Für API
  
  const [selectedArtikel, setSelectedArtikel] = useState(null)
  const [bestellArtikel, setBestellArtikel] = useState(null)
  const [toast, setToast] = useState(null)
  
  // Filter & Sortierung
  const [filterTyp, setFilterTyp] = useState('alle')
  const [kategorien, setKategorien] = useState([])
  const [filterKategorie, setFilterKategorie] = useState('alle')
  const [sortField, setSortField] = useState('artikelnummer') // artikelnummer, bezeichnung, preis, typ
  const [sortOrder, setSortOrder] = useState('asc') // asc, desc
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [pageSize] = useState(25)

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // NEU: Debounce Effect - wartet 1 Sekunde nach letztem Tastendruck
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(inputValue)
      setCurrentPage(1) // Zurück zu Seite 1 bei neuer Suche
    }, 1000) // 1 Sekunde Verzögerung (für Meister die langsam tippen)

    return () => clearTimeout(timer)
  }, [inputValue])

  // Kategorien laden (einmalig)
  useEffect(() => {
    fetchKategorien()
  }, [])

  // Artikel laden wenn sich Filter/Suche/Pagination ändert
  useEffect(() => {
    fetchArtikel()
  }, [currentPage, debouncedSearchTerm, filterTyp, filterKategorie, sortField, sortOrder])

  const fetchKategorien = async () => {
    try {
      const response = await fetch('/api/kategorien?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setKategorien(data)
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err)
    }
  }

  const fetchArtikel = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        nur_aktive: 'false'
      })
      
      // Suche
      if (debouncedSearchTerm) {
        params.append('suche', debouncedSearchTerm)
      }
      
      // Filter nach Kategorie
      if (filterKategorie !== 'alle') {
        params.append('kategorie_id', filterKategorie)
      }
      
      const response = await fetch(`/api/artikel?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Client-seitige Sortierung und Typ-Filter (da Backend das nicht unterstützt)
      let filtered = data.items || []
      
      // Filter nach Typ
      if (filterTyp !== 'alle') {
        filtered = filtered.filter(art => art.typ === filterTyp)
      }
      
      // Sortierung
      filtered.sort((a, b) => {
        let aVal, bVal
        
        switch (sortField) {
          case 'artikelnummer':
            aVal = a.artikelnummer || ''
            bVal = b.artikelnummer || ''
            break
          case 'bezeichnung':
            aVal = a.bezeichnung || ''
            bVal = b.bezeichnung || ''
            break
          case 'preis':
            aVal = parseFloat(a.verkaufspreis) || 0
            bVal = parseFloat(b.verkaufspreis) || 0
            break
          case 'typ':
            aVal = a.typ || ''
            bVal = b.typ || ''
            break
          case 'bestand':
            aVal = (a.bestand_lager || 0) + (a.bestand_werkstatt || 0)
            bVal = (b.bestand_lager || 0) + (b.bestand_werkstatt || 0)
            break
          default:
            aVal = a.artikelnummer || ''
            bVal = b.artikelnummer || ''
        }
        
        // String-Vergleich
        if (typeof aVal === 'string') {
          const comparison = aVal.localeCompare(bVal, 'de')
          return sortOrder === 'asc' ? comparison : -comparison
        }
        
        // Numerischer Vergleich
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      })
      
      setArtikel(filtered)
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

  // Sortierung umschalten
  const handleSort = (field) => {
    if (sortField === field) {
      // Gleicher Field → Order umschalten
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Neuer Field → Default ASC
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Bestand berechnen
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
    setArtikel(prev => 
      prev.map(a => a.id === updatedArtikel.id ? updatedArtikel : a)
    )
    setSelectedArtikel(null)
  }

  const handleNachbestellen = (artikel) => {
    setBestellArtikel(artikel)
  }

  const handleBestellungSuccess = (bestellung) => {
    showToast(`Bestellung ${bestellung.bestellnummer} erfolgreich erstellt!`, 'success')
    setBestellArtikel(null)
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Artikelübersicht</h2>
              <p className="text-gray-600 text-sm mt-1">
                {totalItems} Artikel insgesamt · Seite {currentPage} von {totalPages}
              </p>
            </div>
            
            {/* Suchfeld - WICHTIG: Nutzt inputValue, nicht debouncedSearchTerm */}
            <div className="relative">
              <input
                type="text"
                placeholder="Suche nach Nummer oder Bezeichnung..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full md:w-80 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              {inputValue && (
                <button
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
              {/* Lade-Indikator während Debounce */}
              {inputValue !== debouncedSearchTerm && (
                <div className="absolute right-10 top-2.5">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
          </div>

          {/* Filter & Sortierung */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Typ-Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Typ:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterTyp('alle')}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    filterTyp === 'alle'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilterTyp('material')}
                  className={`px-3 py-1 text-sm rounded-lg transition flex items-center gap-1 ${
                    filterTyp === 'material'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📦 Material
                </button>
                <button
                  onClick={() => setFilterTyp('dienstleistung')}
                  className={`px-3 py-1 text-sm rounded-lg transition flex items-center gap-1 ${
                    filterTyp === 'dienstleistung'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⚙️ Service
                </button>
                <button
                  onClick={() => setFilterTyp('werkzeug')}
                  className={`px-3 py-1 text-sm rounded-lg transition flex items-center gap-1 ${
                    filterTyp === 'werkzeug'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔧 Werkzeug
                </button>
              </div>
            </div>

            {/* Kategorie-Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Kategorie:</span>
              <select
                value={filterKategorie}
                onChange={(e) => setFilterKategorie(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="alle">Alle Kategorien</option>
                {kategorien
                  .filter(k => !k.parent_id) // Nur Hauptkategorien
                  .map(kat => (
                    <option key={kat.id} value={kat.id}>
                      {kat.name}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Sortierung */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">Sortieren:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="artikelnummer">Artikel-Nr.</option>
                <option value="bezeichnung">Bezeichnung</option>
                <option value="typ">Typ</option>
                <option value="bestand">Bestand</option>
                <option value="preis">Preis</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                title={sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Artikel Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('artikelnummer')}
                >
                  Artikel-Nr. {sortField === 'artikelnummer' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('bezeichnung')}
                >
                  Bezeichnung {sortField === 'bezeichnung' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('typ')}
                >
                  Typ {sortField === 'typ' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('bestand')}
                >
                  Bestand {sortField === 'bestand' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EK
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('preis')}
                >
                  VK {sortField === 'preis' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {debouncedSearchTerm ? (
                      <>Keine Artikel gefunden für "{debouncedSearchTerm}"</>
                    ) : (
                      <>Keine Artikel vorhanden</>
                    )}
                  </td>
                </tr>
              ) : (
                artikel.map((art) => {
                  const typConfig = {
                    material: { emoji: '📦', text: 'Material', color: 'bg-blue-100 text-blue-800' },
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
                        {art.kategorie && (
                          <div className="text-xs text-gray-500">{art.kategorie.name}</div>
                        )}
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
          <div className="text-sm text-gray-600">
            Zeige {artikel.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, totalItems)} von {totalItems} Artikeln
          </div>
          
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
            
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1
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

      {/* Modals */}
      {selectedArtikel && (
        <ArtikelDetailsModal
          artikel={selectedArtikel}
          onClose={handleModalClose}
          onSave={handleArtikelSave}
        />
      )}

      {bestellArtikel && (
        <BestellungErstellenModal
          artikel={bestellArtikel}
          onClose={() => setBestellArtikel(null)}
          onSuccess={handleBestellungSuccess}
        />
      )}

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
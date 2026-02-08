import { useState, useEffect, useRef } from 'react'
import { Search, X, UserPlus } from 'lucide-react'

export default function KundenAutocomplete({ 
  value,  // kunde_id
  onSelect,  // (kunde) => void
  onClear,  // () => void
  onNewCustomer,  // () => void (öffnet KundenModal)
  className = ""
}) {
  const [search, setSearch] = useState('')
  const [kunden, setKunden] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedKunde, setSelectedKunde] = useState(null)
  const dropdownRef = useRef(null)

  // Kunden laden wenn gesucht wird
  useEffect(() => {
    if (search.length < 2) {
      setKunden([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/kunden?search=${encodeURIComponent(search)}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setKunden(data.items || [])
          setShowDropdown(true)
        }
      } catch (err) {
        console.error('Fehler beim Laden der Kunden:', err)
      } finally {
        setLoading(false)
      }
    }, 300) // Debounce

    return () => clearTimeout(timer)
  }, [search])

  // Aktuellen Kunde laden wenn value gesetzt ist
  useEffect(() => {
    if (value && !selectedKunde) {
      fetch(`/api/kunden/${value}`)
        .then(r => r.json())
        .then(kunde => {
          setSelectedKunde(kunde)
          setSearch('') // Suchfeld leeren
        })
        .catch(err => console.error('Fehler beim Laden des Kunden:', err))
    }
  }, [value, selectedKunde])

  // Click outside schließt Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (kunde) => {
    setSelectedKunde(kunde)
    setSearch('')
    setShowDropdown(false)
    onSelect(kunde)
  }

  const handleClear = () => {
    setSelectedKunde(null)
    setSearch('')
    setKunden([])
    onClear()
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Wenn Kunde ausgewählt */}
      {selectedKunde ? (
        <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-green-50 border-green-200">
          <div className="flex-1">
            <div className="font-medium text-green-900">
              {selectedKunde.vorname} {selectedKunde.nachname}
            </div>
            <div className="text-sm text-green-600">
              {selectedKunde.kundennummer}
              {selectedKunde.telefon && ` • ${selectedKunde.telefon}`}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-green-100 rounded text-green-600"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        /* Suchfeld */
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search.length >= 2 && setShowDropdown(true)}
              placeholder="Kunde suchen (Name, Kundennummer)..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-3 text-gray-500 text-sm">Suche...</div>
              ) : kunden.length === 0 ? (
                <div className="px-4 py-3">
                  <div className="text-gray-500 text-sm mb-2">Kein Kunde gefunden</div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false)
                      onNewCustomer()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded text-green-700 text-sm font-medium"
                  >
                    <UserPlus size={16} />
                    <span>Neuen Kunde anlegen</span>
                  </button>
                </div>
              ) : (
                <>
                  {kunden.map(kunde => (
                    <button
                      key={kunde.id}
                      type="button"
                      onClick={() => handleSelect(kunde)}
                      className="w-full px-4 py-2 hover:bg-gray-50 text-left border-b last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {kunde.vorname} {kunde.nachname}
                      </div>
                      <div className="text-sm text-gray-600">
                        {kunde.kundennummer}
                        {kunde.telefon && ` • ${kunde.telefon}`}
                        {kunde.status !== 'normal' && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            {kunde.status}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  <div className="border-t p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false)
                        onNewCustomer()
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded text-green-700 text-sm font-medium"
                    >
                      <UserPlus size={16} />
                      <span>Neuen Kunde anlegen</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import TopArtikelList from './TopArtikelList'
import LowStockAlert from './LowStockAlert'

const API_BASE_URL = 'http://localhost:8000'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [topArtikel, setTopArtikel] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [tasks, setTasks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Expandable Sections State
  const [expandedSections, setExpandedSections] = useState({
    nichtBegonnen: false,
    ueberfaellig: false,
    heuteReps: false,
    heuteRaeder: false,
    fertig: false,
    reservierungen: false,
    vermietungenUeberfaellig: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, topArtikelRes, lowStockRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/stats`),
        fetch(`${API_BASE_URL}/api/dashboard/top-artikel?limit=5`),
        fetch(`${API_BASE_URL}/api/dashboard/low-stock`),
        fetch(`${API_BASE_URL}/api/dashboard/offene-aufgaben`)
      ])

      if (!statsRes.ok) throw new Error('Fehler beim Laden der Statistiken')
      if (!topArtikelRes.ok) throw new Error('Fehler beim Laden der Top-Artikel')
      if (!lowStockRes.ok) throw new Error('Fehler beim Laden der Bestandswarnungen')
      if (!tasksRes.ok) throw new Error('Fehler beim Laden der Aufgaben')

      const statsData = await statsRes.json()
      const topArtikelData = await topArtikelRes.json()
      const lowStockData = await lowStockRes.json()
      const tasksData = await tasksRes.json()

      setStats(statsData)
      setTopArtikel(topArtikelData)
      setLowStock(lowStockData)
      setTasks(tasksData)
    } catch (err) {
      setError(err.message)
      console.error('Dashboard Fehler:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard wird geladen...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-red-800">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold">Fehler beim Laden des Dashboards</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Berechne Zahlen für kompakte Anzeige
  const anzahlDringend = 
    (tasks?.reparaturen_nicht_begonnen?.length || 0) +
    (tasks?.reparaturen_ueberfaellig?.length || 0) +
    (tasks?.vermietungen_ueberfaellig?.length || 0)
  
  const anzahlHeute = 
    (tasks?.reparaturen_heute_faellig?.length || 0) +
    (tasks?.vermietungen_heute_zurueck?.length || 0)

  const anzahlFertig = tasks?.reparaturen_fertig?.length || 0
  const anzahlReservierungen = tasks?.reservierungen?.length || 0

  return (
    <div className="space-y-4">
      {/* Kompakter Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📊 Dashboard</h1>
          <p className="text-gray-600 text-xs">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          Refresh
        </button>
      </div>

      {/* ⚡ JETZT HANDELN - Kompakt mit Expand */}
      <div className="bg-white rounded-lg shadow-md border-2 border-gray-200">
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="font-bold text-gray-800">Jetzt handeln</h2>
            </div>
            {(anzahlDringend > 0 || anzahlHeute > 0) && (
              <div className="flex gap-2">
                {anzahlDringend > 0 && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {anzahlDringend} 🔴
                  </span>
                )}
                {anzahlHeute > 0 && (
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {anzahlHeute} 🟡
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {/* NICHT BEGONNEN */}
          {(tasks?.reparaturen_nicht_begonnen?.length || 0) > 0 && (
            <div>
              <button
                onClick={() => toggleSection('nichtBegonnen')}
                className="w-full px-4 py-2.5 hover:bg-red-50 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚠️</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-red-700">
                      Nicht begonnen
                    </div>
                    <div className="text-xs text-gray-600">
                      {tasks.reparaturen_nicht_begonnen.length} Reparatur{tasks.reparaturen_nicht_begonnen.length !== 1 ? 'en' : ''} warten
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-sm font-bold">
                    {tasks.reparaturen_nicht_begonnen.length}
                  </span>
                  <span className={`text-gray-400 transform transition-transform ${expandedSections.nichtBegonnen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>
              {expandedSections.nichtBegonnen && (
                <div className="px-4 pb-3 bg-red-50 space-y-2">
                  {tasks.reparaturen_nicht_begonnen.slice(0, 10).map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white p-2.5 rounded border border-red-200 hover:border-red-400 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {rep.auftragsnummer}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {rep.fahrradmarke} {rep.fahrradmodell && `- ${rep.fahrradmodell}`}
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <div className="text-xs font-bold text-red-700">
                            {rep.tage_seit_annahme}d
                          </div>
                          <div className="text-xs text-red-600">
                            wartet
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-red-200">
                    💡 Klick auf Reparatur-Eintrag oben in der Navigation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ÜBERFÄLLIGE REPARATUREN */}
          {(tasks?.reparaturen_ueberfaellig?.length || 0) > 0 && (
            <div>
              <button
                onClick={() => toggleSection('ueberfaellig')}
                className="w-full px-4 py-2.5 hover:bg-red-50 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔴</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-red-600">
                      Überfällige Reparaturen
                    </div>
                    <div className="text-xs text-gray-600">
                      Fertigstellungs-Termin verpasst
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-sm font-bold">
                    {tasks.reparaturen_ueberfaellig.length}
                  </span>
                  <span className={`text-gray-400 transform transition-transform ${expandedSections.ueberfaellig ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>
              {expandedSections.ueberfaellig && (
                <div className="px-4 pb-3 bg-red-50 space-y-2">
                  {tasks.reparaturen_ueberfaellig.slice(0, 10).map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white p-2.5 rounded border border-red-200 hover:border-red-400 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {rep.auftragsnummer}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {rep.fahrradmarke} · {rep.status === 'wartet_auf_teile' ? '⏸️ Wartet auf Teile' : '🔧 In Arbeit'}
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <div className="text-xs font-bold text-red-600">
                            +{rep.tage_ueberfaellig}d
                          </div>
                          <div className="text-xs text-red-600">
                            über
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-red-200">
                    💡 Klick auf Reparatur-Eintrag oben in der Navigation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEIHRÄDER ÜBERFÄLLIG */}
          {(tasks?.vermietungen_ueberfaellig?.length || 0) > 0 && (
            <div>
              <button
                onClick={() => toggleSection('vermietungenUeberfaellig')}
                className="w-full px-4 py-2.5 hover:bg-orange-50 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🚲</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-orange-700">
                      Leihräder überfällig
                    </div>
                    <div className="text-xs text-gray-600">
                      Rückgabe-Termin verpasst
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-sm font-bold">
                    {tasks.vermietungen_ueberfaellig.length}
                  </span>
                  <span className={`text-gray-400 transform transition-transform ${expandedSections.vermietungenUeberfaellig ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>
              {expandedSections.vermietungenUeberfaellig && (
                <div className="px-4 pb-3 bg-orange-50 space-y-2">
                  {tasks.vermietungen_ueberfaellig.slice(0, 10).map((verm) => (
                    <div
                      key={verm.id}
                      className="bg-white p-2.5 rounded border border-orange-200 hover:border-orange-400 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {verm.inventarnummer || `Leihrad #${verm.leihrad_id}`}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            Rückgabe: {new Date(verm.bis_datum).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <div className="text-xs font-bold text-orange-700">
                            +{verm.tage_ueberfaellig}d
                          </div>
                          <div className="text-xs text-orange-600">
                            über
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-orange-200">
                    💡 Klick auf Leihräder-Eintrag oben in der Navigation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HEUTE FÄLLIG - REPARATUREN */}
          {(tasks?.reparaturen_heute_faellig?.length || 0) > 0 && (
            <div>
              <button
                onClick={() => toggleSection('heuteReps')}
                className="w-full px-4 py-2.5 hover:bg-yellow-50 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🟡</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-yellow-700">
                      Heute fällig
                    </div>
                    <div className="text-xs text-gray-600">
                      Reparaturen heute fertig machen
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-sm font-bold">
                    {tasks.reparaturen_heute_faellig.length}
                  </span>
                  <span className={`text-gray-400 transform transition-transform ${expandedSections.heuteReps ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>
              {expandedSections.heuteReps && (
                <div className="px-4 pb-3 bg-yellow-50 space-y-2">
                  {tasks.reparaturen_heute_faellig.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white p-2.5 rounded border border-yellow-200 hover:border-yellow-400 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {rep.auftragsnummer}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {rep.fahrradmarke}
                          </div>
                        </div>
                        <div className="text-xs text-yellow-700 font-medium ml-2 flex-shrink-0">
                          Heute
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-yellow-200">
                    💡 Klick auf Reparatur-Eintrag oben in der Navigation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HEUTE ZURÜCK - LEIHRÄDER */}
          {(tasks?.vermietungen_heute_zurueck?.length || 0) > 0 && (
            <div>
              <button
                onClick={() => toggleSection('heuteRaeder')}
                className="w-full px-4 py-2.5 hover:bg-blue-50 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🚲</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-blue-700">
                      Heute zurück erwartet
                    </div>
                    <div className="text-xs text-gray-600">
                      Leihräder kommen zurück
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-sm font-bold">
                    {tasks.vermietungen_heute_zurueck.length}
                  </span>
                  <span className={`text-gray-400 transform transition-transform ${expandedSections.heuteRaeder ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>
              {expandedSections.heuteRaeder && (
                <div className="px-4 pb-3 bg-blue-50 space-y-2">
                  {tasks.vermietungen_heute_zurueck.map((verm) => (
                    <div
                      key={verm.id}
                      className="bg-white p-2.5 rounded border border-blue-200 hover:border-blue-400 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {verm.inventarnummer || `Leihrad #${verm.leihrad_id}`}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            Rückgabe heute
                          </div>
                        </div>
                        <div className="text-xs text-blue-700 font-medium ml-2 flex-shrink-0">
                          Heute
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">
                    💡 Klick auf Leihräder-Eintrag oben in der Navigation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FERTIG ZUR ABHOLUNG */}
          {anzahlFertig > 0 && (
            <div>
              <button
                onClick={() => toggleSection('fertig')}
                className="w-full px-4 py-2.5 hover:bg-green-50 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">✅</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-green-700">
                      Zur Abholung bereit
                    </div>
                    <div className="text-xs text-gray-600">
                      Fertige Reparaturen
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-sm font-bold">
                    {anzahlFertig}
                  </span>
                  <span className={`text-gray-400 transform transition-transform ${expandedSections.fertig ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>
              {expandedSections.fertig && (
                <div className="px-4 pb-3 bg-green-50 space-y-2">
                  {tasks.reparaturen_fertig.slice(0, 10).map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white p-2.5 rounded border border-green-200 hover:border-green-400 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {rep.auftragsnummer}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {rep.fahrradmarke}
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          {rep.tage_seit_fertig > 2 && (
                            <div className="text-xs font-medium text-orange-600">
                              {rep.tage_seit_fertig}d
                            </div>
                          )}
                          <div className="text-xs text-green-600">
                            Fertig
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-green-200">
                    💡 Klick auf Reparatur-Eintrag oben in der Navigation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESERVIERUNGEN */}
          {anzahlReservierungen > 0 && (
            <div>
              <button
                onClick={() => toggleSection('reservierungen')}
                className="w-full px-4 py-2.5 hover:bg-purple-50 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📦</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-purple-700">
                      Reservierungen
                    </div>
                    <div className="text-xs text-gray-600">
                      Noch nicht abgeholt
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-sm font-bold">
                    {anzahlReservierungen}
                  </span>
                  <span className={`text-gray-400 transform transition-transform ${expandedSections.reservierungen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>
              {expandedSections.reservierungen && (
                <div className="px-4 pb-3 bg-purple-50 space-y-2">
                  {tasks.reservierungen.slice(0, 10).map((res) => (
                    <div
                      key={res.id}
                      className={`bg-white p-2.5 rounded border cursor-pointer transition ${
                        res.abholung_heute 
                          ? 'border-purple-400 hover:border-purple-600' 
                          : 'border-purple-200 hover:border-purple-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {res.inventarnummer || `Leihrad #${res.leihrad_id}`}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            Ab: {new Date(res.von_datum).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          {res.abholung_heute ? (
                            <div className="text-xs font-bold text-purple-700">
                              Heute!
                            </div>
                          ) : (
                            <div className="text-xs text-purple-600">
                              {new Date(res.von_datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-purple-200">
                    💡 Klick auf Leihräder-Eintrag oben in der Navigation
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ALLES ERLEDIGT */}
          {anzahlDringend === 0 && anzahlHeute === 0 && anzahlFertig === 0 && anzahlReservierungen === 0 && (
            <div className="px-4 py-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-gray-700 font-medium">Alles erledigt!</div>
              <div className="text-sm text-gray-500 mt-1">Keine offenen Aufgaben</div>
            </div>
          )}
        </div>
      </div>

      {/* Kompakte Statistik-Kacheln */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Umsatz */}
        <div className="bg-white rounded-lg shadow p-3 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💰</span>
            <div className="text-xs text-gray-600 font-medium">Umsatz</div>
          </div>
          <div className="text-lg font-bold text-green-700">
            {stats?.umsatz?.heute?.toFixed(0) || '0'}€
          </div>
          <div className="text-xs text-gray-500">
            Woche: {stats?.umsatz?.woche?.toFixed(0) || '0'}€
          </div>
        </div>

        {/* Reparaturen Offen */}
        <div className="bg-white rounded-lg shadow p-3 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔧</span>
            <div className="text-xs text-gray-600 font-medium">Reparaturen</div>
          </div>
          <div className="text-lg font-bold text-blue-700">
            {stats?.reparaturen?.offen || 0}
          </div>
          <div className="text-xs text-gray-500">
            {stats?.reparaturen?.fertig || 0} fertig
          </div>
        </div>

        {/* Leihräder */}
        <div className="bg-white rounded-lg shadow p-3 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚲</span>
            <div className="text-xs text-gray-600 font-medium">Leihräder</div>
          </div>
          <div className="text-lg font-bold text-purple-700">
            {stats?.leihraeder?.verfuegbar || 0}/{stats?.leihraeder?.gesamt || 0}
          </div>
          <div className="text-xs text-gray-500">
            {stats?.leihraeder?.verliehen || 0} verliehen
          </div>
        </div>

        {/* Lager */}
        <div className={`rounded-lg shadow p-3 hover:shadow-md transition ${
          (stats?.lager?.artikel_ausverkauft || 0) > 0 ? 'bg-red-50' : 'bg-white'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📦</span>
            <div className="text-xs text-gray-600 font-medium">Lager</div>
          </div>
          <div className={`text-lg font-bold ${
            (stats?.lager?.artikel_ausverkauft || 0) > 0 ? 'text-red-700' : 'text-gray-700'
          }`}>
            {stats?.lager?.artikel_ausverkauft || 0}
          </div>
          <div className="text-xs text-gray-500">
            {(stats?.lager?.artikel_ausverkauft || 0) > 0 ? 'ausverkauft' : 'Bestand OK'}
          </div>
        </div>

        {/* Bestellungen */}
        <div className="bg-white rounded-lg shadow p-3 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🛒</span>
            <div className="text-xs text-gray-600 font-medium">Bestellungen</div>
          </div>
          <div className="text-lg font-bold text-orange-700">
            {stats?.bestellungen?.offen || 0}
          </div>
          <div className="text-xs text-gray-500">
            {stats?.bestellungen?.unterwegs || 0} unterwegs
          </div>
        </div>
      </div>

      {/* Leihrad Status - Kompakt */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🚲</span>
          <h3 className="text-sm font-semibold text-gray-800">Leihräder Status</h3>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-green-50 rounded p-2">
            <div className="text-xl font-bold text-green-700">{stats?.leihraeder?.verfuegbar || 0}</div>
            <div className="text-green-600">Frei</div>
          </div>
          <div className="bg-blue-50 rounded p-2">
            <div className="text-xl font-bold text-blue-700">{stats?.leihraeder?.verliehen || 0}</div>
            <div className="text-blue-600">Verliehen</div>
          </div>
          <div className="bg-purple-50 rounded p-2">
            <div className="text-xl font-bold text-purple-700">{stats?.leihraeder?.reservierungen_offen || 0}</div>
            <div className="text-purple-600">Reserviert</div>
          </div>
          <div className="bg-yellow-50 rounded p-2">
            <div className="text-xl font-bold text-yellow-700">{stats?.leihraeder?.wartung || 0}</div>
            <div className="text-yellow-600">Wartung</div>
          </div>
          <div className="bg-red-50 rounded p-2">
            <div className="text-xl font-bold text-red-700">{stats?.leihraeder?.defekt || 0}</div>
            <div className="text-red-600">Defekt</div>
          </div>
        </div>
      </div>

      {/* 2-Spalten Layout: Top Artikel + Lager */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopArtikelList artikel={topArtikel} />
        <LowStockAlert items={lowStock} />
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pb-2">
        <p>Auto-Refresh alle 30 Sekunden · Letztes Update: {new Date().toLocaleTimeString('de-DE')}</p>
      </div>
    </div>
  )
}

export default Dashboard
import { useState, useEffect } from 'react'

const API_BASE_URL = 'http://localhost:8000'

function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/stats`),
        fetch(`${API_BASE_URL}/api/dashboard/offene-aufgaben`)
      ])

      if (!statsRes.ok) throw new Error('Fehler beim Laden der Statistiken')
      if (!tasksRes.ok) throw new Error('Fehler beim Laden der Aufgaben')

      const statsData = await statsRes.json()
      const tasksData = await tasksRes.json()

      setStats(statsData)
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
    const interval = setInterval(fetchData, 60000) // 1 Minute
    return () => clearInterval(interval)
  }, [])

  // Dringlichkeiten berechnen
  const anzahlDringend = 
    (tasks?.reparaturen_nicht_begonnen?.length || 0) +
    (tasks?.reparaturen_ueberfaellig?.length || 0) +
    (tasks?.vermietungen_ueberfaellig?.length || 0)
  
  const anzahlHeute = 
    (tasks?.reparaturen_heute_faellig?.length || 0) +
    (tasks?.vermietungen_heute_zurueck?.length || 0)

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

  return (
    <div className="space-y-4">
      {/* Kompakter Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏠 Radstation Portal</h1>
          <p className="text-gray-600 text-sm">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          Aktualisieren
        </button>
      </div>

      {/* ALERT-BEREICH - Nur wirklich Dringendes */}
      {(anzahlDringend > 0 || anzahlHeute > 0) && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 text-lg">Dringend!</h3>
              <div className="flex gap-4 mt-1 text-sm">
                {anzahlDringend > 0 && (
                  <span className="text-red-700">
                    🔴 {anzahlDringend} Überfällig
                  </span>
                )}
                {anzahlHeute > 0 && (
                  <span className="text-orange-700">
                    🟡 {anzahlHeute} Heute fällig
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('reparaturen')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Ansehen →
            </button>
          </div>
        </div>
      )}

      {/* MODUL-KACHELN - 3er Grid, kompakt */}
      <div className="grid grid-cols-3 gap-4">
        {/* Artikel */}
        <button
          onClick={() => onNavigate?.('artikel')}
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📦</span>
            {stats?.lager?.artikel_ausverkauft > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                {stats.lager.artikel_ausverkauft}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600">
            Artikel
          </h3>
          <p className="text-sm text-gray-600">
            Lager & Bestand verwalten
          </p>
        </button>

        {/* Bestellungen */}
        <button
          onClick={() => onNavigate?.('bestellungen')}
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">🛒</span>
            {stats?.bestellungen?.offen > 0 && (
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                {stats.bestellungen.offen}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600">
            Bestellungen
          </h3>
          <p className="text-sm text-gray-600">
            Nachbestellungen verwalten
          </p>
        </button>

        {/* Reparaturen */}
        <button
          onClick={() => onNavigate?.('reparaturen')}
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">🔧</span>
            {stats?.reparaturen?.offen > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                {stats.reparaturen.offen}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600">
            Reparaturen
          </h3>
          <p className="text-sm text-gray-600">
            Aufträge & Werkstatt
          </p>
        </button>

        {/* Leihräder */}
        <button
          onClick={() => onNavigate?.('leihraeder')}
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">🚲</span>
            <span className="text-sm text-gray-600">
              {stats?.leihraeder?.verfuegbar || 0}/{stats?.leihraeder?.gesamt || 0}
            </span>
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600">
            Leihräder
          </h3>
          <p className="text-sm text-gray-600">
            Flotte verwalten
          </p>
        </button>

        {/* Vermietungen */}
        <button
          onClick={() => onNavigate?.('vermietungen')}
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📋</span>
            {stats?.leihraeder?.verliehen > 0 && (
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">
                {stats.leihraeder.verliehen}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600">
            Vermietungen
          </h3>
          <p className="text-sm text-gray-600">
            Buchungen & Kalender
          </p>
        </button>

        {/* Connect */}
        <button
          onClick={() => onNavigate?.('connect')}
          className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📱</span>
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600">
            Connect
          </h3>
          <p className="text-sm text-gray-600">
            Netzwerk & QR-Code
          </p>
        </button>
      </div>

      {/* SCHNELL-ÜBERSICHT - Kompakte Stats */}
      <div className="grid grid-cols-5 gap-3">
        {/* Umsatz */}
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💰</span>
            <div className="text-xs text-gray-600 font-medium">Umsatz heute</div>
          </div>
          <div className="text-lg font-bold text-green-700">
            {stats?.umsatz?.heute?.toFixed(0) || '0'}€
          </div>
          <div className="text-xs text-gray-500">
            Woche: {stats?.umsatz?.woche?.toFixed(0) || '0'}€
          </div>
        </div>

        {/* Reparaturen */}
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔧</span>
            <div className="text-xs text-gray-600 font-medium">Reparaturen</div>
          </div>
          <div className="text-lg font-bold text-blue-700">
            {stats?.reparaturen?.offen || 0} offen
          </div>
          <div className="text-xs text-gray-500">
            {stats?.reparaturen?.fertig || 0} fertig
          </div>
        </div>

        {/* Leihräder */}
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚲</span>
            <div className="text-xs text-gray-600 font-medium">Leihräder</div>
          </div>
          <div className="text-lg font-bold text-purple-700">
            {stats?.leihraeder?.verfuegbar || 0} frei
          </div>
          <div className="text-xs text-gray-500">
            von {stats?.leihraeder?.gesamt || 0} gesamt
          </div>
        </div>

        {/* Lager */}
        <div className={`rounded-lg shadow p-3 ${
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
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🛒</span>
            <div className="text-xs text-gray-600 font-medium">Bestellungen</div>
          </div>
          <div className="text-lg font-bold text-orange-700">
            {stats?.bestellungen?.offen || 0} offen
          </div>
          <div className="text-xs text-gray-500">
            {stats?.bestellungen?.unterwegs || 0} unterwegs
          </div>
        </div>
      </div>

      {/* HEUTE FÄLLIG - Kompakte Liste */}
      {anzahlHeute > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
            <span>🟡</span>
            Heute fällig ({anzahlHeute})
          </h3>
          <div className="space-y-1 text-sm">
            {tasks?.reparaturen_heute_faellig?.slice(0, 3).map(rep => (
              <div key={rep.id} className="text-yellow-700">
                🔧 {rep.auftragsnummer} - {rep.fahrradmarke}
              </div>
            ))}
            {tasks?.vermietungen_heute_zurueck?.slice(0, 3).map(verm => (
              <div key={verm.id} className="text-yellow-700">
                🚲 Rückgabe - {verm.kunde_name}
              </div>
            ))}
            {anzahlHeute > 6 && (
              <div className="text-yellow-600 italic">
                ... und {anzahlHeute - 6} weitere
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500">
        <p>Auto-Refresh alle 60 Sekunden · Letztes Update: {new Date().toLocaleTimeString('de-DE')}</p>
      </div>
    </div>
  )
}

export default Dashboard
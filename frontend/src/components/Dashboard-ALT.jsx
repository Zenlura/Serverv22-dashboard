import { useState, useEffect } from 'react'
import StatCard from './StatCard'
import TopArtikelList from './TopArtikelList'
import LowStockAlert from './LowStockAlert'
import OpenTasksList from './OpenTasksList'

const API_BASE_URL = 'http://localhost:8000'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [topArtikel, setTopArtikel] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [tasks, setTasks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Parallel alle Daten laden
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
    // Auto-Refresh alle 30 Sekunden
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

  // Berechne Dringlichkeits-Level
  const dringendCount = (
    (stats?.reparaturen?.nicht_begonnen || 0) +
    (stats?.reparaturen?.ueberfaellig || 0) +
    (stats?.leihraeder?.vermietungen_ueberfaellig || 0)
  )

  const heuteCount = (
    (stats?.reparaturen?.heute_faellig || 0) +
    (stats?.leihraeder?.heute_zurueck || 0)
  )

  return (
    <div className="space-y-6">
      {/* Header mit Dringlichkeits-Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📊 Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">
            {new Date().toLocaleDateString('de-DE', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          Aktualisieren
        </button>
      </div>

      {/* DRINGEND Banner */}
      {dringendCount > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">⚠️</span>
              <div>
                <div className="font-bold text-lg">
                  {dringendCount} dringende Aufgabe{dringendCount !== 1 ? 'n' : ''}!
                </div>
                <div className="text-sm text-red-100">
                  {stats.reparaturen.nicht_begonnen > 0 && `${stats.reparaturen.nicht_begonnen} nicht begonnen · `}
                  {stats.reparaturen.ueberfaellig > 0 && `${stats.reparaturen.ueberfaellig} überfällig · `}
                  {stats.leihraeder.vermietungen_ueberfaellig > 0 && `${stats.leihraeder.vermietungen_ueberfaellig} Leihräder überfällig`}
                </div>
              </div>
            </div>
            <div className="text-4xl font-bold opacity-20">
              !
            </div>
          </div>
        </div>
      )}

      {/* HEUTE Banner */}
      {heuteCount > 0 && dringendCount === 0 && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🟡</span>
              <div>
                <div className="font-bold text-lg">
                  {heuteCount} Aufgabe{heuteCount !== 1 ? 'n' : ''} heute fällig
                </div>
                <div className="text-sm text-yellow-800">
                  {stats.reparaturen.heute_faellig > 0 && `${stats.reparaturen.heute_faellig} Reparaturen · `}
                  {stats.leihraeder.heute_zurueck > 0 && `${stats.leihraeder.heute_zurueck} Leihräder zurück erwartet`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALLES OK Banner */}
      {dringendCount === 0 && heuteCount === 0 && (
        <div className="bg-gradient-to-r from-green-400 to-green-500 text-green-900 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <div className="font-bold text-lg">
                  Alles im grünen Bereich!
                </div>
                <div className="text-sm text-green-800">
                  Keine dringenden Aufgaben · Gute Arbeit! 🎉
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistik-Kacheln */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Umsatz */}
        <StatCard
          title="Umsatz heute"
          value={`${stats?.umsatz?.heute?.toFixed(2) || '0.00'} €`}
          subtitle={`Woche: ${stats?.umsatz?.woche?.toFixed(2) || '0.00'} €`}
          icon="💰"
          color="green"
        />

        {/* Reparaturen */}
        <StatCard
          title="Reparaturen"
          value={stats?.reparaturen?.offen || 0}
          subtitle={
            stats?.reparaturen?.nicht_begonnen > 0 
              ? `${stats.reparaturen.nicht_begonnen} nicht begonnen!`
              : `${stats?.reparaturen?.fertig || 0} fertig`
          }
          icon="🔧"
          color="blue"
          alert={stats?.reparaturen?.nicht_begonnen > 0 || stats?.reparaturen?.ueberfaellig > 0}
          alertText={
            stats?.reparaturen?.nicht_begonnen > 0 
              ? `${stats.reparaturen.nicht_begonnen} warten!`
              : stats?.reparaturen?.ueberfaellig > 0 
                ? `${stats.reparaturen.ueberfaellig} überfällig`
                : null
          }
        />

        {/* Leihräder */}
        <StatCard
          title="Leihräder"
          value={`${stats?.leihraeder?.verfuegbar || 0} verfügbar`}
          subtitle={`${stats?.leihraeder?.verliehen || 0} verliehen · ${stats?.leihraeder?.heute_zurueck || 0} heute zurück`}
          icon="🚲"
          color="purple"
          alert={stats?.leihraeder?.vermietungen_ueberfaellig > 0}
          alertText={`${stats?.leihraeder?.vermietungen_ueberfaellig} überfällig`}
        />

        {/* Lager */}
        <StatCard
          title="Lager / Material"
          value={stats?.lager?.artikel_ausverkauft || 0}
          subtitle={
            stats?.lager?.artikel_niedrig > 0 
              ? `${stats.lager.artikel_niedrig} niedrig · ${stats.lager.artikel_bald_leer || 0} bald leer`
              : `Bestand OK ✓`
          }
          icon="📦"
          color="orange"
          alert={(stats?.lager?.artikel_ausverkauft || 0) > 0}
          alertText={`${stats?.lager?.artikel_ausverkauft} ausverkauft`}
        />
      </div>

      {/* Leihrad-Status Übersicht (NEU) */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🚲</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Leihräder Status</h2>
            <p className="text-sm text-gray-600">Aktuelle Verfügbarkeit</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-700">
              {stats?.leihraeder?.verfuegbar || 0}
            </div>
            <div className="text-xs text-green-600 mt-1">Verfügbar</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">
              {stats?.leihraeder?.verliehen || 0}
            </div>
            <div className="text-xs text-blue-600 mt-1">Verliehen</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-700">
              {stats?.leihraeder?.reservierungen_offen || 0}
            </div>
            <div className="text-xs text-purple-600 mt-1">Reserviert</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-700">
              {stats?.leihraeder?.wartung || 0}
            </div>
            <div className="text-xs text-yellow-600 mt-1">Wartung</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-700">
              {stats?.leihraeder?.defekt || 0}
            </div>
            <div className="text-xs text-red-600 mt-1">Defekt</div>
          </div>
        </div>
        {stats?.leihraeder?.heute_zurueck > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm">
            <span className="text-blue-600 font-medium">
              ⏰ {stats.leihraeder.heute_zurueck} Leihrad/räder heute zurück erwartet
            </span>
          </div>
        )}
      </div>

      {/* Bestellungen (nur wenn relevant) */}
      {(stats?.bestellungen?.offen > 0 || stats?.bestellungen?.unterwegs > 0) && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛒</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Bestellungen</h2>
                <p className="text-sm text-gray-600">Status der Lieferungen</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-800">
                {stats?.bestellungen?.offen || 0}
              </div>
              <div className="text-sm text-yellow-600">Offene Bestellungen</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-800">
                {stats?.bestellungen?.unterwegs || 0}
              </div>
              <div className="text-sm text-blue-600">Unterwegs</div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Spalten Layout: Aufgaben (größer) + Listen (kleiner) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Offene Aufgaben - NIMMT 2 SPALTEN */}
        <div className="lg:col-span-2">
          <OpenTasksList tasks={tasks} />
        </div>

        {/* Rechte Spalte: Artikel-Info */}
        <div className="space-y-6">
          {/* Top Artikel */}
          <TopArtikelList artikel={topArtikel} />

          {/* Niedrige Bestände */}
          <LowStockAlert items={lowStock} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500">
        <p>Dashboard aktualisiert sich automatisch alle 30 Sekunden</p>
        <p className="text-xs mt-1">Letztes Update: {new Date().toLocaleTimeString('de-DE')}</p>
      </div>
    </div>
  )
}

export default Dashboard

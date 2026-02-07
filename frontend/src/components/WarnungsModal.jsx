import React, { useState, useEffect } from 'react'

export default function WarnungsModal({ kunde, onClose, onSave, showToast }) {
  const [action, setAction] = useState('') // 'warnung', 'sperrung', 'entsperren'
  const [formData, setFormData] = useState({
    grund: '',
    betrag: 0,
    erstellt_von: 'System'
  })
  const [saving, setSaving] = useState(false)
  const [warnungen, setWarnungen] = useState([])
  const [loadingWarnungen, setLoadingWarnungen] = useState(true)

  useEffect(() => {
    loadWarnungen()
  }, [kunde.id])

  const loadWarnungen = async () => {
    try {
      const res = await fetch(`/api/kunden/${kunde.id}`)
      const data = await res.json()
      setWarnungen(data.warnungen || [])
    } catch (error) {
      showToast?.('Fehler beim Laden der Warnungen', 'error')
    } finally {
      setLoadingWarnungen(false)
    }
  }

  const handleWarnung = async () => {
    if (!formData.grund.trim()) {
      showToast?.('Bitte Grund angeben', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        typ: action === 'sperrung' ? 'sperrung' : 'warnung',
        grund: formData.grund.trim(),
        betrag: parseFloat(formData.betrag) || null,
        erstellt_von: formData.erstellt_von.trim() || 'System'
      }

      const res = await fetch(`/api/kunden/${kunde.id}/warnung`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showToast?.(
          action === 'sperrung' ? 'Kunde gesperrt' : 'Warnung angelegt',
          'success'
        )
        onSave?.()
      } else {
        const error = await res.json()
        showToast?.(error.detail || 'Fehler beim Speichern', 'error')
      }
    } catch (error) {
      showToast?.('Netzwerkfehler', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEntsperren = async (warnungId) => {
    if (!confirm('Warnung/Sperre wirklich aufheben?')) return

    setSaving(true)
    try {
      const res = await fetch(`/api/kunden/${kunde.id}/warnung/${warnungId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aufgehoben_von: formData.erstellt_von.trim() || 'System'
        })
      })

      if (res.ok) {
        showToast?.('Warnung aufgehoben', 'success')
        onSave?.()
      } else {
        const error = await res.json()
        showToast?.(error.detail || 'Fehler beim Aufheben', 'error')
      }
    } catch (error) {
      showToast?.('Netzwerkfehler', 'error')
    } finally {
      setSaving(false)
    }
  }

  const statusConfig = {
    normal: { badge: 'bg-green-100 text-green-800 border-green-200', icon: '✅', label: 'Normal' },
    warnung: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⚠️', label: 'Warnung' },
    gesperrt: { badge: 'bg-red-100 text-red-800 border-red-200', icon: '🚨', label: 'Gesperrt' }
  }

  const config = statusConfig[kunde.status] || statusConfig.normal
  const aktiveWarnungen = warnungen.filter(w => !w.aufgehoben_am)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">⚙️ Status & Warnungen</h2>
          <p className="text-blue-100 text-sm mt-1">
            {kunde.vorname} {kunde.nachname} ({kunde.kundennummer})
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Aktueller Status */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="font-bold text-gray-800 mb-3">📊 Aktueller Status</h3>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-2 rounded text-sm font-medium border ${config.badge}`}>
                {config.icon} {config.label}
              </span>
              {kunde.status === 'gesperrt' && kunde.gesperrt_grund && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Grund:</span> {kunde.gesperrt_grund}
                </div>
              )}
            </div>
          </div>

          {/* Aktive Warnungen */}
          {aktiveWarnungen.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-3">
                ⚠️ Aktive Warnungen ({aktiveWarnungen.length})
              </h3>
              <div className="space-y-2">
                {aktiveWarnungen.map(w => (
                  <div key={w.id} className="bg-white rounded p-3 border border-yellow-300">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          w.typ === 'sperrung' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {w.typ === 'sperrung' ? '🚨 Sperre' : '⚠️ Warnung'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleEntsperren(w.id)}
                        disabled={saving}
                        className="text-xs text-green-600 hover:text-green-700 underline disabled:opacity-50"
                      >
                        Aufheben
                      </button>
                    </div>
                    <div className="text-sm text-gray-700">
                      <div><strong>Grund:</strong> {w.grund}</div>
                      {w.betrag && <div><strong>Betrag:</strong> {w.betrag} €</div>}
                      <div className="text-xs text-gray-500 mt-1">
                        Von: {w.erstellt_von} am {new Date(w.erstellt_am).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Selector */}
          {!action && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800">🎯 Aktion wählen</h3>
              <div className="grid gap-3">
                <button
                  onClick={() => setAction('warnung')}
                  className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg hover:bg-yellow-100 transition text-left"
                >
                  <div className="font-bold text-yellow-800">⚠️ Warnung anlegen</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Kunde kann weiterhin mieten, aber erhält Hinweis
                  </div>
                </button>
                <button
                  onClick={() => setAction('sperrung')}
                  className="p-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition text-left"
                >
                  <div className="font-bold text-red-800">🚨 Kunde sperren</div>
                  <div className="text-sm text-red-700 mt-1">
                    Vermietung wird blockiert (kann überschrieben werden)
                  </div>
                </button>
                {kunde.status !== 'normal' && aktiveWarnungen.length > 0 && (
                  <button
                    onClick={() => setAction('entsperren')}
                    className="p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition text-left"
                  >
                    <div className="font-bold text-green-800">✅ Status zurücksetzen</div>
                    <div className="text-sm text-green-700 mt-1">
                      Alle Warnungen aufheben und auf "Normal" setzen
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Warnung/Sperrung Formular */}
          {(action === 'warnung' || action === 'sperrung') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">
                  {action === 'sperrung' ? '🚨 Kunde sperren' : '⚠️ Warnung anlegen'}
                </h3>
                <button
                  onClick={() => setAction('')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Zurück
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grund <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.grund}
                  onChange={(e) => setFormData({ ...formData, grund: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="z.B. Rad mit Schaden zurückgegeben, Kaution nicht bezahlt..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offener Betrag (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.betrag}
                    onChange={(e) => setFormData({ ...formData, betrag: e.target.value })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <span className="text-gray-600">€</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Wird zu offene_rechnungen addiert
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Erfasst von
                </label>
                <input
                  type="text"
                  value={formData.erstellt_von}
                  onChange={(e) => setFormData({ ...formData, erstellt_von: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mitarbeitername"
                />
              </div>

              <button
                onClick={handleWarnung}
                disabled={saving || !formData.grund.trim()}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
              >
                {saving ? 'Speichere...' : action === 'sperrung' ? '🚨 Jetzt sperren' : '⚠️ Warnung anlegen'}
              </button>
            </div>
          )}

          {/* Warnungs-Historie */}
          {warnungen.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-bold text-gray-800 mb-3">📋 Historie ({warnungen.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {warnungen.map(w => (
                  <div
                    key={w.id}
                    className={`p-3 rounded border text-sm ${
                      w.aufgehoben_am
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        w.typ === 'sperrung'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {w.typ === 'sperrung' ? '🚨 Sperre' : '⚠️ Warnung'}
                      </span>
                      {w.aufgehoben_am && (
                        <span className="text-xs text-green-600 font-medium">✅ Aufgehoben</span>
                      )}
                    </div>
                    <div className="mt-2 text-gray-700">{w.grund}</div>
                    {w.betrag && (
                      <div className="text-gray-600 mt-1">Betrag: {w.betrag} €</div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Angelegt: {new Date(w.erstellt_am).toLocaleDateString('de-DE')} von {w.erstellt_von}
                      {w.aufgehoben_am && (
                        <> • Aufgehoben: {new Date(w.aufgehoben_am).toLocaleDateString('de-DE')} von {w.aufgehoben_von}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

function OpenTasksList({ tasks }) {
  if (!tasks) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Was liegt an?</h2>
            <p className="text-sm text-gray-600">Dringend zu erledigen</p>
          </div>
        </div>
        <div className="text-center text-gray-500 py-8">
          Lade Aufgaben...
        </div>
      </div>
    )
  }

  const anzahlDringend = 
    (tasks.reparaturen_nicht_begonnen?.length || 0) +
    (tasks.reparaturen_ueberfaellig?.length || 0) +
    (tasks.vermietungen_ueberfaellig?.length || 0)
  
  const anzahlHeute = 
    (tasks.reparaturen_heute_faellig?.length || 0) +
    (tasks.vermietungen_heute_zurueck?.length || 0) +
    (tasks.reservierungen?.filter(r => r.abholung_heute)?.length || 0)

  const anzahlWarten = 
    (tasks.reparaturen_fertig?.length || 0) +
    (tasks.reservierungen?.filter(r => !r.abholung_heute)?.length || 0)

  const keineAufgaben = anzahlDringend === 0 && anzahlHeute === 0 && anzahlWarten === 0

  if (keineAufgaben) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Was liegt an?</h2>
            <p className="text-sm text-gray-600">Dringend zu erledigen</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-gray-600 font-medium">Alles erledigt!</div>
          <div className="text-sm text-gray-500 mt-1">Keine dringenden Aufgaben</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header mit Zusammenfassung */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Was liegt an?</h2>
              <p className="text-sm text-gray-600">Dringend zu erledigen</p>
            </div>
          </div>
          {anzahlDringend > 0 && (
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
              {anzahlDringend} dringend
            </div>
          )}
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`p-2 rounded ${anzahlDringend > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>
            <div className="font-bold text-lg">{anzahlDringend}</div>
            <div>Dringend</div>
          </div>
          <div className={`p-2 rounded ${anzahlHeute > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'}`}>
            <div className="font-bold text-lg">{anzahlHeute}</div>
            <div>Heute</div>
          </div>
          <div className={`p-2 rounded ${anzahlWarten > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
            <div className="font-bold text-lg">{anzahlWarten}</div>
            <div>Warten</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
        {/* 🔴 NICHT BEGONNEN - HÖCHSTE PRIORITÄT */}
        {tasks.reparaturen_nicht_begonnen?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 text-xl">⚠️</span>
              <h3 className="text-sm font-bold text-red-700 uppercase">
                Nicht begonnen ({tasks.reparaturen_nicht_begonnen.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tasks.reparaturen_nicht_begonnen.slice(0, 5).map((rep) => (
                <div key={rep.id} className="bg-red-50 p-3 rounded-lg border-l-4 border-red-600 hover:bg-red-100 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">
                        {rep.auftragsnummer}
                      </div>
                      <div className="text-xs text-gray-700">
                        {rep.fahrradmarke} {rep.fahrradmodell && `- ${rep.fahrradmodell}`}
                      </div>
                      {rep.kunde_name && (
                        <div className="text-xs text-gray-600 mt-1">
                          👤 {rep.kunde_name}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-xs font-bold text-red-700">
                        {rep.tage_seit_annahme} Tag{rep.tage_seit_annahme !== 1 ? 'e' : ''}
                      </div>
                      <div className="text-xs text-red-600">
                        wartet
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🔴 ÜBERFÄLLIGE REPARATUREN */}
        {tasks.reparaturen_ueberfaellig?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-500 text-xl">🔴</span>
              <h3 className="text-sm font-bold text-red-600 uppercase">
                Überfällig ({tasks.reparaturen_ueberfaellig.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tasks.reparaturen_ueberfaellig.slice(0, 5).map((rep) => (
                <div key={rep.id} className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500 hover:bg-red-100 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {rep.auftragsnummer}
                      </div>
                      <div className="text-xs text-gray-700">
                        {rep.fahrradmarke} · {rep.status === 'wartet_auf_teile' ? '⏸️ Wartet auf Teile' : '🔧 In Arbeit'}
                      </div>
                      {rep.kunde_name && (
                        <div className="text-xs text-gray-600 mt-1">
                          👤 {rep.kunde_name}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-xs font-bold text-red-600">
                        +{rep.tage_ueberfaellig} Tag{rep.tage_ueberfaellig !== 1 ? 'e' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        überfällig
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🔴 LEIHRÄDER ÜBERFÄLLIG */}
        {tasks.vermietungen_ueberfaellig?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600 text-xl">🚲</span>
              <h3 className="text-sm font-bold text-orange-700 uppercase">
                Leihräder überfällig ({tasks.vermietungen_ueberfaellig.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tasks.vermietungen_ueberfaellig.slice(0, 5).map((verm) => (
                <div key={verm.id} className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500 hover:bg-orange-100 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {verm.inventarnummer || `Leihrad #${verm.leihrad_id}`}
                      </div>
                      <div className="text-xs text-gray-700">
                        👤 {verm.kunde_name}
                      </div>
                      {verm.kunde_telefon && (
                        <div className="text-xs text-gray-600 mt-1">
                          📞 {verm.kunde_telefon}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-xs font-bold text-orange-700">
                        +{verm.tage_ueberfaellig} Tag{verm.tage_ueberfaellig !== 1 ? 'e' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        überfällig
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🟡 HEUTE FÄLLIG */}
        {tasks.reparaturen_heute_faellig?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-600 text-xl">🟡</span>
              <h3 className="text-sm font-bold text-yellow-700 uppercase">
                Heute fällig ({tasks.reparaturen_heute_faellig.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tasks.reparaturen_heute_faellig.map((rep) => (
                <div key={rep.id} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-500 hover:bg-yellow-100 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {rep.auftragsnummer}
                      </div>
                      <div className="text-xs text-gray-700">
                        {rep.fahrradmarke}
                      </div>
                    </div>
                    <div className="text-xs text-yellow-700 font-medium ml-2">
                      Heute
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🚲 LEIHRÄDER HEUTE ZURÜCK */}
        {tasks.vermietungen_heute_zurueck?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600 text-xl">🚲</span>
              <h3 className="text-sm font-bold text-blue-700 uppercase">
                Heute zurück erwartet ({tasks.vermietungen_heute_zurueck.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tasks.vermietungen_heute_zurueck.map((verm) => (
                <div key={verm.id} className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500 hover:bg-blue-100 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {verm.inventarnummer || `Leihrad #${verm.leihrad_id}`}
                      </div>
                      <div className="text-xs text-gray-700">
                        👤 {verm.kunde_name}
                      </div>
                    </div>
                    <div className="text-xs text-blue-700 font-medium ml-2">
                      Heute
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📅 RESERVIERUNGEN - BALD ANSTEHEND */}
        {tasks.reservierungen?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-500 text-xl">📅</span>
              <h3 className="text-sm font-bold text-blue-600 uppercase">
                Bald anstehend ({tasks.reservierungen.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tasks.reservierungen.slice(0, 5).map((res) => {
                const vonDatum = new Date(res.von_datum)
                const heute = new Date()
                heute.setHours(0, 0, 0, 0)
                const differenzTage = Math.ceil((vonDatum - heute) / (1000 * 60 * 60 * 24))
                
                return (
                  <div key={res.id} className={`p-3 rounded-lg border-l-4 hover:opacity-90 transition cursor-pointer ${
                    res.abholung_heute 
                      ? 'bg-blue-100 border-blue-600' 
                      : 'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">
                          {res.inventarnummer || `Leihrad #${res.leihrad_id}`}
                        </div>
                        <div className="text-xs text-gray-700">
                          👤 {res.kunde_name}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        {res.abholung_heute ? (
                          <div className="text-xs font-bold text-blue-700">
                            Heute bereit
                          </div>
                        ) : differenzTage === 1 ? (
                          <div className="text-xs font-medium text-blue-600">
                            Morgen
                          </div>
                        ) : (
                          <div className="text-xs text-blue-600">
                            in {differenzTage} Tagen
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ✅ FERTIG ZUR ABHOLUNG */}
        {tasks.reparaturen_fertig?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 text-xl">✅</span>
              <h3 className="text-sm font-bold text-green-700 uppercase">
                Fertig zur Abholung ({tasks.reparaturen_fertig.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tasks.reparaturen_fertig.slice(0, 5).map((rep) => (
                <div key={rep.id} className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500 hover:bg-green-100 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {rep.auftragsnummer}
                      </div>
                      <div className="text-xs text-gray-700">
                        {rep.fahrradmarke}
                      </div>
                      {rep.kunde_name && (
                        <div className="text-xs text-gray-600 mt-1">
                          👤 {rep.kunde_name}
                          {rep.kunde_telefon && ` · 📞 ${rep.kunde_telefon}`}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      {rep.tage_seit_fertig > 2 && (
                        <div className="text-xs font-medium text-orange-600">
                          {rep.tage_seit_fertig} Tage
                        </div>
                      )}
                      <div className="text-xs text-green-600">
                        Fertig
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
        Klicke auf Einträge für Details · Auto-Refresh alle 30s
      </div>
    </div>
  )
}

export default OpenTasksList

function LowStockAlert({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📦</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Bestandswarnungen</h2>
            <p className="text-sm text-gray-600">Niedrige Bestände</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-gray-600">Alle Artikel ausreichend auf Lager</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📦</span>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Bestandswarnungen</h2>
          <p className="text-sm text-gray-600">Artikel nachbestellen!</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isAusverkauft = item.ist_ausverkauft
          const isCritical = item.bestand_aktuell === 0 || item.bestand_aktuell <= Math.ceil(item.mindestbestand / 2)

          return (
            <div
              key={item.id}
              className={`
                p-3 rounded-lg border-l-4
                ${isAusverkauft
                  ? 'bg-red-50 border-red-500'
                  : isCritical
                  ? 'bg-orange-50 border-orange-500'
                  : 'bg-yellow-50 border-yellow-500'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {isAusverkauft ? '🔴' : isCritical ? '🟠' : '🟡'}
                    </span>
                    <div className="font-medium text-gray-800 text-sm">
                      {item.bezeichnung}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 ml-7">
                    {item.artikelnummer}
                  </div>
                </div>

                <div className="text-right ml-2">
                  <div className={`
                    text-sm font-bold
                    ${isAusverkauft
                      ? 'text-red-700'
                      : isCritical
                      ? 'text-orange-700'
                      : 'text-yellow-700'
                    }
                  `}>
                    {item.bestand_aktuell}
                  </div>
                  <div className="text-xs text-gray-500">
                    Min: {item.mindestbestand}
                  </div>
                </div>
              </div>

              {isAusverkauft && (
                <div className="mt-2 text-xs font-medium text-red-700 ml-7">
                  ⚠️ AUSVERKAUFT - Sofort nachbestellen!
                </div>
              )}
            </div>
          )
        })}
      </div>

      {items.length > 5 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Zeige die ersten {Math.min(items.length, 10)} Artikel
        </div>
      )}
    </div>
  )
}

export default LowStockAlert

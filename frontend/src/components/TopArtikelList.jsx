function TopArtikelList({ artikel }) {
  if (!artikel || artikel.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📈</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Top 5 Artikel</h2>
            <p className="text-sm text-gray-600">Meist verkaufte Teile</p>
          </div>
        </div>
        <div className="text-center text-gray-500 py-8">
          Noch keine Verkäufe erfasst
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📈</span>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Top 5 Artikel</h2>
          <p className="text-sm text-gray-600">Meist verkaufte Teile</p>
        </div>
      </div>

      <div className="space-y-3">
        {artikel.map((artikel, index) => (
          <div
            key={artikel.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-3">
              {/* Platzierung */}
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                ${index === 0 ? 'bg-yellow-100 text-yellow-800' : ''}
                ${index === 1 ? 'bg-gray-100 text-gray-700' : ''}
                ${index === 2 ? 'bg-orange-100 text-orange-800' : ''}
                ${index > 2 ? 'bg-blue-50 text-blue-600' : ''}
              `}>
                {index + 1}
              </div>

              {/* Artikel Info */}
              <div>
                <div className="font-medium text-gray-800">
                  {artikel.bezeichnung}
                </div>
                <div className="text-xs text-gray-500">
                  {artikel.artikelnummer}
                </div>
              </div>
            </div>

            {/* Menge */}
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">
                {artikel.menge_verkauft}×
              </div>
              <div className="text-xs text-gray-500">verkauft</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopArtikelList

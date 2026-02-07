import { useState, useEffect } from 'react'

function LeihraederKalender({ leihraeder, vermietungen, onVermietungClick, onDateClick }) {
  const [scrollDate, setScrollDate] = useState(new Date())
  const [visibleMonths, setVisibleMonths] = useState(3)

  // 365 Tage generieren ab heute
  const generateDays = () => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push(date)
    }
    return days
  }

  const days = generateDays()

  // Prüfen ob Rad an einem Tag vermietet ist
  const getVermietungForDate = (leihradId, date) => {
    if (!vermietungen) return null
    
    return vermietungen.find(v => {
      const von = new Date(v.von_datum)
      const bis = new Date(v.bis_datum)
      von.setHours(0, 0, 0, 0)
      bis.setHours(0, 0, 0, 0)
      
      return v.leihrad_id === leihradId && 
             date >= von && 
             date <= bis &&
             v.status !== 'storniert'
    })
  }

  // Monat Header generieren
  const getMonthHeaders = () => {
    const headers = []
    let currentMonth = null
    let dayCount = 0

    days.forEach(day => {
      const month = day.toLocaleString('de-DE', { month: 'short', year: 'numeric' })
      if (month !== currentMonth) {
        if (currentMonth !== null) {
          headers.push({ month: currentMonth, days: dayCount })
        }
        currentMonth = month
        dayCount = 1
      } else {
        dayCount++
      }
    })
    
    if (currentMonth !== null) {
      headers.push({ month: currentMonth, days: dayCount })
    }

    return headers
  }

  const monthHeaders = getMonthHeaders()

  const getCellColor = (vermietung) => {
    if (!vermietung) return 'bg-green-100 hover:bg-green-200'
    
    switch (vermietung.status) {
      case 'reserviert':
        return 'bg-yellow-300 hover:bg-yellow-400'
      case 'aktiv':
        return 'bg-red-400 hover:bg-red-500'
      case 'abgeschlossen':
        return 'bg-gray-300 hover:bg-gray-400'
      default:
        return 'bg-blue-300 hover:bg-blue-400'
    }
  }

  const getCellTitle = (leihrad, date, vermietung) => {
    if (!vermietung) {
      return `${leihrad.inventarnummer}\n${date.toLocaleDateString('de-DE')}\nVerfügbar - Klicken zum Vermieten`
    }
    return `${leihrad.inventarnummer}\n${vermietung.kunde_name}\n${date.toLocaleDateString('de-DE')}\n${vermietung.status}`
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">📅 Leihräder Jahreskalender</h2>
            <p className="text-blue-100 text-sm mt-1">365-Tage-Übersicht • Grün = Verfügbar • Gelb = Reserviert • Rot = Verliehen</p>
          </div>
        </div>
      </div>

      {/* Legende */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
          <span>Verfügbar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-300 border border-yellow-400 rounded"></div>
          <span>Reserviert</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 border border-red-500 rounded"></div>
          <span>Aktiv verliehen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded"></div>
          <span>Abgeschlossen</span>
        </div>
      </div>

      {/* Kalender Container mit Scroll */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        <div className="inline-block min-w-full">
          
          {/* Monat Headers */}
          <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-300">
            <div className="flex">
              {/* Linke Spalte für Rad-Namen */}
              <div className="w-48 flex-shrink-0 border-r-2 border-gray-300 bg-gray-100"></div>
              
              {/* Monat Headers */}
              <div className="flex">
                {monthHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className="border-r border-gray-300 bg-blue-50 font-semibold text-blue-900 text-center py-2 text-sm"
                    style={{ width: `${header.days * 24}px` }}
                  >
                    {header.month}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tag Headers (Sticky) */}
          <div className="sticky top-10 z-10 bg-white border-b border-gray-300">
            <div className="flex">
              {/* Linke Spalte */}
              <div className="w-48 flex-shrink-0 border-r-2 border-gray-300 bg-gray-100 px-3 py-2 font-bold text-gray-700">
                Leihrad
              </div>
              
              {/* Tage */}
              <div className="flex">
                {days.map((day, idx) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const isToday = day.toDateString() === new Date().toDateString()
                  
                  return (
                    <div
                      key={idx}
                      className={`border-r border-gray-200 text-center text-xs py-1 ${
                        isToday ? 'bg-blue-100 font-bold text-blue-900' : 
                        isWeekend ? 'bg-gray-100 text-gray-600' : 'bg-white text-gray-700'
                      }`}
                      style={{ width: '24px' }}
                    >
                      <div>{day.getDate()}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Rad Zeilen */}
          {leihraeder && leihraeder.length > 0 ? (
            leihraeder.map(leihrad => (
              <div key={leihrad.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                {/* Rad Info (Sticky Left) */}
                <div className="w-48 flex-shrink-0 border-r-2 border-gray-300 bg-white px-3 py-2 sticky left-0 z-5">
                  <div className="font-semibold text-sm text-gray-900">{leihrad.inventarnummer}</div>
                  <div className="text-xs text-gray-600">{leihrad.typ}</div>
                  <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${
                    leihrad.status === 'verfuegbar' ? 'bg-green-100 text-green-800' :
                    leihrad.status === 'verliehen' ? 'bg-red-100 text-red-800' :
                    leihrad.status === 'wartung' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {leihrad.status}
                  </div>
                </div>
                
                {/* Kalender Zellen */}
                <div className="flex">
                  {days.map((day, idx) => {
                    const vermietung = getVermietungForDate(leihrad.id, day)
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6
                    
                    return (
                      <div
                        key={idx}
                        className={`border-r border-gray-200 cursor-pointer transition ${getCellColor(vermietung)} ${
                          isWeekend ? 'opacity-70' : ''
                        }`}
                        style={{ width: '24px', height: '64px' }}
                        title={getCellTitle(leihrad, day, vermietung)}
                        onClick={() => {
                          if (vermietung && onVermietungClick) {
                            onVermietungClick(vermietung)
                          } else if (!vermietung && onDateClick) {
                            onDateClick(leihrad, day)
                          }
                        }}
                      >
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              Keine Leihräder vorhanden. Nutze den Schnellstart oben um Räder anzulegen.
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>📊 {leihraeder?.length || 0} Leihräder</span>
          <span>📅 365 Tage Vorschau</span>
          <span>💡 Klicke auf eine Zelle um zu vermieten oder Details zu sehen</span>
        </div>
      </div>
    </div>
  )
}

export default LeihraederKalender

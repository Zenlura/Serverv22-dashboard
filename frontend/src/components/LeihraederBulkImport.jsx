import { useState } from 'react'
import Toast from './Toast'

function LeihraederBulkImport({ onImportComplete }) {
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const handleBulkImport = async () => {
    if (!confirm('21 Leihräder anlegen?\n\n15 E-Bikes\n4 Normale Räder\n2 Werkstatträder')) {
      return
    }

    setImporting(true)

    try {
      // 15 E-Bikes
      const ebikes = []
      for (let i = 1; i <= 15; i++) {
        ebikes.push({
          inventarnummer: `EBIKE-${String(i).padStart(3, '0')}`,
          rahmennummer: `RN-EB-${String(i).padStart(3, '0')}`,
          marke: 'Prophete',
          modell: 'E-Novation',
          typ: 'E-Bike',
          rahmenhoehe: i % 3 === 0 ? 'L' : i % 3 === 1 ? 'M' : 'S',
          farbe: 'Schwarz',
          preis_1tag: 25.00,
          preis_3tage: 22.00,
          preis_5tage: 20.00,
          status: 'verfuegbar',
          kontrollstatus: 'ok',
          zustand: 'Neu'
        })
      }

      // 4 Normale Räder
      const normalRaeder = []
      for (let i = 1; i <= 4; i++) {
        normalRaeder.push({
          inventarnummer: `BIKE-${String(i).padStart(3, '0')}`,
          rahmennummer: `RN-BK-${String(i).padStart(3, '0')}`,
          marke: 'KTM',
          modell: 'City Fun',
          typ: 'Normal',
          rahmenhoehe: i % 2 === 0 ? 'M' : 'L',
          farbe: 'Silber',
          preis_1tag: 15.00,
          preis_3tage: 12.00,
          preis_5tage: 10.00,
          status: 'verfuegbar',
          kontrollstatus: 'ok',
          zustand: 'Gut'
        })
      }

      // 2 Werkstatträder
      const werkstattRaeder = []
      for (let i = 1; i <= 2; i++) {
        werkstattRaeder.push({
          inventarnummer: `WERK-${String(i).padStart(3, '0')}`,
          rahmennummer: `RN-WK-${String(i).padStart(3, '0')}`,
          marke: 'Platzhalter',
          modell: 'Werkstatt',
          typ: 'Werkstatt',
          rahmenhoehe: 'M',
          farbe: 'Rot',
          preis_1tag: 0.00,
          preis_3tage: 0.00,
          preis_5tage: 0.00,
          status: 'wartung',
          kontrollstatus: 'ok',
          zustand: 'Nur für interne Nutzung'
        })
      }

      const allBikes = [...ebikes, ...normalRaeder, ...werkstattRaeder]
      
      // Alle Räder nacheinander anlegen
      let successCount = 0
      let errorCount = 0

      for (const bike of allBikes) {
        try {
          const response = await fetch('http://localhost:8000/api/leihraeder/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bike)
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
            console.error(`Fehler bei ${bike.inventarnummer}:`, await response.text())
          }
        } catch (err) {
          errorCount++
          console.error(`Fehler bei ${bike.inventarnummer}:`, err)
        }
      }

      showToast(
        `Import abgeschlossen! ${successCount} erfolgreich, ${errorCount} Fehler`,
        errorCount > 0 ? 'warning' : 'success'
      )

      if (onImportComplete) {
        onImportComplete()
      }

    } catch (err) {
      showToast('Fehler beim Import: ' + err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-3xl">🚴</div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-2">Schnellstart: 21 Leihräder anlegen</h3>
            <p className="text-sm text-blue-700 mb-3">
              Legt automatisch an: 15 E-Bikes (25€/Tag), 4 normale Räder (15€/Tag) und 2 Werkstatträder
            </p>
            <button
              onClick={handleBulkImport}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
            >
              {importing ? '⏳ Importiere...' : '⚡ Jetzt 21 Räder anlegen'}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

export default LeihraederBulkImport

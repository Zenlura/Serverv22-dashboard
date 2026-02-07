import { useState, useEffect } from 'react'

export default function ConnectScreen() {
  const [ipAddress, setIpAddress] = useState('Wird geladen...')
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    // IP-Adresse vom Backend holen
    fetchIPAddress()
  }, [])

  const fetchIPAddress = async () => {
    try {
      // Hole die aktuelle URL - die enthält schon die richtige IP
      const currentHost = window.location.hostname
      const currentPort = window.location.port || '3000'
      const url = `http://${currentHost}:${currentPort}`
      
      setIpAddress(currentHost)
      
      // Generiere QR-Code URL via API
      // Nutze qr-server.com als kostenlosen QR-Generator
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error('Fehler beim Laden der IP:', error)
      setIpAddress('Fehler beim Laden')
    }
  }

  const url = `http://${ipAddress}:3000`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            📱 Netzwerk-Zugriff
          </h1>
          <p className="text-xl text-gray-600">
            Scannen Sie den QR-Code mit Ihrem Handy oder Tablet
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-6 rounded-xl shadow-lg border-4 border-blue-500">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                    <div className="text-center">
                      <div className="animate-spin text-4xl mb-2">⏳</div>
                      <p className="text-gray-600">Generiere QR-Code...</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-500 text-center">
                Größe: 400x400 Pixel
              </p>
            </div>

            {/* Info */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  🌐 Verbindungsdaten
                </h2>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">IP-Adresse:</p>
                  <p className="text-2xl font-mono font-bold text-blue-600">
                    {ipAddress}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">URL:</p>
                  <a 
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-mono font-bold text-green-600 hover:text-green-700 break-all"
                  >
                    {url}
                  </a>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  📋 Anleitung:
                </h3>
                <ol className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="font-bold text-blue-600 mr-2">1.</span>
                    <span>Handy/Tablet mit <strong>demselben WLAN</strong> verbinden</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-blue-600 mr-2">2.</span>
                    <span>Kamera-App öffnen und QR-Code scannen</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-blue-600 mr-2">3.</span>
                    <span>Link antippen - Fertig! 🎉</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">💡</div>
            <h3 className="font-bold text-gray-900 mb-2">Tipp</h3>
            <p className="text-sm text-gray-600">
              Als Lesezeichen speichern für schnellen Zugriff beim nächsten Mal!
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-bold text-gray-900 mb-2">Kompatibel</h3>
            <p className="text-sm text-gray-600">
              Funktioniert mit iPhone, Android, Tablets und allen modernen Smartphones.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-bold text-gray-900 mb-2">Sicher</h3>
            <p className="text-sm text-gray-600">
              Nur im lokalen Netzwerk erreichbar. Keine Internet-Verbindung nötig.
            </p>
          </div>
        </div>

        {/* Alternative Methode */}
        <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            QR-Code funktioniert nicht?
          </h3>
          <p className="text-gray-700 mb-3">
            Geben Sie die URL manuell in den Browser ein:
          </p>
          <div className="bg-white rounded-lg p-4 font-mono text-lg text-center border-2 border-yellow-300">
            {url}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>🚲 Radstation Warenwirtschaft • Version 1.0</p>
          <p className="mt-1">Dieser Screen kann auf einem Tablet dauerhaft angezeigt werden</p>
        </div>
      </div>
    </div>
  )
}

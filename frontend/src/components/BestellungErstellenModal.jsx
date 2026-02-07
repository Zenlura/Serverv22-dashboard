import { useState, useEffect } from 'react'

/**
 * Bestellung Erstellen Modal - Version 2.0
 * Mit Warenkorb-Funktion für Multi-Artikel-Bestellungen
 */
function BestellungErstellenModal({ artikel: initialArtikel, onClose, onSuccess }) {
  // State
  const [warenkorb, setWarenkorb] = useState([])
  const [lieferanten, setLieferanten] = useState([])
  const [alleArtikel, setAlleArtikel] = useState([])
  const [selectedLieferant, setSelectedLieferant] = useState(null)
  const [versandkosten, setVersandkosten] = useState('0.00')
  const [notizen, setNotizen] = useState('')
  const [interneNotizen, setInterneNotizen] = useState('')
  
  // Artikel hinzufügen Panel
  const [showArtikelSuche, setShowArtikelSuche] = useState(false)
  const [suchbegriff, setSuchbegriff] = useState('')
  const [selectedArtikel, setSelectedArtikel] = useState(null)
  const [menge, setMenge] = useState('')
  const [einzelpreis, setEinzelpreis] = useState('')
  
  // Loading & Error
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Initial laden
  useEffect(() => {
    loadData()
  }, [])

  // Initial-Artikel in Warenkorb legen
  useEffect(() => {
    if (initialArtikel && warenkorb.length === 0 && lieferanten.length > 0) {
      addInitialArtikel()
    }
  }, [initialArtikel, lieferanten])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Parallel laden: Lieferanten und Artikel
      const [lieferantenRes, artikelRes] = await Promise.all([
        fetch('/api/lieferanten'),
        fetch('/api/artikel')
      ])

      if (!lieferantenRes.ok || !artikelRes.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }

      const lieferantenData = await lieferantenRes.json()
      const artikelData = await artikelRes.json()

      setLieferanten(lieferantenData.items || lieferantenData || [])
      setAlleArtikel(artikelData.items || artikelData || [])
      setError(null)
    } catch (err) {
      setError('Fehler beim Laden: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const addInitialArtikel = () => {
    if (!initialArtikel) return

    // Bevorzugten Lieferanten finden
    let lieferantId = null
    let preis = initialArtikel.einkaufspreis || ''

    if (initialArtikel.lieferanten && initialArtikel.lieferanten.length > 0) {
      const bevorzugt = initialArtikel.lieferanten.find(l => l.bevorzugt)
      const hauptLieferant = bevorzugt || initialArtikel.lieferanten[0]
      lieferantId = hauptLieferant.lieferant.id
      preis = hauptLieferant.einkaufspreis || preis
    } else if (lieferanten.length > 0) {
      lieferantId = lieferanten[0].id
    }

    setSelectedLieferant(lieferantId)

    // Vorgeschlagene Menge
    const vorschlag = Math.max(1, (initialArtikel.mindestbestand || 10) * 2)

    // In Warenkorb
    setWarenkorb([{
      id: Date.now(),
      artikel_id: initialArtikel.id,
      artikel: initialArtikel,
      menge: vorschlag,
      einzelpreis: parseFloat(preis) || 0,
      notizen: ''
    }])
  }

  const handleArtikelAuswaehlen = (artikel) => {
    setSelectedArtikel(artikel)
    
    // Preis vom Lieferanten holen (falls zugeordnet)
    let preis = artikel.einkaufspreis || ''
    if (selectedLieferant && artikel.lieferanten) {
      const artikelLieferant = artikel.lieferanten.find(
        l => l.lieferant.id === selectedLieferant
      )
      if (artikelLieferant?.einkaufspreis) {
        preis = artikelLieferant.einkaufspreis
      }
    }
    
    setEinzelpreis(preis.toString())
    setMenge(Math.max(1, artikel.mindestbestand || 1).toString())
    setShowArtikelSuche(false)
  }

  const handleArtikelHinzufuegen = () => {
    if (!selectedArtikel || !menge || !einzelpreis) {
      alert('Bitte Artikel, Menge und Preis angeben!')
      return
    }

    const neuPosition = {
      id: Date.now(),
      artikel_id: selectedArtikel.id,
      artikel: selectedArtikel,
      menge: parseInt(menge),
      einzelpreis: parseFloat(einzelpreis),
      notizen: ''
    }

    setWarenkorb([...warenkorb, neuPosition])
    
    // Reset
    setSelectedArtikel(null)
    setMenge('')
    setEinzelpreis('')
    setSuchbegriff('')
  }

  const handlePositionLoeschen = (id) => {
    if (warenkorb.length === 1) {
      alert('Die Bestellung muss mindestens einen Artikel enthalten!')
      return
    }
    setWarenkorb(warenkorb.filter(p => p.id !== id))
  }

  const handlePositionAendern = (id, field, value) => {
    setWarenkorb(warenkorb.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const getPositionsPreis = (position) => {
    return position.menge * position.einzelpreis
  }

  const getWarenkorbSumme = () => {
    return warenkorb.reduce((sum, p) => sum + getPositionsPreis(p), 0)
  }

  const getGesamtpreis = () => {
    return getWarenkorbSumme() + parseFloat(versandkosten || 0)
  }

  const handleBestellungErstellen = async () => {
    // Validierung
    if (!selectedLieferant) {
      alert('Bitte wähle einen Lieferanten aus!')
      return
    }
    if (warenkorb.length === 0) {
      alert('Bitte füge mindestens einen Artikel hinzu!')
      return
    }

    try {
      setSaving(true)

      const bestellung = {
        lieferant_id: selectedLieferant,
        positionen: warenkorb.map(p => ({
          artikel_id: p.artikel_id,
          menge: p.menge,
          einzelpreis: p.einzelpreis.toString(),
          notizen: p.notizen || null
        })),
        versandkosten: versandkosten.toString(),
        notizen: notizen || null,
        interne_notizen: interneNotizen || null
      }

      const response = await fetch('/api/bestellungen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bestellung)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Fehler: ${response.status}`)
      }

      const createdBestellung = await response.json()
      
      if (onSuccess) {
        onSuccess(createdBestellung)
      }
      
      onClose()
    } catch (err) {
      setError('Fehler beim Erstellen: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const formatPreis = (preis) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(preis || 0)
  }

  const getBestand = (artikel) => {
    return (artikel.bestand_lager || 0) + (artikel.bestand_werkstatt || 0)
  }

  const gefiltert = alleArtikel.filter(a => 
    a.artikelnummer.toLowerCase().includes(suchbegriff.toLowerCase()) ||
    a.bezeichnung.toLowerCase().includes(suchbegriff.toLowerCase())
  ).slice(0, 10) // Max 10 Ergebnisse

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">🛒 Bestellung erstellen</h2>
              <p className="text-green-100 text-sm mt-1">
                {warenkorb.length} Artikel im Warenkorb
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Lade Daten...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6 text-red-800">
              <p className="font-semibold">Fehler</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              
              {/* LINKE SEITE: Warenkorb */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">📦 Warenkorb</h3>
                  {!selectedArtikel && (
                    <button
                      onClick={() => setShowArtikelSuche(!showArtikelSuche)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      + Artikel hinzufügen
                    </button>
                  )}
                </div>

                {/* Artikel-Suche Panel */}
                {showArtikelSuche && !selectedArtikel && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={suchbegriff}
                        onChange={(e) => setSuchbegriff(e.target.value)}
                        placeholder="Artikelnummer oder Bezeichnung..."
                        className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setShowArtikelSuche(false)
                          setSuchbegriff('')
                        }}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                      >
                        Abbrechen
                      </button>
                    </div>
                    
                    {suchbegriff && (
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {gefiltert.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">Keine Artikel gefunden</p>
                        ) : (
                          gefiltert.map(artikel => (
                            <button
                              key={artikel.id}
                              onClick={() => handleArtikelAuswaehlen(artikel)}
                              className="w-full text-left px-3 py-2 bg-white rounded hover:bg-blue-100 transition border border-gray-200"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-sm">{artikel.artikelnummer}</p>
                                  <p className="text-xs text-gray-600">{artikel.bezeichnung}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{formatPreis(artikel.einkaufspreis)}</p>
                                  <p className="text-xs text-gray-500">Bestand: {getBestand(artikel)}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Artikel hinzufügen Form */}
                {selectedArtikel && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{selectedArtikel.artikelnummer}</p>
                        <p className="text-sm text-gray-600">{selectedArtikel.bezeichnung}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedArtikel(null)
                          setMenge('')
                          setEinzelpreis('')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Menge</label>
                        <input
                          type="number"
                          value={menge}
                          onChange={(e) => setMenge(e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Preis/Stk (€)</label>
                        <input
                          type="number"
                          value={einzelpreis}
                          onChange={(e) => setEinzelpreis(e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleArtikelHinzufuegen}
                      className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                    >
                      ✓ In Warenkorb legen
                    </button>
                  </div>
                )}

                {/* Warenkorb-Positionen */}
                <div className="space-y-2">
                  {warenkorb.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <p className="text-gray-500">🛒 Warenkorb ist leer</p>
                      <p className="text-sm text-gray-400 mt-1">Klicke auf "Artikel hinzufügen"</p>
                    </div>
                  ) : (
                    warenkorb.map((position, index) => (
                      <div key={position.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{position.artikel.artikelnummer}</p>
                                <p className="text-sm text-gray-600">{position.artikel.bezeichnung}</p>
                                
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Menge</label>
                                    <input
                                      type="number"
                                      value={position.menge}
                                      onChange={(e) => handlePositionAendern(position.id, 'menge', parseInt(e.target.value) || 0)}
                                      min="1"
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Preis/Stk</label>
                                    <input
                                      type="number"
                                      value={position.einzelpreis}
                                      onChange={(e) => handlePositionAendern(position.id, 'einzelpreis', parseFloat(e.target.value) || 0)}
                                      step="0.01"
                                      min="0"
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Gesamt</label>
                                    <div className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm font-medium">
                                      {formatPreis(getPositionsPreis(position))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handlePositionLoeschen(position.id)}
                            className="text-red-500 hover:text-red-700 p-2"
                            title="Entfernen"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Warenkorb-Summe */}
                {warenkorb.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Zwischensumme:</span>
                      <span className="text-green-700">{formatPreis(getWarenkorbSumme())}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* RECHTE SEITE: Bestelldetails */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">📋 Bestelldetails</h3>

                {/* Lieferant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lieferant *
                  </label>
                  <select
                    value={selectedLieferant || ''}
                    onChange={(e) => setSelectedLieferant(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    disabled={saving}
                  >
                    <option value="">Bitte wählen...</option>
                    {lieferanten.map(lieferant => (
                      <option key={lieferant.id} value={lieferant.id}>
                        {lieferant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Versandkosten */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Versandkosten
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={versandkosten}
                      onChange={(e) => setVersandkosten(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      disabled={saving}
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">€</span>
                  </div>
                </div>

                {/* Gesamtpreis */}
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Gesamtpreis:</div>
                  <div className="text-3xl font-bold text-green-700">
                    {formatPreis(getGesamtpreis())}
                  </div>
                  {warenkorb.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {formatPreis(getWarenkorbSumme())} + {formatPreis(versandkosten)} Versand
                    </div>
                  )}
                </div>

                {/* Notizen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notizen für Lieferant
                  </label>
                  <textarea
                    value={notizen}
                    onChange={(e) => setNotizen(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    disabled={saving}
                    placeholder="Optional..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interne Notizen
                  </label>
                  <textarea
                    value={interneNotizen}
                    onChange={(e) => setInterneNotizen(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    disabled={saving}
                    placeholder="Nur für dich..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {warenkorb.length} Artikel · {formatPreis(getGesamtpreis())}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleBestellungErstellen}
              disabled={saving || loading || warenkorb.length === 0 || !selectedLieferant}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
            >
              {saving ? 'Erstelle...' : '✓ Bestellung erstellen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BestellungErstellenModal
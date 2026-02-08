import { useState, useEffect } from 'react'
import Toast from './Toast'
import VarianteBearbeitenModal from './VarianteBearbeitenModal'

function ArtikelDetailsModal({ artikel, onClose, onSave }) {
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState(null)
  const [kategorien, setKategorien] = useState([])
  const [lieferanten, setLieferanten] = useState([])
  const [lagerorte, setLagerorte] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('basis')
  const [toast, setToast] = useState(null)
  
  // Varianten-Management
  const [varianten, setVarianten] = useState([])
  const [showVarianteModal, setShowVarianteModal] = useState(false)
  const [currentVariante, setCurrentVariante] = useState(null) // Für Edit-Mode
  const [loadingVarianten, setLoadingVarianten] = useState(false)
  
  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }
  
  // Lieferanten-Management
  const [showAddLieferant, setShowAddLieferant] = useState(false)
  const [newLieferant, setNewLieferant] = useState({
    lieferant_id: '',
    lieferanten_artikelnummer: '',
    einkaufspreis: '',
    lieferzeit_tage: '',
    bevorzugt: false,
    notizen: ''
  })

  // Daten laden beim Öffnen
  useEffect(() => {
    if (artikel) {
      loadData()
    }
  }, [artikel])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Kategorien und Lieferanten laden
      const [katResponse, liefResponse, lagerResponse] = await Promise.all([
        fetch('/api/kategorien'),
        fetch('/api/lieferanten'),
        fetch('/api/lagerorte/?nur_aktive=true')
      ])

      if (!katResponse.ok || !liefResponse.ok || !lagerResponse.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }

      const katData = await katResponse.json()
      const liefData = await liefResponse.json()
      const lagerData = await lagerResponse.json()

      setKategorien(katData.items || katData || [])
      setLieferanten(liefData.items || liefData || [])
      setLagerorte(lagerData || [])
      
      // Form-Daten initialisieren
      setFormData({
        ...artikel,
        kategorie_id: artikel.kategorie_id || '',
      })
      
      setError(null)
    } catch (err) {
      setError('Fehler beim Laden: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Varianten laden (nur wenn hat_varianten = true)
  const loadVarianten = async () => {
    if (!artikel?.hat_varianten) return
    
    try {
      setLoadingVarianten(true)
      const response = await fetch(`/api/varianten/artikel/${artikel.id}`)
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Varianten')
      }
      
      const data = await response.json()
      setVarianten(data || [])
    } catch (err) {
      console.error('Fehler beim Laden der Varianten:', err)
      showToast('Fehler beim Laden der Varianten', 'error')
    } finally {
      setLoadingVarianten(false)
    }
  }
  
  // Varianten laden wenn Tab gewechselt wird oder wenn hat_varianten aktiviert wurde
  useEffect(() => {
    if (activeTab === 'varianten' && artikel?.hat_varianten) {
      loadVarianten()
    }
  }, [activeTab, artikel?.hat_varianten])

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Nur die Felder schicken, die das Backend akzeptiert
      const allowedFields = [
        'artikelnummer',
        'bezeichnung', 
        'beschreibung',
        'typ',
        'kategorie_id',
        'bestand_lager',
        'bestand_werkstatt',
        'mindestbestand',
        'einkaufspreis',
        'verkaufspreis',
        'einheit',
        'lagerort_id',
        'aktiv',
        'notizen'
      ]
      
      const dataToSend = {}
      allowedFields.forEach(field => {
        if (formData[field] !== undefined) {
          // kategorie_id speziell behandeln (kann null sein)
          if (field === 'kategorie_id') {
            const value = formData[field]
            dataToSend[field] = (value === '' || value === null) ? null : parseInt(value)
          }
          // Andere Integer-Felder (dürfen nicht null sein)
          else if (['bestand_lager', 'bestand_werkstatt', 'mindestbestand'].includes(field)) {
            dataToSend[field] = parseInt(formData[field]) || 0
          }
          // Float-Felder konvertieren  
          else if (field === 'einkaufspreis' || field === 'verkaufspreis') {
            dataToSend[field] = parseFloat(formData[field]) || 0
          }
          // Rest wie gehabt
          else {
            dataToSend[field] = formData[field]
          }
        }
      })
      
      const response = await fetch(`/api/artikel/${artikel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Fehler beim Speichern: ${response.status}`)
      }

      const updatedArtikel = await response.json()
      onSave(updatedArtikel)
      setEditMode(false)
      showToast('Artikel erfolgreich gespeichert!', 'success')
    } catch (err) {
      setError('Fehler beim Speichern: ' + err.message)
      showToast('Fehler beim Speichern: ' + err.message, 'error')
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

  const getBestand = () => {
    return (formData?.bestand_lager || 0) + (formData?.bestand_werkstatt || 0)
  }

  // ============================================================================
  // VARIANTEN-MANAGEMENT
  // ============================================================================
  
  const handleNeueVariante = () => {
    setCurrentVariante(null)
    setShowVarianteModal(true)
  }
  
  const handleEditVariante = (variante) => {
    setCurrentVariante(variante)
    setShowVarianteModal(true)
  }
  
  const handleVarianteSaved = async (savedVariante) => {
    showToast('Variante erfolgreich gespeichert!', 'success')
    await loadVarianten() // Liste neu laden
  }
  
  const handleDeleteVariante = async (varianteId) => {
    if (!confirm('Variante wirklich löschen? (Nur möglich wenn Bestand = 0)')) {
      return
    }
    
    try {
      const response = await fetch(`/api/varianten/${varianteId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Fehler beim Löschen')
      }
      
      showToast('Variante gelöscht!', 'success')
      await loadVarianten()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }
  
  const handleToggleHatVarianten = async (value) => {
    try {
      const response = await fetch(`/api/artikel/${artikel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hat_varianten: value })
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren')
      }
      
      // FormData & Artikel aktualisieren
      setFormData(prev => ({ ...prev, hat_varianten: value }))
      artikel.hat_varianten = value
      
      if (value) {
        showToast('Varianten aktiviert! Wechsle zum Varianten-Tab um Varianten anzulegen.', 'success')
        await loadVarianten()
      } else {
        showToast('Varianten deaktiviert', 'success')
      }
      
      // Parent benachrichtigen
      if (onSave) {
        onSave({ ...artikel, hat_varianten: value })
      }
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error')
    }
  }

  // ============================================================================
  // LIEFERANTEN-MANAGEMENT
  // ============================================================================
  const handleAddLieferant = async () => {
    if (!newLieferant.lieferant_id) {
      showToast('Bitte wähle einen Lieferanten aus!', 'warning')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/artikel/${artikel.id}/lieferanten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lieferant_id: parseInt(newLieferant.lieferant_id),
          lieferanten_artikelnummer: newLieferant.lieferanten_artikelnummer,
          einkaufspreis: parseFloat(newLieferant.einkaufspreis) || null,
          lieferzeit_tage: parseInt(newLieferant.lieferzeit_tage) || null,
          bevorzugt: newLieferant.bevorzugt,
          notizen: newLieferant.notizen
        })
      })

      if (!response.ok) {
        throw new Error(`Fehler: ${response.status}`)
      }

      // Artikel neu laden um aktualisierte Lieferanten zu bekommen
      const updatedResponse = await fetch(`/api/artikel/${artikel.id}`)
      const updatedArtikel = await updatedResponse.json()
      
      onSave(updatedArtikel)
      
      // Form zurücksetzen
      setNewLieferant({
        lieferant_id: '',
        lieferanten_artikelnummer: '',
        einkaufspreis: '',
        lieferzeit_tage: '',
        bevorzugt: false,
        notizen: ''
      })
      setShowAddLieferant(false)
      showToast('Lieferant erfolgreich hinzugefügt!', 'success')
      
    } catch (err) {
      setError('Fehler beim Hinzufügen: ' + err.message)
      showToast('Fehler beim Hinzufügen: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveLieferant = async (lieferantId) => {
    if (!confirm('Lieferanten-Zuordnung wirklich entfernen?')) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/artikel/${artikel.id}/lieferanten/${lieferantId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Fehler: ${response.status}`)
      }

      // Artikel neu laden
      const updatedResponse = await fetch(`/api/artikel/${artikel.id}`)
      const updatedArtikel = await updatedResponse.json()
      
      onSave(updatedArtikel)
      
    } catch (err) {
      setError('Fehler beim Löschen: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!artikel) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {editMode ? 'Artikel bearbeiten' : 'Artikel-Details'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {artikel.artikelnummer} - {artikel.bezeichnung}
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

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('basis')}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                activeTab === 'basis'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Basis-Daten
            </button>
            
            {/* Varianten-Tab (nur wenn aktiviert) */}
            {formData?.hat_varianten && (
              <button
                onClick={() => setActiveTab('varianten')}
                className={`py-3 px-4 font-medium border-b-2 transition ${
                  activeTab === 'varianten'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Varianten ({varianten.length})
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('lieferanten')}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                activeTab === 'lieferanten'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Lieferanten ({artikel.lieferanten?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('bestand')}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                activeTab === 'bestand'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Bestand
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Lade Daten...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          ) : (
            <>
              {/* Tab: Basis-Daten */}
              {activeTab === 'basis' && formData && (
                <div className="space-y-6">
                  {/* Artikelnummer (Read-Only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artikelnummer
                    </label>
                    <input
                      type="text"
                      value={formData.artikelnummer}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed font-mono"
                    />
                  </div>

                  {/* Bezeichnung */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bezeichnung *
                    </label>
                    <input
                      type="text"
                      value={formData.bezeichnung || ''}
                      onChange={(e) => handleChange('bezeichnung', e.target.value)}
                      disabled={!editMode}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    />
                  </div>

                  {/* Beschreibung */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschreibung
                    </label>
                    <textarea
                      value={formData.beschreibung || ''}
                      onChange={(e) => handleChange('beschreibung', e.target.value)}
                      disabled={!editMode}
                      rows={3}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    />
                  </div>

                  {/* Kategorie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategorie
                    </label>
                    <select
                      value={formData.kategorie_id || ''}
                      onChange={(e) => handleChange('kategorie_id', e.target.value ? parseInt(e.target.value) : null)}
                      disabled={!editMode}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    >
                      <option value="">Keine Kategorie</option>
                      {kategorien.map(kat => (
                        <option key={kat.id} value={kat.id}>
                          {kat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Artikel-Typ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artikel-Typ *
                    </label>
                    <select
                      value={formData.typ || 'material'}
                      onChange={(e) => handleChange('typ', e.target.value)}
                      disabled={!editMode}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    >
                      <option value="material">🔩 Material (Schläuche, Reifen, Teile, ...)</option>
                      <option value="dienstleistung">⚙️ Dienstleistung (Arbeitszeit, Service, ...)</option>
                      <option value="werkzeug">🔧 Werkzeug (nur intern)</option>
                      <option value="sonstiges">📦 Sonstiges</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Nur "Material" wird in Bestandswarnungen angezeigt
                    </p>
                  </div>

                  {/* Preise */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Einkaufspreis
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={formData.einkaufspreis || ''}
                          onChange={(e) => handleChange('einkaufspreis', parseFloat(e.target.value))}
                          disabled={!editMode}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500">€</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verkaufspreis
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={formData.verkaufspreis || ''}
                          onChange={(e) => handleChange('verkaufspreis', parseFloat(e.target.value))}
                          disabled={!editMode}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500">€</span>
                      </div>
                    </div>
                  </div>

                  {/* Einheit & Lagerort */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Einheit
                      </label>
                      <input
                        type="text"
                        value={formData.einheit || ''}
                        onChange={(e) => handleChange('einheit', e.target.value)}
                        disabled={!editMode}
                        placeholder="Stück, Meter, kg, ..."
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lagerort
                      </label>
                      <select
                        value={formData.lagerort_id || ''}
                        onChange={(e) => handleChange('lagerort_id', e.target.value ? parseInt(e.target.value) : null)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                        }`}
                      >
                        <option value="">Kein Lagerort</option>
                        {lagerorte.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hat Varianten Toggle */}
                  <div className="border-t pt-6">
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <input
                        type="checkbox"
                        id="hat_varianten"
                        checked={formData.hat_varianten || false}
                        onChange={(e) => handleToggleHatVarianten(e.target.checked)}
                        disabled={!editMode}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label htmlFor="hat_varianten" className="block font-medium text-gray-900">
                          Hat Varianten
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          Aktiviere dies, wenn der Artikel mehrere Varianten hat (z.B. verschiedene Größen, Farben, Kassetten-Codes wie KSA18/KSA40, etc.)
                        </p>
                        {formData.hat_varianten && (
                          <p className="text-sm text-blue-700 mt-2 font-medium">
                            ✓ Varianten aktiv → Wechsle zum "Varianten"-Tab um Varianten zu verwalten
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notizen */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notizen
                    </label>
                    <textarea
                      value={formData.notizen || ''}
                      onChange={(e) => handleChange('notizen', e.target.value)}
                      disabled={!editMode}
                      rows={3}
                      placeholder="Interne Notizen zum Artikel..."
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Tab: Varianten */}
              {activeTab === 'varianten' && (
                <div className="space-y-4">
                  {/* Header mit Button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Varianten von {artikel.bezeichnung}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Verwalte verschiedene Ausführungen dieses Artikels
                      </p>
                    </div>
                    <button
                      onClick={handleNeueVariante}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <span>+</span>
                      Neue Variante
                    </button>
                  </div>

                  {/* Varianten-Liste */}
                  {loadingVarianten ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Lade Varianten...</p>
                    </div>
                  ) : varianten.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-lg">Noch keine Varianten vorhanden</p>
                      <p className="text-gray-400 text-sm mt-2">Klicke auf "Neue Variante" um eine anzulegen</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Artikelnummer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Spezifikation
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kompatibilität
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Farbe
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bestand
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              EK
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              UVP
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Aktionen
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {varianten.map((variante) => (
                            <tr key={variante.id} className={variante.ist_mindestbestand ? 'bg-yellow-50' : ''}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {variante.artikelnummer}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {variante.spezifikation || variante.etrto || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {variante.kompatibilitaet || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {variante.farbe || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={variante.ist_mindestbestand ? 'text-yellow-700 font-semibold' : 'text-gray-900'}>
                                  {variante.bestand_gesamt}
                                </span>
                                {variante.ist_mindestbestand && (
                                  <span className="ml-2 text-xs text-yellow-600">⚠ Niedrig</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {formatPreis(variante.preis_ek_effektiv)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {formatPreis(variante.preis_uvp)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <button
                                  onClick={() => handleEditVariante(variante)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleDeleteVariante(variante.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Löschen
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Lieferanten */}
              {activeTab === 'lieferanten' && (
                <div className="space-y-4">
                  {/* Bestehende Lieferanten */}
                  {artikel.lieferanten && artikel.lieferanten.length > 0 && (
                    <div className="space-y-3">
                      {artikel.lieferanten.map((al) => (
                        <div
                          key={al.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {al.lieferant?.name || 'Unbekannter Lieferant'}
                                </h4>
                                {al.bevorzugt && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                    ⭐ Bevorzugt
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">Lieferanten-Art.Nr:</span>
                                  <span className="ml-2 font-mono text-gray-900">
                                    {al.lieferanten_artikelnummer || '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Einkaufspreis:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {formatPreis(al.einkaufspreis)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Lieferzeit:</span>
                                  <span className="ml-2 text-gray-900">
                                    {al.lieferzeit_tage ? `${al.lieferzeit_tage} Tage` : '-'}
                                  </span>
                                </div>
                                {al.notizen && (
                                  <div className="col-span-2">
                                    <span className="text-gray-600">Notizen:</span>
                                    <span className="ml-2 text-gray-700 italic">
                                      {al.notizen}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {editMode && (
                              <button
                                className="ml-4 text-red-600 hover:text-red-800 font-medium text-sm"
                                onClick={() => handleRemoveLieferant(al.id)}
                                disabled={saving}
                              >
                                Entfernen
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Kein Lieferant zugeordnet */}
                  {(!artikel.lieferanten || artikel.lieferanten.length === 0) && !showAddLieferant && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 mb-4">Keine Lieferanten zugeordnet</p>
                      {editMode && (
                        <button
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                          onClick={() => setShowAddLieferant(true)}
                        >
                          + Lieferant hinzufügen
                        </button>
                      )}
                    </div>
                  )}

                  {/* Formular: Lieferant hinzufügen */}
                  {editMode && showAddLieferant && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Lieferant hinzufügen</h4>
                      
                      <div className="space-y-3">
                        {/* Lieferant auswählen */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lieferant *
                          </label>
                          <select
                            value={newLieferant.lieferant_id}
                            onChange={(e) => setNewLieferant({...newLieferant, lieferant_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Bitte wählen...</option>
                            {lieferanten.map(lief => (
                              <option key={lief.id} value={lief.id}>
                                {lief.name} ({lief.kurzname})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Lieferanten-Artikelnummer */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lieferanten-Artikelnummer
                          </label>
                          <input
                            type="text"
                            value={newLieferant.lieferanten_artikelnummer}
                            onChange={(e) => setNewLieferant({...newLieferant, lieferanten_artikelnummer: e.target.value})}
                            placeholder="z.B. RB-12345"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Einkaufspreis & Lieferzeit */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Einkaufspreis
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                value={newLieferant.einkaufspreis}
                                onChange={(e) => setNewLieferant({...newLieferant, einkaufspreis: e.target.value})}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="absolute right-3 top-2 text-gray-500">€</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Lieferzeit (Tage)
                            </label>
                            <input
                              type="number"
                              value={newLieferant.lieferzeit_tage}
                              onChange={(e) => setNewLieferant({...newLieferant, lieferzeit_tage: e.target.value})}
                              placeholder="z.B. 3"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Bevorzugt Checkbox */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="bevorzugt"
                            checked={newLieferant.bevorzugt}
                            onChange={(e) => setNewLieferant({...newLieferant, bevorzugt: e.target.checked})}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="bevorzugt" className="text-sm font-medium text-gray-700">
                            ⭐ Als bevorzugten Lieferanten markieren
                          </label>
                        </div>

                        {/* Notizen */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notizen
                          </label>
                          <textarea
                            value={newLieferant.notizen}
                            onChange={(e) => setNewLieferant({...newLieferant, notizen: e.target.value})}
                            placeholder="Optionale Notizen zu diesem Lieferanten..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => {
                              setShowAddLieferant(false)
                              setNewLieferant({
                                lieferant_id: '',
                                lieferanten_artikelnummer: '',
                                einkaufspreis: '',
                                lieferzeit_tage: '',
                                bevorzugt: false,
                                notizen: ''
                              })
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                            disabled={saving}
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={handleAddLieferant}
                            disabled={saving || !newLieferant.lieferant_id}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                          >
                            {saving ? 'Speichere...' : 'Hinzufügen'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Button: Weiteren Lieferanten hinzufügen */}
                  {editMode && artikel.lieferanten && artikel.lieferanten.length > 0 && !showAddLieferant && (
                    <button
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                      onClick={() => setShowAddLieferant(true)}
                    >
                      + Weiteren Lieferanten hinzufügen
                    </button>
                  )}
                </div>
              )}

              {/* Tab: Bestand */}
              {activeTab === 'bestand' && formData && (
                <div className="space-y-6">
                  {/* Gesamtbestand */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                    <div className="text-sm text-blue-700 font-medium mb-1">Gesamtbestand</div>
                    <div className="text-4xl font-bold text-blue-900">
                      {getBestand()} {formData.einheit || 'Stück'}
                    </div>
                  </div>

                  {/* Bestand Lager */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bestand Lager
                    </label>
                    <input
                      type="number"
                      value={formData.bestand_lager || 0}
                      onChange={(e) => handleChange('bestand_lager', parseInt(e.target.value) || 0)}
                      disabled={!editMode}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    />
                  </div>

                  {/* Bestand Werkstatt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bestand Werkstatt
                    </label>
                    <input
                      type="number"
                      value={formData.bestand_werkstatt || 0}
                      onChange={(e) => handleChange('bestand_werkstatt', parseInt(e.target.value) || 0)}
                      disabled={!editMode}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    />
                  </div>

                  {/* Mindestbestand */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mindestbestand
                    </label>
                    <input
                      type="number"
                      value={formData.mindestbestand || 0}
                      onChange={(e) => handleChange('mindestbestand', parseInt(e.target.value) || 0)}
                      disabled={!editMode}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        editMode ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                    />
                    {formData.mindestbestand > 0 && getBestand() <= formData.mindestbestand && (
                      <p className="mt-2 text-sm text-orange-600 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Mindestbestand erreicht oder unterschritten!</span>
                      </p>
                    )}
                  </div>

                  {/* Status-Anzeige */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-3">Bestand-Status</div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        getBestand() > (formData.mindestbestand || 0) * 2
                          ? 'bg-green-500'
                          : getBestand() > formData.mindestbestand
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}></div>
                      <span className="text-gray-900">
                        {getBestand() > (formData.mindestbestand || 0) * 2
                          ? 'Gut bevorratet'
                          : getBestand() > formData.mindestbestand
                          ? 'Normaler Bestand'
                          : 'Nachbestellen empfohlen'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {artikel.updated_at && (
              <span>Zuletzt geändert: {new Date(artikel.updated_at).toLocaleString('de-DE')}</span>
            )}
          </div>
          
          <div className="flex gap-3">
            {!editMode ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Schließen
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Bearbeiten
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setFormData({ ...artikel })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {saving ? 'Speichere...' : 'Speichern'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Variante Bearbeiten Modal */}
      {showVarianteModal && (
        <VarianteBearbeitenModal
          artikelId={artikel.id}
          variante={currentVariante}
          onClose={() => {
            setShowVarianteModal(false)
            setCurrentVariante(null)
          }}
          onSave={handleVarianteSaved}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default ArtikelDetailsModal
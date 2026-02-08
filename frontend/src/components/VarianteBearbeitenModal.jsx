import { useState, useEffect } from 'react';
import { X, Save, Barcode as BarcodeIcon } from 'lucide-react';

/**
 * VarianteBearbeitenModal
 * Modal zum Erstellen/Bearbeiten einer Artikel-Variante
 * 
 * Features:
 * - Hartje-Artikelnummer (Pflicht)
 * - ETRTO (optional - für Reifen)
 * - Automatische Zoll-Berechnung
 * - Barcode (optional - später per Scanner)
 * - Preise: EK, EK rabattiert, UVP
 * - Bestand
 */

const VarianteBearbeitenModal = ({ 
  artikelId,
  variante = null, // Wenn vorhanden: Edit-Mode, sonst Create
  onClose, 
  onSave 
}) => {
  const isEdit = !!variante;

  // Form State
  const [formData, setFormData] = useState({
    artikelnummer: '',
    barcode: '',
    etrto: '',
    zoll_info: '',
    farbe: '',
    preis_ek: '',
    preis_ek_rabattiert: '',
    preis_uvp: '',
    bestand_lager: 0,
    bestand_werkstatt: 0,
    mindestbestand: 0,
    notizen: '',
    aktiv: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Gängige ETRTO-Größen für Dropdown
  const ETRTO_GROESSEN = {
    '28 Zoll': ['37-622', '40-622', '42-622', '47-622', '50-622', '54-622', '57-622'],
    '26 Zoll': ['40-559', '47-559', '50-559', '54-559', '57-559', '60-559'],
    '24 Zoll': ['40-507', '47-507', '50-507', '54-507'],
    '20 Zoll': ['40-406', '47-406', '50-406', '54-406', '57-406'],
    '29 Zoll': ['50-622', '54-622', '57-622', '60-622', '62-622'],
  };

  // Initialisiere Form mit Variante (Edit-Mode)
  useEffect(() => {
    if (variante) {
      setFormData({
        artikelnummer: variante.artikelnummer || '',
        barcode: variante.barcode || '',
        etrto: variante.etrto || '',
        zoll_info: variante.zoll_info || '',
        farbe: variante.farbe || '',
        preis_ek: variante.preis_ek || '',
        preis_ek_rabattiert: variante.preis_ek_rabattiert || '',
        preis_uvp: variante.preis_uvp || '',
        bestand_lager: variante.bestand_lager || 0,
        bestand_werkstatt: variante.bestand_werkstatt || 0,
        mindestbestand: variante.mindestbestand || 0,
        notizen: variante.notizen || '',
        aktiv: variante.aktiv !== false,
      });
    }
  }, [variante]);

  // Input Handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ETRTO-Änderung → Zoll automatisch berechnen
  const handleETRTOChange = (e) => {
    const etrto = e.target.value;
    setFormData(prev => ({
      ...prev,
      etrto: etrto,
      zoll_info: etrtoToZoll(etrto)
    }));
  };

  // ETRTO → Zoll Umrechnung (Client-seitig, Backend macht das auch)
  const etrtoToZoll = (etrto) => {
    if (!etrto || !etrto.includes('-')) return '';

    const parts = etrto.split('-');
    if (parts.length !== 2) return '';

    const breite = parseInt(parts[0]);
    const durchmesser = parseInt(parts[1]);

    const zollMap = {
      622: '28"', 635: '28"',
      590: '26"', 559: '26"', 571: '26"',
      507: '24"', 520: '24"', 540: '24"',
      451: '20"', 406: '20"', 419: '20"',
      355: '18"', 369: '18"',
      305: '16"', 317: '16"',
      203: '12"',
    };

    const zoll = zollMap[durchmesser] || `${durchmesser}mm`;
    const breiteInch = (breite / 25.4).toFixed(2);
    
    return `${zoll} x ${breiteInch}`;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEdit 
        ? `/api/varianten/${variante.id}`
        : `/api/varianten/artikel/${artikelId}`;

      const method = isEdit ? 'PUT' : 'POST';

      // Daten vorbereiten
      const payload = {
        ...formData,
        preis_ek: parseFloat(formData.preis_ek) || 0,
        preis_ek_rabattiert: formData.preis_ek_rabattiert ? parseFloat(formData.preis_ek_rabattiert) : null,
        preis_uvp: parseFloat(formData.preis_uvp) || 0,
        bestand_lager: parseInt(formData.bestand_lager) || 0,
        bestand_werkstatt: parseInt(formData.bestand_werkstatt) || 0,
        mindestbestand: parseInt(formData.mindestbestand) || 0,
      };

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Fehler beim Speichern');
      }

      const saved = await response.json();
      onSave(saved);
      onClose();

    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Variante bearbeiten' : 'Neue Variante'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Identifikation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Identifikation</h3>
            
            {/* Hartje-Artikelnummer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieferanten-Artikelnummer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="artikelnummer"
                value={formData.artikelnummer}
                onChange={handleChange}
                placeholder="z.B. 0.754.432/3"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Hartje-Nr, ZEG-Nr, oder andere Lieferanten-Nummer
              </p>
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <BarcodeIcon size={16} />
                Barcode
                <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                placeholder="Später einpflegen oder scannen"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                EAN13, Code128, oder QR-Code (kann später ergänzt werden)
              </p>
            </div>
          </div>

          {/* Spezifikation (für Reifen) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Spezifikation</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* ETRTO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ETRTO
                  <span className="text-gray-400 text-xs ml-1">(nur Reifen)</span>
                </label>
                <input
                  type="text"
                  name="etrto"
                  value={formData.etrto}
                  onChange={handleETRTOChange}
                  placeholder="z.B. 47-507"
                  list="etrto-suggestions"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <datalist id="etrto-suggestions">
                  {Object.entries(ETRTO_GROESSEN).map(([gruppe, groessen]) => (
                    <optgroup key={gruppe} label={gruppe}>
                      {groessen.map(g => (
                        <option key={g} value={g} />
                      ))}
                    </optgroup>
                  ))}
                </datalist>
              </div>

              {/* Zoll (automatisch) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zoll-Bezeichnung
                  <span className="text-gray-400 text-xs ml-1">(automatisch)</span>
                </label>
                <input
                  type="text"
                  name="zoll_info"
                  value={formData.zoll_info}
                  readOnly
                  placeholder="Wird aus ETRTO berechnet"
                  className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            {/* Farbe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Farbe
                <span className="text-gray-400 text-xs ml-1">(optional)</span>
              </label>
              <input
                type="text"
                name="farbe"
                value={formData.farbe}
                onChange={handleChange}
                placeholder="z.B. schwarz, weiß, rot"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preise */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Preise</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {/* EK */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  EK <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="preis_ek"
                    value={formData.preis_ek}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>

              {/* EK rabattiert */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  EK rabattiert
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="preis_ek_rabattiert"
                    value={formData.preis_ek_rabattiert}
                    onChange={handleChange}
                    placeholder="optional"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>

              {/* UVP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UVP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="preis_uvp"
                    value={formData.preis_uvp}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bestand */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Bestand</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lager
                </label>
                <input
                  type="number"
                  name="bestand_lager"
                  value={formData.bestand_lager}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Werkstatt
                </label>
                <input
                  type="number"
                  name="bestand_werkstatt"
                  value={formData.bestand_werkstatt}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mindestbestand
                </label>
                <input
                  type="number"
                  name="mindestbestand"
                  value={formData.mindestbestand}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notizen
            </label>
            <textarea
              name="notizen"
              value={formData.notizen}
              onChange={handleChange}
              rows={3}
              placeholder="Interne Notizen..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Aktiv */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="aktiv"
              id="aktiv"
              checked={formData.aktiv}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="aktiv" className="text-sm font-medium text-gray-700">
              Aktiv
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VarianteBearbeitenModal;

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Truck, Save, AlertCircle } from 'lucide-react';

/**
 * BestellungModal - Erstellen/Bearbeiten von Bestellungen
 * Mit Positionen-Verwaltung und ETRTO-Support
 */
export const BestellungModal = ({ bestellung, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    lieferant_id: bestellung?.lieferant_id || '',
    notizen: bestellung?.notizen || '',
    positionen: bestellung?.positionen || [],
  });
  const [lieferanten, setLieferanten] = useState([]);
  const [artikel, setArtikel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!bestellung?.id;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Lieferanten laden
      const liefResponse = await fetch('/api/lieferanten/');
      if (liefResponse.ok) {
        const data = await liefResponse.json();
        setLieferanten(data.items || data);
      }

      // Artikel laden (für Autocomplete)
      const artResponse = await fetch('/api/artikel/?limit=500');
      if (artResponse.ok) {
        const data = await artResponse.json();
        setArtikel(data.items || data);
      }
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    }
  };

  const handleAddPosition = () => {
    setFormData(prev => ({
      ...prev,
      positionen: [
        ...prev.positionen,
        {
          artikelnummer: '',
          beschreibung: '',
          etrto: '',
          zoll_info: '',
          menge_bestellt: 1,
          einkaufspreis: 0,
          verkaufspreis: 0,
        }
      ]
    }));
  };

  const handleRemovePosition = (index) => {
    setFormData(prev => ({
      ...prev,
      positionen: prev.positionen.filter((_, i) => i !== index)
    }));
  };

  const handlePositionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      positionen: prev.positionen.map((pos, i) => 
        i === index ? { ...pos, [field]: value } : pos
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEdit 
        ? `/api/bestellungen/${bestellung.id}`
        : '/api/bestellungen/';
      
      const method = isEdit ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Fehler beim Speichern');
      }

      const saved = await response.json();
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? `Bestellung bearbeiten` : 'Neue Bestellung'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2 text-red-800">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Lieferant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieferant *
              </label>
              <select
                required
                value={formData.lieferant_id}
                onChange={(e) => setFormData({ ...formData, lieferant_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bitte wählen...</option>
                {lieferanten.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.kurzname && `(${l.kurzname})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen
              </label>
              <textarea
                value={formData.notizen}
                onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Optional: Zusätzliche Informationen zur Bestellung..."
              />
            </div>

            {/* Positionen */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Positionen ({formData.positionen.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddPosition}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus size={14} />
                  Position hinzufügen
                </button>
              </div>

              <div className="space-y-3">
                {formData.positionen.map((pos, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {/* Artikelnummer */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Art.-Nr. *
                          </label>
                          <input
                            type="text"
                            required
                            value={pos.artikelnummer}
                            onChange={(e) => handlePositionChange(index, 'artikelnummer', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="z.B. 12345"
                          />
                        </div>

                        {/* Beschreibung */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Beschreibung *
                          </label>
                          <input
                            type="text"
                            required
                            value={pos.beschreibung}
                            onChange={(e) => handlePositionChange(index, 'beschreibung', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="z.B. Reifen Continental Contact"
                          />
                        </div>

                        {/* ETRTO */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            ETRTO
                          </label>
                          <input
                            type="text"
                            value={pos.etrto || ''}
                            onChange={(e) => handlePositionChange(index, 'etrto', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="z.B. 37-622"
                          />
                        </div>

                        {/* Zoll Info */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Zoll (Info)
                          </label>
                          <input
                            type="text"
                            value={pos.zoll_info || ''}
                            onChange={(e) => handlePositionChange(index, 'zoll_info', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="z.B. 28 x 1.40"
                          />
                        </div>

                        {/* Menge */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Menge *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={pos.menge_bestellt}
                            onChange={(e) => handlePositionChange(index, 'menge_bestellt', parseInt(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>

                        {/* EK */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            EK (€) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={pos.einkaufspreis}
                            onChange={(e) => handlePositionChange(index, 'einkaufspreis', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>

                        {/* VK */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            VK (€) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={pos.verkaufspreis}
                            onChange={(e) => handlePositionChange(index, 'verkaufspreis', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>

                        {/* Summe */}
                        <div className="col-span-2 text-right text-sm text-gray-600">
                          Summe EK: <span className="font-medium">{(pos.menge_bestellt * pos.einkaufspreis).toFixed(2)} €</span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePosition(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Position löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {formData.positionen.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Keine Positionen. Klicke auf "Position hinzufügen" um Artikel zur Bestellung hinzuzufügen.
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {formData.positionen.length > 0 && (
              <span>
                Gesamt EK: <span className="font-bold">
                  {formData.positionen.reduce((sum, pos) => sum + (pos.menge_bestellt * pos.einkaufspreis), 0).toFixed(2)} €
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.lieferant_id}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Save size={16} />
              {loading ? 'Speichern...' : (isEdit ? 'Aktualisieren' : 'Erstellen')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * WareneingangModal - Wareneingang für Bestellung erfassen
 */
export const WareneingangModal = ({ bestellung, onClose, onSave }) => {
  const [eingang, setEingang] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleWareneingang = async (positionId, menge) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bestellungen/positionen/${positionId}/wareneingang`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menge }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Fehler beim Wareneingang');
      }

      // Eingang zurücksetzen
      setEingang(prev => ({ ...prev, [positionId]: '' }));
      
      // Callback
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Wareneingang: {bestellung.bestellnummer}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 flex items-center gap-2 text-red-800">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {bestellung.positionen?.map(pos => (
              <div key={pos.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{pos.beschreibung}</div>
                    <div className="text-sm text-gray-600">Art.-Nr.: {pos.artikelnummer}</div>
                    {pos.etrto && (
                      <div className="text-sm text-blue-600">
                        ETRTO: {pos.etrto} {pos.zoll_info && `(${pos.zoll_info})`}
                      </div>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    pos.vollstaendig_geliefert 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {pos.menge_geliefert}/{pos.menge_bestellt}
                  </div>
                </div>

                {!pos.vollstaendig_geliefert && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      max={pos.menge_offen}
                      value={eingang[pos.id] || ''}
                      onChange={(e) => setEingang({ ...eingang, [pos.id]: e.target.value })}
                      placeholder={`Max ${pos.menge_offen}`}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded"
                    />
                    <button
                      onClick={() => handleWareneingang(pos.id, parseInt(eingang[pos.id] || 0))}
                      disabled={!eingang[pos.id] || loading}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Erfassen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 hover:bg-gray-200 rounded"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

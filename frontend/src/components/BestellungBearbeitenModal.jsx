import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Toast from './Toast';

const BestellungBearbeitenModal = ({ bestellung, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    status: '',
    lieferdatum_erwartet: '',
    notizen: '',
    interne_notizen: '',
    versandkosten: 0
  });
  
  const [positionen, setPositionen] = useState([]);
  const [editingPosition, setEditingPosition] = useState(null);
  const [showAddArtikel, setShowAddArtikel] = useState(false);
  const [alleArtikel, setAlleArtikel] = useState([]);
  const [suchbegriff, setSuchbegriff] = useState('');
  const [neuerArtikel, setNeuerArtikel] = useState(null);
  const [neuePosition, setNeuePosition] = useState({
    menge_bestellt: 1,
    einkaufspreis: 0,
    verkaufspreis: 0,
    notizen: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Initialisiere Formular mit Bestelldaten
  useEffect(() => {
    if (bestellung) {
      setFormData({
        status: bestellung.status || 'offen',
        lieferdatum_erwartet: bestellung.lieferdatum_erwartet 
          ? bestellung.lieferdatum_erwartet.split('T')[0] 
          : '',
        notizen: bestellung.notizen || '',
        interne_notizen: bestellung.interne_notizen || '',
        versandkosten: bestellung.versandkosten || 0
      });
      setPositionen(bestellung.positionen || []);
    }
  }, [bestellung]);

  // Lade Artikel für Suche
  useEffect(() => {
    const fetchArtikel = async () => {
      try {
        const response = await fetch('/api/artikel');
        const data = await response.json();
        setAlleArtikel(data.items || data);
      } catch (err) {
        console.error('Fehler beim Laden der Artikel:', err);
      }
    };
    if (showAddArtikel) {
      fetchArtikel();
    }
  }, [showAddArtikel]);

  // Gefilterte Artikel für Suche
  const gefilterteArtikel = alleArtikel.filter(artikel => {
    if (!suchbegriff) return false;
    const begriff = suchbegriff.toLowerCase();
    return (
      artikel.artikelnummer?.toLowerCase().includes(begriff) ||
      artikel.bezeichnung?.toLowerCase().includes(begriff)
    );
  }).slice(0, 10);

  // Berechnungen
  const berechneSummen = () => {
    const zwischensumme = positionen.reduce((sum, pos) => {
      return sum + (Number(pos.menge_bestellt) * Number(pos.einkaufspreis));
    }, 0);
    const gesamtpreis = zwischensumme + Number(formData.versandkosten);
    return { zwischensumme, gesamtpreis };
  };

  const { zwischensumme, gesamtpreis } = berechneSummen();

  // Position bearbeiten
  const handlePositionEdit = (position) => {
    setEditingPosition({
      ...position,
      menge_bestellt: position.menge_bestellt,
      einkaufspreis: position.einkaufspreis,
      notizen: position.notizen || ''
    });
  };

  const handlePositionSave = async () => {
    if (!editingPosition) return;

    // Nur bei Entwürfen kann Menge/Preis geändert werden
    if (bestellung.status !== 'offen' && 
        (editingPosition.menge_bestellt !== positionen.find(p => p.id === editingPosition.id)?.menge_bestellt ||
         editingPosition.einkaufspreis !== positionen.find(p => p.id === editingPosition.id)?.einkaufspreis)) {
      showToast('Menge und Preis können nur bei Entwürfen geändert werden', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/bestellungen/positionen/${editingPosition.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menge_bestellt: Number(editingPosition.menge_bestellt),
            einkaufspreis: Number(editingPosition.einkaufspreis),
            verkaufspreis: Number(editingPosition.verkaufspreis),
            notizen: editingPosition.notizen
          })
        }
      );

      if (!response.ok) throw new Error('Fehler beim Speichern');

      const updatedPosition = await response.json();
      
      // Aktualisiere lokale Positionen
      setPositionen(positionen.map(p => 
        p.id === editingPosition.id ? updatedPosition : p
      ));
      setEditingPosition(null);
      showToast('Position gespeichert!', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Fehler: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Position löschen
  const handlePositionDelete = async (positionId) => {
    if (positionen.length <= 1) {
      showToast('Mindestens eine Position muss verbleiben', 'warning');
      return;
    }

    if (bestellung.status !== 'offen') {
      showToast('Positionen können nur bei offenen Bestellungen gelöscht werden', 'warning');
      return;
    }

    if (!confirm('Position wirklich löschen?')) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/bestellungen/${bestellung.id}/positionen/${positionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Fehler beim Löschen');

      setPositionen(positionen.filter(p => p.id !== positionId));
      showToast('Position gelöscht!', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Fehler: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Artikel auswählen zum Hinzufügen
  const handleArtikelSelect = (artikel) => {
    setNeuerArtikel(artikel);
    setNeuePosition({
      menge_bestellt: 1,
      einkaufspreis: artikel.einkaufspreis || 0,
      verkaufspreis: artikel.verkaufspreis || 0,
      notizen: ''
    });
    setSuchbegriff('');
  };

  // Neue Position hinzufügen
  const handlePositionAdd = async () => {
    if (!neuerArtikel) return;

    if (bestellung.status !== 'offen') {
      showToast('Positionen können nur bei offenen Bestellungen hinzugefügt werden', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/bestellungen/${bestellung.id}/positionen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artikel_id: neuerArtikel.id,
          menge_bestellt: Number(neuePosition.menge_bestellt),
          einkaufspreis: Number(neuePosition.einkaufspreis),
          verkaufspreis: Number(neuePosition.verkaufspreis),
          notizen: neuePosition.notizen
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Fehler beim Hinzufügen');
      }

      const newPosition = await response.json();
      
      // Position zur Liste hinzufügen
      setPositionen([...positionen, newPosition]);
      
      // Reset
      setNeuerArtikel(null);
      setShowAddArtikel(false);
      setNeuePosition({ 
        menge_bestellt: 1, 
        einkaufspreis: 0, 
        verkaufspreis: 0,
        notizen: '' 
      });
      showToast('Artikel hinzugefügt!', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Fehler: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bestellung aktualisieren
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/bestellungen/${bestellung.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          lieferdatum_erwartet: formData.lieferdatum_erwartet || null,
          notizen: formData.notizen,
          interne_notizen: formData.interne_notizen,
          versandkosten: Number(formData.versandkosten)
        })
      });

      if (!response.ok) throw new Error('Fehler beim Speichern');

      const updated = await response.json();
      showToast('Änderungen erfolgreich gespeichert!', 'success');
      setTimeout(() => {
        onUpdate(updated);
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message);
      showToast('Fehler: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Status ändern
  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bestellungen/${bestellung.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Fehler beim Status-Update');

      const updated = await response.json();
      setFormData({ ...formData, status: newStatus });
      showToast('Status erfolgreich geändert!', 'success');
      onUpdate(updated);
    } catch (err) {
      setError(err.message);
      showToast('Fehler: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bestellung löschen
  const handleDelete = async () => {
    if (bestellung.status !== 'offen') {
      showToast('Nur offene Bestellungen können gelöscht werden', 'warning');
      return;
    }

    if (!confirm(`Bestellung ${bestellung.bestellnummer} wirklich löschen?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/bestellungen/${bestellung.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Fehler beim Löschen');

      showToast('Bestellung erfolgreich gelöscht!', 'success');
      setTimeout(() => {
        onUpdate(null); // Signal zum Entfernen
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message);
      showToast('Fehler: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'offen', label: 'Offen', color: 'bg-gray-100 text-gray-800' },
    { value: 'bestellt', label: 'Bestellt', color: 'bg-blue-100 text-blue-800' },
    { value: 'teilweise_geliefert', label: 'Teilweise geliefert', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'geliefert', label: 'Geliefert', color: 'bg-green-100 text-green-800' },
    { value: 'abgeschlossen', label: 'Abgeschlossen', color: 'bg-purple-100 text-purple-800' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Bestellung bearbeiten</h2>
            <p className="text-blue-100 text-sm mt-1">{bestellung?.bestellnummer}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4">
            <div className="flex items-center">
              <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Linke Spalte - Positionen */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Positionen ({positionen.length})
                </h3>
                {bestellung?.status === 'offen' && (
                  <button
                    onClick={() => setShowAddArtikel(!showAddArtikel)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Artikel hinzufügen
                  </button>
                )}
              </div>

              {/* Artikel hinzufügen Panel */}
              {showAddArtikel && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">Artikel suchen</h4>
                  
                  {/* Suchfeld */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={suchbegriff}
                      onChange={(e) => setSuchbegriff(e.target.value)}
                      placeholder="Artikelnummer oder Bezeichnung..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Suchergebnisse */}
                  {suchbegriff && gefilterteArtikel.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {gefilterteArtikel.map(artikel => (
                        <button
                          key={artikel.id}
                          onClick={() => handleArtikelSelect(artikel)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 transition"
                        >
                          <div className="font-medium text-gray-900">{artikel.bezeichnung}</div>
                          <div className="text-sm text-gray-500">{artikel.artikelnummer}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ausgewählter Artikel */}
                  {neuerArtikel && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="font-medium text-gray-900">{neuerArtikel.bezeichnung}</div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Menge
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={neuePosition.menge_bestellt}
                            onChange={(e) => setNeuePosition({ ...neuePosition, menge_bestellt: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            EK-Preis (€)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={neuePosition.einkaufspreis}
                            onChange={(e) => setNeuePosition({ ...neuePosition, einkaufspreis: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handlePositionAdd}
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          In Warenkorb legen
                        </button>
                        <button
                          onClick={() => {
                            setNeuerArtikel(null);
                            setShowAddArtikel(false);
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Positionen Liste */}
              <div className="space-y-2">
                {positionen.map((position) => (
                  <div
                    key={position.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    {editingPosition?.id === position.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="font-medium text-gray-900">
                          {position.artikel?.bezeichnung || 'Artikel'}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Menge</label>
                            <input
                              type="number"
                              min="1"
                              value={editingPosition.menge_bestellt}
                              onChange={(e) => setEditingPosition({ ...editingPosition, menge_bestellt: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              disabled={bestellung.status !== 'offen'}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">EK-Preis (€)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingPosition.einkaufspreis}
                              onChange={(e) => setEditingPosition({ ...editingPosition, einkaufspreis: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              disabled={bestellung.status !== 'offen'}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handlePositionSave}
                            disabled={loading}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                          >
                            <CheckIcon className="w-4 h-4 mr-1" />
                            Speichern
                          </button>
                          <button
                            onClick={() => setEditingPosition(null)}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {position.artikel?.bezeichnung || 'Artikel'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {position.menge_bestellt}× à {Number(position.einkaufspreis).toFixed(2)} € = {' '}
                            <span className="font-semibold text-gray-900">
                              {(Number(position.menge_bestellt) * Number(position.einkaufspreis)).toFixed(2)} €
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handlePositionEdit(position)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Bearbeiten"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {bestellung.status === 'offen' && positionen.length > 1 && (
                            <button
                              onClick={() => handlePositionDelete(position.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Löschen"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summen */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Zwischensumme:</span>
                  <span className="font-semibold">{zwischensumme.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Versandkosten:</span>
                  <span className="font-semibold">{Number(formData.versandkosten).toFixed(2)} €</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">Gesamtpreis:</span>
                  <span className="font-bold text-green-600 text-lg">{gesamtpreis.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Rechte Spalte - Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Bestelldetails</h3>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        formData.status === option.value
                          ? option.color + ' ring-2 ring-offset-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lieferant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieferant
                </label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900">
                    {bestellung?.lieferant?.name || 'Kein Lieferant'}
                  </div>
                </div>
              </div>

              {/* Lieferdatum erwartet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Erwartetes Lieferdatum
                </label>
                <input
                  type="date"
                  value={formData.lieferdatum_erwartet}
                  onChange={(e) => setFormData({ ...formData, lieferdatum_erwartet: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Versandkosten */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Versandkosten (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.versandkosten}
                  onChange={(e) => setFormData({ ...formData, versandkosten: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={bestellung.status !== 'offen'}
                />
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen
                </label>
                <textarea
                  value={formData.notizen}
                  onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Notizen zur Bestellung..."
                />
              </div>

              {/* Interne Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interne Notizen
                </label>
                <textarea
                  value={formData.interne_notizen}
                  onChange={(e) => setFormData({ ...formData, interne_notizen: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Interne Notizen (nicht für Lieferanten)..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <div>
            {bestellung?.status === 'offen' && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
              >
                <TrashIcon className="w-4 h-4 inline mr-2" />
                Bestellung löschen
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Speichern...' : 'Änderungen speichern'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default BestellungBearbeitenModal;
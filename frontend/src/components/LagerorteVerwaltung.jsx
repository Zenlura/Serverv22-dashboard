import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Archive } from 'lucide-react';

/**
 * Lagerorte-Verwaltung
 * 
 * Verwaltet Lagerorte wie:
 * - Keller
 * - Schränke im Käfig  
 * - Werkstatt/Büro
 */
const LagerorteVerwaltung = () => {
  const [lagerorte, setLagerorte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLagerort, setEditingLagerort] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    beschreibung: '',
    sortierung: 0,
    aktiv: true
  });

  useEffect(() => {
    loadLagerorte();
  }, []);

  const loadLagerorte = async () => {
    try {
      const response = await fetch('/api/lagerorte/?nur_aktive=false');
      if (response.ok) {
        const data = await response.json();
        setLagerorte(data);
      }
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingLagerort 
        ? `/api/lagerorte/${editingLagerort.id}`
        : '/api/lagerorte/';
      
      const response = await fetch(url, {
        method: editingLagerort ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Fehler beim Speichern');
      }

      loadLagerorte();
      handleCloseModal();
      alert(editingLagerort ? 'Lagerort aktualisiert!' : 'Lagerort erstellt!');
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Lagerort "${name}" wirklich löschen?\n\nNur möglich wenn keine Artikel zugeordnet sind.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/lagerorte/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Fehler beim Löschen');
      }

      loadLagerorte();
      alert('Lagerort gelöscht!');
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  };

  const handleOpenModal = (lagerort = null) => {
    if (lagerort) {
      setEditingLagerort(lagerort);
      setFormData({
        name: lagerort.name,
        beschreibung: lagerort.beschreibung || '',
        sortierung: lagerort.sortierung,
        aktiv: lagerort.aktiv
      });
    } else {
      setEditingLagerort(null);
      setFormData({
        name: '',
        beschreibung: '',
        sortierung: lagerorte.length, // Ans Ende setzen
        aktiv: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLagerort(null);
    setFormData({ name: '', beschreibung: '', sortierung: 0, aktiv: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive size={20} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Lagerorte</h2>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          <Plus size={16} />
          Neuer Lagerort
        </button>
      </div>

      {/* Liste */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lagerorte.map((lagerort) => (
          <div
            key={lagerort.id}
            className={`bg-white border rounded-lg p-4 ${
              lagerort.aktiv ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{lagerort.name}</h3>
                {!lagerort.aktiv && (
                  <span className="text-xs text-gray-500">Inaktiv</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenModal(lagerort)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                  title="Bearbeiten"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(lagerort.id, lagerort.name)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {lagerort.beschreibung && (
              <p className="text-sm text-gray-600">{lagerort.beschreibung}</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              Sortierung: {lagerort.sortierung}
            </div>
          </div>
        ))}
      </div>

      {lagerorte.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Archive size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">Noch keine Lagerorte angelegt</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Ersten Lagerort erstellen
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editingLagerort ? 'Lagerort bearbeiten' : 'Neuer Lagerort'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Keller, Schränke im Käfig"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={formData.beschreibung}
                  onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Regal 1-5 im Keller"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sortierung
                </label>
                <input
                  type="number"
                  value={formData.sortierung}
                  onChange={(e) => setFormData({ ...formData, sortierung: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Niedrigere Zahl = weiter oben in der Liste
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="aktiv"
                  checked={formData.aktiv}
                  onChange={(e) => setFormData({ ...formData, aktiv: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="aktiv" className="text-sm text-gray-700">
                  Aktiv
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingLagerort ? 'Speichern' : 'Erstellen'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LagerorteVerwaltung;

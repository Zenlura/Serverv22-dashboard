import React, { useState, useEffect } from 'react';
import { Archive, Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';

const LagerorteVerwaltung = () => {
  const [lagerorte, setLagerorte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    beschreibung: '',
    sortierung: 0,
    aktiv: true
  });

  // Lagerorte laden
  useEffect(() => {
    loadLagerorte();
  }, []);

  const loadLagerorte = async () => {
    try {
      const response = await fetch('/api/lagerorte/?nur_aktive=false');
      const data = await response.json();
      setLagerorte(data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  // Neuer Lagerort / Bearbeiten Modal öffnen
  const openModal = (lagerort = null) => {
    if (lagerort) {
      setEditingId(lagerort.id);
      setFormData({
        name: lagerort.name,
        beschreibung: lagerort.beschreibung || '',
        sortierung: lagerort.sortierung,
        aktiv: lagerort.aktiv
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        beschreibung: '',
        sortierung: 0,
        aktiv: true
      });
    }
    setShowModal(true);
  };

  // Speichern (Erstellen oder Updaten)
  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingId 
        ? `/api/lagerorte/${editingId}`
        : '/api/lagerorte/';
      
      const method = editingId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Fehler beim Speichern');
      }

      await loadLagerorte();
      setShowModal(false);
    } catch (error) {
      alert('Fehler: ' + error.message);
    }
  };

  // Löschen
  const handleDelete = async (id) => {
    if (!confirm('Lagerort wirklich löschen? Geht nur wenn keine Artikel zugeordnet sind.')) {
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

      await loadLagerorte();
    } catch (error) {
      alert('Fehler: ' + error.message);
    }
  };

  // Sortierung ändern
  const changeSortierung = async (lagerort, direction) => {
    const newSortierung = direction === 'up' 
      ? lagerort.sortierung - 1 
      : lagerort.sortierung + 1;

    try {
      const response = await fetch(`/api/lagerorte/${lagerort.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortierung: newSortierung })
      });

      if (response.ok) {
        await loadLagerorte();
      }
    } catch (error) {
      console.error('Fehler beim Sortieren:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="text-gray-500">Lade Lagerorte...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Archive size={32} className="text-indigo-600" />
            Lagerorte
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalte deine Lagerorte (Keller, Schränke im Käfig, Werkstatt/Büro)
          </p>
        </div>
        
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus size={20} />
          Neuer Lagerort
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sortierung
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Beschreibung
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lagerorte.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  Noch keine Lagerorte vorhanden
                </td>
              </tr>
            ) : (
              lagerorte.map((lagerort) => (
                <tr key={lagerort.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeSortierung(lagerort, 'up')}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Nach oben"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <span className="text-gray-600">{lagerort.sortierung}</span>
                      <button
                        onClick={() => changeSortierung(lagerort, 'down')}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Nach unten"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {lagerort.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {lagerort.beschreibung || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      lagerort.aktiv 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lagerort.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(lagerort)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                      title="Bearbeiten"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(lagerort.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Lagerort bearbeiten' : 'Neuer Lagerort'}
            </h2>
            
            <form onSubmit={handleSave}>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    placeholder="z.B. Keller, Schränke im Käfig"
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.beschreibung}
                    onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="3"
                    placeholder="z.B. Regal 1-5 im Keller"
                  />
                </div>

                {/* Sortierung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sortierung
                  </label>
                  <input
                    type="number"
                    value={formData.sortierung}
                    onChange={(e) => setFormData({ ...formData, sortierung: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Niedrigere Zahl = weiter oben
                  </p>
                </div>

                {/* Aktiv */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aktiv}
                    onChange={(e) => setFormData({ ...formData, aktiv: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Aktiv
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  <X size={18} className="inline mr-1" />
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Save size={18} className="inline mr-1" />
                  Speichern
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

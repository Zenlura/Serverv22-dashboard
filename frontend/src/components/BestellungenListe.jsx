import React, { useState, useEffect } from 'react';
import { Package, Plus, Download, Eye, Edit2, Trash2, AlertCircle, CheckCircle, Clock, Truck, Archive } from 'lucide-react';

/**
 * BestellungenListe - Hauptübersicht aller Sammelbestellungen
 * 
 * Features:
 * - Liste nach Lieferant gruppiert
 * - Status-Filter (offen, bestellt, teilweise_geliefert, geliefert, abgeschlossen)
 * - PDF-Download
 * - Wareneingang erfassen
 */
const BestellungenListe = ({ onNewBestellung, onEditBestellung, onWareneingangClick, refreshKey = 0 }) => {
  const [bestellungen, setBestellungen] = useState([]);
  const [lieferanten, setLieferanten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('alle');

  useEffect(() => {
    loadData();
  }, [statusFilter, refreshKey]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Bestellungen laden
      const params = new URLSearchParams();
      if (statusFilter !== 'alle') {
        params.append('status', statusFilter);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/bestellungen/?${params.toString()}`);
      if (!response.ok) throw new Error('Fehler beim Laden der Bestellungen');
      
      const data = await response.json();
      setBestellungen(data);

      // Lieferanten laden
      const liefResponse = await fetch('/api/lieferanten/');
      if (liefResponse.ok) {
        const liefData = await liefResponse.json();
        setLieferanten(liefData.items || liefData);
      }

    } catch (err) {
      console.error('Ladefehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBestellung = async (id) => {
    if (!confirm('Bestellung wirklich löschen? (Nur möglich bei Status "offen")')) {
      return;
    }

    try {
      const response = await fetch(`/api/bestellungen/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Fehler beim Löschen');
      }

      loadData(); // Neu laden
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  };

  const handleDownloadPDF = async (id, bestellnummer) => {
    try {
      const response = await fetch(`/api/bestellungen/${id}/pdf`);
      if (!response.ok) throw new Error('Fehler beim PDF-Download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bestellung_${bestellnummer}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`PDF-Download fehlgeschlagen: ${err.message}`);
    }
  };

  const StatusBadge = ({ status }) => {
    const config = {
      offen: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Offen' },
      bestellt: { color: 'bg-blue-100 text-blue-700', icon: Package, label: 'Bestellt' },
      teilweise_geliefert: { color: 'bg-yellow-100 text-yellow-700', icon: Truck, label: 'Teilweise' },
      geliefert: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Geliefert' },
      abgeschlossen: { color: 'bg-purple-100 text-purple-700', icon: Archive, label: 'Abgeschlossen' },
    };

    const { color, icon: Icon, label } = config[status] || config.offen;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  const LieferstatusBar = ({ prozent, positionen_offen, anzahl_positionen }) => {
    let colorClass = 'bg-gray-200';
    let barColorClass = 'bg-gray-400';
    
    if (prozent === 100) {
      colorClass = 'bg-green-100';
      barColorClass = 'bg-green-500';
    } else if (prozent > 0) {
      colorClass = 'bg-yellow-100';
      barColorClass = 'bg-yellow-500';
    }

    return (
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-2 rounded-full ${colorClass} overflow-hidden`}>
          <div
            className={`h-full ${barColorClass} transition-all duration-300`}
            style={{ width: `${prozent}%` }}
          />
        </div>
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {prozent}% ({anzahl_positionen - positionen_offen}/{anzahl_positionen})
        </span>
      </div>
    );
  };

  const BestellungCard = ({ bestellung }) => {
    const lieferant = lieferanten.find(l => l.id === bestellung.lieferant_id) || bestellung.lieferant;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{bestellung.bestellnummer}</h3>
              <StatusBadge status={bestellung.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package size={14} />
              <span className="font-medium">{lieferant?.name || 'Unbekannt'}</span>
              {lieferant?.kurzname && (
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{lieferant.kurzname}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDownloadPDF(bestellung.id, bestellung.bestellnummer)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title="PDF herunterladen"
            >
              <Download size={16} />
            </button>
            
            {(bestellung.status === 'bestellt' || bestellung.status === 'teilweise_geliefert') && (
              <button
                onClick={() => onWareneingangClick(bestellung)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                title="Wareneingang erfassen"
              >
                <Truck size={16} />
              </button>
            )}

            <button
              onClick={() => onEditBestellung(bestellung)}
              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
              title="Bearbeiten"
            >
              <Edit2 size={16} />
            </button>

            {bestellung.status === 'offen' && (
              <button
                onClick={() => handleDeleteBestellung(bestellung.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                title="Löschen"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          {/* Lieferstatus */}
          <LieferstatusBar 
            prozent={bestellung.lieferstatus_prozent}
            positionen_offen={bestellung.positionen_offen}
            anzahl_positionen={bestellung.anzahl_positionen}
          />

          {/* Summen */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gray-600">
                {bestellung.anzahl_positionen} Position{bestellung.anzahl_positionen !== 1 ? 'en' : ''}
              </span>
              {bestellung.positionen_offen > 0 && (
                <span className="text-yellow-600">
                  {bestellung.positionen_offen} offen
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-600">
                EK: <span className="font-medium">{(Number(bestellung.gesamtsumme_ek) || 0).toFixed(2)} €</span>
              </span>
            </div>
          </div>

          {/* Termine */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Erstellt: {new Date(bestellung.erstellt_am).toLocaleDateString('de-DE')}</span>
            {bestellung.bestellt_am && (
              <span>Bestellt: {new Date(bestellung.bestellt_am).toLocaleDateString('de-DE')}</span>
            )}
            {bestellung.geliefert_am && (
              <span className="text-green-600">
                Geliefert: {new Date(bestellung.geliefert_am).toLocaleDateString('de-DE')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span className="font-semibold">Fehler beim Laden</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button 
          onClick={loadData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  // Gruppierung nach Status
  const gruppiert = {
    offen: bestellungen.filter(b => b.status === 'offen'),
    aktiv: bestellungen.filter(b => ['bestellt', 'teilweise_geliefert'].includes(b.status)),
    abgeschlossen: bestellungen.filter(b => ['geliefert', 'abgeschlossen'].includes(b.status)),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Bestellungen</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="alle">Alle Status</option>
            <option value="offen">Offen</option>
            <option value="bestellt">Bestellt</option>
            <option value="teilweise_geliefert">Teilweise geliefert</option>
            <option value="geliefert">Geliefert</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>

          <button
            onClick={onNewBestellung}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            <Plus size={16} />
            Neue Bestellung
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Offen</div>
          <div className="text-2xl font-bold text-gray-700">{gruppiert.offen.length}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">In Bestellung</div>
          <div className="text-2xl font-bold text-blue-700">{gruppiert.aktiv.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="text-xs text-green-600 mb-1">Abgeschlossen</div>
          <div className="text-2xl font-bold text-green-700">{gruppiert.abgeschlossen.length}</div>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {/* Offene Bestellungen */}
        {gruppiert.offen.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Clock size={14} />
              OFFEN ({gruppiert.offen.length})
            </h3>
            <div className="space-y-2">
              {gruppiert.offen.map(bestellung => (
                <BestellungCard key={bestellung.id} bestellung={bestellung} />
              ))}
            </div>
          </div>
        )}

        {/* Aktive Bestellungen */}
        {gruppiert.aktiv.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Truck size={14} />
              IN BESTELLUNG ({gruppiert.aktiv.length})
            </h3>
            <div className="space-y-2">
              {gruppiert.aktiv.map(bestellung => (
                <BestellungCard key={bestellung.id} bestellung={bestellung} />
              ))}
            </div>
          </div>
        )}

        {/* Abgeschlossene */}
        {statusFilter === 'alle' && gruppiert.abgeschlossen.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Archive size={14} />
              ABGESCHLOSSEN (letzte {Math.min(gruppiert.abgeschlossen.length, 10)})
            </h3>
            <div className="space-y-2">
              {gruppiert.abgeschlossen.slice(0, 10).map(bestellung => (
                <BestellungCard key={bestellung.id} bestellung={bestellung} />
              ))}
            </div>
          </div>
        )}

        {bestellungen.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Keine Bestellungen gefunden</p>
            <button
              onClick={onNewBestellung}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Erste Bestellung erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestellungenListe;
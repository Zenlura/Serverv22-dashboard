import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, isToday, isTomorrow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, AlertCircle, CheckCircle, Clock, Users, Bike, Edit2, Info, Trash2 } from 'lucide-react';

/**
 * LeihraederTimeline V3 - KOMPAKT + FIXES
 * - Buchungen nur am Start-Tag (nicht wiederholt)
 * - Löschen-Button
 * - Bessere Verfügbarkeits-Berechnung
 */
const LeihraederTimeline = ({ onNewBuchung, onEditBuchung, onDetailsClick }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tageAnzahl, setTageAnzahl] = useState(7);
  const [gesamtRaeder, setGesamtRaeder] = useState(21);  // ✅ Dynamisch vom Backend geladen

  useEffect(() => {
    loadTimelineData();
  }, [tageAnzahl]);

  const loadTimelineData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vermietungen/?limit=500');
      if (!response.ok) throw new Error('Fehler beim Laden der Buchungen');
      
      const data = await response.json();
      const vermietungen = data.items || [];

      const aktiveBuchungen = vermietungen.filter(v => 
        v.status === 'aktiv' || v.status === 'reserviert'
      );

      // ✅ FIX: Gesamt-Räder IMMER laden (nicht nur wenn aktive Buchungen)
      const heute = new Date();
      const verfResponse = await fetch(
        `/api/vermietungen/verfuegbarkeit/?von_datum=${format(heute, 'yyyy-MM-dd')}&bis_datum=${format(heute, 'yyyy-MM-dd')}`
      );
      if (verfResponse.ok) {
        const verfData = await verfResponse.json();
        setGesamtRaeder(verfData.gesamt || 21);  // ✅ Default 21 statt 15
      }

      const timelineData = [];
      // heute bereits oben deklariert

      for (let i = 0; i < tageAnzahl; i++) {
        const tag = addDays(heute, i);
        const tagKey = format(tag, 'yyyy-MM-dd');

        // 🔥 FIX: Buchungen die an diesem Tag LAUFEN (für Verfügbarkeit)
        const buchungenLaufenAmTag = aktiveBuchungen.filter(v => {
          const von = parseISO(v.von_datum);
          const bis = parseISO(v.bis_datum);
          return tag >= von && tag <= bis;
        });

        // 🔥 FIX: Buchungen die an diesem Tag STARTEN (für Anzeige - nur einmal!)
        const buchungenStartenAmTag = aktiveBuchungen.filter(v => {
          const vonDatum = parseISO(v.von_datum);
          return isSameDay(vonDatum, tag);
        });

        // Verfügbarkeit basiert auf allen laufenden Buchungen
        const belegtAnzahl = buchungenLaufenAmTag.reduce((sum, v) => sum + (v.anzahl_raeder || 1), 0);
        const verfuegbar = gesamtRaeder - belegtAnzahl;

        // Sortiere nach Zeit
        const sortedBuchungen = buchungenStartenAmTag.sort((a, b) => {
          const timeA = a.von_zeit || '00:00';
          const timeB = b.von_zeit || '00:00';
          return timeA.localeCompare(timeB);
        });

        timelineData.push({
          datum: tag,
          datumKey: tagKey,
          verfuegbar,
          belegt: belegtAnzahl,
          gesamt: gesamtRaeder,
          buchungen: sortedBuchungen, // 🔥 Nur Buchungen die HIER STARTEN
          isToday: isToday(tag),
          isTomorrow: isTomorrow(tag)
        });
      }

      setTimeline(timelineData);
    } catch (err) {
      console.error('Timeline Ladefehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTagHeader = (tag) => {
    if (tag.isToday) return `HEUTE (${format(tag.datum, 'EEE, dd. MMM yyyy', { locale: de })})`;
    if (tag.isTomorrow) return `MORGEN (${format(tag.datum, 'EEE, dd. MMM yyyy', { locale: de })})`;
    return format(tag.datum, 'EEEE (EEE, dd. MMM yyyy)', { locale: de }).toUpperCase();
  };

  const StatusBadge = ({ status }) => {
    const config = {
      reserviert: { color: 'bg-yellow-100 text-yellow-700', label: 'Reserviert' },
      aktiv: { color: 'bg-red-100 text-red-700', label: 'Aktiv' },
      abgeschlossen: { color: 'bg-green-100 text-green-700', label: 'Abgeschlossen' }
    };

    const { color, label } = config[status] || config.reserviert;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const VerfuegbarkeitsBadge = ({ verfuegbar, gesamt, belegt }) => {
    const prozent = (verfuegbar / gesamt) * 100;
    let color = 'bg-green-100 text-green-700';
    if (prozent < 30) color = 'bg-red-100 text-red-700';
    else if (prozent < 60) color = 'bg-yellow-100 text-yellow-700';

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium ${color}`}>
        <Bike size={14} />
        <span>{verfuegbar}/{gesamt} Räder</span>
        {belegt > 0 && <span className="text-xs opacity-75">({belegt} belegt)</span>}
      </div>
    );
  };

  const BuchungsCard = ({ buchung }) => {
    const vonDatum = parseISO(buchung.von_datum);
    const bisDatum = parseISO(buchung.bis_datum);
    const kundenName = buchung.kunde?.vorname && buchung.kunde?.nachname 
      ? `${buchung.kunde.vorname} ${buchung.kunde.nachname}`
      : buchung.kunde_name || 'Unbekannt';

    const radAbgeholt = buchung.rad_abgeholt;
    const anzahlRaeder = buchung.anzahl_raeder || 1;

    return (
      <div className="bg-white rounded border border-gray-200 px-3 py-2 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between gap-3">
          {/* Links: Zeit + Kunde + Details */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1 text-gray-600 text-sm flex-shrink-0">
              <Clock size={13} />
              <span className="font-medium">{buchung.von_zeit || '—'}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 truncate">
                  {kundenName}
                </span>
                {buchung.kunde?.kundennummer && (
                  <span className="text-xs text-gray-500 flex-shrink-0">({buchung.kunde.kundennummer})</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {anzahlRaeder} {buchung.leihrad?.typ || 'Räder'}
                  {buchung.leihrad?.typ && anzahlRaeder > 1 && 's'}  {/* Plural wenn mehrere */}
                </span>
                <span>→ {format(bisDatum, 'EEE dd.MM', { locale: de })} {buchung.bis_zeit || '—'}</span>
                {radAbgeholt && (
                  <span className="text-green-600 font-medium">✓ Abgeholt</span>
                )}
              </div>
            </div>
          </div>

          {/* Rechts: Status + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={buchung.status} />
            
            {/* Action Buttons mit Löschen */}
            <div className="flex gap-1">
              <button
                onClick={() => onDetailsClick?.(buchung)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Details"
              >
                <Info size={14} />
              </button>
              <button
                onClick={() => onEditBuchung?.(buchung)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Bearbeiten"
              >
                <Edit2 size={14} />
              </button>
              {/* 🔥 NEU: Löschen-Button */}
              <button
                onClick={() => handleLoeschen(buchung)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Löschen"
              >
                <Trash2 size={14} />
              </button>
              {buchung.status === 'aktiv' && !radAbgeholt && (
                <button
                  onClick={() => handleAbholung(buchung)}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Abholen
                </button>
              )}
              {buchung.status === 'aktiv' && radAbgeholt && (
                <button
                  onClick={() => handleRueckgabe(buchung)}
                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  Rückgabe
                </button>
              )}
            </div>
          </div>
        </div>

        {buchung.notizen && (
          <div className="mt-1 text-xs text-gray-600 italic border-l-2 border-gray-300 pl-2">
            {buchung.notizen}
          </div>
        )}
      </div>
    );
  };

  // 📊 Übersichts-Statistik berechnen
  const getUebersicht = () => {
    if (timeline.length === 0) return null;

    const durchschnittVerfuegbar = Math.round(
      timeline.reduce((sum, t) => sum + t.verfuegbar, 0) / timeline.length
    );
    
    const durchschnittBelegt = Math.round(
      timeline.reduce((sum, t) => sum + t.belegt, 0) / timeline.length
    );

    const maxBelegt = Math.max(...timeline.map(t => t.belegt));
    const tageVollBelegt = timeline.filter(t => t.verfuegbar === 0).length;
    const tageStarkBelegt = timeline.filter(t => t.verfuegbar > 0 && t.verfuegbar < 5).length;

    return {
      durchschnittVerfuegbar,
      durchschnittBelegt,
      maxBelegt,
      tageVollBelegt,
      tageStarkBelegt,
      gesamt: gesamtRaeder
    };
  };

  const UebersichtsCard = () => {
    const stats = getUebersicht();
    if (!stats) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bike size={18} className="text-blue-600" />
          <h3 className="font-bold text-gray-900">Übersicht {tageAnzahl} Tage</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">Ø Verfügbar</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.durchschnittVerfuegbar}/{stats.gesamt}
            </div>
          </div>
          
          <div className="bg-white rounded p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">Ø Belegt</div>
            <div className="text-2xl font-bold text-orange-600">
              {stats.durchschnittBelegt}
            </div>
          </div>
          
          <div className="bg-white rounded p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">Max. belegt</div>
            <div className="text-2xl font-bold text-red-600">
              {stats.maxBelegt}
            </div>
          </div>
          
          <div className="bg-white rounded p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">Kritische Tage</div>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.tageVollBelegt + stats.tageStarkBelegt}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.tageVollBelegt > 0 && `${stats.tageVollBelegt}× voll`}
              {stats.tageVollBelegt > 0 && stats.tageStarkBelegt > 0 && ', '}
              {stats.tageStarkBelegt > 0 && `${stats.tageStarkBelegt}× knapp`}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 🔥 NEU: Löschen-Handler
  const handleLoeschen = async (buchung) => {
    const kundenName = buchung.kunde?.vorname && buchung.kunde?.nachname 
      ? `${buchung.kunde.vorname} ${buchung.kunde.nachname}`
      : buchung.kunde_name || 'Unbekannt';

    if (!confirm(`Buchung wirklich löschen?\n\n${kundenName}\n${buchung.anzahl_raeder || 1} Räder\n${format(parseISO(buchung.von_datum), 'dd.MM.yyyy')} - ${format(parseISO(buchung.bis_datum), 'dd.MM.yyyy')}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vermietungen/${buchung.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Fehler beim Löschen');
      
      // Timeline neu laden
      loadTimelineData();
    } catch (err) {
      alert(`Fehler beim Löschen: ${err.message}`);
    }
  };

  const handleAbholung = async (buchung) => {
    if (!confirm(`${buchung.anzahl_raeder || 1} Räder als abgeholt markieren?`)) return;

    try {
      const response = await fetch(`/api/vermietungen/${buchung.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rad_abgeholt: true,
          abholzeit: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Fehler beim Markieren');
      loadTimelineData();
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  };

  const handleRueckgabe = (buchung) => {
    if (confirm(`Rückgabe für ${buchung.anzahl_raeder || 1} Räder durchführen?`)) {
      console.log('Rückgabe für Buchung:', buchung.id);
    }
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
          <span className="font-semibold">Fehler beim Laden der Timeline</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={loadTimelineData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Leihräder Timeline</h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tageAnzahl}
            onChange={(e) => setTageAnzahl(parseInt(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>7 Tage</option>
            <option value={14}>14 Tage</option>
            <option value={30}>30 Tage</option>
          </select>

          <button
            onClick={onNewBuchung}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Neue Buchung
          </button>
        </div>
      </div>

      <UebersichtsCard />

      <div className="space-y-3">
        {timeline.map((tag) => (
          <div key={tag.datumKey} className="bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <h3 className={`text-sm font-bold ${tag.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {formatTagHeader(tag)}
              </h3>
              <VerfuegbarkeitsBadge 
                verfuegbar={tag.verfuegbar} 
                gesamt={tag.gesamt} 
                belegt={tag.belegt} 
              />
            </div>

            <div className="p-3">
              {tag.buchungen.length > 0 ? (
                <div className="space-y-2">
                  {tag.buchungen.map((buchung) => (
                    <BuchungsCard key={buchung.id} buchung={buchung} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Keine Buchungen an diesem Tag</p>
                  <button
                    onClick={onNewBuchung}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Buchung erstellen
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={loadTimelineData}
          className="text-xs text-gray-600 hover:text-gray-800"
        >
          Timeline aktualisieren
        </button>
      </div>
    </div>
  );
};

export default LeihraederTimeline;
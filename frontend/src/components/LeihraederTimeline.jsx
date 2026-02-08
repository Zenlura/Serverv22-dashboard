import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, isToday, isTomorrow, parseISO, isWithinInterval, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, AlertCircle, Clock, Users, Bike, Edit2, Info, Trash2, ArrowRight, CheckCircle, Package } from 'lucide-react';

/**
 * LeihraederTimeline V8 - MIT ACTION-BUTTONS
 * Session: 08.02.2026 13:30
 * 
 * FIXES:
 * 1. ✅ Kompakte Darstellung - Laufende Buchungen als Badge, nicht voll
 * 2. ✅ Bearbeiten öffnet Edit-Modal (nicht Neu anlegen)
 * 3. ✅ Rückgabe-Tag zeigt Rückgabe-Card
 * 4. ✅ Rückgabe-Funktion mit Feedback
 * 5. ✅ Einzelne Räder hinzufügen/entfernen
 * 6. ✅ AUSGABE-BUTTON: Reserviert → Aktiv
 * 7. ✅ RÜCKNAHME-BUTTON: Aktiv → Abgeschlossen
 * 
 * NEU IN V8:
 * - Ausgabe-Button für Buchungen die heute starten (status=reserviert)
 * - Verbesserte Rückgabe mit besserem Feedback
 * - Zeitstempel für Ausgabe/Rückgabe (ausgabe_zeit, rueckgabe_zeit)
 */
const LeihraederTimeline = ({ onNewBuchung, onEditBuchung, onDetailsClick, refreshKey = 0 }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tageAnzahl, setTageAnzahl] = useState(7);
  const [gesamtRaeder, setGesamtRaeder] = useState(0);
  const [expandedBuchungen, setExpandedBuchungen] = useState(new Set());

  useEffect(() => {
    loadTimelineData();
  }, [tageAnzahl, refreshKey]); // ✅ Lädt neu bei refreshKey Änderung

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

      // Gesamt-Räder dynamisch laden
      const heute = new Date();
      const verfResponse = await fetch(
        `/api/vermietungen/verfuegbarkeit/?von_datum=${format(heute, 'yyyy-MM-dd')}&bis_datum=${format(heute, 'yyyy-MM-dd')}`
      );
      if (verfResponse.ok) {
        const verfData = await verfResponse.json();
        setGesamtRaeder(verfData.gesamt || 0);
      }

      // Typ-Verfügbarkeit laden - ✅ MIT HEUTE-DATUM!
      let typVerfuegbarkeit = null;
      try {
        const heuteDatum = format(heute, 'yyyy-MM-dd');
        const typResponse = await fetch(
          `/api/vermietungen/verfuegbarkeit-pro-typ/?von_datum=${heuteDatum}&bis_datum=${heuteDatum}`
        );
        if (typResponse.ok) {
          typVerfuegbarkeit = await typResponse.json();
        }
      } catch (err) {
        console.error('Typ-Verfügbarkeit konnte nicht geladen werden:', err);
      }

      const timelineData = [];

      for (let i = 0; i < tageAnzahl; i++) {
        const tag = addDays(heute, i);
        const tagKey = format(tag, 'yyyy-MM-dd');

        // Buchungen die an diesem Tag LAUFEN
        const buchungenLaufenAmTag = aktiveBuchungen.filter(v => {
          const von = startOfDay(parseISO(v.von_datum));
          const bis = startOfDay(parseISO(v.bis_datum));
          const tagStart = startOfDay(tag);
          return isWithinInterval(tagStart, { start: von, end: bis });
        });

        // 🎯 NEUE LOGIK: Kategorisierung
        const buchungenStart = [];    // Starten heute
        const buchungenLaufend = [];  // Laufen durch (Start war früher)
        const buchungenEnde = [];     // Enden heute (Rückgabe)

        buchungenLaufenAmTag.forEach(v => {
          const vonDatum = parseISO(v.von_datum);
          const bisDatum = parseISO(v.bis_datum);
          
          if (isSameDay(vonDatum, tag)) {
            buchungenStart.push(v);
          } else if (isSameDay(bisDatum, tag)) {
            buchungenEnde.push(v);
          } else {
            buchungenLaufend.push(v);
          }
        });

        // Verfügbarkeit - ✅ FIX: Positionen berücksichtigen
        let belegtAnzahl = 0;
        buchungenLaufenAmTag.forEach(v => {
          if (v.positionen && v.positionen.length > 0) {
            belegtAnzahl += v.positionen.reduce((sum, p) => sum + p.anzahl, 0);
          } else {
            belegtAnzahl += v.anzahl_raeder || 1;
          }
        });
        const verfuegbar = Math.max(0, gesamtRaeder - belegtAnzahl);

        // Sortierung
        const sortByTime = (a, b) => {
          const timeA = a.von_zeit || '00:00';
          const timeB = b.von_zeit || '00:00';
          return timeA.localeCompare(timeB);
        };

        timelineData.push({
          datum: tag,
          datumKey: tagKey,
          verfuegbar,
          belegt: belegtAnzahl,
          gesamt: gesamtRaeder,
          buchungenStart: buchungenStart.sort(sortByTime),
          buchungenLaufend: buchungenLaufend.sort(sortByTime),
          buchungenEnde: buchungenEnde.sort(sortByTime),
          typVerfuegbarkeit,
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

  const StatusBadge = ({ status, onRueckgabe, isEarlyReturn }) => {
    const config = {
      reserviert: { color: 'bg-yellow-100 text-yellow-700', label: 'Reserviert' },
      aktiv: { color: 'bg-red-100 text-red-700 hover:bg-red-200', label: 'Aktiv' },
      abgeschlossen: { color: 'bg-green-100 text-green-700', label: 'Abgeschlossen' }
    };
    const { color, label } = config[status] || config.reserviert;
    
    // ✅ Aktiv-Badge als Button für frühe Rückgabe
    if (status === 'aktiv' && onRueckgabe && isEarlyReturn) {
      return (
        <button
          onClick={onRueckgabe}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${color}`}
          title="Klicken für vorzeitige Rückgabe"
        >
          {label}
        </button>
      );
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const VerfuegbarkeitsBadge = ({ verfuegbar, gesamt, belegt }) => {
    const prozent = gesamt > 0 ? (verfuegbar / gesamt) * 100 : 0;
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

  const getRadAnzeige = (buchung) => {
    const hatPositionen = buchung.positionen && buchung.positionen.length > 0;
    const anzahlRaeder = buchung.anzahl_raeder || 1;
    
    if (hatPositionen) {
      return buchung.positionen.map(p => `${p.anzahl}× ${p.rad_typ}`).join(', ');
    } else if (buchung.leihrad?.typ) {
      return `${anzahlRaeder}× ${buchung.leihrad.typ}`;
    } else {
      return `${anzahlRaeder} Räder`;
    }
  };

  const getKundenName = (buchung) => {
    if (buchung.kunde?.vorname && buchung.kunde?.nachname) {
      return `${buchung.kunde.vorname} ${buchung.kunde.nachname}`;
    }
    return buchung.kunde_name || 'Unbekannt';
  };

  // 🎯 HAUPTBUCHUNG (Start-Tag)
  const BuchungsCardStart = ({ buchung }) => {
    const vonDatum = parseISO(buchung.von_datum);
    const bisDatum = parseISO(buchung.bis_datum);
    const kundenName = getKundenName(buchung);
    const raederAnzeige = getRadAnzeige(buchung);

    return (
      <div className="bg-white rounded border border-gray-200 px-3 py-2 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1 text-gray-600 text-sm flex-shrink-0">
              <Clock size={13} />
              <span className="font-medium">{buchung.von_zeit || '—'}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 truncate">{kundenName}</span>
                {buchung.kunde?.kundennummer && (
                  <span className="text-xs text-gray-500">({buchung.kunde.kundennummer})</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {raederAnzeige}
                </span>
                <span>→ {format(bisDatum, 'EEE dd.MM', { locale: de })} {buchung.bis_zeit || '—'}</span>
                {buchung.rad_abgeholt && (
                  <span className="text-green-600 font-medium">✓ Abgeholt</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge 
              status={buchung.status} 
              onRueckgabe={() => handleRueckgabe(buchung)}
              isEarlyReturn={buchung.status === 'aktiv'}
            />
            
            <div className="flex gap-1">
              {/* ✅ AUSGABE-BUTTON: Nur wenn reserviert */}
              {buchung.status === 'reserviert' && (
                <button
                  onClick={() => handleAusgeben(buchung)}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 font-medium"
                  title="Räder ausgeben"
                >
                  <CheckCircle size={14} />
                  Ausgeben
                </button>
              )}
              
              {/* Details, Edit, Löschen - immer sichtbar */}
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
              <button
                onClick={() => handleLoeschen(buchung)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Löschen"
              >
                <Trash2 size={14} />
              </button>
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

  // 🎯 KOMPAKTE LAUFEND-ANZEIGE (Zwischen-Tage)
  const BuchungsCardLaufend = ({ buchung }) => {
    const kundenName = getKundenName(buchung);
    const raederAnzeige = getRadAnzeige(buchung);
    const vonDatum = parseISO(buchung.von_datum);
    const bisDatum = parseISO(buchung.bis_datum);
    const isExpanded = expandedBuchungen.has(buchung.id);

    return (
      <div 
        className="bg-orange-50 border border-orange-200 rounded px-3 py-1.5 cursor-pointer hover:bg-orange-100 transition-colors"
        onClick={() => {
          const newExpanded = new Set(expandedBuchungen);
          if (isExpanded) {
            newExpanded.delete(buchung.id);
          } else {
            newExpanded.add(buchung.id);
          }
          setExpandedBuchungen(newExpanded);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight size={14} className="text-orange-600" />
            <span className="font-medium text-gray-900">{kundenName}</span>
            <span className="text-xs text-gray-600">{raederAnzeige}</span>
            <span className="text-xs text-orange-600">
              läuft seit {format(vonDatum, 'dd.MM', { locale: de })}
            </span>
          </div>
          <StatusBadge status={buchung.status} />
        </div>

        {/* Ausgeklappt: Volle Details */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-orange-200 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              <div>Bis: {format(bisDatum, 'EEE dd.MM', { locale: de })} {buchung.bis_zeit || '—'}</div>
              {buchung.notizen && <div className="italic mt-1">{buchung.notizen}</div>}
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onDetailsClick?.(buchung); }}
                className="p-1 text-gray-600 hover:bg-white rounded"
                title="Details"
              >
                <Info size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEditBuchung?.(buchung); }}
                className="p-1 text-blue-600 hover:bg-white rounded"
                title="Bearbeiten"
              >
                <Edit2 size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 🎯 RÜCKGABE-CARD (End-Tag)
  const BuchungsCardRueckgabe = ({ buchung }) => {
    const kundenName = getKundenName(buchung);
    const raederAnzeige = getRadAnzeige(buchung);
    const vonDatum = parseISO(buchung.von_datum);

    return (
      <div className="bg-purple-50 border-2 border-purple-300 rounded px-3 py-2">
        <div className="flex items-center gap-2 text-sm mb-2">
          <CheckCircle size={16} className="text-purple-600" />
          <span className="font-bold text-purple-900">RÜCKGABE HEUTE</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{kundenName}</div>
            <div className="text-xs text-gray-600 mt-1">
              <div>{raederAnzeige}</div>
              <div>Gestartet: {format(vonDatum, 'EEE dd.MM', { locale: de })} {buchung.von_zeit || '—'}</div>
              <div>Rückgabe bis: {buchung.bis_zeit || '18:00'}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <StatusBadge status={buchung.status} />
            <button
              onClick={() => handleRueckgabe(buchung)}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
            >
              <Package size={14} />
              Rückgabe
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => onDetailsClick?.(buchung)}
                className="p-1 text-gray-600 hover:bg-white rounded"
                title="Details"
              >
                <Info size={12} />
              </button>
              <button
                onClick={() => onEditBuchung?.(buchung)}
                className="p-1 text-blue-600 hover:bg-white rounded"
                title="Bearbeiten"
              >
                <Edit2 size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleLoeschen = async (buchung) => {
    const kundenName = getKundenName(buchung);
    if (!confirm(`Buchung wirklich löschen?\n\n${kundenName}\n${buchung.anzahl_raeder || 1} Räder\n${format(parseISO(buchung.von_datum), 'dd.MM.yyyy')} - ${format(parseISO(buchung.bis_datum), 'dd.MM.yyyy')}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vermietungen/${buchung.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Fehler beim Löschen');
      loadTimelineData();
    } catch (err) {
      alert(`Fehler beim Löschen: ${err.message}`);
    }
  };

  // ✅ NEU: Räder ausgeben (reserviert → aktiv)
  const handleAusgeben = async (buchung) => {
    const kundenName = getKundenName(buchung);
    const raederAnzeige = getRadAnzeige(buchung);
    
    if (!confirm(`Räder jetzt ausgeben?\n\n${kundenName}\n${raederAnzeige}\nUhrzeit: ${buchung.von_zeit || '—'}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vermietungen/${buchung.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'aktiv',
          ausgabe_datum: new Date().toISOString().split('T')[0],
          ausgabe_zeit: new Date().toTimeString().split(' ')[0].substring(0, 5)
        })
      });
      
      if (!response.ok) throw new Error('Fehler beim Ausgeben');
      
      loadTimelineData();
      alert(`✅ Räder ausgegeben!\n\n${kundenName}\n${raederAnzeige}`);
    } catch (err) {
      alert(`Fehler beim Ausgeben: ${err.message}`);
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
          abholzeit: new Date().toISOString(),
          status: 'aktiv'
        })
      });
      if (!response.ok) throw new Error('Fehler beim Markieren');
      loadTimelineData();
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  };

  const handleRueckgabe = async (buchung) => {
    const kundenName = getKundenName(buchung);
    const raederAnzeige = getRadAnzeige(buchung);
    
    if (!confirm(`Rückgabe durchführen?\n\n${kundenName}\n${raederAnzeige}\nRückgabe bis: ${buchung.bis_zeit || '18:00'}`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/vermietungen/${buchung.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'abgeschlossen',
          rueckgabe_datum: new Date().toISOString().split('T')[0],
          rueckgabe_zeit: new Date().toTimeString().split(' ')[0].substring(0, 5)
        })
      });
      
      if (!response.ok) throw new Error('Fehler bei Rückgabe');
      
      loadTimelineData();
      alert(`✅ Rückgabe erfolgreich!\n\n${kundenName}\n${raederAnzeige}`);
    } catch (err) {
      alert(`Fehler bei Rückgabe: ${err.message}`);
    }
  };

  const calculateStats = () => {
    if (timeline.length === 0) return {
      heuteVerfuegbar: 0,
      heuteBelegt: 0,
      gesamt: gesamtRaeder,
      maxBelegt: 0,
      tageVollBelegt: 0,
      tageStarkBelegt: 0
    };

    // ✅ HEUTE statt Durchschnitt!
    const heute = timeline[0]; // Erster Tag = Heute
    const maxBelegt = Math.max(...timeline.map(tag => tag.belegt));
    const tageVollBelegt = timeline.filter(tag => tag.verfuegbar === 0).length;
    const tageStarkBelegt = timeline.filter(tag => {
      const prozent = tag.gesamt > 0 ? (tag.verfuegbar / tag.gesamt) * 100 : 100;
      return prozent > 0 && prozent < 30;
    }).length;

    return {
      heuteVerfuegbar: heute.verfuegbar,
      heuteBelegt: heute.belegt,
      gesamt: gesamtRaeder,
      maxBelegt,
      tageVollBelegt,
      tageStarkBelegt
    };
  };

  const OverviewBox = () => {
    const stats = calculateStats();

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bike className="text-blue-600" size={18} />
          <h3 className="font-bold text-gray-900">🚲 Übersicht {tageAnzahl} Tage</h3>
        </div>

        {timeline.length > 0 && timeline[0].typVerfuegbarkeit && (
          <div className="space-y-2 mb-4">
            {Object.entries(timeline[0].typVerfuegbarkeit)
              .filter(([_, info]) => info.vermietbar !== false)
              .map(([typ, info]) => {
                const prozent = info.gesamt > 0 ? (info.verfuegbar / info.gesamt) * 100 : 0;
                let badgeColor = 'bg-green-100 text-green-800 border-green-200';
                if (prozent < 30) badgeColor = 'bg-red-100 text-red-800 border-red-200';
                else if (prozent < 60) badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';

                return (
                  <div key={typ} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <Bike size={14} className="text-gray-600" />
                      <span className="font-medium text-gray-900">{typ}</span>
                      {info.special && <span className="text-xs">{info.special.includes('Georg') ? '🎉' : '🔧'}</span>}
                      <span className="text-xs text-gray-500">
                        ({info.preis_1tag > 0 ? `${info.preis_1tag.toFixed(0)}€/Tag` : 'GRATIS'})
                      </span>
                    </div>
                    <div className={`px-2 py-1 rounded border text-xs font-medium ${badgeColor}`}>
                      {info.verfuegbar}/{info.gesamt} verfügbar
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">📅 Heute verfügbar</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.heuteVerfuegbar}/{stats.gesamt}
            </div>
          </div>
          <div className="bg-white rounded p-3 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">🚲 Heute belegt</div>
            <div className="text-2xl font-bold text-orange-600">
              {stats.heuteBelegt}
            </div>
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
          <span className="font-semibold">Fehler beim Laden der Timeline</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button onClick={loadTimelineData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
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
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            <Plus size={16} />
            Neue Buchung
          </button>
        </div>
      </div>

      <OverviewBox />

      <div className="space-y-3">
        {timeline.map((tag) => (
          <div key={tag.datumKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className={`text-sm font-bold ${tag.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {formatTagHeader(tag)}
                </h3>
                <VerfuegbarkeitsBadge verfuegbar={tag.verfuegbar} gesamt={tag.gesamt} belegt={tag.belegt} />
              </div>
              
              {tag.typVerfuegbarkeit && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {Object.entries(tag.typVerfuegbarkeit)
                    .filter(([_, info]) => info.vermietbar !== false)
                    .map(([typ, info]) => {
                      const prozent = info.gesamt > 0 ? (info.verfuegbar / info.gesamt) * 100 : 0;
                      let colorClass = 'text-green-600 bg-green-50';
                      if (prozent < 30) colorClass = 'text-red-600 bg-red-50';
                      else if (prozent < 60) colorClass = 'text-yellow-600 bg-yellow-50';
                      
                      return (
                        <span key={typ} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${colorClass}`}>
                          <Bike size={11} />
                          <span className="font-medium">{typ}:</span>
                          <span>{info.verfuegbar}/{info.gesamt}</span>
                          {info.special && <span>{info.special.includes('Georg') ? '🎉' : '🔧'}</span>}
                        </span>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="p-3 space-y-2">
              {/* 🎯 START: Volle Buchungs-Cards */}
              {tag.buchungenStart.map((buchung) => (
                <BuchungsCardStart key={`start-${buchung.id}`} buchung={buchung} />
              ))}

              {/* 🎯 RÜCKGABE: Lila Rückgabe-Cards */}
              {tag.buchungenEnde.map((buchung) => (
                <BuchungsCardRueckgabe key={`ende-${buchung.id}`} buchung={buchung} />
              ))}

              {/* 🎯 LAUFEND: Kompakte Orange Badges */}
              {tag.buchungenLaufend.length > 0 && (
                <div className="space-y-1">
                  {tag.buchungenLaufend.map((buchung) => (
                    <BuchungsCardLaufend key={`laufend-${buchung.id}`} buchung={buchung} />
                  ))}
                </div>
              )}

              {/* Leer */}
              {tag.buchungenStart.length === 0 && 
               tag.buchungenEnde.length === 0 && 
               tag.buchungenLaufend.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Keine Aktivitäten an diesem Tag</p>
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
        <button onClick={loadTimelineData} className="text-xs text-gray-600 hover:text-gray-800">
          Timeline aktualisieren
        </button>
      </div>
    </div>
  );
};

export default LeihraederTimeline;
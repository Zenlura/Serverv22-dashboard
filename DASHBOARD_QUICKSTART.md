# ⚡ DASHBOARD QUICK-START

## 🚀 IN 3 SCHRITTEN ZUM DASHBOARD

### SCHRITT 1: Dateien kopieren ✅

**BEREITS ERLEDIGT!** Alle Dateien sind fertig erstellt:

**Backend (1 neue Datei + 1 geändert):**
```
✅ app/routers/dashboard.py  <- NEU
✅ app/main.py               <- Dashboard registriert
```

**Frontend (5 neue Komponenten + 1 geändert):**
```
✅ src/components/Dashboard.jsx
✅ src/components/StatCard.jsx
✅ src/components/TopArtikelList.jsx
✅ src/components/LowStockAlert.jsx
✅ src/components/OpenTasksList.jsx
✅ src/App.jsx               <- Dashboard Tab hinzugefügt
```

---

### SCHRITT 2: Server neu starten 🔄

**Windows (einfach):**
```batch
# Im Hauptverzeichnis Serverv22-main
STOP.bat
START_NETWORK.bat
```

**Oder manuell (Windows/Linux/Mac):**

**Terminal 1 - Backend:**
```bash
cd Serverv22-main
# Falls Python venv verwendet wird:
# source venv/bin/activate  (Linux/Mac)
# venv\Scripts\activate     (Windows)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd Serverv22-main/frontend
npm run dev
```

---

### SCHRITT 3: Browser öffnen 🌐

```
http://localhost:5173
```

Das Dashboard sollte **automatisch** als erste Ansicht erscheinen! 🎉

---

## ✅ FUNKTIONIERT ES?

### Check 1: Backend läuft?
Öffne: `http://localhost:8000/docs`

Sollte die FastAPI Swagger-Dokumentation zeigen mit:
```
✅ /api/dashboard/stats
✅ /api/dashboard/top-artikel
✅ /api/dashboard/low-stock
✅ /api/dashboard/offene-aufgaben
✅ /api/dashboard/umsatz-verlauf
```

### Check 2: Dashboard sichtbar?
In der Navigation ganz links:
```
📊 Dashboard | 📦 Artikel | 🛒 Bestellungen | ...
```

### Check 3: Daten vorhanden?
**Normal wenn leer!** Dashboard zeigt erst Daten wenn:
- Reparaturen erstellt & bezahlt
- Artikel hinzugefügt
- Bestellungen erfasst

---

## 🎨 WAS DU SIEHST

```
┌──────────────────────────────────────┐
│  📊 Dashboard      [🔄 Aktualisieren]│
├──────────────────────────────────────┤
│                                       │
│  💰 450 €    🔧 5      🚲 12/20      │
│  📦 3        🛒 3                     │
│                                       │
│  📈 Top Artikel  📦 Warnungen  📋 Tasks
└──────────────────────────────────────┘
```

---

## 🐛 PROBLEM?

### "Fehler beim Laden"
```bash
# 1. Backend läuft?
http://localhost:8000/docs

# 2. Console checken (F12)
# 3. Backend-Logs ansehen
```

### "Keine Daten"
```
✅ NORMAL! Dashboard zeigt erst Daten wenn:
   - Reparaturen bezahlt wurden
   - Artikel verkauft wurden
   - Mindestbestände unterschritten
```

---

## 🎯 FERTIG!

**Dashboard läuft?** ✅  
**Zeig es den Meistern!** 🎉

---

**Zeit bis "Wow":** ~2 Minuten nach Server-Start  
**Aufwand:** Minimal  
**Nutzen:** MAXIMAL 💯

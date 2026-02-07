# 🚴 Radstation Frontend - Installation für Mechaniker

**Datum:** 01.02.2026  
**Session:** 1.7 - Artikelliste  
**Dauer:** 10 Minuten

---

## ☑️ Checkliste - Brauchst du noch:

- [ ] Node.js installiert? (Wenn nein → Schritt 1)
- [ ] Backend läuft? (Wenn nein → siehe Backend-Anleitung)

---

## 🔧 SCHRITT 1: Node.js installieren (einmalig!)

### Wenn du Node.js noch nicht hast:

1. **Browser öffnen**
2. **Gehe zu:** https://nodejs.org/de
3. **Download:** Den grünen Button "LTS" klicken (z.B. "20.11.0 LTS")
4. **Installieren:** 
   - Datei öffnen
   - Immer "Weiter" klicken
   - Am Ende: "Fertig stellen"
5. **Testen:**
   - Terminal öffnen (siehe unten)
   - Tippe: `node --version`
   - Sollte zeigen: `v20.x.x` oder ähnlich

✅ **Fertig!** Node.js ist installiert!

---

## 🖥️ SCHRITT 2: Terminal öffnen

### Windows:
1. **Drücke:** `Windows-Taste + R`
2. **Tippe:** `cmd`
3. **Drücke:** Enter
4. **Schwarzes Fenster** öffnet sich ✅

**ODER:**
- Gehe zum `Serverv22` Ordner
- Rechtsklick auf leere Fläche
- "Terminal hier öffnen" oder "Git Bash hier"

### Mac:
1. **Drücke:** `Cmd + Leertaste`
2. **Tippe:** `terminal`
3. **Drücke:** Enter

---

## 📂 SCHRITT 3: Ins Frontend-Verzeichnis wechseln

Im Terminal tippen:

```bash
cd C:\Pfad\zu\deinem\Serverv22\frontend
```

**TIPP - Einfacher Weg:**
1. Öffne den `Serverv22` Ordner im Explorer
2. Gehe in den `frontend` Unterordner
3. Ziehe diesen Ordner ins Terminal-Fenster
4. Der Pfad wird automatisch eingefügt!
5. Drücke Enter

✅ **Check:** Du solltest jetzt sowas sehen:
```
C:\...\Serverv22\frontend>
```

---

## 📦 SCHRITT 4: Pakete installieren (einmalig!)

Im Terminal tippen:

```bash
npm install
```

**Was passiert:**
- Viel Text läuft durch (1-2 Minuten)
- Du siehst "added xyz packages"
- Ein `node_modules` Ordner wird erstellt

⚠️ **WICHTIG:** 
- Nicht schließen während es läuft!
- Bei Fehlern: Screenshot machen und KI zeigen

✅ **Fertig wenn du siehst:**
```
added 200+ packages in 1m
```

---

## 🚀 SCHRITT 5: Frontend starten

Im Terminal tippen:

```bash
npm run dev
```

✅ **Läuft wenn du siehst:**

```
VITE v5.0.8  ready in 234 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Das Terminal OFFEN lassen!** 🚨

---

## 🌐 SCHRITT 6: Im Browser öffnen

1. **Browser öffnen** (Chrome, Firefox, Edge...)
2. **Adresszeile:** Tippe `localhost:3000`
3. **Enter drücken**

✅ **Du solltest sehen:**
- Blauen Header "Radstation Warenwirtschaft"
- Eine Tabelle mit deinen Artikeln
- Suchfeld oben rechts

---

## 🎯 SCHRITT 7: Testen

### Was funktioniert:
- ✅ Artikel werden angezeigt
- ✅ Suche funktioniert (oben rechts)
- ✅ Bestand wird farbig angezeigt:
  - 🟢 Grün = Viel Bestand (>10)
  - 🟡 Gelb = Wenig Bestand (1-10)
  - 🔴 Rot = Kein Bestand (0)
- ✅ Preise werden formatiert (€)
- ✅ Lieferanten werden angezeigt

### Probiere:
1. **Suche** nach einem Artikel (z.B. "Schlauch")
2. **Klicke** auf "Bearbeiten" → Meldung kommt (kommt in Session 1.8)
3. **Scrolle** durch die Artikel

---

## ⚠️ PROBLEME LÖSEN

### Problem: "npm: command not found"
**Lösung:** Node.js nicht installiert → Zurück zu Schritt 1

### Problem: "Cannot GET /api/artikel"
**Lösung:** Backend läuft nicht!
1. Neues Terminal öffnen
2. Gehe zu `Serverv22/backend`
3. Starte Backend: `uvicorn main:app --reload`

### Problem: Leere Tabelle
**Lösung 1:** Backend läuft nicht (siehe oben)  
**Lösung 2:** Drücke `F12` → Tab "Console" → Screenshot und KI zeigen

### Problem: "Port 3000 already in use"
**Lösung:** 
1. Öffne `vite.config.js`
2. Ändere `port: 3000` zu `port: 3001`
3. Starte neu mit `npm run dev`
4. Dann öffne: `localhost:3001`

---

## 🛑 BEENDEN

**Wenn du fertig bist:**

1. **Gehe zum Terminal** (wo Frontend läuft)
2. **Drücke:** `Strg + C` (Windows) oder `Cmd + C` (Mac)
3. **Bestätige** mit `J` oder `Y` wenn gefragt
4. **Terminal schließen**

**Beim nächsten Mal:**
- ✅ `npm install` überspringen
- ✅ Nur noch `npm run dev` starten

---

## 📞 HILFE HOLEN

**Wenn gar nichts geht:**

1. **Screenshot** vom Terminal machen
2. **Screenshot** vom Browser (F12 → Console Tab)
3. **KI zeigen** mit Beschreibung was du gemacht hast

---

## ✅ GESCHAFFT!

**Du hast jetzt:**
- ✅ Frontend läuft auf `localhost:3000`
- ✅ Backend läuft auf `localhost:5000`
- ✅ Artikelliste wird angezeigt
- ✅ Suche funktioniert
- ✅ System bereit für Session 1.8 (Bearbeiten)

---

**Viel Erfolg! 🎉**

Bei Fragen: Einfach Screenshot machen und KI fragen!

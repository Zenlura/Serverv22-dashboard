# 🚴 Radstation Frontend - Session 1.7

## ✅ Was ist das?

Das ist die Admin-Oberfläche für deine Fahrradwerkstatt Warenwirtschaft.
Hier kannst du alle Artikel sehen, die im System sind.

## 📦 Was du brauchst

- **Node.js** (Version 18 oder höher)
  - Download: https://nodejs.org/de
  - Nimm die "LTS" Version (das ist die stabile)

## 🚀 Installation (Schritt-für-Schritt)

### Schritt 1: Terminal öffnen

**Windows:**
- Drücke `Windows + R`
- Tippe `cmd` und Enter
- Oder: Rechtsklick auf Ordner → "Terminal hier öffnen"

**Mac:**
- Drücke `Cmd + Leertaste`
- Tippe `terminal` und Enter

### Schritt 2: In den Frontend-Ordner wechseln

```bash
cd pfad/zu/deinem/Serverv22/frontend
```

**Tipp:** Du kannst den Ordner auch ins Terminal ziehen statt den Pfad zu tippen!

### Schritt 3: Pakete installieren

```bash
npm install
```

⏱️ Das dauert 1-2 Minuten. Du siehst viel Text - das ist normal!

### Schritt 4: Frontend starten

```bash
npm run dev
```

✅ Wenn du siehst:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

Dann läuft es! 🎉

## 🌐 Öffnen im Browser

1. Öffne deinen Browser (Chrome, Firefox, Edge...)
2. Gib ein: `http://localhost:3000`
3. Du siehst die Artikelliste! 🚴

## 🔧 Backend muss laufen!

**WICHTIG:** Das Backend muss gleichzeitig laufen auf `http://localhost:5000`

Sonst siehst du einen Fehler "Fehler beim Laden der Artikel".

## 📝 Was kannst du jetzt tun?

- ✅ Alle Artikel sehen
- ✅ Nach Artikeln suchen
- ✅ Bestand sehen (mit Farben: grün = viel, gelb = wenig, rot = leer)
- ✅ Preise sehen
- ✅ Lieferanten sehen
- ⏳ Bearbeiten kommt in Session 1.8

## 🆘 Probleme?

### "npm: command not found"
→ Node.js ist nicht installiert. Gehe zu Schritt 1!

### "Cannot GET /api/artikel"
→ Backend läuft nicht. Starte zuerst das Backend!

### Port 3000 ist belegt
→ Ändere in `vite.config.js` den Port von 3000 auf 3001

### Nichts wird angezeigt
→ Drücke `F12` im Browser → Tab "Console" → Screenshot machen und KI zeigen

## 🛑 Stoppen

Im Terminal: `Strg + C` (Windows/Linux) oder `Cmd + C` (Mac)

## 📊 Tech-Stack

- React 18 (UI Framework)
- Vite 5 (Build Tool)
- Tailwind CSS (Styling)

---

**Erstellt in:** Session 1.7  
**Datum:** 01.02.2026  
**Status:** ✅ Fertig - Bereit für Session 1.8

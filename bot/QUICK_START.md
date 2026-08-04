# ⚡ Schnell-Start: Bot mit Session-Daten

Diese Methode ist **am schnellsten** - kein QR-Code nötig!

## 🚀 Super einfach (3 Schritte)

### 1️⃣ Session-Daten eingeben

Du hast von mir Session-Daten bekommen (aus dem QR-Code).

Speichere sie:
```bash
node setup-with-session.js
```

Das Script speichert die Session lokal.

### 2️⃣ `.env` Datei erstellen

```bash
cp .env.example .env
```

Editiere `.env` und trage deine **Gruppen-ID** ein:
```
WHATSAPP_GROUP_ID=120362047382940238@g.us
FIREBASE_PROJECT_ID=strategic-bus-gtgzl
FIREBASE_API_KEY=AIzaSyAnnacfE_oBHBFAVytJfB2jjYyg883PpZ0
...
```

### 3️⃣ Bot starten

```bash
npm start
```

**Das war's!** ✅ Der Bot läuft jetzt und sendet täglich Nachrichten!

---

## 📱 Oder auf Cloud Run deployen (24/7)

```bash
bash deploy.sh
```

---

## ⚠️ Wichtig

- **Session-Daten** sind sensitiv → **NICHT öffentlich teilen!**
- `.wwebjs_auth/` wird im `.gitignore` ignored (sicher)
- Die Session bleibt lokal/im Bot gespeichert

---

## 🔍 Troubleshooting

**Bot sendet keine Nachrichten?**
```bash
npm start
```
Logs anschauen und fehlende `.env` Variablen überprüfen.

**Neue Gruppen-ID?**
Editiere `.env` und starte neu:
```bash
npm start
```

---

**Questions?** Siehe `bot/README.md` für mehr Details! 🚀

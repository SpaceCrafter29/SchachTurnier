# ⚡ Schnell-Start: WhatsApp Bot Einrichtung

**Zwei einfache Schritte - das war's!**

## 🚀 Schritt 1: Setup durchführen (1x)

```bash
cd bot
npm install
npm run init
```

Das Script wird:
1. ✅ WhatsApp Verbindung herstellen
2. 📱 QR-Code anzeigen (nur beim **ersten Mal**!)
3. 🔍 "Chess Olympics" Gruppe finden
4. 📝 `.env` Datei automatisch erstellen

**Output sieht so aus:**
```
✅ Mit WhatsApp verbunden!
🔍 Suche "Chess Olympics" Gruppe...
🎉 GEFUNDEN: Chess Olympics
   👥 Mitglieder: 8
   🔑 ID: 120362047382940238@g.us
✅ .env Datei erstellt!
🚀 Du kannst jetzt starten: npm start
```

## 🚀 Schritt 2: Bot starten (jeden Tag)

```bash
npm start
```

Der Bot läuft jetzt und sendet:
- **Täglich um 20:00 Uhr** eine erste Nachricht
- **Dann stündlich** (10x insgesamt) wenn Matches ausstehen

## 📱 Häufige Fragen

**Q: Muss ich jedes Mal einen QR-Code scannen?**
A: Nein! Nur beim ersten `npm run init`. Die Session wird lokal gespeichert.

**Q: Kann ich den Bot 24/7 laufen lassen?**
A: Ja! Deploy auf Google Cloud Run mit: `bash deploy.sh`

**Q: Die Benachrichtigungen passen nicht?**
A: Editiere `.env`:
```bash
NOTIFICATION_HOUR=14    # Um 14:00 Uhr starten
NOTIFICATIONS_PER_DAY=5 # 5x pro Tag statt 10x
```

**Q: Neue Gruppen-ID?**
A: Editiere `.env` WHATSAPP_GROUP_ID und starte `npm start` neu

## 🔒 Sicherheit

- ⚠️ **Session-Daten NICHT teilen!**
- `.env` NICHT ins GitHub committen (steht in `.gitignore`)

---

**Weitere Details:** `bot/README.md`

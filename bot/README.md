# 🤖 Schach-Turnier WhatsApp-Bot

Automatische Benachrichtigungen für ausstehende Matches in WhatsApp!

Der Bot nutzt [wa-automate](https://github.com/open-wa/wa-automate-nodejs) für die WhatsApp-Verbindung.

## 📋 Setup

### 1. Abhängigkeiten installieren
```bash
cd bot
npm install
```

### 2. Einmaliges Setup (QR-Code + Gruppe finden)
```bash
npm run init
```

Das Script:
- Zeigt einen QR-Code zum Scannen mit WhatsApp
- Findet automatisch die Gruppe "Chess Olympics"
- Erstellt automatisch die `.env` Datei mit allen benötigten Werten

Die Session wird lokal gespeichert, sodass beim nächsten Start kein neuer QR-Code nötig ist.

**Konfiguration** (optional in `.env` anpassbar):
- `NOTIFICATION_HOUR`: Wann die erste Benachrichtigung des Tages kommt (z.B. 20 = 20:00 Uhr)
- `NOTIFICATIONS_PER_DAY`: Wie viele Nachrichten pro Tag (z.B. 10 = eine pro Stunde für 10 Stunden)

### 3. Bot starten
```bash
npm start
```

## 🔔 Wie es funktioniert

1. **Firebase überwachen**: Der Bot prüft kontinuierlich, welche Matches noch nicht gespielt wurden
2. **Tägliche Benachrichtigungen**: Jeden Tag (z.B. ab 20:00 Uhr) sendet der Bot:
   - **20:00** - "5 Matches ausstehend"
   - **21:00** - "5 Matches ausstehend"
   - **22:00** - "4 Matches ausstehend"
   - ... usw.

3. **Smart Updates**: Wenn Matches gespielt werden, reduziert sich die Anzahl automatisch

## 📱 Nachrichtenbeispiel

```
⚽ Chess Olympics - Spielplan Update

❗ 5 Matches noch nicht gespielt:

📌 2. Runde (02.08.–04.08.)
   3 Matches ausstehend

📌 3. Runde (07.08.–09.08.)
   2 Matches ausstehend

🕐 Nächste Benachrichtigung in 1 Stunde
```

## ⚙️ Troubleshooting

**Falsche Gruppen-ID?**
- Führe `npm run init` erneut aus (lösche vorher ggf. die gespeicherte Session)
- Stelle sicher, dass die Gruppe "Chess Olympics" im Namen enthalten ist

**Session neu einrichten?**
- Lösche den lokalen Session-Ordner und führe `npm run init` erneut aus

## 🚀 Production Deployment

Für kontinuierlichen Betrieb (z.B. auf Heroku, Railway, etc):

```bash
# Mit PM2
npm install -g pm2
pm2 start bot.js --name "chess-bot"
pm2 save
pm2 startup
```

Für Google Cloud Run siehe `DEPLOY_FIREBASE.md`.

## 📝 Lizenz & Hinweis

Nutze wa-automate verantwortungsvoll und beachte WhatsApps Terms of Service!

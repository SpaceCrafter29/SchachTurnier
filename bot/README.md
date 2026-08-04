# 🤖 Schach-Turnier WhatsApp-Bot

Automatische Benachrichtigungen für ausstehende Matches in WhatsApp!

## 📋 Setup

### 1. Abhängigkeiten installieren
```bash
cd bot
npm install
```

### 2. Gruppen-ID finden
```bash
npm run list-groups
```

Das Script:
- Zeigt einen QR-Code zum Scannen mit WhatsApp
- Listet alle deine Gruppen auf
- Zeigt die Gruppen-ID (z.B. `123456789-1234567890@g.us`)

Kopiere die ID von "Chess Olympics".

### 3. `.env` Datei erstellen
```bash
cp .env.example .env
```

Bearbeite `.env` und trage ein:
```
WHATSAPP_GROUP_ID=123456789-1234567890@g.us
NOTIFICATION_HOUR=20
NOTIFICATIONS_PER_DAY=10
```

**Konfiguration:**
- `NOTIFICATION_HOUR`: Wann die erste Benachrichtigung des Tages kommt (z.B. 20 = 20:00 Uhr)
- `NOTIFICATIONS_PER_DAY`: Wie viele Nachrichten pro Tag (z.B. 10 = eine pro Stunde für 10 Stunden)

### 4. Bot starten
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

**"WhatsApp blockiert Zugang"?**
- Stelle sicher, dass du am PC/Mac die richtige WhatsApp-Instanz öffnest
- Scanne den QR-Code nur mit der Telefon-WhatsApp-App
- Der Bot bleibt mit der Sitzung verbunden (`.wwebjs_auth` Ordner)

**Falsche Gruppen-ID?**
- Führe `npm run list-groups` erneut aus
- Stelle sicher, dass du die exakte ID kopierst

## 🚀 Production Deployment

Für kontinuierlichen Betrieb (z.B. auf Heroku, Railway, etc):

```bash
# Mit PM2
npm install -g pm2
pm2 start bot.js --name "chess-bot"
pm2 save
pm2 startup
```

## 📝 Lizenz & Hinweis

Nutze whatsapp-web.js verantwortungsvoll und beachte WhatsApps Terms of Service!

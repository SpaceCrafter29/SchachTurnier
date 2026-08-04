# 🚀 Firebase Cloud Run Deployment

Der Bot läuft dann **24/7 in der Cloud** - kein eigener PC nötig! ☁️

## 📋 Voraussetzungen

1. **Google Cloud Project** (kostenlos, 300$ Guthaben für Neukunden)
   - https://console.cloud.google.com
2. **gcloud CLI** installiert
   - https://cloud.google.com/sdk/docs/install
3. **Docker** installiert (zum lokalen Testen)
   - https://www.docker.com/products/docker-desktop

## 🔧 Setup (5 Minuten)

### 1. Google Cloud Project erstellen

```bash
# Melde dich an
gcloud auth login

# Projekt erstellen (ersetze PROJECT_ID)
gcloud projects create schachturnier-bot --name="Schach Turnier Bot"

# Projekt setzen
gcloud config set project schachturnier-bot

# Aktiviere Cloud Run API
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Secrets in Cloud Secret Manager speichern

```bash
# Aktiviere Secret Manager
gcloud services enable secretmanager.googleapis.com

# Speichere die .env Werte als Secrets
echo -n "123456789-1234567890@g.us" | gcloud secrets create WHATSAPP_GROUP_ID --data-file=-
echo -n "strategic-bus-gtgzl" | gcloud secrets create FIREBASE_PROJECT_ID --data-file=-
echo -n "AIzaSyAnnacfE_oBHBFAVytJfB2jjYyg883PpZ0" | gcloud secrets create FIREBASE_API_KEY --data-file=-
# ... usw. für alle anderen Firebase Config Werte
```

### 3. Docker Image bauen & pushen

```bash
cd bot

# Baue das Image (ersetze PROJECT_ID)
docker build -t gcr.io/schachturnier-bot/chess-bot:latest .

# Konfiguriere Docker für Google Cloud
gcloud auth configure-docker

# Pushe das Image
docker push gcr.io/schachturnier-bot/chess-bot:latest
```

### 4. Cloud Run Service deployen

```bash
gcloud run deploy chess-bot \
  --image gcr.io/schachturnier-bot/chess-bot:latest \
  --platform managed \
  --region europe-west1 \
  --memory 512Mi \
  --timeout 3600 \
  --set-env-vars WHATSAPP_GROUP_ID=$(gcloud secrets versions access latest --secret="WHATSAPP_GROUP_ID") \
  --set-env-vars FIREBASE_PROJECT_ID=$(gcloud secrets versions access latest --secret="FIREBASE_PROJECT_ID") \
  --set-env-vars FIREBASE_API_KEY=$(gcloud secrets versions access latest --secret="FIREBASE_API_KEY") \
  --set-env-vars NOTIFICATION_HOUR=20 \
  --set-env-vars NOTIFICATIONS_PER_DAY=10 \
  --no-allow-unauthenticated
```

## ✅ Test

Der Bot läuft jetzt in der Cloud!

```bash
# Prüfe den Status
gcloud run services list

# Schau die Logs an
gcloud run services logs read chess-bot --limit 50
```

## 💰 Kosten

- **Kostenlos für:**
  - Erste 180 Stunden/Monat (der Bot braucht nur ~10 Stunden/Tag = 300 Stunden möglich)
  - 2 Millionen Requests/Monat
  - Cloud Secret Manager

- **Potenzielle Kosten:**
  - Nur wenn über 180 Stunden/Monat
  - ~$0.00001667 pro Stunde (ca. $0.25/Monat für 300 Stunden)

## 🔍 Troubleshooting

### Bot sendet keine Nachrichten?

```bash
# Schau die Logs an
gcloud run services logs read chess-bot --limit 100

# Stelle sicher, dass die Secrets korrekt gesetzt sind
gcloud secrets list
gcloud secrets versions access latest --secret="WHATSAPP_GROUP_ID"
```

### Secrets aktualisieren?

```bash
# Neues Secret anlegen
echo -n "neue-wert" | gcloud secrets versions add WHATSAPP_GROUP_ID --data-file=-

# Bot neu deployen
gcloud run deploy chess-bot \
  --image gcr.io/schachturnier-bot/chess-bot:latest \
  --update-env-vars WHATSAPP_GROUP_ID=$(gcloud secrets versions access latest --secret="WHATSAPP_GROUP_ID")
```

### QR-Code beim Deployment?

Das funktioniert nicht bei Cloud Run (keine UI). Der Bot speichert die Session lokal.

**Erste Ausführung lokal:**
```bash
npm run test  # Damit wird die Session erstellt
```

Dann die Session-Datei `.wwebjs_auth` committen oder in Cloud Storage speichern.

## 📝 Kostenlose Alternativen

Wenn Google Cloud zu kompliziert ist:

1. **Railway** - Kostenlos bis 5$, einfaches Setup
2. **Replit** - Kostenlos, aber langsamer
3. **Fly.io** - Kostenlos bis 3 Shared-cpu-1x 256MB VMs

## 🔐 Sicherheit

- Secrets werden verschlüsselt gespeichert ✅
- Die Funktion ist nicht öffentlich zugänglich (`--no-allow-unauthenticated`) ✅
- Logs sind verschlüsselt ✅

---

**Fragen?** Schau die [Cloud Run Docs](https://cloud.google.com/run/docs) an!

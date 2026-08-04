#!/bin/bash

set -e

echo "🚀 Schach-Turnier Bot Deployment zu Google Cloud Run"
echo "=================================================="
echo ""

# Konfiguration
PROJECT_ID="schachturnier-bot"
SERVICE_NAME="chess-bot"
REGION="europe-west1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Google Cloud authentifizieren
echo -e "${YELLOW}[1/5]${NC} Authentifiziere mit Google Cloud..."
gcloud auth login

# 2. Projekt konfigurieren
echo -e "${YELLOW}[2/5]${NC} Konfiguriere Projekt..."
gcloud config set project ${PROJECT_ID}
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 3. Docker Image bauen
echo -e "${YELLOW}[3/5]${NC} Baue Docker Image..."
docker build -t ${IMAGE_NAME} .

# 4. Docker Image pushen
echo -e "${YELLOW}[4/5]${NC} Pushe Docker Image zu Google Container Registry..."
gcloud auth configure-docker
docker push ${IMAGE_NAME}

# 5. Cloud Run Service deployen
echo -e "${YELLOW}[5/5]${NC} Deploye zu Cloud Run..."
echo ""
echo "⚠️  HINWEIS: Stelle sicher, dass .env mit den korrekten Secrets erstellt ist!"
echo ""

gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --memory 512Mi \
  --timeout 3600 \
  --no-allow-unauthenticated \
  --set-env-vars "NOTIFICATION_HOUR=20,NOTIFICATIONS_PER_DAY=10"

echo ""
echo -e "${GREEN}✅ Deployment erfolgreich!${NC}"
echo ""
echo "Bot Logs anschauen:"
echo "  gcloud run services logs read ${SERVICE_NAME} --limit 50"
echo ""
echo "Bot Status:"
echo "  gcloud run services list"
echo ""

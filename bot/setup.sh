#!/bin/bash

echo "🚀 Chess-Bot Setup"
echo "=================="
echo ""

# 1. Dependencies installieren
echo "📦 Installiere Abhängigkeiten..."
npm install

# 2. Gruppen-ID finden
echo ""
echo "📱 Starte WhatsApp-Verbindung..."
echo ""
npm run find-group

# 3. .env erstellen
echo ""
read -p "Gib die Gruppen-ID ein (aus oben): " GROUP_ID

if [ -z "$GROUP_ID" ]; then
  echo "❌ Gruppen-ID erforderlich!"
  exit 1
fi

# Erstelle .env
cat > .env << EOF
WHATSAPP_GROUP_ID=$GROUP_ID
FIREBASE_PROJECT_ID=strategic-bus-gtgzl
FIREBASE_APP_ID=1:223160037293:web:05722321bf1f676a477b24
FIREBASE_API_KEY=AIzaSyAnnacfE_oBHBFAVytJfB2jjYyg883PpZ0
FIREBASE_AUTH_DOMAIN=strategic-bus-gtgzl.firebaseapp.com
FIREBASE_STORAGE_BUCKET=strategic-bus-gtgzl.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=223160037293
NOTIFICATION_HOUR=20
NOTIFICATIONS_PER_DAY=10
EOF

echo ""
echo "✅ .env Datei erstellt!"
echo ""
echo "🧪 Sende Test-Nachricht..."
npm run test

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "1. Deploy auf Cloud Run: bash deploy.sh"
echo "2. Bot startet dann automatisch jeden Tag um 20:00 Uhr"
echo ""

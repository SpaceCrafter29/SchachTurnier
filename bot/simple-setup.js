import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';

console.log('\n🚀 Einfaches Setup\n');
console.log('==================\n');

const client = new Client();

client.on('qr', (qr) => {
  console.log('📱 Scanne mit WhatsApp auf deinem Handy:\n');
  qrcode.generate(qr, {small: true});
  console.log('\n⏳ Warte auf Verbindung...\n');
});

client.on('ready', async () => {
  console.log('\n✅ Verbunden!\n');
  console.log('🔍 Suche "Chess Olympics" Gruppe...\n');

  const chats = await client.getChats();
  let foundGroupId = null;

  for (const chat of chats) {
    if (chat.isGroup) {
      console.log(`- ${chat.name} (${chat.participants.length} Mitglieder)`);

      if (chat.name.includes('Chess Olympics')) {
        foundGroupId = chat.id.user;
        console.log(`\n🎉 GEFUNDEN: ${chat.name}\n`);
      }
    }
  }

  if (!foundGroupId) {
    console.log('\n❌ "Chess Olympics" nicht gefunden!\n');
    console.log('Versuche den genauen Namen zu nutzen.\n');
    process.exit(1);
  }

  // Erstelle .env
  const envContent = `# ⚽ Chess Olympics WhatsApp Bot

# WhatsApp
WHATSAPP_GROUP_ID=${foundGroupId}

# Firebase
FIREBASE_PROJECT_ID=strategic-bus-gtgzl
FIREBASE_APP_ID=1:223160037293:web:05722321bf1f676a477b24
FIREBASE_API_KEY=AIzaSyAnnacfE_oBHBFAVytJfB2jjYyg883PpZ0
FIREBASE_AUTH_DOMAIN=strategic-bus-gtgzl.firebaseapp.com
FIREBASE_STORAGE_BUCKET=strategic-bus-gtgzl.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=223160037293

# Bot
NOTIFICATION_HOUR=20
NOTIFICATIONS_PER_DAY=10
`;

  fs.writeFileSync('.env', envContent);

  console.log('✅ .env erstellt!\n');
  console.log('Nächster Schritt:\n');
  console.log('  npm start\n');

  process.exit(0);
});

client.on('error', (err) => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

console.log('Starte...\n');
client.initialize();

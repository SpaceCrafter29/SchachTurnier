import { Client, LocalAuth } from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';

console.log('🤖 Auto-Setup: Finde Chess Olympics Gruppen-ID...\n');

// Session-Daten (aus QR-Code)
const sessionData = {
  WABrowserId: "2@D2OtiNXhG1ncSxeA4m02hpqZpUK+y4ZNIiPl8ylK7B6MMFgAkZ66/nITKFkifo9KzSrQzc4s7XfaKZHeTLKr6KzwYIGxaqsnuK0=",
  WASecretBundle: "rkmpc9xyfHsJXumcrOjPDMIPifgDS2a6dPXlPq0Yrmc=",
  WAToken1: "rNLy6vvVlnaJ9FVooYmCsXxv9vGyna64nhkHnBAIS1s=",
  WAToken2: "UGakAShcVDr0B9yz/oU0IupXSASTTZzGgUmOql4CTVU=",
  WAToken3: "1"
};

// Speichere Session
const authDir = '.wwebjs_auth';
const sessionFile = path.join(authDir, 'session.json');

if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

fs.writeFileSync(sessionFile, JSON.stringify([{
  name: 'Default',
  data: sessionData
}], null, 2));

console.log('✅ Session gespeichert\n');

// Starte Client
const client = new Client({
  authStrategy: new LocalAuth()
});

let foundGroupId = null;

client.on('ready', async () => {
  console.log('✅ WhatsApp verbunden!\n');
  console.log('🔍 Suche nach "Chess Olympics"...\n');

  const chats = await client.getChats();

  // Suche nach Chess Olympics Gruppe
  for (const chat of chats) {
    if (chat.isGroup && chat.name.includes('Chess Olympics')) {
      foundGroupId = chat.id.user;
      console.log('🎉 GEFUNDEN!\n');
      console.log(`📋 Gruppe: ${chat.name}`);
      console.log(`👥 Mitglieder: ${chat.participants.length}`);
      console.log(`🔑 ID: ${foundGroupId}\n`);
      break;
    }
  }

  if (!foundGroupId) {
    console.log('❌ "Chess Olympics" nicht gefunden!\n');
    console.log('Verfügbare Gruppen:\n');
    chats.forEach((chat) => {
      if (chat.isGroup) {
        console.log(`- ${chat.name} (${chat.participants.length} Mitglieder)`);
      }
    });
    process.exit(1);
  }

  // Erstelle .env
  const envContent = `# WhatsApp Bot Config
WHATSAPP_GROUP_ID=${foundGroupId}

# Firebase Config
FIREBASE_PROJECT_ID=strategic-bus-gtgzl
FIREBASE_APP_ID=1:223160037293:web:05722321bf1f676a477b24
FIREBASE_API_KEY=AIzaSyAnnacfE_oBHBFAVytJfB2jjYyg883PpZ0
FIREBASE_AUTH_DOMAIN=strategic-bus-gtgzl.firebaseapp.com
FIREBASE_STORAGE_BUCKET=strategic-bus-gtgzl.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=223160037293

# Bot Config
NOTIFICATION_HOUR=20
NOTIFICATIONS_PER_DAY=10
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ .env Datei erstellt!\n');
  console.log('📄 Inhalt:');
  console.log(envContent);
  console.log('\n✨ Alles fertig!\n');
  console.log('Du kannst jetzt starten:');
  console.log('  npm start\n');

  process.exit(0);
});

client.on('error', (error) => {
  console.error('❌ Fehler:', error.message);
  process.exit(1);
});

client.initialize();

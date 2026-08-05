import { create } from '@open-wa/wa-automate';
import fs from 'fs';

console.log('\n🤖 Chess Turnier Bot - Setup\n');
console.log('============================\n');

console.log('📱 Starte WhatsApp Verbindung...\n');
console.log('QR-Code wird gleich angezeigt - bitte scannen!\n');

const client = await create({
  sessionId: 'chess-bot',
  headless: true,
  multiDevice: true,
  autoRefresh: true,
  qrTimeout: 0
});

console.log('✅ Authentifiziert!\n');
console.log('🔍 Suche "Chess Olympics" Gruppe...\n');

try {
  const chats = await client.getAllChats();
  let foundGroupId = null;

  for (const chat of chats) {
    if (chat.isGroup && chat.name.includes('Chess Olympics')) {
      foundGroupId = chat.id;
      console.log(`🎉 GEFUNDEN: ${chat.name}`);
      console.log(`   👥 Mitglieder: ${chat.participants.length}`);
      console.log(`   🔑 ID: ${foundGroupId}\n`);
      break;
    }
  }

  if (!foundGroupId) {
    console.log('❌ "Chess Olympics" Gruppe nicht gefunden!\n');
    console.log('Verfügbare Gruppen:\n');
    chats.forEach((chat) => {
      if (chat.isGroup) {
        console.log(`- ${chat.name}`);
      }
    });
    await client.close();
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

# Bot Konfiguration
NOTIFICATION_HOUR=20
NOTIFICATIONS_PER_DAY=10
`;

  fs.writeFileSync('.env', envContent);

  console.log('✅ .env Datei erstellt!\n');
  console.log('📋 Inhalt:\n');
  console.log('   ✓ WHATSAPP_GROUP_ID=' + foundGroupId);
  console.log('   ✓ Firebase Config');
  console.log('   ✓ Bot Benachrichtigungen\n');

  console.log('🚀 Du kannst jetzt starten:\n');
  console.log('   npm start\n');

  await client.close();
  process.exit(0);

} catch (error) {
  console.error('❌ Fehler:', error.message);
  await client.close();
  process.exit(1);
}

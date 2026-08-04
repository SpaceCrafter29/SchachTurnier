import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client();

client.on('qr', (qr) => {
  console.log('\n📱 Bitte mit WhatsApp auf deinem Handy den QR-Code scannen:\n');
  qrcode.generate(qr, {small: true});
  console.log('\n(Warte auf Verbindung...)\n');
});

client.on('ready', async () => {
  console.log('\n✅ WhatsApp verbunden!\n');
  console.log('🔍 Suche nach "Chess Olympics" Gruppe...\n');

  const chats = await client.getChats();

  let found = false;
  chats.forEach((chat) => {
    if (chat.isGroup && chat.name.includes('Chess Olympics')) {
      found = true;
      console.log('🎉 GEFUNDEN!\n');
      console.log(`📋 Gruppe: ${chat.name}`);
      console.log(`👥 Mitglieder: ${chat.participants.length}`);
      console.log(`\n🔑 GRUPPEN-ID (kopieren!):\n`);
      console.log(`${chat.id.user}\n`);
      console.log('---\n');
      console.log('Diese ID in die .env Datei eintragen:\n');
      console.log(`WHATSAPP_GROUP_ID=${chat.id.user}\n`);
    }
  });

  if (!found) {
    console.log('❌ "Chess Olympics" Gruppe nicht gefunden!\n');
    console.log('Alle Gruppen:\n');
    chats.forEach((chat) => {
      if (chat.isGroup) {
        console.log(`- ${chat.name} (${chat.participants.length} Mitglieder)`);
      }
    });
  }

  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

client.on('error', (error) => {
  console.error('❌ Fehler:', error);
});

console.log('🤖 Starte WhatsApp-Verbindung...\n');
client.initialize();

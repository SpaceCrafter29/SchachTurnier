import { Client } = from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client();

client.on('qr', (qr) => {
  console.log('📱 Bitte QR-Code mit WhatsApp scannen:\n');
  qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
  console.log('✅ WhatsApp verbunden!\n');
  const chats = await client.getChats();

  console.log('📋 Alle Gruppen:\n');
  let groupCount = 0;
  chats.forEach((chat) => {
    if (chat.isGroup) {
      groupCount++;
      console.log(`${groupCount}. ${chat.name}`);
      console.log(`   ID: ${chat.id.user}`);
      console.log(`   Mitglieder: ${chat.participants.length}\n`);
    }
  });

  if (groupCount === 0) {
    console.log('Keine Gruppen gefunden.');
  }

  process.exit(0);
});

client.initialize();

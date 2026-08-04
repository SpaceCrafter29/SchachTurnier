import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client();

client.on('qr', (qr) => {
  console.log('\n📱 QR-Code mit WhatsApp scannen:\n');
  qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
  console.log('✅ WhatsApp verbunden!\n');

  const groupId = process.env.WHATSAPP_GROUP_ID;

  if (!groupId) {
    console.error('❌ WHATSAPP_GROUP_ID nicht in .env gesetzt!');
    process.exit(1);
  }

  try {
    const chat = await client.getChatById(groupId);

    const testMessage = `🧪 *Test Nachricht vom Bot*

✅ WhatsApp Bot läuft!
🏆 Chess Olympics Turnierbot ist verbunden

📋 Nächste Nachricht: Echte Benachrichtigungen

Zeit: ${new Date().toLocaleString('de-DE')}`;

    await chat.sendMessage(testMessage);
    console.log('✅ Test-Nachricht erfolgreich gesendet!\n');
    console.log('📝 Die Nachricht sollte jetzt in der Gruppe sichtbar sein.\n');

  } catch (error) {
    console.error('❌ Fehler beim Senden:', error.message);
  }

  setTimeout(() => {
    console.log('👋 Bot wird beendet...');
    process.exit(0);
  }, 2000);
});

client.on('error', (error) => {
  console.error('❌ WhatsApp Error:', error);
});

console.log('🤖 Starte Test-Bot...\n');
client.initialize();

import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client();

client.on('qr', (qr) => {
  console.log('\n📱 Scanne mit WhatsApp:\n');
  qrcode.generate(qr, {small: true});
  console.log('\nFertig! 🎉\n');
});

client.on('ready', () => {
  console.log('✅ Verbunden!\n');
  process.exit(0);
});

console.log('🚀 Starte...\n');
client.initialize();

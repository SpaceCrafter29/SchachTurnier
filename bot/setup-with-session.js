import fs from 'fs';
import path from 'path';

// Session-Daten speichern (aus QR-Code)
const sessionData = {
  WABrowserId: "2@D2OtiNXhG1ncSxeA4m02hpqZpUK+y4ZNIiPl8ylK7B6MMFgAkZ66/nITKFkifo9KzSrQzc4s7XfaKZHeTLKr6KzwYIGxaqsnuK0=",
  WASecretBundle: "rkmpc9xyfHsJXumcrOjPDMIPifgDS2a6dPXlPq0Yrmc=",
  WAToken1: "rNLy6vvVlnaJ9FVooYmCsXxv9vGyna64nhkHnBAIS1s=",
  WAToken2: "UGakAShcVDr0B9yz/oU0IupXSASTTZzGgUmOql4CTVU=",
  WAToken3: "1"
};

const authDir = '.wwebjs_auth';
const sessionFile = path.join(authDir, 'session.json');

// Verzeichnis erstellen
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Session speichern
fs.writeFileSync(sessionFile, JSON.stringify([{
  name: 'Default',
  data: sessionData
}], null, 2));

console.log('✅ WhatsApp-Session gespeichert!');
console.log('📁 Datei: ' + sessionFile);
console.log('');
console.log('Du kannst jetzt starten:');
console.log('  npm start');
console.log('');
console.log('Der Bot startet direkt ohne QR-Code! 🚀');

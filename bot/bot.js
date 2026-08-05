import { create } from '@open-wa/wa-automate';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  appId: process.env.FIREBASE_APP_ID,
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID
};

const ROUNDS = [
  {nr:1, date:'28.07.–30.07.'},
  {nr:2, date:'02.08.–04.08.'},
  {nr:3, date:'07.08.–09.08.'},
  {nr:4, date:'12.08.–14.08.'},
  {nr:5, date:'17.08.–19.08.'},
  {nr:6, date:'22.08.–24.08.'},
  {nr:7, date:'27.08.–29.08.'}
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-ae9706c1-9a01-400b-b585-6db71a52287f");

let client;
let lastSentTime = null;
let unplayedMatches = [];
const groupId = process.env.WHATSAPP_GROUP_ID;

console.log('🤖 Schach-Turnier WhatsApp-Bot wird gestartet...\n');

async function startBot() {
  try {
    client = await create({
      sessionId: 'chess-bot',
      headless: true,
      multiDevice: true,
      autoRefresh: true
    });

    console.log('✅ WhatsApp-Bot verbunden!\n');
    console.log(`📱 Sende Benachrichtigungen an: ${groupId}\n`);

    monitorGames();
    startDailyNotifications();

  } catch (error) {
    console.error('❌ Fehler beim Bot-Start:', error.message);
    process.exit(1);
  }
}

function monitorGames() {
  const docRef = doc(db, "tournament", "state");
  onSnapshot(docRef, (docSnap) => {
    const data = docSnap.exists() ? docSnap.data() : {};
    const games = data.games || {};

    unplayedMatches = [];

    for(let r = 1; r <= 7; r++) {
      for(let m = 0; m < 4; m++) {
        for(let b = 1; b <= 3; b++) {
          const key = `R${r}M${m}B${b}`;
          if(!games[key]) {
            unplayedMatches.push({round: r, match: m, board: b});
          }
        }
      }
    }

    if(unplayedMatches.length > 0) {
      console.log(`🔔 ${unplayedMatches.length} Matches noch nicht gespielt`);
    }
  });
}

function startDailyNotifications() {
  const notificationsPerDay = parseInt(process.env.NOTIFICATIONS_PER_DAY) || 10;
  const notificationHour = parseInt(process.env.NOTIFICATION_HOUR) || 20;

  setInterval(async () => {
    const now = new Date();

    if(now.getHours() !== notificationHour) return;
    if(lastSentTime && (now - lastSentTime) < 60000) return;

    sendNotifications();
    lastSentTime = now;
  }, 60000);

  console.log(`⏰ Benachrichtigungen um ${notificationHour}:00 Uhr starten`);
  console.log(`📤 ${notificationsPerDay} Nachrichten pro Tag (1 pro Stunde für ${notificationsPerDay} Stunden)\n`);
}

async function sendNotifications() {
  if(!client || unplayedMatches.length === 0) return;

  try {
    const byRound = {};
    unplayedMatches.forEach(m => {
      if(!byRound[m.round]) byRound[m.round] = [];
      byRound[m.round].push(m);
    });

    let message = `⚽ *Chess Olympics - Spielplan Update*\n\n`;
    message += `❗ ${unplayedMatches.length} Matches noch nicht gespielt:\n\n`;

    Object.keys(byRound).sort().forEach(roundNr => {
      const round = ROUNDS[roundNr-1];
      message += `📌 *${roundNr}. Runde* (${round.date})\n`;
      message += `   ${byRound[roundNr].length} Matches ausstehend\n\n`;
    });

    message += `🕐 Nächste Benachrichtigung in 1 Stunde\n`;

    await client.sendText(groupId, message);
    console.log(`✅ Benachrichtigung gesendet: ${unplayedMatches.length} ausstehende Matches`);

  } catch (error) {
    console.error('❌ Fehler beim Senden:', error.message);
  }
}

startBot();

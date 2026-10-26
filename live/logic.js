// Spiellogik für das Live-Schach (1 gegen 1): Regeln via chess.js, dazu Uhren, Remis-Angebote,
// Aufgabe und Revanche. Läuft auf dem Rechner der Person, die den Raum erstellt hat ("Host"), die
// anderen bekommen nur den jeweiligen Stand geschickt (siehe net.js). Reines JS ohne Browser-APIs,
// damit es sich in Node testen lässt (siehe live/test.mjs).
import { Chess } from './vendor/chess.js';

// Sitz 0 = Weiß, Sitz 1 = Schwarz (innerhalb EINER Partie; bei der Revanche tauschen die Farben).
export class GameCore {
  constructor({ timeMs, incMs }) {
    this.timeMs = timeMs;
    this.incMs = incMs;
    this.reset();
  }

  reset() {
    this.chess = new Chess();
    this.moves = []; // [{ from, to, promotion, san }]
    this.remaining = [this.timeMs, this.timeMs];
    this.runningSince = null; // ab wann die Uhr der Seite am Zug läuft (Host-Zeit in ms)
    this.started = false;
    this.result = null; // { winner: 0|1|null, reason }
    this.drawOffer = null;
  }

  start() { this.started = true; }

  turnSeat() { return this.chess.turn() === 'w' ? 0 : 1; }

  // Die Uhr läuft erst, nachdem Weiß seinen ersten Zug gemacht hat (der erste Zug ist zeitfrei).
  clockRunning() { return this.started && !this.result && this.moves.length > 0; }

  liveRemaining(now) {
    const r = this.remaining.slice();
    if (this.clockRunning()) r[this.turnSeat()] = Math.max(0, r[this.turnSeat()] - (now - this.runningSince));
    return r;
  }

  // Zeitablauf prüfen; true, wenn die Partie dadurch gerade zu Ende gegangen ist.
  tick(now) {
    if (!this.clockRunning()) return false;
    const seat = this.turnSeat();
    if (this.remaining[seat] - (now - this.runningSince) <= 0) {
      this.remaining[seat] = 0;
      this.result = { winner: 1 - seat, reason: 'time' };
      return true;
    }
    return false;
  }

  move(seat, { from, to, promotion }, now) {
    if (!this.started || this.result || seat !== this.turnSeat()) return false;
    if (this.tick(now)) return false;
    let mv;
    try { mv = this.chess.move({ from, to, promotion }); } catch { return false; }
    if (!mv) return false;
    if (this.moves.length > 0) {
      this.remaining[seat] = this.remaining[seat] - (now - this.runningSince) + this.incMs;
    }
    this.moves.push({ from: mv.from, to: mv.to, promotion: mv.promotion || null, san: mv.san });
    this.runningSince = now;
    this.drawOffer = null;
    if (this.chess.isCheckmate()) this.result = { winner: seat, reason: 'checkmate' };
    else if (this.chess.isStalemate()) this.result = { winner: null, reason: 'stalemate' };
    else if (this.chess.isInsufficientMaterial()) this.result = { winner: null, reason: 'insufficient' };
    else if (this.chess.isThreefoldRepetition()) this.result = { winner: null, reason: 'repetition' };
    else if (this.chess.isDraw()) this.result = { winner: null, reason: 'fifty' };
    return true;
  }

  resign(seat) {
    if (!this.started || this.result) return false;
    this.result = { winner: 1 - seat, reason: 'resign' };
    return true;
  }

  offerDraw(seat) {
    if (!this.started || this.result || this.drawOffer != null) return false;
    this.drawOffer = seat;
    return true;
  }

  acceptDraw(seat) {
    if (!this.started || this.result || this.drawOffer == null || this.drawOffer === seat) return false;
    this.result = { winner: null, reason: 'agreement' };
    return true;
  }

  declineDraw(seat) {
    if (this.drawOffer == null || this.drawOffer === seat) return false;
    this.drawOffer = null;
    return true;
  }

  // Stand für die Übertragung: Zeiten sind "Restzeit jetzt", `running` sagt, wessen Uhr läuft.
  snapshot(now) {
    return {
      moves: this.moves.map((m) => ({ from: m.from, to: m.to, promotion: m.promotion, san: m.san })),
      remaining: this.liveRemaining(now),
      running: this.clockRunning() ? this.turnSeat() : null,
      started: this.started,
      result: this.result,
      drawOffer: this.drawOffer,
      timeMs: this.timeMs,
      incMs: this.incMs,
    };
  }

  // Stand aus einer früheren Übertragung wiederherstellen (Host lädt die Seite neu). Die Zeit,
  // in der die Seite zu war, zählt nicht.
  restore(snap, now) {
    this.reset();
    this.started = !!snap.started;
    for (const m of snap.moves) {
      this.chess.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
      this.moves.push({ from: m.from, to: m.to, promotion: m.promotion || null, san: m.san });
    }
    this.remaining = snap.remaining.slice();
    this.result = snap.result || null;
    this.drawOffer = snap.drawOffer == null ? null : snap.drawOffer;
    this.runningSince = now;
  }
}

// Was ein Zuschauer/Mitspieler aus einem übertragenen Stand macht: Brett nachspielen.
export function boardFromSnapshot(snap) {
  const chess = new Chess();
  for (const m of snap.moves) chess.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
  return chess;
}

// Eval-Balken: Anteil Weiß (0..1) aus Centipawns (Weißsicht), wie bei lichess.
export function evalShare(cp) {
  return 0.5 + 0.5 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function formatClock(ms) {
  const s = Math.max(0, ms) / 1000;
  if (s < 10) return `0:0${s.toFixed(1)}`;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export const REASON_TEXT = {
  checkmate: 'Schachmatt',
  time: 'Zeit abgelaufen',
  resign: 'Aufgabe',
  stalemate: 'Patt',
  insufficient: 'Unzureichendes Material',
  repetition: 'Dreifache Stellungswiederholung',
  fifty: '50-Züge-Regel',
  agreement: 'Remis vereinbart',
};

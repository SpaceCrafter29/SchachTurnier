// Tests für die Spiellogik: node live/test.mjs
import assert from 'node:assert';
import { GameCore, boardFromSnapshot, evalShare, formatClock } from './logic.js';

const mv = (g, seat, from, to, now, promotion) => g.move(seat, { from, to, promotion }, now);
const ok = (name) => console.log('ok -', name);
const fresh = (timeMs = 60000, incMs = 0) => { const g = new GameCore({ timeMs, incMs }); g.start(); return g; };

{ // Narrenmatt
  const g = fresh(); let t = 0;
  assert(mv(g, 0, 'f2', 'f3', t += 1000)); assert(mv(g, 1, 'e7', 'e5', t += 1000));
  assert(mv(g, 0, 'g2', 'g4', t += 1000)); assert(mv(g, 1, 'd8', 'h4', t += 1000));
  assert.deepStrictEqual(g.result, { winner: 1, reason: 'checkmate' }); ok('Narrenmatt: Schwarz gewinnt per Schachmatt');
  assert.strictEqual(mv(g, 0, 'a2', 'a3', t + 1), false); ok('nach Spielende keine Züge mehr');
}
{ // falscher Sitz, illegaler Zug, nicht gestartet
  const g = fresh();
  assert.strictEqual(mv(g, 1, 'e7', 'e5', 0), false); ok('Schwarz darf nicht beginnen');
  assert.strictEqual(mv(g, 0, 'e2', 'e5', 0), false); ok('illegaler Zug wird abgelehnt');
  const g2 = new GameCore({ timeMs: 1000, incMs: 0 }); assert.strictEqual(mv(g2, 0, 'e2', 'e4', 0), false); ok('vor dem Start keine Züge');
}
{ // erster Zug ist zeitfrei, danach läuft Schwarz, Inkrement
  const g = fresh(60000, 2000);
  assert(mv(g, 0, 'e2', 'e4', 50000)); assert.deepStrictEqual(g.remaining, [60000, 60000]); ok('Weiß: erster Zug kostet keine Zeit, kein Inkrement');
  assert.deepStrictEqual(g.liveRemaining(50000 + 5000), [60000, 55000]); ok('danach läuft die Uhr von Schwarz');
  assert(mv(g, 1, 'e7', 'e5', 50000 + 5000)); assert.deepStrictEqual(g.remaining, [60000, 57000]); ok('Schwarz: 5 s gedacht, +2 s Inkrement');
  assert(mv(g, 0, 'g1', 'f3', 50000 + 8000)); assert.deepStrictEqual(g.remaining, [60000 - 3000 + 2000, 57000]); ok('Weiß: 3 s gedacht, +2 s Inkrement');
}
{ // Zeitablauf per tick und per verspätetem Zug
  const g = fresh(10000); assert(mv(g, 0, 'e2', 'e4', 0));
  assert.strictEqual(g.tick(9000), false); assert.strictEqual(g.tick(10000), true);
  assert.deepStrictEqual(g.result, { winner: 0, reason: 'time' }); ok('Zeitablauf: Weiß gewinnt');
  const h = fresh(10000); mv(h, 0, 'e2', 'e4', 0);
  assert.strictEqual(mv(h, 1, 'e7', 'e5', 12000), false); assert.deepStrictEqual(h.result, { winner: 0, reason: 'time' }); ok('zu später Zug zählt nicht, Zeit verloren');
}
{ // Aufgabe, Remis
  const g = fresh(); mv(g, 0, 'e2', 'e4', 0); assert(g.resign(1)); assert.deepStrictEqual(g.result, { winner: 0, reason: 'resign' }); ok('Aufgabe');
  const h = fresh(); mv(h, 0, 'e2', 'e4', 0);
  assert(h.offerDraw(1)); assert.strictEqual(h.acceptDraw(1), false); assert.strictEqual(h.declineDraw(1), false);
  assert(h.declineDraw(0)); assert.strictEqual(h.drawOffer, null); assert(h.offerDraw(0)); assert(h.acceptDraw(1));
  assert.deepStrictEqual(h.result, { winner: null, reason: 'agreement' }); ok('Remis: anbieten, ablehnen, annehmen (nur der Gegner)');
  const i = fresh(); mv(i, 0, 'e2', 'e4', 0); i.offerDraw(1); mv(i, 1, 'e7', 'e5', 1000); assert.strictEqual(i.drawOffer, null); ok('Angebot verfällt nach einem Zug');
}
{ // Patt, Wiederholung
  const g = fresh(); let t = 0;
  for (const [s, f, to] of [[0,'e2','e3'],[1,'a7','a5'],[0,'d1','h5'],[1,'a8','a6'],[0,'h5','a5'],[1,'h7','h5'],[0,'h2','h4'],[1,'a6','h6'],[0,'a5','c7'],[1,'f7','f6'],[0,'c7','d7'],[1,'e8','f7'],[0,'d7','b7'],[1,'d8','d3'],[0,'b7','b8'],[1,'d3','h7'],[0,'b8','c8'],[1,'f7','g6'],[0,'c8','e6']]) assert(mv(g, s, f, to, t += 100), `${f}${to}`);
  assert.deepStrictEqual(g.result, { winner: null, reason: 'stalemate' }); ok('Patt (Sam Loyd) wird erkannt');
  const r = fresh(); t = 0; const cyc = [[0,'g1','f3'],[1,'g8','f6'],[0,'f3','g1'],[1,'f6','g8']];
  for (let i = 0; i < 2; i++) for (const [s, f, to] of cyc) mv(r, s, f, to, t += 100);
  assert.deepStrictEqual(r.result, { winner: null, reason: 'repetition' }); ok('dreifache Wiederholung wird erkannt');
}
{ // Rochade, Umwandlung, en passant laufen über chess.js
  const g = fresh(); let t = 0;
  for (const [s, f, to, p] of [[0,'e2','e4'],[1,'e7','e5'],[0,'g1','f3'],[1,'b8','c6'],[0,'f1','c4'],[1,'g8','f6'],[0,'e1','g1']]) assert(mv(g, s, f, to, t += 100, p), `${f}${to}`);
  assert.strictEqual(g.chess.get('f1').type, 'r'); ok('Rochade klappt');
}
{ // Snapshot / Wiederherstellen
  const g = fresh(30000, 1000); mv(g, 0, 'e2', 'e4', 0); mv(g, 1, 'c7', 'c5', 4000);
  const snap = g.snapshot(9000); assert.strictEqual(snap.running, 0); assert.deepStrictEqual(snap.remaining, [30000 - 5000, 30000 - 4000 + 1000]);
  const h = new GameCore({ timeMs: 30000, incMs: 1000 }); h.restore(JSON.parse(JSON.stringify(snap)), 100000);
  assert.strictEqual(h.chess.fen(), g.chess.fen()); assert.deepStrictEqual(h.liveRemaining(100000), snap.remaining); assert.strictEqual(boardFromSnapshot(snap).fen(), g.chess.fen());
  ok('Snapshot -> restore: gleiche Stellung, gleiche Zeiten');
}
assert(Math.abs(evalShare(0) - 0.5) < 1e-9 && evalShare(300) > 0.7 && evalShare(-300) < 0.3 && evalShare(2000) > 0.99); ok('Eval-Anteil: 0 = 50 %, +3 > 70 %');
assert.strictEqual(formatClock(65000), '1:05'); assert.strictEqual(formatClock(9500), '0:09.5'); assert.strictEqual(formatClock(-5), '0:00.0'); ok('Uhr-Format');
console.log('\nALLE TESTS BESTANDEN');

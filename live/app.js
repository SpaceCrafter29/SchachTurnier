import { Chess } from './vendor/chess.js';
import { boardFromSnapshot, evalShare, formatClock, REASON_TEXT } from './logic.js';
import { HostSession, GuestSession, randomId, hostKey } from './net.js';
import { Evaluator } from './eval.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const roomId = params.get('r');
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const glyph = (t) => GLYPH[t] + '︎'; // ︎ = Text- statt Emoji-Darstellung
const FILES = 'abcdefgh';

let session = null;
let stateAt = 0; // wann der aktuelle Stand lokal eingetroffen ist (für die Uhren)
let lastState = null;
const ui = { selected: null, targets: [], premove: null, flipped: false, promo: null, lastMoves: -1,
  evalOn: store.get('live.eval', '1') === '1', evalRes: null, evalFen: null, drag: null };
const evaluator = new Evaluator();
let chessCache = { key: '', chess: null };

function chessFor(snap) {
  const key = snap.moves.map((m) => m.from + m.to + (m.promotion || '')).join(',');
  if (chessCache.key !== key || !chessCache.chess) chessCache = { key, chess: boardFromSnapshot(snap) };
  return chessCache.chess;
}
const inviteLink = () => {
  const u = new URLSearchParams({ r: session.roomId });
  const broker = params.get('broker'); // nur zum Testen mit lokalem Broker
  if (broker) u.set('broker', broker);
  return `${location.origin}${location.pathname}?${u}`;
};

// ------------------------------------------------------------------ Lobby ------------------
function renderLobby() {
  const presets = [[1, 0], [3, 0], [3, 2], [5, 0], [10, 0], [15, 10], [30, 0]];
  const f = { min: 5, inc: 0, color: 'random' };
  app.innerHTML = `<div class="card"><h2>Neue Partie</h2>
    <label>Dein Name</label><input type="text" id="name" maxlength="20" value="${esc(store.get('live.name', ''))}" placeholder="z. B. Anna">
    <label>Bedenkzeit (Minuten + Sekunden pro Zug)</label>
    <div class="chips" id="presets">${presets.map(([m, i]) => `<button data-m="${m}" data-i="${i}">${m}+${i}</button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><input type="number" id="min" min="1" max="180" style="width:90px"> <span>Min +</span> <input type="number" id="inc" min="0" max="60" style="width:90px"> <span>Sek</span></div>
    <label>Deine Farbe</label>
    <div class="chips" id="colors"><button data-c="w">Weiß</button><button data-c="random">Zufall</button><button data-c="b">Schwarz</button></div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:14px;color:var(--txt)"><input type="checkbox" id="evalopt" checked> Eval-Balken im Spiel erlauben</label>
    <div class="btns"><button class="primary" id="create">Partie erstellen &amp; Link teilen</button></div>
    <p class="muted small">Die Partie läuft direkt zwischen den Browsern. Wer den Raum erstellt, muss die Seite offen lassen.</p></div>`;
  const q = (s) => app.querySelector(s);
  const sync = () => {
    q('#min').value = f.min; q('#inc').value = f.inc;
    app.querySelectorAll('#presets button').forEach((b) => b.classList.toggle('on', +b.dataset.m === f.min && +b.dataset.i === f.inc));
    app.querySelectorAll('#colors button').forEach((b) => b.classList.toggle('on', b.dataset.c === f.color));
  };
  app.querySelectorAll('#presets button').forEach((b) => b.addEventListener('click', () => { f.min = +b.dataset.m; f.inc = +b.dataset.i; sync(); }));
  app.querySelectorAll('#colors button').forEach((b) => b.addEventListener('click', () => { f.color = b.dataset.c; sync(); }));
  q('#min').addEventListener('input', (e) => { f.min = Math.max(1, Math.min(180, +e.target.value || 1)); sync(); q('#min').value = e.target.value; });
  q('#inc').addEventListener('input', (e) => { f.inc = Math.max(0, Math.min(60, +e.target.value || 0)); sync(); q('#inc').value = e.target.value; });
  q('#create').addEventListener('click', () => {
    const name = q('#name').value.trim() || 'Gast';
    store.set('live.name', name);
    const hostSeat = f.color === 'w' ? 0 : f.color === 'b' ? 1 : (crypto.getRandomValues(new Uint8Array(1))[0] & 1);
    startHost({ roomId: 'tsl-' + randomId(9), opts: { timeMs: f.min * 60000, incMs: f.inc * 1000, evalBar: q('#evalopt').checked }, hostName: name, hostSeat });
  });
  sync();
}

async function startHost(cfg, saved = null) {
  app.innerHTML = '<p class="muted">Raum wird erstellt…</p>';
  session = new HostSession({ ...cfg, saved });
  session.onUpdate(onState);
  try { await session.open(); } catch (e) { renderError('Der Raum konnte nicht erstellt werden (' + esc(session.error || 'Netzwerk') + '). Bitte Seite neu laden.'); return; }
  if (!roomIdCurrent()) { const u = new URLSearchParams(location.search); u.set('r', cfg.roomId); history.replaceState(null, '', `?${u}`); }
  onState(session.state);
}
const roomIdCurrent = () => new URLSearchParams(location.search).get('r');

// ------------------------------------------------------------------ Beitreten --------------
function renderJoin() {
  app.innerHTML = `<div class="card"><h2>Einladung zu einer Schachpartie</h2>
    <p class="muted">Gib deinen Namen ein und tritt der Partie bei. Ist sie schon voll, schaust du zu.</p>
    <label>Dein Name</label><input type="text" id="name" maxlength="20" value="${esc(store.get('live.name', ''))}" placeholder="z. B. Ben">
    <div class="btns"><button class="primary" id="join">Partie beitreten</button></div></div>`;
  app.querySelector('#join').addEventListener('click', () => {
    const name = app.querySelector('#name').value.trim() || 'Gast';
    store.set('live.name', name);
    startGuest(name);
  });
}

function startGuest(name) {
  session = new GuestSession({ roomId, name });
  session.onUpdate(onState);
  session.connect();
  app.innerHTML = '<p class="muted">Verbinde mit dem Raum…</p>';
}

function renderError(html) {
  app.innerHTML = `<div class="card"><h2>Keine Verbindung</h2><p>${html}</p><div class="btns"><button class="primary" onclick="location.reload()">Erneut versuchen</button> <a href="${location.pathname}">Neue Partie</a></div></div>`;
}

// ------------------------------------------------------------------ Spielansicht -----------
function onState(st) {
  if (session instanceof GuestSession && ['error', 'timeout'].includes(session.status)) {
    renderError(session.status === 'timeout' || !st
      ? 'Der Raum antwortet nicht. Ist die Person, die ihn erstellt hat, noch online (Seite offen)? Manche Netzwerke blockieren außerdem die direkte Verbindung.'
      : 'Die Verbindung zum Raum konnte nicht wiederhergestellt werden.');
    return;
  }
  if (!st) return;
  if (st !== lastState) { stateAt = Date.now(); lastState = st; } // Uhren hängen am Zeitpunkt des Eintreffens
  const snap = st.snap;
  const chess = chessFor(snap);
  const you = st.you;
  const canPlay = st.role === 'player' && snap.started && !snap.result;
  const myColor = you === 0 ? 'w' : 'b';
  if (snap.moves.length !== ui.lastMoves) {
    const grew = snap.moves.length > ui.lastMoves;
    ui.lastMoves = snap.moves.length;
    ui.selected = null; ui.targets = []; ui.promo = null;
    if (!grew || snap.result) ui.premove = null;
    // Vorgemerkten Zug (Premove) sofort ausführen, sobald der Gegner gezogen hat
    if (ui.premove && canPlay && chess.turn() === myColor) {
      const pm = ui.premove; ui.premove = null;
      const legal = chess.moves({ verbose: true }).find((m) => m.from === pm.from && m.to === pm.to && (!m.promotion || m.promotion === (pm.promotion || 'q')));
      if (legal) session.act({ t: 'move', from: pm.from, to: pm.to, promotion: legal.promotion });
    }
  }
  renderGame();
}

function seatName(st, seat) { return st.names[seat] || (seat === 0 ? 'Weiß' : 'Schwarz'); }

function resultText(st) {
  const r = st.snap.result;
  if (!r) return '';
  const why = REASON_TEXT[r.reason] || r.reason;
  if (r.winner == null) return `Remis – ${why}`;
  return `${why} – ${seatName(st, r.winner)} (${r.winner === 0 ? 'Weiß' : 'Schwarz'}) gewinnt`;
}

function renderGame() {
  const st = session.state;
  if (!st) return;
  const snap = st.snap;
  const chess = chessFor(snap);
  const you = st.you;
  const over = !!snap.result;
  const canPlay = st.role === 'player' && snap.started && !over;
  const myColor = you === 0 ? 'w' : 'b';
  const bottom = ui.flipped ? 1 - (you ?? 0) : (you ?? 0);
  const last = snap.moves[snap.moves.length - 1];
  const kingSq = chess.inCheck() ? chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn()).square : null;
  const pre = ui.premove ? [ui.premove.from, ui.premove.to] : [];

  let sqs = '';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rank = bottom === 0 ? 8 - r : r + 1;
    const file = bottom === 0 ? f : 7 - f;
    const sq = FILES[file] + rank;
    const p = chess.get(sq);
    const cls = ['sq', (file + rank) % 2 === 0 ? 'l' : 'd'];
    if (last && (last.from === sq || last.to === sq)) cls.push('last');
    if (ui.selected === sq) cls.push('sel');
    if (pre.includes(sq)) cls.push('pre');
    if (kingSq === sq) cls.push('chk');
    const tg = ui.targets.includes(sq) ? `<i class="tg${p ? ' cap' : ''}"></i>` : '';
    const coR = f === 0 ? `<b class="co r">${rank}</b>` : '';
    const coF = r === 7 ? `<b class="co f">${FILES[file]}</b>` : '';
    sqs += `<div class="${cls.join(' ')}" data-sq="${sq}">${coR}${coF}${p ? `<span class="pc ${p.color}">${glyph(p.type)}</span>` : ''}${tg}</div>`;
  }

  const topSeat = 1 - bottom;
  const player = (seat, id) => `<div class="player" id="${id}"><span><span class="dot" style="background:${seat === 0 ? '#fff' : '#222'}"></span>${esc(seatName(st, seat))}${st.names[seat] == null ? ' <span class="muted small">(wartet…)</span>' : ''}</span><span class="clock" id="${id}c"></span></div>`;

  const allowEval = st.evalBar || over || st.role === 'spectator';
  const showEval = allowEval && ui.evalOn;
  const promo = ui.promo ? `<div class="promo"><div>${['q', 'r', 'b', 'n'].map((t) => `<button data-promo="${t}">${glyph(t)}</button>`).join('')}</div></div>` : '';

  const moves = [];
  for (let i = 0; i < snap.moves.length; i += 2) moves.push(`<span class="n">${i / 2 + 1}.</span><span class="${i === snap.moves.length - 1 ? 'cur' : ''}">${esc(snap.moves[i].san)}</span><span class="${i + 1 === snap.moves.length - 1 ? 'cur' : ''}">${snap.moves[i + 1] ? esc(snap.moves[i + 1].san) : ''}</span>`);

  let status = '';
  if (over) status = `<div class="msg ${snap.result.winner == null ? '' : (snap.result.winner === you ? 'ok' : (you == null ? '' : 'bad'))}"><b>${esc(resultText(st))}</b></div>`;
  else if (st.role === 'player' && !st.opponentHere) status = '<div class="msg">Warte auf deinen Gegner – schick ihm den Link:</div>';
  else if (st.role === 'player' && snap.started) status = `<div class="msg">${chess.turn() === myColor ? '<b>Du bist am Zug.</b>' : 'Gegner ist am Zug.'}${!snap.moves.length ? ' Die Uhr startet nach dem ersten Zug von Weiß.' : ''}</div>`;
  else if (st.role === 'spectator') status = `<div class="msg">Du schaust zu. ${chess.turn() === 'w' ? 'Weiß' : 'Schwarz'} ist am Zug.</div>`;

  let drawUi = '';
  if (canPlay && snap.drawOffer != null && snap.drawOffer !== you) drawUi = '<div class="msg">Dein Gegner bietet Remis an. <button data-act="acceptDraw">Annehmen</button> <button data-act="declineDraw">Ablehnen</button></div>';

  let buttons = '';
  if (canPlay) buttons = `<button class="danger" data-act="resign">Aufgeben</button><button data-act="offerDraw" ${snap.drawOffer === you ? 'disabled' : ''}>${snap.drawOffer === you ? 'Remis angeboten…' : 'Remis anbieten'}</button>`;
  if (over && st.role === 'player') {
    const mine = st.votes.includes(you), theirs = st.votes.includes(1 - you);
    buttons = `<button class="primary" data-act="rematch" ${mine ? 'disabled' : ''}>${mine ? 'Warte auf Gegner…' : theirs ? 'Revanche annehmen' : 'Revanche'}</button>`;
  }
  buttons += `<button data-act="flip">Brett drehen</button>`;
  if (ui.premove) buttons += `<button data-act="clearPre">Premove abbrechen</button>`;

  const invite = st.role === 'player' && session instanceof HostSession
    ? `<div class="card"><b>Einladungslink</b><div class="link"><input type="text" readonly id="invite" value="${esc(inviteLink())}"><button id="copy">Kopieren</button>${navigator.share ? '<button id="share">Teilen</button>' : ''}</div><p class="muted small" style="margin:8px 0 0">Wer den Link öffnet, wird dein Gegner – alle weiteren schauen zu${st.spectators ? ` (${st.spectators} Zuschauer)` : ''}. Lass diese Seite offen, solange gespielt wird.</p></div>`
    : '';

  app.innerHTML = `<div class="game">
    <div class="boardwrap">
      ${showEval ? '<div class="evalbar" id="evalbar"><div class="w" id="evw"></div><div class="n" id="evn"></div></div>' : ''}
      <div class="boardcol">${player(topSeat, 'ptop')}<div class="board" id="board">${sqs}${promo}</div>${player(bottom, 'pbot')}</div>
    </div>
    <div class="side">
      ${session instanceof GuestSession && session.status === 'reconnecting' ? '<div class="msg bad">Verbindung unterbrochen – verbinde neu…</div>' : ''}${status}${drawUi}${session instanceof HostSession && !st.opponentHere ? invite : ''}
      <div class="btns">${buttons}</div>
      ${allowEval ? `<label style="display:flex;gap:8px;align-items:center;margin:0 0 10px;color:var(--txt)"><input type="checkbox" id="evaltoggle" ${ui.evalOn ? 'checked' : ''}> Eval-Balken</label>` : ''}
      <div class="card"><h2>Züge</h2><div class="moves" id="moves">${moves.join('') || '<span class="muted">Noch keine Züge</span>'}</div></div>
      ${session instanceof HostSession && st.opponentHere ? invite : ''}
    </div></div>`;

  wire(chess, canPlay, myColor);
  paintClocks();
  const mv = document.getElementById('moves');
  if (mv) mv.scrollTop = mv.scrollHeight;
  updateEval(chess, snap, showEval);
}

function wire(chess, canPlay, myColor) {
  const board = document.getElementById('board');
  const st = session.state;
  board.addEventListener('contextmenu', (e) => { e.preventDefault(); ui.premove = null; ui.selected = null; ui.targets = []; renderGame(); });
  board.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.sq');
    if (!el || e.button === 2) return;
    const sq = el.dataset.sq;
    const wasOwn = chess.get(sq) && chess.get(sq).color === myColor;
    onSquare(chess, canPlay, myColor, sq);
    if (canPlay && wasOwn) ui.drag = { sq, x: e.clientX, y: e.clientY, ghost: null, moved: false };
  });
  board.querySelectorAll('[data-promo]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const { from, to } = ui.promo; ui.promo = null;
    if (chess.turn() === myColor) session.act({ t: 'move', from, to, promotion: b.dataset.promo });
    else ui.premove = { from, to, promotion: b.dataset.promo };
    ui.selected = null; ui.targets = []; renderGame();
  }));
  app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'resign') { if (confirm('Wirklich aufgeben?')) session.act({ t: 'resign' }); }
    else if (a === 'flip') { ui.flipped = !ui.flipped; renderGame(); }
    else if (a === 'clearPre') { ui.premove = null; renderGame(); }
    else session.act({ t: a });
  }));
  const tg = document.getElementById('evaltoggle');
  if (tg) tg.addEventListener('change', () => { ui.evalOn = tg.checked; store.set('live.eval', tg.checked ? '1' : '0'); ui.evalFen = null; if (!tg.checked) evaluator.stop(); renderGame(); });
  const copy = document.getElementById('copy');
  if (copy) copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(inviteLink()); copy.textContent = 'Kopiert'; } catch { document.getElementById('invite').select(); } });
  const share = document.getElementById('share');
  if (share) share.addEventListener('click', () => navigator.share({ title: 'Schach-Partie', text: 'Komm zu einer Partie Schach:', url: inviteLink() }).catch(() => {}));
}

function legalTargets(chess, sq) { return chess.moves({ square: sq, verbose: true }).map((m) => m.to); }
// Ziele für einen Premove: so tun, als wäre man selbst am Zug
function premoveTargets(chess, sq, myColor) {
  const parts = chess.fen().split(' '); parts[1] = myColor; parts[3] = '-';
  try { return new Chess(parts.join(' ')).moves({ square: sq, verbose: true }).map((m) => m.to); }
  catch { return FILES.split('').flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => f + r)).filter((s) => s !== sq); }
}
function isPromotionMove(chess, from, to, myColor) {
  const p = chess.get(from);
  return !!p && p.type === 'p' && (to[1] === (myColor === 'w' ? '8' : '1'));
}

function onSquare(chess, canPlay, myColor, sq) {
  const started = session.state.snap.started && !session.state.snap.result && session.state.role === 'player';
  if (!started) return;
  const mine = chess.get(sq) && chess.get(sq).color === myColor;
  const myTurn = chess.turn() === myColor;
  if (ui.selected && ui.selected !== sq && ui.targets.includes(sq)) {
    if (isPromotionMove(chess, ui.selected, sq, myColor)) { ui.promo = { from: ui.selected, to: sq }; renderGame(); return; }
    if (myTurn) session.act({ t: 'move', from: ui.selected, to: sq });
    else ui.premove = { from: ui.selected, to: sq };
    ui.selected = null; ui.targets = []; renderGame(); return;
  }
  if (mine && ui.selected !== sq) {
    ui.selected = sq;
    ui.targets = myTurn ? legalTargets(chess, sq) : premoveTargets(chess, sq, myColor);
  } else { ui.selected = null; ui.targets = []; if (!myTurn && !mine) ui.premove = null; }
  renderGame();
}

// Ziehen mit Finger/Maus (zusätzlich zum Antippen)
document.addEventListener('pointermove', (e) => {
  const d = ui.drag; if (!d) return;
  if (!d.ghost && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) {
    const src = document.querySelector(`[data-sq="${d.sq}"] .pc`);
    if (!src) { ui.drag = null; return; }
    d.ghost = src.cloneNode(true); d.ghost.className = src.className + ' ghost'; document.body.appendChild(d.ghost); src.style.opacity = '.3';
  }
  if (d.ghost) { d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px'; }
});
document.addEventListener('pointerup', (e) => {
  const d = ui.drag; ui.drag = null;
  if (!d || !d.ghost) return;
  d.ghost.remove();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const target = el && el.closest && el.closest('.sq');
  if (target && target.dataset.sq !== d.sq && session.state) {
    const st = session.state; const chess = chessFor(st.snap); const myColor = st.you === 0 ? 'w' : 'b';
    onSquare(chess, true, myColor, target.dataset.sq);
  } else renderGame();
});

// ------------------------------------------------------------------ Uhren ------------------
function liveClocks() {
  const st = session.state; if (!st) return null;
  const r = st.snap.remaining.slice();
  if (st.snap.running != null && !st.snap.result) r[st.snap.running] = Math.max(0, r[st.snap.running] - (Date.now() - stateAt));
  return r;
}
function paintClocks() {
  const st = session && session.state; if (!st) return;
  const r = liveClocks();
  const bottom = ui.flipped ? 1 - (st.you ?? 0) : (st.you ?? 0);
  for (const [id, seat] of [['ptop', 1 - bottom], ['pbot', bottom]]) {
    const box = document.getElementById(id), c = document.getElementById(id + 'c');
    if (!box || !c) continue;
    c.textContent = formatClock(r[seat]);
    c.classList.toggle('low', r[seat] < 20000 && st.snap.started && !st.snap.result);
    box.classList.toggle('run', st.snap.running === seat && !st.snap.result);
  }
}
setInterval(paintClocks, 100);

// ------------------------------------------------------------------ Eval-Balken ------------
function paintEval() {
  const w = document.getElementById('evw'), n = document.getElementById('evn');
  if (!w || !ui.evalRes) return;
  const e = ui.evalRes;
  const share = e.mate != null ? (e.mate > 0 ? 1 : 0) : e.cp == null ? 0.5 : evalShare(e.cp);
  const st = session.state;
  const whiteBottom = (ui.flipped ? 1 - (st.you ?? 0) : (st.you ?? 0)) === 0;
  w.style.height = `${share * 100}%`;
  w.style.top = whiteBottom ? 'auto' : '0'; w.style.bottom = whiteBottom ? '0' : 'auto';
  const label = e.label != null ? e.label : e.mate != null ? `M${Math.abs(e.mate)}` : `${e.cp >= 0 ? '+' : '−'}${(Math.abs(e.cp) / 100).toFixed(1)}`;
  n.textContent = label;
  // Die Zahl steht am Ende des Balkens, das zur führenden Seite gehört
  const whiteWinning = share >= 0.5;
  const leadAtBottom = whiteWinning === whiteBottom;
  n.style.top = leadAtBottom ? 'auto' : '3px';
  n.style.bottom = leadAtBottom ? '3px' : 'auto';
  n.style.color = whiteWinning ? '#222' : '#fff';
}

function updateEval(chess, snap, show) {
  if (!show) { evaluator.stop(); return; }
  const fen = chess.fen();
  if (snap.result && snap.result.reason === 'checkmate') { evaluator.stop(); ui.evalRes = { cp: null, mate: snap.result.winner === 0 ? 1 : -1, label: '#' }; ui.evalFen = fen; paintEval(); return; }
  if (snap.result && snap.result.winner == null) { evaluator.stop(); ui.evalRes = { cp: 0, mate: null, label: '½' }; ui.evalFen = fen; paintEval(); return; }
  if (ui.evalFen === fen) { paintEval(); return; }
  ui.evalFen = fen;
  paintEval();
  evaluator.analyse(fen, (res) => { if (ui.evalFen === fen) { ui.evalRes = res; paintEval(); } });
}

// ------------------------------------------------------------------ Start ------------------
(function main() {
  if (!roomId) { renderLobby(); return; }
  const savedRaw = store.get(hostKey(roomId));
  if (savedRaw) {
    try {
      const saved = JSON.parse(savedRaw);
      startHost({ roomId, opts: saved.opts, hostName: saved.names[saved.hostSeat], hostSeat: saved.hostSeat }, saved);
      return;
    } catch {}
  }
  if (store.get('live.joined.' + roomId)) { startGuest(store.get('live.name', 'Gast')); return; }
  renderJoin();
})();

// Merken, dass man diesem Raum schon beigetreten ist (Neuladen verbindet dann automatisch)
const markJoined = setInterval(() => {
  if (session instanceof GuestSession && session.state && session.state.role === 'player') { store.set('live.joined.' + roomId, '1'); clearInterval(markJoined); }
}, 1000);

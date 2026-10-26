// Verbindung zwischen den Browsern (WebRTC über PeerJS, kein eigener Server): Wer den Raum erstellt
// ("Host") verwaltet die Partie (siehe logic.js), der Gegner und Zuschauer verbinden sich per Link
// direkt mit ihm. Der Host muss die Seite offen lassen; lädt er neu, setzt er die Partie fort.
// PeerJS selbst kommt als normales <script> (vendor/peerjs.min.js) und liefert das globale `Peer`.
import { GameCore } from './logic.js';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];

export function makePeer(id) {
  const opts = { config: { iceServers: ICE } };
  // Nur zum Testen: ?broker=localhost:9000 (nur lokale Adressen erlaubt)
  const broker = new URLSearchParams(location.search).get('broker');
  if (broker) {
    const [h, p] = broker.split(':');
    if (h === 'localhost' || h === '127.0.0.1') Object.assign(opts, { host: h, port: Number(p), path: '/', secure: false });
  }
  return id ? new Peer(id, opts) : new Peer(opts);
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function randomId(n) {
  const a = crypto.getRandomValues(new Uint8Array(n));
  return [...a].map((x) => ALPHABET[x % ALPHABET.length]).join('');
}
export function clientToken() {
  let t = null;
  try { t = localStorage.getItem('live.token'); } catch {}
  if (!t) { t = randomId(16); try { localStorage.setItem('live.token', t); } catch {} }
  return t;
}
export const hostKey = (roomId) => `live.host.${roomId}`;

const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 20) || 'Gast';

// ---------------------------------------------------------------------------------------------
export class HostSession {
  // opts: { timeMs, incMs, evalBar }, hostSeat: 0 (Weiß) | 1 (Schwarz)
  constructor({ roomId, opts, hostName, hostSeat, saved = null }) {
    this.roomId = roomId;
    this.opts = opts;
    this.core = new GameCore({ timeMs: opts.timeMs, incMs: opts.incMs });
    this.hostSeat = hostSeat;
    this.names = [null, null];
    this.names[hostSeat] = cleanName(hostName);
    this.tokens = {}; // Token -> Sitz (damit Neuladen derselbe Platz bleibt)
    this.tokens[clientToken()] = hostSeat;
    this.conns = new Map(); // DataConnection -> { token, seat|null }
    this.votes = new Set(); // Sitze, die eine Revanche wollen
    this.listeners = [];
    this.status = 'connecting'; // connecting | open | error
    this.error = null;
    if (saved) {
      this.hostSeat = saved.hostSeat;
      this.names = saved.names;
      this.tokens = saved.tokens;
      this.tokens[clientToken()] = saved.hostSeat;
      this.core.restore(saved.snap, Date.now());
    }
  }

  onUpdate(cb) { this.listeners.push(cb); }
  get mySeat() { return this.hostSeat; }

  get state() {
    const now = Date.now();
    return {
      snap: this.core.snapshot(now),
      names: this.names.slice(),
      you: this.hostSeat,
      evalBar: !!this.opts.evalBar,
      votes: [...this.votes],
      spectators: [...this.conns.values()].filter((c) => c.seat == null).length,
      opponentHere: this.names[1 - this.hostSeat] != null,
      role: 'player',
    };
  }

  open() {
    return new Promise((resolve, reject) => {
      let tries = 0;
      const attempt = () => {
        const peer = makePeer(this.roomId);
        this.peer = peer;
        peer.on('open', () => {
          this.status = 'open';
          peer.on('connection', (c) => this._onConnection(c));
          this._timer = setInterval(() => { if (this.core.tick(Date.now())) this._changed(); }, 250);
          this._persist();
          this._emit();
          resolve();
        });
        peer.on('error', (e) => {
          // Nach einem Neuladen ist die alte Verbindung beim Broker evtl. noch eine Weile gemeldet.
          if (e.type === 'unavailable-id' && tries++ < 20) { peer.destroy(); setTimeout(attempt, 3000); return; }
          this.status = 'error'; this.error = e.type; this._emit();
          reject(e);
        });
        peer.on('disconnected', () => { try { peer.reconnect(); } catch {} });
      };
      attempt();
    });
  }

  _onConnection(conn) {
    conn.on('data', (msg) => this._onMessage(conn, msg));
    conn.on('close', () => { this.conns.delete(conn); this._emit(); });
    conn.on('error', () => { this.conns.delete(conn); });
  }

  _onMessage(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') { this._hello(conn, msg); return; }
    const info = this.conns.get(conn);
    if (!info || info.seat == null) return; // Zuschauer dürfen nichts
    this.handle(info.seat, msg);
  }

  _hello(conn, { token, name }) {
    token = String(token || '').slice(0, 40);
    const oppSeat = 1 - this.hostSeat;
    let seat = this.tokens[token];
    if (seat === undefined || seat === this.hostSeat) {
      if (this.names[oppSeat] == null && seat === undefined) {
        seat = oppSeat;
        this.tokens[token] = seat;
        this.names[seat] = cleanName(name);
        this.core.start();
      } else seat = null;
    }
    // Eine zweite Verbindung desselben Spielers (z. B. nach Neuladen) ersetzt die alte.
    for (const [c, i] of this.conns) if (seat != null && i.seat === seat) { this.conns.delete(c); try { c.close(); } catch {} }
    this.conns.set(conn, { token, seat });
    this._changed();
  }

  // Aktion eines Spielers (auch des Hosts selbst): move / resign / offerDraw / acceptDraw / declineDraw / rematch
  handle(seat, msg) {
    const now = Date.now();
    const c = this.core;
    let changed = false;
    if (msg.t === 'move') changed = c.move(seat, { from: msg.from, to: msg.to, promotion: msg.promotion }, now);
    else if (msg.t === 'resign') changed = c.resign(seat);
    else if (msg.t === 'offerDraw') changed = c.offerDraw(seat);
    else if (msg.t === 'acceptDraw') changed = c.acceptDraw(seat);
    else if (msg.t === 'declineDraw') changed = c.declineDraw(seat);
    else if (msg.t === 'rematch' && c.result) {
      this.votes.add(seat);
      if (this.votes.size === 2) this._swapColors();
      changed = true;
    }
    if (changed) this._changed();
  }
  act(msg) { this.handle(this.hostSeat, msg); }

  _swapColors() {
    this.names = [this.names[1], this.names[0]];
    this.hostSeat = 1 - this.hostSeat;
    for (const t of Object.keys(this.tokens)) this.tokens[t] = 1 - this.tokens[t];
    for (const i of this.conns.values()) if (i.seat != null) i.seat = 1 - i.seat;
    this.votes.clear();
    this.core.reset();
    this.core.start();
  }

  _changed() { this._persist(); this._emit(); this._broadcast(); }
  _emit() { for (const cb of this.listeners) cb(this.state); }

  _broadcast() {
    const base = this.state;
    for (const [conn, info] of this.conns) {
      if (!conn.open) continue;
      conn.send({ t: 'state', ...base, you: info.seat, role: info.seat == null ? 'spectator' : 'player' });
    }
  }

  _persist() {
    try {
      localStorage.setItem(hostKey(this.roomId), JSON.stringify({
        opts: this.opts, hostSeat: this.hostSeat, names: this.names, tokens: this.tokens,
        snap: this.core.snapshot(Date.now()),
      }));
    } catch {}
  }

  destroy() { clearInterval(this._timer); try { this.peer.destroy(); } catch {} }
}

// ---------------------------------------------------------------------------------------------
export class GuestSession {
  constructor({ roomId, name }) {
    this.roomId = roomId;
    this.name = name;
    this.state = null;
    this.status = 'connecting'; // connecting | open | closed | error | timeout
    this.error = null;
    this.listeners = [];
  }

  onUpdate(cb) { this.listeners.push(cb); }
  get mySeat() { return this.state && this.state.you; }
  _emit() { for (const cb of this.listeners) cb(this.state); }

  connect() {
    if (!this.state) this.status = 'connecting';
    this._emit();
    try { if (this.peer) this.peer.destroy(); } catch {}
    const peer = makePeer();
    this.peer = peer;
    const giveUp = setTimeout(() => { if (!this.state) { this.status = 'timeout'; this._emit(); } else this._retry(); }, 20000);
    peer.on('open', () => {
      const conn = peer.connect(this.roomId, { reliable: true });
      this.conn = conn;
      conn.on('open', () => conn.send({ t: 'hello', token: clientToken(), name: this.name }));
      conn.on('data', (msg) => {
        if (msg && msg.t === 'state') {
          clearTimeout(giveUp);
          this.status = 'open';
          this.attempts = 0;
          this.state = msg;
          this._emit();
        }
      });
      conn.on('close', () => { clearTimeout(giveUp); this._retry(); });
      conn.on('error', () => { clearTimeout(giveUp); this._retry(); });
    });
    peer.on('error', (e) => {
      clearTimeout(giveUp);
      this.error = e.type;
      if (!this.state && e.type === 'peer-unavailable') { this.status = 'error'; this._emit(); return; }
      this._retry();
    });
  }

  // Verbindung weg (z. B. Host lädt neu): automatisch wieder verbinden, der Stand bleibt sichtbar.
  _retry() {
    if (this._retrying) return;
    this.attempts = (this.attempts || 0) + 1;
    if (this.attempts > 40) { this.status = 'error'; this._emit(); return; }
    if (this.state) this.status = 'reconnecting';
    this._emit();
    this._retrying = true;
    setTimeout(() => { this._retrying = false; this.connect(); }, 3000);
  }

  act(msg) { if (this.conn && this.conn.open) this.conn.send(msg); }
  destroy() { try { this.peer.destroy(); } catch {} }
}

// Eval-Balken: Stockfish (WebAssembly, läuft als Worker im eigenen Browser) bewertet die Stellung.
// Liefert die Bewertung immer aus Sicht von Weiß: { cp, mate, depth } (mate = Züge bis zum Matt,
// positiv = Weiß setzt matt, negativ = Schwarz).
export class Evaluator {
  constructor(url = new URL('./vendor/stockfish.wasm.js', import.meta.url)) {
    this.url = url;
    this.worker = null;
    this.busy = false;
    this.nextFen = null;
    this.curFen = null;
    this.callback = null;
    this.failed = false;
  }

  _ensure() {
    if (this.worker || this.failed) return;
    try {
      this.worker = new Worker(this.url);
    } catch (e) { this.failed = true; return; }
    this.worker.onerror = () => { this.failed = true; };
    this.worker.onmessage = (e) => this._line(String(e.data));
    this.worker.postMessage('uci');
    this.worker.postMessage('setoption name Hash value 32');
  }

  // Bewertet `fen`; `callback` wird bei jeder Vertiefung aufgerufen. Eine laufende Suche wird abgelöst.
  analyse(fen, callback, movetimeMs = 1500) {
    this.callback = callback;
    this.nextFen = fen;
    this.movetime = movetimeMs;
    this._ensure();
    if (!this.worker) return;
    if (this.busy) this.worker.postMessage('stop');
    else this._startNext();
  }

  stop() {
    this.nextFen = null;
    this.callback = null;
    if (this.worker && this.busy) this.worker.postMessage('stop');
  }

  _startNext() {
    if (!this.nextFen || !this.worker) return;
    this.curFen = this.nextFen;
    this.nextFen = null;
    this.busy = true;
    this.worker.postMessage(`position fen ${this.curFen}`);
    this.worker.postMessage(`go movetime ${this.movetime}`);
  }

  _line(line) {
    if (line.startsWith('bestmove')) {
      this.busy = false;
      if (this.nextFen) this._startNext();
      return;
    }
    if (!line.startsWith('info') || !this.callback || this.nextFen) return;
    if (/ (upper|lower)bound/.test(line) || !/ score /.test(line)) return;
    if (/ multipv (?!1\b)/.test(line)) return;
    const depth = Number((/ depth (\d+)/.exec(line) || [])[1]);
    const m = / score (cp|mate) (-?\d+)/.exec(line);
    if (!m || !depth) return;
    const sign = this.curFen.split(' ')[1] === 'b' ? -1 : 1; // Engine meldet aus Sicht der Seite am Zug
    const v = sign * Number(m[2]);
    this.callback(m[1] === 'cp' ? { cp: v, mate: null, depth } : { cp: null, mate: v, depth });
  }
}

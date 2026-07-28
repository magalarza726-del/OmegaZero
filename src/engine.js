import { ENGINE_PROFILE } from './constants.js';
import { APP_VERSION } from './version.js';
import { publicAsset } from './publicAssets.js';

export class StockfishEngine {
  constructor(onStatus = () => {}) {
    this.onStatus = onStatus;
    this.worker = null;
    this.ready = false;
    this.initializing = null;
    this.pending = null;
    this.lines = new Map();
    this.analysisTurn = 'w';
  }

  async init() {
    if (this.ready) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.initializeWorker();
    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  async initializeWorker() {
    this.onStatus('Cargando Stockfish 18…');
    // Ruta relativa: funciona desde INICIAR.bat y también si la carpeta dist se
    // publica bajo un subdirectorio. Las rutas absolutas rompían los recursos.
    const workerUrl = publicAsset('engine/stockfish-18-lite-single.js', APP_VERSION);
    this.worker = new Worker(workerUrl);
    this.worker.onmessage = (event) => this.handleMessage(String(event.data));
    this.worker.onerror = (error) => {
      this.onStatus(`No se pudo iniciar Stockfish · revisa public/engine`);
      this.pending?.reject(error);
      this.pending = null;
    };
    await this.waitFor('uciok', () => this.send('uci'));
    this.send('setoption name Skill Level value 20');
    this.send('setoption name UCI_LimitStrength value false');
    this.send('setoption name UCI_AnalyseMode value true');
    this.send('setoption name UCI_ShowWDL value true');
    this.send(`setoption name MultiPV value ${ENGINE_PROFILE.multiPv}`);
    this.send(`setoption name Hash value ${ENGINE_PROFILE.hashMb}`);
    await this.waitFor('readyok', () => this.send('isready'));
    this.ready = true;
    this.onStatus('Motor listo · Stockfish 18');
  }

  send(command) {
    this.worker?.postMessage(command);
  }

  waitFor(token, trigger) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Stockfish no respondió: ${token}`)), 15000);
      const listener = (event) => {
        if (String(event.data).includes(token)) {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', listener);
          resolve();
        }
      };
      this.worker.addEventListener('message', listener);
      trigger();
    });
  }

  configureStrength(skill = 20) {
    const value = Math.max(1, Math.min(20, Number(skill) || 20));
    this.send(`setoption name Skill Level value ${value}`);
    if (value >= 20) {
      this.send('setoption name UCI_LimitStrength value false');
    } else if (value >= 8) {
      const elo = Math.round(1320 + ((value - 8) / 11) * 1680);
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${elo}`);
    } else {
      this.send('setoption name UCI_LimitStrength value false');
    }
  }

  analyse(fen, { depth = ENGINE_PROFILE.depth, multiPv = ENGINE_PROFILE.multiPv, searchMoves = [], skill = 20 } = {}) {
    if (!this.ready) throw new Error('El motor todavía no está listo.');
    if (this.pending) this.stop();
    this.lines.clear();
    this.analysisTurn = String(fen).split(' ')[1] === 'b' ? 'b' : 'w';
    const effectiveMultiPv = searchMoves.length ? 1 : multiPv;
    this.configureStrength(skill);
    this.send(`setoption name MultiPV value ${effectiveMultiPv}`);
    this.send(`position fen ${fen}`);
    this.onStatus(`Calculando · profundidad ${depth}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending = null;
        reject(new Error('La búsqueda tardó demasiado.'));
      }, 240000);
      this.pending = { resolve, reject, timeout };
      const restriction = searchMoves.length ? ` searchmoves ${searchMoves.join(' ')}` : '';
      this.send(`go depth ${depth}${restriction}`);
    });
  }

  handleMessage(line) {
    if (line.startsWith('info ') && line.includes(' multipv ') && line.includes(' pv ')) {
      const pv = Number(line.match(/\bmultipv (\d+)/)?.[1] || 1);
      const cp = line.match(/\bscore cp (-?\d+)/);
      const mate = line.match(/\bscore mate (-?\d+)/);
      const pvText = line.match(/\bpv ((?:[a-h][1-8][a-h][1-8][qrbn]?(?:\s+|$))+)/)?.[1]?.trim();
      const variation = pvText ? pvText.split(/\s+/) : [];
      const move = variation[0];
      const depth = Number(line.match(/\bdepth (\d+)/)?.[1] || 0);
      const wdlMatch = line.match(/\bwdl (\d+) (\d+) (\d+)/);
      const rawWdl = wdlMatch ? { win:Number(wdlMatch[1]), draw:Number(wdlMatch[2]), loss:Number(wdlMatch[3]) } : null;
      const wdl = rawWdl && this.analysisTurn === 'b' ? { win:rawWdl.loss, draw:rawWdl.draw, loss:rawWdl.win } : rawWdl;
      if (move && (cp || mate)) {
        const rawMate = mate ? Number(mate[1]) : null;
        const rawScore = rawMate !== null ? (rawMate > 0 ? 100000 - rawMate : -100000 - rawMate) : Number(cp[1]);
        const score = this.analysisTurn === 'b' ? -rawScore : rawScore;
        const normalizedMate = rawMate === null ? null : (this.analysisTurn === 'b' ? -rawMate : rawMate);
        this.lines.set(pv, { uci: move, score, mate: normalizedMate, depth, variation, wdl });
      }
    }

    if (line.startsWith('bestmove ') && this.pending) {
      const fallback = line.split(' ')[1];
      const candidates = [...this.lines.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, value]) => value);
      if (!candidates.length && fallback && fallback !== '(none)') {
        candidates.push({ uci: fallback, score: 0, mate: null, depth: 0 });
      }
      clearTimeout(this.pending.timeout);
      this.pending.resolve(candidates);
      this.pending = null;
      this.onStatus('Motor listo · Stockfish 18');
    }
  }

  stop() {
    this.send('stop');
    if (this.pending) {
      clearTimeout(this.pending.timeout);
      this.pending.reject(new Error('Búsqueda cancelada'));
      this.pending = null;
    }
  }

  destroy() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

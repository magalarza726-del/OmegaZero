import { ENGINE_PROFILE } from './constants.js';
import { APP_VERSION } from './version.js';
import { publicAsset } from './publicAssets.js';

const ENGINE_INIT_TIMEOUT_MS = 90000;

export class StockfishEngine {
  constructor(onStatus = () => {}) {
    this.onStatus = onStatus;
    this.worker = null;
    this.ready = false;
    this.initializing = null;
    this.pending = null;
    this.lines = new Map();
    this.analysisTurn = 'w';
    this.workerError = null;
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

  buildWorkerUrl(cacheToken = APP_VERSION) {
    const scriptUrl = publicAsset('engine/stockfish-18-lite-single.js', cacheToken);
    const wasmUrl = publicAsset('engine/stockfish-18-lite-single.wasm', cacheToken);
    // Stockfish.js acepta la URL WASM en el hash. Así no necesita inferirla a
    // partir de la ruta del Worker, algo que puede fallar bajo /Repositorio/.
    return `${scriptUrl}#${encodeURIComponent(wasmUrl)}`;
  }

  async initializeWorker() {
    this.ready = false;
    this.workerError = null;
    this.onStatus('Cargando Stockfish 18…');

    try {
      await this.startWorker(this.buildWorkerUrl(APP_VERSION));
    } catch (firstError) {
      // Un segundo intento evita quedarse con una respuesta parcial guardada
      // por el navegador o por el CDN de GitHub Pages.
      this.worker?.terminate();
      this.worker = null;
      const retryToken = `${APP_VERSION}-${Date.now()}`;
      this.onStatus('Reintentando Stockfish 18…');
      await this.startWorker(this.buildWorkerUrl(retryToken), firstError);
    }

    this.send('setoption name Skill Level value 20');
    this.send('setoption name UCI_LimitStrength value false');
    this.send('setoption name UCI_AnalyseMode value true');
    this.send('setoption name UCI_ShowWDL value true');
    this.send(`setoption name MultiPV value ${ENGINE_PROFILE.multiPv}`);
    this.send(`setoption name Hash value ${ENGINE_PROFILE.hashMb}`);
    await this.waitFor('readyok', () => this.send('isready'), ENGINE_INIT_TIMEOUT_MS);
    this.ready = true;
    this.onStatus('Motor listo · Stockfish 18');
  }

  async startWorker(workerUrl, previousError = null) {
    this.worker = new Worker(workerUrl);
    this.worker.onmessage = (event) => this.handleMessage(String(event.data));
    this.worker.onerror = (event) => {
      const detail = event?.message || previousError?.message || 'Error al cargar Worker/WASM';
      this.workerError = new Error(detail);
      this.onStatus(`Stockfish no disponible · ${detail}`);
      if (this.pending) {
        this.pending.reject(this.workerError);
        this.pending = null;
      }
    };

    this.enableDownloadProgress();
    await this.waitFor('uciok', () => this.send('uci'), ENGINE_INIT_TIMEOUT_MS);
  }

  enableDownloadProgress() {
    if (typeof MessageChannel !== 'function' || !this.worker) return;
    const channel = new MessageChannel();
    let activated = false;

    channel.port1.onmessage = (event) => {
      const progress = event.data || {};
      const percent = Math.max(0, Math.min(100, Math.round(Number(progress.percent || 0) * 100)));
      if (percent < 100) {
        this.onStatus(`Descargando Stockfish 18 · ${percent}%`);
      } else {
        this.onStatus('Preparando Stockfish 18…');
        channel.port1.close();
      }
    };

    const supportListener = (event) => {
      if (String(event.data) !== 'info WillOutputEngineDownloadProgress') return;
      activated = true;
      this.worker?.removeEventListener('message', supportListener);
      try {
        this.worker?.postMessage({ progressPort: channel.port2 }, [channel.port2]);
      } catch {
        channel.port1.close();
      }
    };

    this.worker.addEventListener('message', supportListener);
    this.worker.postMessage('setoption name CanOutputEngineDownloadProgress');
    setTimeout(() => {
      if (!activated) {
        this.worker?.removeEventListener('message', supportListener);
        channel.port1.close();
      }
    }, 5000);
  }

  send(command) {
    this.worker?.postMessage(command);
  }

  waitFor(token, trigger, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timeout);
        this.worker?.removeEventListener('message', listener);
      };
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };
      const timeout = setTimeout(() => {
        const detail = this.workerError?.message ? ` (${this.workerError.message})` : '';
        finish(reject, new Error(`Stockfish no respondió: ${token}${detail}`));
      }, timeoutMs);
      const listener = (event) => {
        if (String(event.data).includes(token)) finish(resolve);
      };
      this.worker?.addEventListener('message', listener);
      try {
        trigger();
      } catch (error) {
        finish(reject, error);
      }
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

  analyse(fen, { depth = ENGINE_PROFILE.depth, multiPv = ENGINE_PROFILE.multiPv, searchMoves = [], skill = 20, nodes = 0, movetime = 0, timeoutMs = 180000 } = {}) {
    if (!this.ready) throw new Error('El motor todavía no está listo.');
    if (this.pending) this.stop();
    this.lines.clear();
    this.analysisTurn = String(fen).split(' ')[1] === 'b' ? 'b' : 'w';
    const effectiveMultiPv = searchMoves.length ? 1 : multiPv;
    this.configureStrength(skill);
    this.send(`setoption name MultiPV value ${effectiveMultiPv}`);
    this.send(`position fen ${fen}`);
    const limitText = nodes > 0 ? `${Math.round(nodes)} nodos` : movetime > 0 ? `${Math.round(movetime)} ms` : `profundidad ${depth}`;
    this.onStatus(`Calculando · ${limitText}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.send('stop');
        this.pending = null;
        reject(new Error('La búsqueda tardó demasiado.'));
      }, Math.max(5000, Number(timeoutMs) || 180000));
      this.pending = { resolve, reject, timeout };
      const restriction = searchMoves.length ? ` searchmoves ${searchMoves.join(' ')}` : '';
      const limit = nodes > 0 ? `nodes ${Math.round(nodes)}` : movetime > 0 ? `movetime ${Math.round(movetime)}` : `depth ${depth}`;
      this.send(`go ${limit}${restriction}`);
    });
  }

  clearHash() {
    if (!this.ready) return;
    this.send('setoption name Clear Hash');
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

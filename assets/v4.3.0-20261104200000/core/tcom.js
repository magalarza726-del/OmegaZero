import { Chess } from '../vendor/chess.js';
import { buildPositionMatrix, compileFunctionDefinitions, evaluateCompiledFunctionDefinitions, reduceTransformOutput } from './algebraicChess.js';
import { lruGet, lruSet } from './lruCache.js';

const TERMINAL_SCORE = 1e15;
const MAX_NON_TERMINAL_SCORE = 1e12;
const MAX_CACHE = 6000;
const MAX_COMPILED_MODULES = 128;
const COMPILED_MODULES = new Map();

function compiledModule(expressions) {
  const key = (expressions || []).join('\n');
  const cached = lruGet(COMPILED_MODULES, key);
  if (cached !== undefined) return cached;
  const compiled = compileFunctionDefinitions(expressions || []);
  return lruSet(COMPILED_MODULES, key, compiled, MAX_COMPILED_MODULES);
}

export function stableTransformScore(value, enabled = true) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) throw new Error('La función produjo NaN.');
  const finite = Number.isFinite(numeric) ? numeric : Math.sign(numeric || 1) * 1e300;
  if (!enabled) return Math.max(-MAX_NON_TERMINAL_SCORE, Math.min(MAX_NON_TERMINAL_SCORE, finite));
  return Math.sign(finite) * Math.log1p(Math.abs(finite));
}

export function transformModuleSignature(module) {
  return JSON.stringify({ expressions: module.expressions || [], reducer: module.reducer || 'auto', stabilize: module.stabilize !== false });
}

export function evaluateTransformModuleFen(fen, module, cache = null) {
  const signature = transformModuleSignature(module);
  const key = `${signature}\n${String(fen).split(' ').slice(0, 4).join(' ')}`;
  const cached = lruGet(cache, key);
  if (cached !== undefined) return cached;
  const chess = new Chess(fen);
  let raw;
  let score;
  if (chess.isCheckmate?.()) {
    raw = chess.turn() === 'w' ? -TERMINAL_SCORE : TERMINAL_SCORE;
    score = raw;
  } else if (chess.isDraw?.() || chess.isStalemate?.() || chess.isInsufficientMaterial?.()) {
    raw = 0;
    score = 0;
  } else {
    const { matrix } = buildPositionMatrix(fen);
    const outputs = evaluateCompiledFunctionDefinitions(compiledModule(module.expressions), matrix);
    if (!outputs.length) throw new Error('El módulo no contiene funciones.');
    const last = outputs[outputs.length - 1];
    raw = reduceTransformOutput(last.value, module.reducer || 'auto');
    score = stableTransformScore(raw, module.stabilize !== false);
  }
  const result = { score, raw };
  return lruSet(cache, key, result, MAX_CACHE);
}

export async function chooseTransformMoveOnePly(chess, module, options = {}) {
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return null;
  const color = chess.turn();
  const cache = options.cache || null;
  const chunkSize = Math.max(1, Number(options.chunkSize) || 5);
  const candidates = [];
  for (let index = 0; index < legal.length; index += 1) {
    if (options.cancelled?.()) throw new Error('Cálculo cancelado.');
    const move = legal[index];
    const child = new Chess(chess.fen());
    const applied = child.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    if (!applied) continue;
    try {
      const evaluated = evaluateTransformModuleFen(child.fen(), module, cache);
      candidates.push({
        uci: `${move.from}${move.to}${move.promotion || ''}`,
        san: applied.san,
        score: evaluated.score,
        rawScore: evaluated.raw,
        fen: child.fen(),
      });
    } catch (error) {
      candidates.push({
        uci: `${move.from}${move.to}${move.promotion || ''}`,
        san: applied.san,
        score: color === 'w' ? -Infinity : Infinity,
        rawScore: NaN,
        error: error.message,
        fen: child.fen(),
      });
    }
    if ((index + 1) % chunkSize === 0) await (options.yieldControl?.() || new Promise((resolve) => setTimeout(resolve, 0)));
  }
  const valid = candidates.filter((candidate) => Number.isFinite(candidate.score));
  if (!valid.length) throw new Error(candidates.find((candidate) => candidate.error)?.error || 'Ninguna semijugada produjo un valor válido.');
  valid.sort((left, right) => color === 'w' ? right.score - left.score : left.score - right.score);
  const best = valid[0];
  const diversity = Math.max(0, Math.min(100, Number(options.diversity) || 0));
  if (!diversity) return { chosen: best, candidates: valid };
  const tolerance = Math.max(0.03, Math.abs(best.score) * diversity / 100);
  const eligible = valid.filter((candidate) => Math.abs(candidate.score - best.score) <= tolerance).slice(0, 8);
  return { chosen: eligible[Math.floor(Math.random() * eligible.length)] || best, candidates: valid };
}

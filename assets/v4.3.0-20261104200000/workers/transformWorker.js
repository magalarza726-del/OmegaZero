import { Chess } from '../vendor/chess.js';
import {
  buildPositionMatrix,
  algebraicProperties,
  compileFunctionDefinitions,
  evaluateCompiledFunctionDefinitions,
} from '../core/algebraicChess.js';
import { evaluateTransformModuleFen } from '../core/tcom.js';

function serialiseOutput(output) {
  if (!output) return null;
  try {
    return {
      name: output.name,
      kind: output.kind,
      scalar: Number.isFinite(output.scalar) ? output.scalar : null,
      properties: output.kind === 'matrix' ? algebraicProperties(output.value) : null,
      error: '',
    };
  } catch (error) {
    return { name: output.name || '', kind: 'error', scalar: null, properties: null, error: error.message || String(error) };
  }
}

function evaluateBatch(expressions, positions) {
  const definitions = compileFunctionDefinitions(expressions || []);
  return (positions || []).map((position) => {
    try {
      const { matrix } = buildPositionMatrix(position.fen);
      const outputs = evaluateCompiledFunctionDefinitions(definitions, matrix);
      return { id: position.id, analyses: outputs.map(serialiseOutput) };
    } catch (error) {
      return {
        id: position.id,
        analyses: (expressions || []).map((_, index) => ({
          name: `f${index + 1}`, kind: 'error', scalar: null, properties: null,
          error: error.message || String(error),
        })),
      };
    }
  });
}

async function chooseMove(fen, module, diversity = 0) {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return null;
  const color = chess.turn();
  const candidates = [];
  for (const move of legal) {
    const child = new Chess(chess.fen());
    const applied = child.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    if (!applied) continue;
    try {
      // Do not use the legacy v4.0.0 cache: its FEN key omitted the halfmove clock.
      const evaluated = evaluateTransformModuleFen(child.fen(), module, null);
      const rawNumeric = Number(evaluated.raw);
      candidates.push({
        uci: `${move.from}${move.to}${move.promotion || ''}`, san: applied.san,
        score: evaluated.score, rawScore: evaluated.raw, fen: child.fen(),
        saturated: !Number.isFinite(rawNumeric) || Math.abs(rawNumeric) >= 1e300,
      });
    } catch (error) {
      candidates.push({
        uci: `${move.from}${move.to}${move.promotion || ''}`, san: applied.san,
        score: color === 'w' ? -Infinity : Infinity, rawScore: NaN,
        error: error.message || String(error), fen: child.fen(),
      });
    }
  }
  const valid = candidates.filter(candidate => Number.isFinite(candidate.score));
  const invalidCandidates = candidates.filter(candidate => !Number.isFinite(candidate.score));
  if (!valid.length) throw new Error(`0/${candidates.length} candidatas válidas. ${invalidCandidates.find(candidate=>candidate.error)?.error || 'Ninguna semijugada produjo un valor válido.'}`);
  valid.sort((left, right) => color === 'w' ? right.score - left.score : left.score - right.score);
  const best = valid[0];
  const pct = Math.max(0, Math.min(100, Number(diversity) || 0));
  let chosen = best;
  if (pct) {
    const tolerance = Math.max(0.03, Math.abs(best.score) * pct / 100);
    const eligible = valid.filter(candidate => Math.abs(candidate.score - best.score) <= tolerance).slice(0, 8);
    chosen = eligible[Math.floor(Math.random() * eligible.length)] || best;
  }
  return {
    chosen, candidates: valid, invalidCandidates,
    legalCount: candidates.length, validCount: valid.length,
    invalidCount: invalidCandidates.length,
    saturationCount: valid.filter(candidate => candidate.saturated).length,
  };
}

self.onmessage = async event => {
  const msg = event.data || {};
  try {
    if (msg.type === 'evaluate-batch') {
      self.postMessage({ id: msg.id, ok: true, results: evaluateBatch(msg.expressions, msg.positions) });
      return;
    }
    if (msg.type === 'choose-move') {
      self.postMessage({ id: msg.id, ok: true, decision: await chooseMove(msg.fen, msg.module, msg.diversity) });
      return;
    }
    throw new Error(`Operación desconocida: ${msg.type}`);
  } catch (error) {
    self.postMessage({ id: msg.id, ok: false, error: error.message || String(error) });
  }
};

import { Chess } from '../vendor/chess.js';
import { positionKey } from './utils.js';

export function buildOpeningGraph(openings = []) {
  const nodes = new Map();
  const byOpening = new Map();
  for (const opening of openings) {
    const chess = new Chess();
    const positions = [];
    for (let ply = 0; ply < opening.moves.length; ply += 1) {
      try { chess.move(opening.moves[ply]); } catch { break; }
      const key = positionKey(chess.fen());
      positions.push(key);
      const node = nodes.get(key) || { key, openings: [], ply: ply + 1 };
      if (!node.openings.some((item) => item.id === opening.id)) node.openings.push({ id: opening.id, ply: ply + 1, total: opening.moves.length });
      nodes.set(key, node);
    }
    byOpening.set(opening.id, positions);
    opening.positionKeys = positions;
    opening.previewFen = positions.length ? chess.fen() : null;
  }
  return { nodes, byOpening };
}

export function identifyOpeningByPosition(graph, fen, openings = []) {
  const node = graph.nodes.get(positionKey(fen));
  if (!node?.openings?.length) return null;
  return node.openings
    .map((reference) => ({ ...reference, opening: openings.find((opening) => opening.id === reference.id) }))
    .filter((reference) => reference.opening)
    .sort((a, b) => Number(b.ply === b.total) - Number(a.ply === a.total) || b.ply - a.ply || b.opening.moves.length - a.opening.moves.length)[0]?.opening || null;
}

export function nextBookMoves(graph, openingId, fen, openings = []) {
  const opening = openings.find((item) => item.id === openingId);
  if (!opening) return [];
  const key = positionKey(fen);
  const index = opening.positionKeys?.indexOf(key) ?? -1;
  if (index < 0 || index + 1 >= opening.moves.length) return [];
  return [opening.moves[index + 1]];
}

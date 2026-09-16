import { positionKey } from './utils.js';

export const FIDE_RULES_VERSION = 'Leyes FIDE vigentes desde 1 de enero de 2023';

export function repetitionCount(positions = [], fen = '') {
  const key = positionKey(fen);
  return positions.reduce((count, entry) => count + Number(positionKey(entry?.fen || entry) === key), 0);
}

export function halfmoveClock(fen = '') {
  return Number(fen.split(' ')[4] || 0);
}

export function fideGameState(chess, positions = []) {
  const repetition = repetitionCount(positions, chess.fen());
  const halfmoves = halfmoveClock(chess.fen());
  if (chess.isCheckmate?.()) return { terminal: true, result: chess.turn() === 'w' ? '0-1' : '1-0', reason: 'jaque mate', claimable: false };
  if (chess.isStalemate?.()) return { terminal: true, result: '1/2-1/2', reason: 'ahogado', claimable: false };
  if (chess.isInsufficientMaterial?.()) return { terminal: true, result: '1/2-1/2', reason: 'posición muerta / material insuficiente', claimable: false };
  if (repetition >= 5) return { terminal: true, result: '1/2-1/2', reason: 'cinco repeticiones', claimable: false, repetition };
  if (halfmoves >= 150) return { terminal: true, result: '1/2-1/2', reason: 'regla automática de 75 movimientos', claimable: false, halfmoves };
  const claims = [];
  if (repetition >= 3) claims.push('triple repetición');
  if (halfmoves >= 100) claims.push('regla de 50 movimientos');
  return { terminal: false, result: '*', reason: '', claimable: claims.length > 0, claims, repetition, halfmoves };
}

export function sideCanPossiblyMate(chess, color) {
  const allPieces = chess.board().flat().filter(Boolean);
  const pieces = allPieces.filter(piece => piece.color === color);
  if (pieces.some(piece => ['p', 'r', 'q'].includes(piece.type))) return true;
  const bishops = pieces.filter(piece => piece.type === 'b').length;
  const knights = pieces.filter(piece => piece.type === 'n').length;
  if (bishops >= 2 || (bishops >= 1 && knights >= 1)) return true;
  const opponent = color === 'w' ? 'b' : 'w';
  const opponentHasBlockingMaterial = allPieces.some(piece => piece.color === opponent && piece.type !== 'k');
  if (bishops + knights === 1) return opponentHasBlockingMaterial;
  if (knights >= 2) return opponentHasBlockingMaterial;
  return false;
}

export function timeoutResult(chess, flaggedColor) {
  const opponent = flaggedColor === 'w' ? 'b' : 'w';
  if (!sideCanPossiblyMate(chess, opponent)) return '1/2-1/2';
  return opponent === 'w' ? '1-0' : '0-1';
}

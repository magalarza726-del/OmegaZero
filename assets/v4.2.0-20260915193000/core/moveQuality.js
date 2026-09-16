const PIECE_VALUE = Object.freeze({ p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 });

export function evaluationLoss(bestScore = 0, playedScore = 0, mover = 'w') {
  const best = Number(bestScore);
  const played = Number(playedScore);
  return Math.max(0, mover === 'b' ? played - best : best - played);
}

function moveMaterialDelta(move) {
  if (!move) return 0;
  const captured = PIECE_VALUE[move.captured] || 0;
  const promoted = move.promotion ? (PIECE_VALUE[move.promotion] || 0) - PIECE_VALUE.p : 0;
  return captured + promoted;
}

export function isMeaningfulSacrifice({ move, followupMove, lossCp, alternatives = [] }) {
  if (!move || lossCp > 25) return false;
  const movedValue = PIECE_VALUE[move.piece] || 0;
  const immediateGain = moveMaterialDelta(move);
  const exposed = Boolean(move.captured) ? movedValue > immediateGain + 150 : movedValue >= 300;
  const forcing = /[+#]/.test(move.san || '') || alternatives.length <= 2;
  const notTrivialRecovery = !followupMove?.captured || (PIECE_VALUE[followupMove.captured] || 0) < movedValue - 100;
  return exposed && forcing && notTrivialRecovery;
}

export function classifyMoveQuality({
  bestScore = 0,
  playedScore = 0,
  mover = 'w',
  move = null,
  alternatives = [],
  isBook = false,
  isMate = false,
  previousScore = 0,
} = {}) {
  if (isMate) return { key: 'mate', label: 'Mate encontrado', lossCp: 0 };
  if (isBook) return { key: 'book', label: 'Jugada de libro', lossCp: 0 };
  const lossCp = evaluationLoss(bestScore, playedScore, mover);
  const gapToSecond = alternatives.length > 1 ? Math.abs(Number(alternatives[0]?.score || 0) - Number(alternatives[1]?.score || 0)) : 999;
  const sacrifice = isMeaningfulSacrifice({ move, lossCp, alternatives });
  const improvesPosition = mover === 'w' ? playedScore >= previousScore - 10 : playedScore <= previousScore + 10;
  if (sacrifice && improvesPosition && gapToSecond >= 18) return { key: 'brilliant', label: 'Brillante', lossCp };
  if (lossCp <= 8) return { key: 'best', label: 'Mejor jugada', lossCp };
  if (lossCp <= 20) return { key: 'excellent', label: 'Excelente', lossCp };
  if (lossCp <= 45) return { key: 'good', label: 'Buena', lossCp };
  if (lossCp <= 90) return { key: 'inaccuracy', label: 'Imprecisión', lossCp };
  if (lossCp <= 180) return { key: 'mistake', label: 'Error', lossCp };
  return { key: 'blunder', label: 'Grave error', lossCp };
}

export function candidateValidityThreshold(difficulty = 'medium') {
  return ({ easy: 90, medium: 55, hard: 30, master: 15 })[difficulty] ?? 55;
}

export function orderCandidatesForMover(candidates = [], mover = 'w') {
  const direction = mover === 'b' ? 1 : -1;
  return [...candidates].sort((a, b) => direction * (Number(a.score || 0) - Number(b.score || 0)));
}

export function validCandidates(candidates = [], mover = 'w', difficulty = 'medium', minimum = 1) {
  if (!candidates.length) return [];
  const ordered = orderCandidatesForMover(candidates, mover);
  const best = Number(ordered[0].score || 0);
  const threshold = candidateValidityThreshold(difficulty);
  const filtered = ordered.filter((candidate) => evaluationLoss(best, Number(candidate.score || 0), mover) <= threshold);
  return (filtered.length >= minimum ? filtered : ordered.slice(0, minimum)).slice(0, 3);
}

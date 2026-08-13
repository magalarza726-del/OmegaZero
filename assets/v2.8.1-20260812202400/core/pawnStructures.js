export const PAWN_STRUCTURE_CODES = Object.freeze(
  Array.from({ length: 256 }, (_, value) => value.toString(4).padStart(4, '0'))
);

export const PAWN_STRUCTURE_MODEL = Object.freeze({
  coreFiles: 4,
  coreRanks: 4,
  displayFiles: 6,
  displayRanks: 6,
  coreFileStart: 1,
  coreRankStart: 2,
  maxAdvance: 3,
});

export function decodePawnStructure(code) {
  const value = String(code ?? '');
  if (!/^[0-3]{4}$/.test(value)) throw new Error(`Código de estructura inválido: ${value}`);
  return [...value].map(Number);
}

export function analyzePawnStructure(code) {
  const heights = decodePawnStructure(code);
  const { displayFiles, displayRanks, coreFiles, coreRanks, coreFileStart, coreRankStart } = PAWN_STRUCTURE_MODEL;
  const pawns = heights.map((height, index) => ({
    index,
    file: coreFileStart + index,
    rank: coreRankStart + height,
    height,
  }));

  const control = new Map();
  const key = (file, rank) => `${file}:${rank}`;
  for (const pawn of pawns) {
    const targetRank = pawn.rank + 1;
    if (targetRank > displayRanks) continue;
    for (const targetFile of [pawn.file - 1, pawn.file + 1]) {
      if (targetFile < 0 || targetFile >= displayFiles) continue;
      const id = key(targetFile, targetRank);
      control.set(id, (control.get(id) || 0) + 1);
    }
  }

  const pawnByCell = new Map(pawns.map(pawn => [key(pawn.file, pawn.rank), pawn]));
  const cells = [];
  let behindCount = 0;
  let aheadUncontrolledCount = 0;
  let controlledUniqueCount = 0;
  let doubleControlledCount = 0;
  let supportedPawns = 0;

  for (let rank = 1; rank <= displayRanks; rank += 1) {
    for (let file = 0; file < displayFiles; file += 1) {
      const id = key(file, rank);
      const pawn = pawnByCell.get(id) || null;
      const controlCount = control.get(id) || 0;
      const coreIndex = file - coreFileStart;
      const isCoreFile = coreIndex >= 0 && coreIndex < coreFiles;
      const isCore = Boolean(
        isCoreFile &&
        rank >= coreRankStart &&
        rank < coreRankStart + coreRanks
      );
      const ownPawnRank = isCoreFile ? pawns[coreIndex].rank : null;
      const behind = Boolean(isCoreFile && rank < ownPawnRank);
      const ahead = Boolean(isCoreFile && rank > ownPawnRank);
      const aheadUncontrolled = Boolean(ahead && controlCount === 0);

      if (behind) behindCount += 1;
      if (aheadUncontrolled) aheadUncontrolledCount += 1;
      if (controlCount > 0) controlledUniqueCount += 1;
      if (controlCount > 1) doubleControlledCount += 1;
      if (pawn && controlCount > 0) supportedPawns += 1;

      cells.push({ file, rank, pawn, controlCount, behind, aheadUncontrolled, isCore, isCoreFile });
    }
  }

  const totalAdvance = heights.reduce((sum, value) => sum + value, 0);
  const maxAdvance = Math.max(...heights);
  const minAdvance = Math.min(...heights);
  const gradient = heights.slice(1).map((value, index) => value - heights[index]);

  return {
    code,
    heights,
    pawns,
    cells,
    totalAdvance,
    maxAdvance,
    minAdvance,
    depth: maxAdvance - minAdvance,
    gradient,
    behindCount,
    aheadUncontrolledCount,
    controlledUniqueCount,
    doubleControlledCount,
    supportedPawns,
  };
}

// OmegaZero dependency boundary. Feature modules import from here instead of coupling to main.js.
export { Chess } from '../vendor/chess.js';
export { StockfishEngine } from '../engine.js';
export { chooseBotCandidate } from '../scheme.js';
export { resolveBotScheme } from '../bots.js';
export { OPENINGS, openingOptions, getOpening, identifyOpening, openingTreeHtml, openingPreview, nextOpeningSan } from '../openings.js';
export { MASTER_GAMES, MASTER_PROBLEMS } from '../data/masterGames.js';
export { loadDb, hydrateDb, saveDb, flushDb, addGame, addProblemsFromGame, getMigrationInfo, migrateLegacyData, declineLegacyMigration, clearGamesAndTraining, resetAllAppData } from '../storage.js';
export { APP_VERSION } from '../version.js';
export { $, $$, clamp, escapeHtml as esc, uciToMove, scoreText, phaseFromFen, downloadText } from '../core/utils.js';
export { classifyMoveQuality, validCandidates } from '../core/moveQuality.js';
export { fideGameState, timeoutResult, FIDE_RULES_VERSION } from '../core/fideRules.js';
export { buildGameStats, buildTrainingStats, buildPlayerEloStats, estimateWdl } from '../core/statistics.js';
export { applyAccessibility, boardSquareAria, announce } from '../ui/accessibility.js';
export { playTone } from '../ui/sounds.js';
export { publicAsset } from '../publicAssets.js';
export { buildPositionMatrix, algebraicProperties, buildTimelineFromPgn, splitPgnDatabase, pgnDisplayName, compileFunctionDefinitions, evaluateCompiledFunctionDefinitions, compileScalarFunctionLine, formatNumber } from '../core/algebraicChess.js';
export { chooseTransformMoveOnePly } from '../core/tcom.js';
export { finiteExtentOfSeries, normalizeFiniteSeries } from '../core/seriesMath.js';
export { lruGet, lruSet } from '../core/lruCache.js';
export { PAWN_STRUCTURE_CODES, analyzePawnStructure } from '../core/pawnStructures.js';
export { STRUCTURE_KINDS, buildPawnFamilies, buildMinorFamilies, buildMajorFamilies, getStructureFamilies, analyzePieceConfiguration, formatGradient2D, pieceFamilySignature, pawnFamilySignature, gradient2D, gradientDirection } from '../core/structureFamilies.js';
export { ENERGY_PIECE_WEIGHTS, ENERGY_PRIORITIES, ENERGY_MASS_MODES, normalizeEnergyOptions, energyHeight, legalReachableSquares, analyzeEnergyPosition, chooseEnergyMoveOnePly, energyFormulaText } from '../core/energyChess.js';

export { FREE_PIECE_TYPES, FREE_CONTROL_MODES, parseFreeSquare, normalizeFreePieces, normalizeRowWindow, freeFamilySignature, analyzeFreePieceConfiguration, buildFreePieceFamilies } from '../core/freePieceStructures.js';

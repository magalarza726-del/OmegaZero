import { APP_VERSION, STORAGE_NAMESPACE, LEGACY_APP_KEYS, LEGACY_LEAGUE_KEYS } from './version.js';
import { clearStores, deleteDatabase, getAll, replaceAll } from './persistence/indexedDb.js';
import { phaseFromFen, positionKey } from './core/utils.js';

const PREFIX = `${STORAGE_NAMESPACE}:`;
export const STORAGE_KEYS = Object.freeze({
  settings: `${PREFIX}settings`,
  meta: `${PREFIX}meta`,
  summary: `${PREFIX}summary`,
});

const defaultSettings = () => ({
  boardColor: 'blue',
  pieceSet: 'alpha',
  favoriteOpenings: [],
  recentOpenings: [],
  sound: false,
  soundPack: 'chesscom',
  soundVolume: 70,
  highContrast: false,
  colorVision: 'default',
  fontScale: 100,
  reduceMotion: false,
  setupMode: 'quick',
  gameConfig: {},
  analysisDepth: 14,
  strategyDifficulty: 'medium',
  strategySessionSize: 10,
  strategyLength: 1,
  strategyPhase: 'all',
  strategyOpening: 'all',
  repeatFailed: true,
});
const defaultCustom = () => ({ boardLight: null, boardDark: null, pieces: {}, namedSets: [] });
export const emptyDb = () => ({ games: [], problems: [], settings: defaultSettings(), custom: defaultCustom(), analysis: [] });

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function normaliseDb(raw = {}) {
  const base = emptyDb();
  const settings = { ...base.settings, ...(raw.settings || {}) };
  settings.favoriteOpenings = Array.isArray(settings.favoriteOpenings) ? settings.favoriteOpenings.slice(0, 10) : [];
  settings.recentOpenings = Array.isArray(settings.recentOpenings) ? settings.recentOpenings.slice(0, 10) : [];
  return {
    games: Array.isArray(raw.games) ? raw.games : [],
    problems: Array.isArray(raw.problems) ? raw.problems : [],
    analysis: Array.isArray(raw.analysis) ? raw.analysis : [],
    settings,
    custom: { ...base.custom, ...(raw.custom || {}), pieces: { ...(raw.custom?.pieces || {}) }, namedSets: Array.isArray(raw.custom?.namedSets) ? raw.custom.namedSets : [] },
  };
}

let cache = normaliseDb({
  settings: readJson(STORAGE_KEYS.settings, defaultSettings()),
});
let pendingWrite = Promise.resolve();

export function loadDb() { return cache; }

export async function hydrateDb() {
  try {
    const [games, problems, assets, analysis] = await Promise.all([
      getAll('games'), getAll('problems'), getAll('assets'), getAll('analysis'),
    ]);
    cache = normaliseDb({
      games,
      problems,
      analysis,
      settings: readJson(STORAGE_KEYS.settings, cache.settings),
      custom: assets.find((item) => item.id === 'custom')?.value || cache.custom,
    });
  } catch (error) {
    console.warn('IndexedDB no estuvo disponible; se mantiene la sesión en memoria.', error);
  }
  return cache;
}

async function persistDb(db) {
  const safe = normaliseDb(db);
  writeJson(STORAGE_KEYS.settings, safe.settings);
  writeJson(STORAGE_KEYS.summary, { games: safe.games.length, problems: safe.problems.length, updatedAt: Date.now() });
  const meta = readJson(STORAGE_KEYS.meta, {});
  writeJson(STORAGE_KEYS.meta, { ...meta, schemaVersion: 2, appVersion: APP_VERSION, updatedAt: Date.now() });
  await Promise.all([
    replaceAll('games', safe.games),
    replaceAll('problems', safe.problems),
    replaceAll('analysis', safe.analysis || []),
    replaceAll('assets', [{ id: 'custom', value: safe.custom }]),
  ]);
}

export function saveDb(db) {
  cache = normaliseDb(db);
  writeJson(STORAGE_KEYS.settings, cache.settings);
  pendingWrite = pendingWrite.catch(() => {}).then(() => persistDb(cache)).catch((error) => console.error('No se pudieron guardar los datos.', error));
  return pendingWrite;
}
export function flushDb() { return pendingWrite; }

function v13Payload() {
  const games = readJson('omegazero:v1.3:games', null);
  const problems = readJson('omegazero:v1.3:problems', null);
  const settings = readJson('omegazero:v1.3:settings', null);
  const custom = readJson('omegazero:v1.3:custom', null);
  if (!games && !problems && !settings && !custom) return null;
  return { key: 'omegazero:v1.3:*', db: normaliseDb({ games, problems, settings, custom }) };
}

function legacyPayload() {
  const split = v13Payload();
  if (split) return split;
  for (const key of LEGACY_APP_KEYS) {
    const parsed = readJson(key, null);
    if (parsed && typeof parsed === 'object') return { key, db: normaliseDb(parsed) };
  }
  return null;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function getMigrationInfo() {
  const meta = readJson(STORAGE_KEYS.meta, {});
  const legacy = legacyPayload();
  const db = legacy?.db;
  return {
    available: Boolean(legacy && (db.games.length || db.problems.length || db.settings.favoriteOpenings.length || db.custom.boardLight || db.custom.boardDark || Object.keys(db.custom.pieces).length)),
    decided: Boolean(meta.migrationDecision),
    decision: meta.migrationDecision || null,
    sourceKey: legacy?.key || null,
    games: db?.games.length || 0,
    problems: db?.problems.length || 0,
    favorites: db?.settings.favoriteOpenings.length || 0,
    customAssets: Number(Boolean(db?.custom.boardLight)) + Number(Boolean(db?.custom.boardDark)) + Object.keys(db?.custom.pieces || {}).length,
  };
}

export async function migrateLegacyData() {
  const legacy = legacyPayload();
  if (!legacy) return { migrated: false, games: 0, problems: 0 };
  const current = await hydrateDb();
  cache = normaliseDb({
    games: uniqueBy([...current.games, ...legacy.db.games], (game) => game.id || `${game.date || ''}|${game.pgn || ''}`),
    problems: uniqueBy([...current.problems, ...legacy.db.problems], (problem) => problem.key || positionKey(problem.fen) || problem.id),
    settings: { ...legacy.db.settings, ...current.settings, favoriteOpenings: uniqueBy([...(current.settings.favoriteOpenings || []), ...(legacy.db.settings.favoriteOpenings || [])], (id) => id).slice(0, 10) },
    custom: Object.keys(current.custom.pieces || {}).length || current.custom.boardLight || current.custom.boardDark ? current.custom : legacy.db.custom,
    analysis: current.analysis,
  });
  await saveDb(cache);
  const meta = readJson(STORAGE_KEYS.meta, {});
  writeJson(STORAGE_KEYS.meta, { ...meta, schemaVersion: 2, migrationDecision: 'migrated', migratedFrom: legacy.key, migratedAt: Date.now() });
  return { migrated: true, games: cache.games.length, problems: cache.problems.length };
}

export function declineLegacyMigration() {
  const meta = readJson(STORAGE_KEYS.meta, {});
  writeJson(STORAGE_KEYS.meta, { ...meta, schemaVersion: 2, migrationDecision: 'clean-start', migrationDecidedAt: Date.now() });
}

export async function clearGamesAndTraining() {
  cache.games = []; cache.problems = []; cache.analysis = [];
  await clearStores(['games', 'problems', 'analysis']);
  await saveDb(cache);
  return cache;
}

export async function resetAllAppData() {
  const removable = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && (key.startsWith('omegazero:') || LEGACY_APP_KEYS.includes(key) || LEGACY_LEAGUE_KEYS.includes(key))) removable.push(key);
  }
  removable.forEach((key) => localStorage.removeItem(key));
  await deleteDatabase();
  cache = emptyDb();
  return removable.length;
}

export { positionKey };
export function addGame(db, game) {
  db.games.unshift(game);
  db.games = db.games.slice(0, 5000);
  saveDb(db);
}
export const STRATEGY_START_PLY = 13; // Desde 7.Blancas; equivale al movimiento 7 de la partida.
export const STRATEGY_GAP_PLIES = 14; // Siete jugadas completas entre posiciones de una misma partida.
export function addProblemsFromGame(db, game, minPly = STRATEGY_START_PLY, gapPlies = STRATEGY_GAP_PLIES) {
  let last = -999; let added = 0;
  for (const pos of game.positions || []) {
    if (pos.ply < minPly || pos.ply - last < gapPlies) continue;
    const key = positionKey(pos.fen);
    const existing = db.problems.find((problem) => problem.key === key);
    if (existing) {
      existing.frequency = Number(existing.frequency || 1) + 1;
      continue;
    }
    db.problems.push({
      id: crypto.randomUUID?.() || `${Date.now()}-${added}`,
      key,
      fen: pos.fen,
      sourceGame: game.id,
      ply: pos.ply,
      phase: phaseFromFen(pos.fen),
      openingId: game.openingId || null,
      openingName: game.openingName || null,
      createdAt: Date.now(),
      attempts: 0,
      best: -1,
      failed: false,
      frequency: 1,
    });
    last = pos.ply; added += 1;
  }
  saveDb(db); return added;
}

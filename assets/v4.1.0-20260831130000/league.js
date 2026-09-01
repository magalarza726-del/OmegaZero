import { BOTS } from './bots.js';

const STORAGE_KEY = 'omegazero:v1.3:league';

function defaultState() {
  return {
    version: 2,
    games: 0,
    scheduleIndex: 0,
    ratings: Object.fromEntries(Object.values(BOTS).map((bot) => [bot.id, bot.ratingBase])),
    records: Object.fromEntries(Object.values(BOTS).map((bot) => [bot.id, { wins: 0, draws: 0, losses: 0 }])),
    matchups: {},
    schemeMoves: {},
    recentGames: [],
  };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class LearningLeague {
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage;
    this.state = this.load();
  }

  load() {
    if (!this.storage) return defaultState();
    try {
      const parsed = JSON.parse(this.storage.getItem(STORAGE_KEY));
      return parsed?.version === 2 ? { ...defaultState(), ...parsed } : defaultState();
    } catch {
      return defaultState();
    }
  }

  save() {
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* almacenamiento no disponible */ }
  }

  reset() {
    this.state = defaultState();
    this.save();
  }

  nextPairing() {
    const index = this.state.scheduleIndex++;
    const pair = ['zero', 'omega'];
    const reverse = index % 2 === 1;
    this.save();
    return reverse ? { white: pair[1], black: pair[0] } : { white: pair[0], black: pair[1] };
  }

  recordGame({ whiteBot, blackBot, result, moves = [], pgn = '' }) {
    if (!BOTS[whiteBot] || !BOTS[blackBot] || !['1-0', '0-1', '1/2-1/2'].includes(result)) return;
    const whiteScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
    const blackScore = 1 - whiteScore;
    this.updateRatings(whiteBot, blackBot, whiteScore);
    this.updateRecord(whiteBot, whiteScore);
    this.updateRecord(blackBot, blackScore);
    this.updateMatchup(whiteBot, blackBot, whiteScore);

    for (const move of moves) {
      const score = move.color === 'w' ? whiteScore : blackScore;
      const scheme = this.state.schemeMoves[move.schemeId] ||= {};
      const stat = scheme[move.uci] ||= { games: 0, score: 0, wins: 0, losses: 0, draws: 0 };
      stat.games += 1;
      stat.score += score;
      if (score === 1) stat.wins += 1;
      else if (score === 0) stat.losses += 1;
      else stat.draws += 1;
    }

    this.state.games += 1;
    this.state.recentGames.unshift({ whiteBot, blackBot, result, pgn: pgn.slice(0, 4000), at: new Date().toISOString() });
    this.state.recentGames = this.state.recentGames.slice(0, 24);
    this.save();
  }

  updateRatings(whiteBot, blackBot, whiteScore) {
    if (whiteBot === blackBot) return;
    const rw = this.state.ratings[whiteBot];
    const rb = this.state.ratings[blackBot];
    const expectedWhite = 1 / (1 + 10 ** ((rb - rw) / 400));
    const change = 16 * (whiteScore - expectedWhite);
    this.state.ratings[whiteBot] = Math.round(clamp(rw + change, BOTS[whiteBot].ratingBase - 300, BOTS[whiteBot].ratingBase + 300));
    this.state.ratings[blackBot] = Math.round(clamp(rb - change, BOTS[blackBot].ratingBase - 300, BOTS[blackBot].ratingBase + 300));
  }

  updateRecord(botId, score) {
    const record = this.state.records[botId];
    if (score === 1) record.wins += 1;
    else if (score === 0) record.losses += 1;
    else record.draws += 1;
  }

  updateMatchup(whiteBot, blackBot, whiteScore) {
    const ids = [whiteBot, blackBot].sort();
    const key = ids.join('|');
    const matchup = this.state.matchups[key] ||= { a: ids[0], b: ids[1], games: 0, aScore: 0 };
    matchup.games += 1;
    matchup.aScore += whiteBot === matchup.a ? whiteScore : 1 - whiteScore;
  }

  getMoveWeights(schemeId) {
    const stats = this.state.schemeMoves[schemeId] || {};
    return Object.fromEntries(Object.entries(stats).map(([uci, stat]) => {
      const rate = stat.score / Math.max(1, stat.games);
      const confidence = Math.min(1, stat.games / 24);
      return [uci, clamp((rate - 0.5) * 70 * confidence, -24, 24)];
    }));
  }

  teacherKnowledge(schemeId) {
    const stats = this.state.schemeMoves[schemeId] || {};
    const topMoves = Object.entries(stats)
      .filter(([, stat]) => stat.games >= 2)
      .map(([uci, stat]) => ({ uci, games: stat.games, rate: stat.score / stat.games }))
      .sort((a, b) => (b.rate - 0.5) * Math.min(b.games, 20) - (a.rate - 0.5) * Math.min(a.games, 20))
      .slice(0, 4);
    const zeroOmega = this.state.matchups['omega|zero'];
    const duelText = zeroOmega?.games
      ? `Zero y Omega han disputado ${zeroOmega.games} partida(s); Omega registra ${Math.round((zeroOmega.aScore / zeroOmega.games) * 100)}% de puntuación.`
      : 'La liga todavía no tiene suficientes partidas Zero–Omega para extraer una tendencia.';
    return {
      games: this.state.games,
      moveWeights: this.getMoveWeights(schemeId),
      topMoves,
      summary: `${duelText} El maestro usa estas tendencias como evidencia secundaria, nunca por encima del cálculo táctico.`,
    };
  }

  resultFromChess(chess) {
    if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
    if (chess.isDraw()) return '1/2-1/2';
    return null;
  }
}

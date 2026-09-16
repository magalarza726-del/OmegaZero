import { phaseFromFen } from './utils.js';

export function gameResultForSide(result, side = 'w') {
  if (result === '1/2-1/2') return 0.5;
  if (result === '1-0') return side === 'w' ? 1 : 0;
  if (result === '0-1') return side === 'b' ? 1 : 0;
  return null;
}

export function buildGameStats(games = []) {
  const stats = { total: games.length, whiteWins: 0, blackWins: 0, draws: 0, unfinished: 0, openings: {}, styles: {}, modes: {} };
  for (const game of games) {
    if (game.result === '1-0') stats.whiteWins += 1;
    else if (game.result === '0-1') stats.blackWins += 1;
    else if (game.result === '1/2-1/2') stats.draws += 1;
    else stats.unfinished += 1;
    const opening = game.openingName || game.opening || 'Fuera de libro';
    stats.openings[opening] = stats.openings[opening] || { games: 0, whiteWins: 0, blackWins: 0, draws: 0 };
    stats.openings[opening].games += 1;
    if (game.result === '1-0') stats.openings[opening].whiteWins += 1;
    if (game.result === '0-1') stats.openings[opening].blackWins += 1;
    if (game.result === '1/2-1/2') stats.openings[opening].draws += 1;
    for (const style of [game.white, game.black]) {
      if (!style) continue;
      stats.styles[style] = stats.styles[style] || { games: 0, wins: 0, losses: 0, draws: 0 };
      stats.styles[style].games += 1;
      if (game.result === '1/2-1/2') stats.styles[style].draws += 1;
      else if ((style === game.white && game.result === '1-0') || (style === game.black && game.result === '0-1')) stats.styles[style].wins += 1;
      else if (game.result && game.result !== '*') stats.styles[style].losses += 1;
    }
    stats.modes[game.mode || 'unknown'] = (stats.modes[game.mode || 'unknown'] || 0) + 1;
  }
  stats.topOpenings = Object.entries(stats.openings).sort((a, b) => b[1].games - a[1].games).slice(0, 8);
  return stats;
}

export function buildTrainingStats(problems = []) {
  const stats = { total: problems.length, attempted: 0, failed: 0, mastered: 0, average: 0, phases: {}, openings: {} };
  let scoreSum = 0;
  let scoreCount = 0;
  for (const problem of problems) {
    const attempts = Number(problem.attempts || 0);
    const best = Number(problem.best ?? -1);
    if (attempts > 0) stats.attempted += 1;
    if (problem.failed || (attempts > 0 && best < 0.5)) stats.failed += 1;
    if (best >= 0.9) stats.mastered += 1;
    if (best >= 0) { scoreSum += best; scoreCount += 1; }
    const phase = problem.phase || phaseFromFen(problem.fen);
    stats.phases[phase] = (stats.phases[phase] || 0) + 1;
    const opening = problem.openingName || 'Sin identificar';
    stats.openings[opening] = (stats.openings[opening] || 0) + 1;
  }
  stats.average = scoreCount ? scoreSum / scoreCount : 0;
  return stats;
}

export function estimateWdl(scoreCp = 0) {
  const cp = Math.max(-1200, Math.min(1200, Number(scoreCp) || 0));
  const win = 1 / (1 + Math.exp(-cp / 180));
  const draw = Math.max(0.05, 0.42 * Math.exp(-Math.abs(cp) / 420));
  const decisive = 1 - draw;
  const white = decisive * win;
  const black = decisive * (1 - win);
  const total = white + draw + black;
  return { white: white / total, draw: draw / total, black: black / total };
}

const ENGINE_LEVEL_ELO = [650,750,850,950,1050,1150,1250,1350,1450,1550,1650,1750,1850,2000,2150,2300,2500,2700,2950,3200];

function engineEloFromGame(game = {}) {
  const direct = Number(game.engineElo ?? game.opponentElo);
  if (Number.isFinite(direct) && direct >= 100) return direct;
  const skill = Number(game.engineSkill ?? game.opponentSkill);
  if (Number.isInteger(skill) && skill >= 1 && skill <= 20) return ENGINE_LEVEL_ELO[skill - 1];
  return null;
}

function humanSideFromGame(game = {}) {
  if (game.humanColor === 'w' || game.humanColor === 'b') return game.humanColor;
  const white = String(game.white || '').toLowerCase();
  const black = String(game.black || '').toLowerCase();
  if ((white === 'j1' || white === 'jugador') && black !== 'j1' && black !== 'jugador') return 'w';
  if ((black === 'j1' || black === 'jugador') && white !== 'j1' && white !== 'jugador') return 'b';
  return null;
}

function ratingBand(rating) {
  if (rating < 800) return 'iniciación';
  if (rating < 1200) return 'nivel básico';
  if (rating < 1600) return 'nivel intermedio';
  if (rating < 2000) return 'nivel avanzado';
  if (rating < 2400) return 'nivel experto';
  if (rating < 2800) return 'nivel maestro';
  return 'rendimiento de élite';
}

const ELO_MODEL = Object.freeze({
  min: 100,
  max: 4000,
  step: 5,
  priorMean: 1500,
  priorDeviation: 600,
});

function expectedScore(playerElo, opponentElo) {
  return 1 / (1 + 10 ** ((opponentElo - playerElo) / 400));
}

function posteriorQuantile(points, probability) {
  let cumulative = 0;
  for (const point of points) {
    cumulative += point.probability;
    if (cumulative >= probability) return point.rating;
  }
  return points.at(-1)?.rating ?? null;
}

function uncertaintyText(sd, count) {
  if (count < 3 || sd >= 450) return 'Incertidumbre muy alta: estas partidas todavía delimitan poco tu nivel. Un resultado esperado contra un rival extremo apenas debe modificar la estimación.';
  if (sd >= 300) return 'Incertidumbre alta: ya existe una dirección, pero faltan partidas contra niveles variados.';
  if (sd >= 180) return 'Incertidumbre moderada: el intervalo se está cerrando y el valor central ya es útil como referencia.';
  if (sd >= 100) return 'Incertidumbre baja: el historial ofrece una estimación bastante definida.';
  return 'Incertidumbre muy baja: los resultados son numerosos y coherentes para este modelo.';
}

function reliabilityLabel(count, sd) {
  if (count < 3 || sd >= 450) return 'Preliminar';
  if (count < 8 || sd >= 300) return 'Provisional';
  if (count < 20 || sd >= 180) return 'Moderada';
  return 'Alta';
}

/**
 * Estimador probabilístico del Elo del jugador a partir de J1 vs COM.
 *
 * No asigna una suma/resta fija por partida. Para cada Elo posible calcula
 * cuán compatibles son todos los resultados con la expectativa logística de
 * Elo. Una derrota frente a 3200, por ejemplo, aporta muy poca evidencia en
 * contra porque era un resultado altamente esperado; una victoria aporta
 * mucha evidencia a favor. La distribución parte de una referencia amplia
 * (1500 ± 600), cuya influencia disminuye a medida que crece el historial.
 */
export function buildPlayerEloStats(games = []) {
  const pvcGames = games.filter(game => game?.mode === 'pvc' || game?.mode === 'pvc-simultaneous');
  const samples = [];
  let unfinished = 0;
  let missingMetadata = 0;

  for (const game of pvcGames) {
    const side = humanSideFromGame(game);
    const opponentElo = engineEloFromGame(game);
    if (!['1-0', '0-1', '1/2-1/2'].includes(game.result)) { unfinished += 1; continue; }
    if (!side || opponentElo == null) { missingMetadata += 1; continue; }
    const score = gameResultForSide(game.result, side);
    samples.push({
      gameId: game.id,
      date: game.date,
      result: game.result,
      humanSide: side,
      opponentElo,
      score,
    });
  }

  if (!samples.length) {
    return {
      count: 0,
      totalPvc: pvcGames.length,
      excluded: unfinished + missingMetadata,
      unfinished,
      missingMetadata,
      mean: null,
      median: null,
      standardDeviation: null,
      credibleLow: null,
      credibleHigh: null,
      mode: null,
      reliability: 'Sin datos suficientes',
      samples,
      interpretations: {
        mean: 'Juega partidas completas contra OmegaZero con el nivel del motor registrado para iniciar la estimación.',
        median: 'La mediana aparecerá cuando exista al menos una partida válida.',
        standardDeviation: 'La desviación estándar mostrará la incertidumbre estadística, no una penalización fija por derrota.',
      },
    };
  }

  const logPosterior = [];
  let maximumLog = -Infinity;
  for (let rating = ELO_MODEL.min; rating <= ELO_MODEL.max; rating += ELO_MODEL.step) {
    let logProbability = -0.5 * ((rating - ELO_MODEL.priorMean) / ELO_MODEL.priorDeviation) ** 2;
    for (const sample of samples) {
      const expectation = Math.min(1 - 1e-12, Math.max(1e-12, expectedScore(rating, sample.opponentElo)));
      logProbability += sample.score * Math.log(expectation) + (1 - sample.score) * Math.log(1 - expectation);
    }
    logPosterior.push({ rating, logProbability });
    if (logProbability > maximumLog) maximumLog = logProbability;
  }

  let normalization = 0;
  const posterior = logPosterior.map(point => {
    const weight = Math.exp(point.logProbability - maximumLog);
    normalization += weight;
    return { rating: point.rating, weight };
  }).map(point => ({ rating: point.rating, probability: point.weight / normalization }));

  const mean = posterior.reduce((sum, point) => sum + point.rating * point.probability, 0);
  const medianValue = posteriorQuantile(posterior, 0.5);
  const variance = posterior.reduce((sum, point) => sum + (point.rating - mean) ** 2 * point.probability, 0);
  const standardDeviation = Math.sqrt(variance);
  const mode = posterior.reduce((best, point) => point.probability > best.probability ? point : best, posterior[0]).rating;
  const credibleLow = posteriorQuantile(posterior, 0.1);
  const credibleHigh = posteriorQuantile(posterior, 0.9);
  const reliability = reliabilityLabel(samples.length, standardDeviation);

  return {
    count: samples.length,
    totalPvc: pvcGames.length,
    excluded: unfinished + missingMetadata,
    unfinished,
    missingMetadata,
    mean: Math.round(mean),
    median: Math.round(medianValue),
    standardDeviation: Math.round(standardDeviation),
    credibleLow,
    credibleHigh,
    mode,
    reliability,
    samples,
    interpretations: {
      mean: `El centro promedio de la estimación es ${Math.round(mean)} Elo (${ratingBand(mean)}). Considera simultáneamente la fuerza de cada bot y qué tan esperado era el resultado.`,
      median: `La mediana es ${Math.round(medianValue)} Elo: el modelo asigna aproximadamente la misma probabilidad a que tu nivel esté por debajo o por encima. El 80% central queda entre ${credibleLow} y ${credibleHigh}.`,
      standardDeviation: `${Math.round(standardDeviation)} puntos de incertidumbre. ${uncertaintyText(standardDeviation, samples.length)}`,
    },
  };
}

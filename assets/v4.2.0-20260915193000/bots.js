import { SCHEMES } from './constants.js';

export const BOTS = {
  zero: {
    id: 'zero',
    name: 'Zero',
    family: 'OmegaZero',
    title: 'Modo defensivo y contraataque',
    strengthLabel: 'Stockfish máximo',
    ratingBase: 3200,
    defaultStyle: 'zero',
    accent: '#4fc3b1',
    glyph: 'Z',
    repertoire: ['hippo'],
    description: 'Especialista integral en Hipopótamo y semi-Hipopótamos. Reconoce el tipo de centro, decide si debe completar la formación o desviarse, y transforma la posición en estructuras Francesa, India de Rey, Siciliana o Benoni cuando corresponde.',
    doctrine: 'No usa piloto automático: integra los diez hitos del Hipopótamo, los seis quiebres temáticos, los cuatro métodos de seguridad del rey, las trece familias estructurales y los errores críticos descritos por Alessio De Santis.',
    knowledgeSource: 'The Hippopotamus Defence · Alessio De Santis · New In Chess 2019',
  },
  omega: {
    id: 'omega',
    name: 'Omega',
    family: 'OmegaZero',
    title: 'Modo hiperagresivo y táctico',
    strengthLabel: 'Stockfish máximo',
    ratingBase: 3200,
    defaultStyle: 'omega',
    accent: '#d46f67',
    glyph: 'Ω',
    repertoire: ['counterHippo'],
    description: 'Modo hiperagresivo y táctico. Juega la mejor línea de Stockfish mientras no detecta un Hipopótamo rival; cuando aparecen señales suficientes, activa Counter Hipopótamo con centros amplios, Ataque Austríaco/cuatro peones, restricciones h4/a4 y rupturas directas.',
    doctrine: 'Counter condicional: no fuerza una receta anti-Hipopótamo contra cualquier rival. Primero detecta la estructura enemiga; si no hay Hipopótamo, mantiene la primera línea del motor. Si lo detecta, convierte espacio, iniciativa y actividad en presión concreta sobre f5/c5/g5/b5 y el rey.',
    knowledgeSource: 'The Hippopotamus Defence · Alessio De Santis · New In Chess 2019',
  },
};

export const ZERO_SCHEMES = ['auto', 'hippo'];

function pieceAt(chess, square, color, type) {
  const piece = chess?.get?.(square);
  return piece?.color === color && piece?.type === type;
}

export function hippoIntentScore(chess, color) {
  if (!chess) return 0;
  const white = color === 'w';
  const signals = [
    [white ? 'g3' : 'g6', 'p', 2],
    [white ? 'g2' : 'g7', 'b', 2],
    [white ? 'd3' : 'd6', 'p', 1],
    [white ? 'e3' : 'e6', 'p', 1],
    [white ? 'b3' : 'b6', 'p', 1],
    [white ? 'b2' : 'b7', 'b', 1],
    [white ? 'd2' : 'd7', 'n', 1],
    [white ? 'e2' : 'e7', 'n', 1],
  ];
  return signals.reduce((score, [square, type, weight]) => score + (pieceAt(chess, square, color, type) ? weight : 0), 0);
}

export function detectsHippo(chess, color) {
  // Un simple fianchetto g6/Bg7 (o g3/Bg2) aparece en Pirc, Moderna e India de Rey.
  // Exigimos más señales de la "concha" para no disparar Counter Hipopótamo por error.
  return hippoIntentScore(chess, color) >= 6;
}

export function resolveBotScheme(botId, color, configuredScheme = 'auto', leagueGames = 0, chess = null) {
  void configuredScheme;
  void leagueGames;
  if (botId === 'zero') return 'hippo';
  if (botId === 'omega') {
    const enemy = color === 'b' ? 'w' : 'b';
    return chess && detectsHippo(chess, enemy) ? 'counterHippo' : 'best';
  }
  return 'best';
}

export function schemeDisplayName(schemeId) {
  if (schemeId === 'counterHippo') return 'Counter Hipopótamo';
  if (schemeId === 'best') return 'Mejor jugada';
  return SCHEMES[schemeId]?.short || schemeId;
}

export function botPlan(botId, color, configuredScheme = 'auto', leagueGames = 0, chess = null) {
  const schemeId = resolveBotScheme(botId, color, configuredScheme, leagueGames, chess);
  if (botId === 'zero') {
    return 'Zero clasifica el centro antes de mover: completa el Hipopótamo solo cuando es adecuado, o entra en un semi-Hippo con la ruptura exacta. Conserva la elasticidad, elige conscientemente la seguridad del rey y explota el defecto creado por el último avance rival.';
  }
  if (schemeId === 'counterHippo') {
    return 'Omega detectó un Hipopótamo rival y activa Counter: ocupa el centro, respalda cada peón con desarrollo, restringe f5/c5/g5/b5 y busca una transformación concreta antes de que el rival coordine sus piezas.';
  }
  return 'Omega no detecta el patrón que activa Counter: descarta sesgos temáticos y ejecuta la mejor jugada de Stockfish.';
}

export function botSelectOptions(selected) {
  return Object.values(BOTS).map((bot) => `<option value="${bot.id}" ${bot.id === selected ? 'selected' : ''}>OmegaZero · ${bot.name}</option>`).join('');
}

export function botSchemeOptions(botId, selected = 'auto') {
  if (botId === 'omega') {
    return '<option value="auto" selected>Automático · mejor línea / Counter si detecta Hipopótamo</option>';
  }
  return ZERO_SCHEMES.map((id) => {
    const label = id === 'auto' ? 'Automático · Defensa Hipopótamo' : SCHEMES[id].name;
    return `<option value="${id}" ${id === selected ? 'selected' : ''}>${label}</option>`;
  }).join('');
}

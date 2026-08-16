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
    description: 'Especialista antihipopótamo alimentado por las mismas trece familias estructurales. Elige entre centro de rey, Austríaco, centro de dama y cuatro peones, restringe las seis rupturas de Zero y abre la posición en el momento en que el desarrollo lo permite.',
    doctrine: 'Counter permanente: convertir el espacio en control real, vigilar f5/c5/g5/b5, usar h4/a4 como restricciones concretas y castigar el rey o las piezas cuando el Hipopótamo se desvía hacia un semi-Hippo impreciso.',
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
  return hippoIntentScore(chess, color) >= 3;
}

export function resolveBotScheme(botId, color, configuredScheme = 'auto', leagueGames = 0, chess = null) {
  void color;
  void configuredScheme;
  void leagueGames;
  void chess;
  if (botId === 'omega') return 'counterHippo';
  if (botId === 'zero') return 'hippo';
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
    return 'Omega juega Counter Hipopótamo de forma permanente: selecciona el tipo de centro, respalda cada peón con desarrollo, restringe f5/c5/g5/b5 y provoca una transformación concreta antes de que Zero coordine sus piezas.';
  }
  return 'Omega no detecta el patrón que activa Counter: descarta sesgos temáticos y ejecuta la mejor jugada de Stockfish.';
}

export function botSelectOptions(selected) {
  return Object.values(BOTS).map((bot) => `<option value="${bot.id}" ${bot.id === selected ? 'selected' : ''}>OmegaZero · ${bot.name}</option>`).join('');
}

export function botSchemeOptions(botId, selected = 'auto') {
  if (botId === 'omega') {
    return '<option value="auto" selected>Automático · Counter Hipopótamo</option>';
  }
  return ZERO_SCHEMES.map((id) => {
    const label = id === 'auto' ? 'Automático · Defensa Hipopótamo' : SCHEMES[id].name;
    return `<option value="${id}" ${id === selected ? 'selected' : ''}>${label}</option>`;
  }).join('');
}

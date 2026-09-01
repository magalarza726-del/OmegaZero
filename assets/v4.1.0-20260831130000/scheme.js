import { SCHEMES, STYLES } from './constants.js';
import { analyzeHippoPosition, bookSchemePreferences, hippoSetupStatus } from './hippoKnowledge.js';

const TARGETS = {
  hippo: {
    w: {
      opening: ['g2g3', 'f1g2', 'd2d3', 'b1d2', 'e2e3', 'g1e2', 'b2b3', 'c1b2', 'h2h3', 'a2a3'],
      breaks: ['f2f4', 'c2c4', 'e3e4', 'd3d4', 'g3g4', 'b3b4'],
    },
    b: {
      opening: ['g7g6', 'f8g7', 'd7d6', 'b8d7', 'e7e6', 'g8e7', 'b7b6', 'c8b7', 'h7h6', 'a7a6'],
      breaks: ['f7f5', 'c7c5', 'e6e5', 'd6d5', 'g6g5', 'b6b5'],
    },
  },
  london: {
    w: {
      opening: ['d2d4', 'g1f3', 'c1f4', 'e2e3', 'c2c3', 'f1d3', 'b1d2', 'e1g1'],
      breaks: ['e3e4', 'c3c4', 'f3e5', 'h2h4', 'g2g4'],
    },
    b: {
      opening: ['d7d5', 'g8f6', 'c8f5', 'e7e6', 'c7c6', 'f8d6', 'b8d7', 'e8g8'],
      breaks: ['e6e5', 'c6c5', 'f6e4', 'h7h5', 'g7g5'],
    },
  },
  colle: {
    w: {
      opening: ['d2d4', 'g1f3', 'e2e3', 'f1d3', 'b1d2', 'c2c3', 'e1g1'],
      breaks: ['e3e4', 'c3c4', 'f3e5', 'd4e5'],
    },
    b: {
      opening: ['d7d5', 'g8f6', 'e7e6', 'f8d6', 'b8d7', 'c7c6', 'e8g8'],
      breaks: ['e6e5', 'c6c5', 'f6e4', 'd5e4'],
    },
  },
  hedgehog: {
    w: {
      opening: ['a2a3', 'b2b3', 'd2d3', 'e2e3', 'c1b2', 'f1e2', 'g1f3', 'b1d2', 'd1c2', 'e1g1'],
      breaks: ['b3b4', 'd3d4', 'e3e4'],
    },
    b: {
      opening: ['a7a6', 'b7b6', 'd7d6', 'e7e6', 'c8b7', 'f8e7', 'g8f6', 'b8d7', 'd8c7', 'e8g8'],
      breaks: ['b6b5', 'd6d5', 'e6e5'],
    },
  },
  torre: {
    w: {
      opening: ['d2d4', 'g1f3', 'c1g5', 'e2e3', 'b1d2', 'f1d3', 'c2c3', 'e1g1'],
      breaks: ['e3e4', 'f3e5', 'h2h4', 'c3c4'],
    },
    b: {
      opening: ['d7d5', 'g8f6', 'c8g4', 'e7e6', 'b8d7', 'f8d6', 'c7c6', 'e8g8'],
      breaks: ['e6e5', 'f6e4', 'h7h5', 'c6c5'],
    },
  },
  attack150: {
    w: {
      opening: ['e2e4', 'd2d4', 'b1c3', 'c1e3', 'd1d2', 'f2f3', 'e1c1'],
      breaks: ['h2h4', 'g2g4', 'h4h5', 'f3f4', 'e4e5'],
    },
    b: {
      opening: ['e7e5', 'd7d5', 'b8c6', 'c8e6', 'd8d7', 'f7f6', 'e8c8'],
      breaks: ['h7h5', 'g7g5', 'h5h4', 'f6f5', 'e5e4'],
    },
  },
  dragon: {
    w: {
      opening: ['e2e4', 'g1f3', 'd2d4', 'b1c3', 'c1e3', 'f2f3', 'd1d2', 'e1c1'],
      breaks: ['h2h4', 'g2g4', 'h4h5', 'e4e5'],
    },
    b: {
      opening: ['c7c5', 'd7d6', 'g8f6', 'b8c6', 'g7g6', 'f8g7', 'e8g8', 'c8e6', 'a8c8'],
      breaks: ['d6d5', 'b7b5', 'f7f5', 'c5c4'],
    },
  },
  counterHippo: {
    w: {
      opening: ['e2e4', 'd2d4', 'c2c4', 'b1c3', 'f2f4', 'c1e3', 'd1d2', 'a2a4', 'h2h4', 'e1c1'],
      breaks: ['h4h5', 'a4a5', 'f4f5', 'e4e5', 'd4d5', 'c4c5', 'g2g4'],
    },
    b: {
      opening: ['e7e5', 'd7d5', 'c7c5', 'b8c6', 'f7f5', 'c8e6', 'd8d7', 'a7a5', 'h7h5', 'e8c8'],
      breaks: ['h5h4', 'a5a4', 'f5f4', 'e5e4', 'd5d4', 'c5c4', 'g7g5'],
    },
  },
};

const square = (uci) => uci.slice(2, 4);
const origin = (uci) => uci.slice(0, 2);

export function legalSchemePreferences(chess, schemeId, color) {
  const profile = TARGETS[schemeId]?.[color];
  if (!profile) return [];
  const legal = new Set(chess.moves({ verbose: true }).map(moveToUci));
  const result = [];

  profile.opening.forEach((uci, index) => {
    if (legal.has(uci)) result.push({ uci, plan: 'desarrollo', weight: 120 - index * 5 });
  });
  profile.breaks.forEach((uci, index) => {
    if (legal.has(uci)) result.push({ uci, plan: 'ruptura', weight: 72 - index * 4 });
  });

  adaptivePreferences(chess, schemeId, color).forEach((item) => {
    if (!legal.has(item.uci)) return;
    const existing = result.find((candidate) => candidate.uci === item.uci);
    if (existing && existing.weight >= item.weight) return;
    if (existing) result.splice(result.indexOf(existing), 1);
    result.push(item);
  });

  bookSchemePreferences(chess, schemeId, color).forEach((item) => {
    if (!legal.has(item.uci)) return;
    const existing = result.find((candidate) => candidate.uci === item.uci);
    if (existing && existing.weight >= item.weight) return;
    if (existing) result.splice(result.indexOf(existing), 1);
    result.push(item);
  });

  return result;
}

function isPiece(chess, squareName, color, type) {
  const piece = chess.get(squareName);
  return piece?.color === color && piece?.type === type;
}

function hasAny(chess, checks) {
  return checks.some(([squareName, color, type]) => isPiece(chess, squareName, color, type));
}

export function adaptivePreferences(chess, schemeId, color) {
  const enemy = color === 'w' ? 'b' : 'w';
  const suggestions = [];
  const add = (uci, plan, weight = 150) => suggestions.push({ uci, plan, weight });

  if (schemeId === 'london') {
    const queenPressure = color === 'w'
      ? hasAny(chess, [['b6', enemy, 'q'], ['a5', enemy, 'q']])
      : hasAny(chess, [['b3', enemy, 'q'], ['a4', enemy, 'q']]);
    const bishopChased = color === 'w'
      ? isPiece(chess, 'f4', color, 'b') && hasAny(chess, [['h5', enemy, 'n'], ['g5', enemy, 'p']])
      : isPiece(chess, 'f5', color, 'b') && hasAny(chess, [['h4', enemy, 'n'], ['g4', enemy, 'p']]);
    const earlyCPressure = color === 'w'
      ? hasAny(chess, [['c5', enemy, 'p'], ['c6', enemy, 'n']])
      : hasAny(chess, [['c4', enemy, 'p'], ['c3', enemy, 'n']]);

    if (queenPressure) {
      (color === 'w' ? ['d1b3', 'b2b3', 'd1c2'] : ['d8b6', 'b7b6', 'd8c7'])
        .forEach((uci) => add(uci, 'neutralizar presión sobre b2/b7', 170));
    }
    if (bishopChased) {
      (color === 'w' ? ['f4g3', 'f4g5', 'f4e5'] : ['f5g6', 'f5g4', 'f5e4'])
        .forEach((uci) => add(uci, 'preservar el alfil Londres', 180));
    }
    if (earlyCPressure) {
      (color === 'w' ? ['c2c3', 'e2e3', 'd4c5'] : ['c7c6', 'e7e6', 'd5c4'])
        .forEach((uci) => add(uci, 'estabilizar el centro ante presión lateral', 155));
    }
  }

  if (schemeId === 'colle') {
    const activeBishop = color === 'w'
      ? hasAny(chess, [['f5', enemy, 'b'], ['g4', enemy, 'b']])
      : hasAny(chess, [['f4', enemy, 'b'], ['g5', enemy, 'b']]);
    const fianchetto = color === 'w'
      ? hasAny(chess, [['g6', enemy, 'p'], ['g7', enemy, 'b']])
      : hasAny(chess, [['g3', enemy, 'p'], ['g2', enemy, 'b']]);
    const centerReady = color === 'w'
      ? isPiece(chess, 'd4', color, 'p') && isPiece(chess, 'e3', color, 'p') && isPiece(chess, 'd2', color, 'n')
      : isPiece(chess, 'd5', color, 'p') && isPiece(chess, 'e6', color, 'p') && isPiece(chess, 'd7', color, 'n');

    if (activeBishop) {
      (color === 'w' ? ['f1d3', 'c2c4', 'd1b3'] : ['f8d6', 'c7c5', 'd8b6'])
        .forEach((uci) => add(uci, 'discutir el alfil activo rival', 165));
    }
    if (fianchetto) {
      (color === 'w' ? ['b2b3', 'c1b2'] : ['b7b6', 'c8b7'])
        .forEach((uci) => add(uci, 'transición Colle–Zukertort', 160));
    }
    if (centerReady) add(color === 'w' ? 'e3e4' : 'e6e5', 'ruptura Colle e4/e5', 205);
  }

  if (schemeId === 'hedgehog') {
    const bind = color === 'w'
      ? hasAny(chess, [['c5', enemy, 'p'], ['e5', enemy, 'p']])
      : hasAny(chess, [['c4', enemy, 'p'], ['e4', enemy, 'p']]);
    const piecesReady = color === 'w'
      ? isPiece(chess, 'b2', color, 'b') && isPiece(chess, 'f3', color, 'n')
      : isPiece(chess, 'b7', color, 'b') && isPiece(chess, 'f6', color, 'n');
    if (bind && piecesReady) {
      (color === 'w' ? ['b3b4', 'd3d4'] : ['b6b5', 'd6d5'])
        .forEach((uci, index) => add(uci, 'liberación del Erizo', 205 - index * 8));
    }
  }

  if (schemeId === 'torre') {
    const bishopChallenged = color === 'w'
      ? isPiece(chess, 'g5', color, 'b') && hasAny(chess, [['h6', enemy, 'p'], ['e4', enemy, 'n']])
      : isPiece(chess, 'g4', color, 'b') && hasAny(chess, [['h3', enemy, 'p'], ['e5', enemy, 'n']]);
    const fianchetto = color === 'w'
      ? hasAny(chess, [['g6', enemy, 'p'], ['g7', enemy, 'b']])
      : hasAny(chess, [['g3', enemy, 'p'], ['g2', enemy, 'b']]);
    if (bishopChallenged) {
      (color === 'w' ? ['g5h4', 'g5f4', 'g5e3'] : ['g4h5', 'g4f5', 'g4e6'])
        .forEach((uci) => add(uci, 'reubicar el alfil Torre sin perder tiempos', 182));
    }
    if (fianchetto) {
      (color === 'w' ? ['b1d2', 'e2e4', 'f1e2'] : ['b8d7', 'e7e5', 'f8e7'])
        .forEach((uci) => add(uci, 'adaptación Torre contra fianchetto', 165));
    }
  }

  if (schemeId === 'attack150') {
    const knightJump = color === 'w'
      ? hasAny(chess, [['g4', enemy, 'n'], ['e4', enemy, 'n']])
      : hasAny(chess, [['g5', enemy, 'n'], ['e5', enemy, 'n']]);
    const queensideStorm = color === 'w'
      ? hasAny(chess, [['b5', enemy, 'p'], ['c5', enemy, 'p']])
      : hasAny(chess, [['b4', enemy, 'p'], ['c4', enemy, 'p']]);
    if (knightJump) {
      (color === 'w' ? ['e3g5', 'e3f4', 'd1d2'] : ['e6g4', 'e6f5', 'd8d7'])
        .forEach((uci) => add(uci, 'neutralizar el salto de caballo antes del asalto', 190));
    }
    if (queensideStorm) {
      (color === 'w' ? ['a2a3', 'c3e2', 'c1b1'] : ['a7a6', 'c6e7', 'c8b8'])
        .forEach((uci) => add(uci, 'profilaxis del rey en enroques opuestos', 188));
    }
  }

  if (schemeId === 'counterHippo') {
    const hippoSquares = color === 'w'
      ? [['g6', enemy, 'p'], ['d6', enemy, 'p'], ['e6', enemy, 'p'], ['b6', enemy, 'p'], ['g7', enemy, 'b'], ['b7', enemy, 'b']]
      : [['g3', enemy, 'p'], ['d3', enemy, 'p'], ['e3', enemy, 'p'], ['b3', enemy, 'p'], ['g2', enemy, 'b'], ['b2', enemy, 'b']];
    const hippoSignals = hippoSquares.filter(([sq, side, type]) => isPiece(chess, sq, side, type)).length;
    if (hippoSignals >= 2) {
      (color === 'w'
        ? ['h2h4', 'h4h5', 'f2f4', 'f4f5', 'e4e5', 'd4d5', 'c4c5']
        : ['h7h5', 'h5h4', 'f7f5', 'f5f4', 'e5e4', 'd5d4', 'c5c4'])
        .forEach((uci, index) => add(uci, 'restricción anti-Hipopótamo', 220 - index * 6));
    }
  }

  if (schemeId === 'hippo') {
    const enemyAdvancedCenter = color === 'w'
      ? [['c5', enemy, 'p'], ['d5', enemy, 'p'], ['e5', enemy, 'p'], ['f5', enemy, 'p']]
      : [['c4', enemy, 'p'], ['d4', enemy, 'p'], ['e4', enemy, 'p'], ['f4', enemy, 'p']];
    const advancedCount = enemyAdvancedCenter.filter(([sq, side, type]) => isPiece(chess, sq, side, type)).length;
    if (advancedCount >= 2) {
      (color === 'w' ? ['f2f4', 'c2c4', 'e3e4'] : ['f7f5', 'c7c5', 'e6e5'])
        .forEach((uci, index) => add(uci, 'contragolpe al centro sobreextendido', 180 - index * 6));
    }
  }

  return suggestions;
}

export function moveToUci(move) {
  return `${move.from}${move.to}${move.promotion || ''}`;
}

function kingDistance(squareName, enemyColor) {
  const file = squareName.charCodeAt(0) - 97;
  const rank = Number(squareName[1]) - 1;
  const enemyKing = enemyColor === 'b' ? [6, 7] : [6, 0];
  return Math.abs(file - enemyKing[0]) + Math.abs(rank - enemyKing[1]);
}

function developmentBonus(uci, color) {
  const from = origin(uci);
  const to = square(uci);
  const homeRank = color === 'w' ? '1' : '8';
  const pawnRank = color === 'w' ? '2' : '7';
  if (from[1] === homeRank && to[1] !== homeRank) return 10;
  if (from[1] === pawnRank) return 4;
  return 0;
}

export function styleBonus(chess, uci, styleId, color) {
  const move = chess.moves({ verbose: true }).find((candidate) => moveToUci(candidate) === uci);
  if (!move) return -999;
  const style = STYLES[styleId] || STYLES.zero;
  let score = developmentBonus(uci, color);
  const enemy = color === 'w' ? 'b' : 'w';

  if (style.id === 'omega') {
    if (move.captured) score += 24;
    if (move.san.includes('+')) score += 30;
    if (move.san.includes('#')) score += 1000;
    score += Math.max(0, 7 - kingDistance(move.to, enemy)) * 3;
    if (['f', 'g', 'h'].includes(move.to[0])) score += 5;
  } else if (style.id === 'zero') {
    if (move.san === 'O-O' || move.san === 'O-O-O') score += 36;
    if (move.captured) score += 8;
    if (['f2', 'g2', 'h2', 'f7', 'g7', 'h7'].includes(move.to)) score += 8;
    if (move.piece === 'q' && chess.history().length < 16) score -= 12;
  } else {
    if (move.captured) score += 10;
    if (move.san.includes('+')) score += 8;
    if (move.san === 'O-O' || move.san === 'O-O-O') score += 18;
  }
  return score;
}

export function chooseCandidate(chess, candidates, schemeId, styleId, color, learnedWeights = {}) {
  if (!candidates.length) return null;
  const style = STYLES[styleId] || STYLES.zero;
  const direction = color === 'b' ? 1 : -1;
  const sorted = [...candidates].sort((a, b) => direction * (a.score - b.score));
  const best = sorted[0];
  const loss = (candidate) => color === 'b' ? candidate.score - best.score : best.score - candidate.score;
  const safe = sorted.filter((candidate) => loss(candidate) <= style.tolerance);
  const preferences = new Map(
    legalSchemePreferences(chess, schemeId, color).map((item) => [item.uci, item]),
  );

  return safe
    .map((candidate) => {
      const preference = preferences.get(candidate.uci);
      const schemeBonus = preference ? preference.weight : 0;
      const personality = styleBonus(chess, candidate.uci, styleId, color);
      const precision = -loss(candidate) * (styleId === 'zero' ? 1.6 : 0.7);
      const learned = Number(learnedWeights[candidate.uci] || 0);
      return {
        ...candidate,
        plan: preference?.plan || inferPlan(chess, candidate.uci, styleId),
        learnedBonus: learned,
        composite: precision + schemeBonus + personality + learned,
      };
    })
    .sort((a, b) => b.composite - a.composite)[0];
}

export function chooseBotCandidate(chess, candidates, botId, schemeId, color, learnedWeights = {}, styleId = null) {
  if (!candidates.length) return null;
  const direction = color === 'b' ? 1 : -1;
  const sorted = [...candidates].sort((a, b) => direction * (a.score - b.score));
  const best = sorted[0];
  const loss = (candidate) => color === 'b' ? candidate.score - best.score : best.score - candidate.score;
  const activeStyleId = styleId || (botId === 'zero' ? 'zero' : 'omega');
  const activeStyle = STYLES[activeStyleId] || STYLES.zero;
  const openingPhase = chess.history().length < 18;
  // La identidad puede elegir una jugada temática inferior, pero nunca una
  // alternativa fuera de un margen táctico razonable.
  const identityWindow = openingPhase ? 72 : 36;
  const tolerance = Math.max(activeStyle.tolerance, identityWindow);
  const safe = sorted.filter((candidate) => loss(candidate) <= tolerance);
  const preferences = new Map(
    legalSchemePreferences(chess, schemeId, color).map((item) => [item.uci, item]),
  );
  return safe.map((candidate) => {
    const preference = preferences.get(candidate.uci);
    const thematic = preference ? Math.min(82, preference.weight / 2.5) : 0;
    const personality = Math.max(-18, Math.min(30, styleBonus(chess, candidate.uci, activeStyleId, color) / 2));
    const learned = Math.max(-4, Math.min(4, Number(learnedWeights[candidate.uci] || 0) / 6));
    return {
      ...candidate,
      plan: preference?.plan || inferPlan(chess, candidate.uci, activeStyleId),
      learnedBonus: learned,
      composite: -loss(candidate) + thematic + personality + learned,
    };
  }).sort((a, b) => b.composite - a.composite)[0];
}

function inferPlan(chess, uci, styleId) {
  const move = chess.moves({ verbose: true }).find((candidate) => moveToUci(candidate) === uci);
  if (!move) return 'precisión táctica';
  if (move.san.includes('#')) return 'mate forzado';
  if (move.san.includes('+')) return 'iniciativa con jaque';
  if (move.captured) return styleId === 'zero' ? 'simplificación favorable' : 'tensión táctica';
  if (move.san.startsWith('O-O')) return 'seguridad del rey';
  return 'mejora de piezas';
}

export function currentPlan(chess, schemeId, color, styleId) {
  const ply = chess.history().length;
  const scheme = SCHEMES[schemeId];
  if (chess.inCheck()) return 'Responder al jaque sin abandonar la coordinación.';
  if (schemeId === 'hippo' || schemeId === 'counterHippo') {
    const book = analyzeHippoPosition(chess, color, schemeId);
    const warning = book.warnings[0] ? ` Advertencia: ${book.warnings[0]}` : '';
    return `${book.center.name} · ${book.phase}. ${book.plan}${warning}`;
  }
  if (ply < 10) {
    if (schemeId === 'london') return 'Completar el triángulo y asegurar el alfil activo en f4.';
    if (schemeId === 'colle') return 'Concentrar las piezas detrás del centro antes de preparar e4.';
    if (schemeId === 'hedgehog') return 'Construir las espinas a6–b6–d6–e6 sin apresurar una liberación.';
    if (schemeId === 'torre') return 'Clavar el caballo con Bg5 y completar desarrollo sin bloquear e4.';
    if (schemeId === 'dragon') return 'Completar …c5, …d6, …Nf6 y el fianchetto antes de iniciar el contrajuego.';
    return 'Coordinar Be3, Qd2 y f3 antes de comprometer el rey o lanzar peones.';
  }
  if (ply < 22) {
    if (schemeId === 'hippo') return styleId === 'omega'
      ? 'Provocar el avance rival y golpear con f5 o g5.'
      : 'Esperar la sobreextensión y elegir entre c5, f5 o e5.';
    if (schemeId === 'london') return 'Instalar un caballo en e5 y orientar piezas hacia el rey.';
    if (schemeId === 'colle') return 'Verificar si la ruptura e4 ya es tácticamente segura.';
    if (schemeId === 'hedgehog') return 'Medir si …b5 o …d5 libera las piezas sin perder una espina.';
    if (schemeId === 'torre') return 'Instalar Ne5 y decidir entre e4, h4 o presión posicional.';
    if (schemeId === 'dragon') return 'Presionar c3, medir …d5 y coordinar torre, dama y alfil de g7.';
    return 'Enrocar largo con seguridad y calcular la carrera de ataques antes de h4–g4.';
  }
  return `${scheme.short}: convertir la estructura lograda en ${styleId === 'omega' ? 'iniciativa directa' : styleId === 'zero' ? 'control, profilaxis y contraataque' : 'actividad coordinada'}.`;
}

export function schemeProgress(chess, schemeId, color) {
  if (schemeId === 'hippo') return hippoSetupStatus(chess, color).percent;
  const profile = TARGETS[schemeId]?.[color];
  if (!profile) return 0;
  const history = chess.history({ verbose: true }).filter((_, index) => (index % 2 === 0 ? 'w' : 'b') === color);
  const played = new Set(history.map(moveToUci));
  const completed = profile.opening.filter((uci) => played.has(uci)).length;
  return Math.min(100, Math.round((completed / Math.min(7, profile.opening.length)) * 100));
}

export const SCHEME_TARGETS = TARGETS;

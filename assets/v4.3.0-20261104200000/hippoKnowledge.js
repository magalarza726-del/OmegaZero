/**
 * Motor de conocimiento posicional basado en la taxonomía y los principios de
 * The Hippopotamus Defence, de Alessio De Santis (New In Chess, 2019).
 *
 * No contiene el texto del libro. Convierte sus ideas, clasificaciones y
 * repertorios en reglas evaluables sobre el tablero.
 */

export const HIPPO_BOOK = Object.freeze({
  title: 'The Hippopotamus Defence',
  author: 'Alessio De Santis',
  publisher: 'New In Chess',
  publicationYear: 2018,
  copyrightYear: 2019,
  scope: 'Hipopótamo, semi-Hipopótamo, transformaciones centrales, repertorios 1...g6/1...b6 y errores típicos',
  chapters: Object.freeze([
    'Introducción al sistema Hipopótamo',
    'Universalidad y límites prácticos',
    'Evitar teoría, ralentizar el juego y ocultar el contraataque',
    'Razones prácticas para emplearlo',
    'Hipopótamo completo y semi-Hipopótamos',
    'Estructuras, rupturas, seguridad del rey y maniobras',
    'Significado de las jugadas del Hipopótamo',
    'Significado de las desviaciones semi-Hippo',
    'Modelos de grandes maestros',
    'Historia y desarrollo',
    'Clasificación por transformación y estructura',
    'Partidas instructivas por trece familias',
    'Estrategia avanzada y motivos tácticos',
    'Problemas teóricos de los centros críticos',
    'Errores que deben evitarse',
    'Partidas complejas y construcción del repertorio',
  ]),
});

const MOVE_MEANINGS = Object.freeze({
  gPawn: {
    plan: 'iniciar el fianchetto de rey y mantener transposiciones con Moderna/Pirc',
    detail: 'Coloca el alfil en la diagonal larga sin ofrecer una pieza adelantada como punto de contacto.',
    reference: 'Cap. 7 · comienzo con ...g6',
  },
  kingBishop: {
    plan: 'completar el fianchetto de rey',
    detail: 'El alfil presiona el centro desde la diagonal larga y obliga a proteger el peón central correspondiente.',
    reference: 'Cap. 7 · significado del fianchetto de rey',
  },
  dPawn: {
    plan: 'controlar la casilla de invasión y preparar el caballo',
    detail: 'Mantiene la opción de cerrar con ...d5 si el rival avanza e5 y conecta con estructuras de Pirc/Moderna.',
    reference: 'Caps. 6-7 · pareja central retrasada',
  },
  queenKnight: {
    plan: 'desarrollar el caballo a una casilla protegida',
    detail: 'Controla la casilla central crítica y deja libres las rupturas de peones.',
    reference: 'Cap. 7 · caballo de dama',
  },
  ePawn: {
    plan: 'formar la pareja central flexible',
    detail: 'Cubre la invasión rival, prepara el segundo caballo y conserva la respuesta de cierre ...e5 ante d5.',
    reference: 'Caps. 6-7 · pareja d6/e6',
  },
  kingKnight: {
    plan: 'completar la red de caballos sin ocupar el frente',
    detail: 'Bloquea tácticas sobre la dama, apoya casillas centrales y permite maniobras para elegir dónde situar el rey.',
    reference: 'Caps. 6-7 · maniobras de caballos',
  },
  bPawn: {
    plan: 'iniciar el segundo fianchetto',
    detail: 'Prepara presión sobre el centro desde la otra diagonal y conserva la estructura compacta.',
    reference: 'Cap. 7 · comienzo con ...b6',
  },
  queenBishop: {
    plan: 'completar el doble fianchetto',
    detail: 'Termina la geometría básica del Hipopótamo y aumenta la presión de largo alcance sobre el centro.',
    reference: 'Cap. 7 · segundo fianchetto',
  },
  hPawn: {
    plan: 'preservar el alfil fianchettado y preparar la expansión lateral',
    detail: 'Controla g5, dificulta el cambio del alfil y habilita g5 cuando esa ruptura sea conveniente.',
    reference: 'Caps. 1, 6 y 7 · función de ...h6',
  },
  aPawn: {
    plan: 'controlar b5 y preparar la expansión del flanco de dama',
    detail: 'Refleja la función de h6: protege la estructura, gana tiempos con b5 y puede iniciar contrajuego.',
    reference: 'Caps. 1, 6 y 7 · función de ...a6',
  },
});

export const HIPPO_CENTER_TYPES = Object.freeze({
  kingsTwo: {
    id: 'kingsTwo',
    name: 'Centro de rey de dos peones',
    evidence: 'e+d',
    zeroPlan: 'Completar la estructura si no existe una ruptura inmediata; conservar las respuestas de cierre y observar qué pieza rival queda mal colocada.',
    omegaPlan: 'Desarrollar sin regalar tiempos, mantener e4/d4 defendidos y decidir si añadir f4 o c4 antes de que Zero consiga la ruptura correcta.',
    reference: 'Caps. 11-12 · centro de rey',
  },
  austrian: {
    id: 'austrian',
    name: 'Centro de tres peones · Ataque Austríaco',
    evidence: 'e+d+f',
    zeroPlan: 'Abandonar el piloto automático: considerar f5, c5 o c6-d5 antes de completar jugadas lentas del esquema.',
    omegaPlan: 'Usar f4-f5 como restricción solo con e4 protegido y desarrollo suficiente; la ventaja está en obligar a Zero a un semi-Hipopótamo.',
    reference: 'Caps. 7-8, 12 y 14 · Ataque Austríaco',
  },
  queensTwo: {
    id: 'queensTwo',
    name: 'Centro de dama de dos peones',
    evidence: 'c+d',
    zeroPlan: 'Vigilar la incorporación de e4: la estructura suele transformarse y no debe tratarse como una posición estática.',
    omegaPlan: 'Preparar e4 sin descuidar la diagonal del alfil de b7 ni permitir que un cambio táctico destruya el centro.',
    reference: 'Caps. 11-12 · centro c4+d4',
  },
  queensThree: {
    id: 'queensThree',
    name: 'Centro de dama extendido de tres peones',
    evidence: 'c+d+e',
    zeroPlan: 'Atacar la base o transformar con c5, f5, d5 o e5 según la colocación de piezas; suele exigir un semi-Hippo preciso.',
    omegaPlan: 'Conservar la cadena c4-d4-e4, completar el desarrollo y abrir líneas antes de que Zero convierta la posición en una estructura conocida favorable.',
    reference: 'Caps. 11-12 y 14 · centro c4+d4+e4',
  },
  fourPawns: {
    id: 'fourPawns',
    name: 'Centro de cuatro peones',
    evidence: 'c+d+e+f',
    zeroPlan: 'Provocar una definición y golpear una base; no abrir simultáneamente ambos flancos sin piezas listas.',
    omegaPlan: 'El espacio solo vale si las piezas lo sostienen: terminar desarrollo, evitar peones colgantes y restringir f5/c5.',
    reference: 'Caps. 11-12 · centro de cuatro peones',
  },
  onePawn: {
    id: 'onePawn',
    name: 'Centro restringido de un peón',
    evidence: 'un único peón central',
    zeroPlan: 'Es el terreno más cómodo para completar el Hipopótamo; si el rival renuncia al centro, también puede ser correcto ocuparlo.',
    omegaPlan: 'No permitir una construcción gratuita: añadir un segundo peón central o generar presión concreta antes de que Zero complete diez hitos.',
    reference: 'Caps. 5, 11-12 · Londres, Colle, Réti y sistemas afines',
  },
  french: {
    id: 'french',
    name: 'Transformación a centro Francés',
    evidence: 'avance e5 respondido con d5',
    zeroPlan: 'Atacar la cadena por su base y aprovechar piezas rivales mal colocadas; la ruptura de cierre es defensiva, no un fin en sí misma.',
    omegaPlan: 'Antes de e5, comprobar que el cierre no entregue a Zero una versión cómoda de la Francesa con piezas mejor ubicadas.',
    reference: 'Caps. 6, 11-12 · transformación francesa',
  },
  kingsIndian: {
    id: 'kingsIndian',
    name: 'Transformación a centro Indio de Rey',
    evidence: 'avance d5 respondido con e5',
    zeroPlan: 'Preparar f5 y atacar la cadena; la ventaja práctica nace de las piezas rivales que quedaron en casillas inadecuadas.',
    omegaPlan: 'No cerrar con d5 por costumbre: medir si Zero obtiene f5 con facilidad y si las piezas blancas pueden actuar en el flanco de dama.',
    reference: 'Caps. 6, 11-12 · transformación india de rey',
  },
  sicilian: {
    id: 'sicilian',
    name: 'Transformación a centro Siciliano',
    evidence: 'ruptura c5 contra e4/d4',
    zeroPlan: 'Tratar c5 como una transición estructural: desarrollar actividad sobre la columna c y no como un simple avance aislado.',
    omegaPlan: 'Si Zero consigue c5 en buenas condiciones, evitar que el centro amplio se convierta en objetivos; responder con desarrollo y control de d5.',
    reference: 'Caps. 6, 11-12 · transformación siciliana',
  },
  benoni: {
    id: 'benoni',
    name: 'Estructura Benoni',
    evidence: 'd5 frente a c5/e6',
    zeroPlan: 'Buscar contrajuego en las rupturas laterales y presión sobre la cadena, sin perder tiempos en completar un Hipopótamo que ya cambió de naturaleza.',
    omegaPlan: 'Usar el espacio de d5, vigilar b5/f5 y evitar que el flanco de dama quede sin apoyo.',
    reference: 'Caps. 11-12 · estructuras Benoni',
  },
  openE: {
    id: 'openE',
    name: 'Columna e abierta',
    evidence: 'ausencia de peones e',
    zeroPlan: 'La apertura de la columna exige seguridad del rey y control de entradas; ya no basta con maniobrar detrás de la cadena.',
    omegaPlan: 'Ocupar la columna con piezas antes de que Zero consolide y explotar al rey si permanece en el centro.',
    reference: 'Caps. 11-13 · apertura de la columna e',
  },
  openD: {
    id: 'openD',
    name: 'Columna d abierta',
    evidence: 'ausencia de peones d',
    zeroPlan: 'Disputar la columna y controlar las casillas de entrada; los cambios defensivos pueden ser el recurso correcto.',
    omegaPlan: 'Doblar piezas y convertir la columna en una invasión, no en presión decorativa.',
    reference: 'Caps. 11-13 · apertura de la columna d',
  },
  superHippo: {
    id: 'superHippo',
    name: 'Super-Hipopótamo',
    evidence: 'estructura extendida con c6/f6',
    zeroPlan: 'Usarlo como recurso excepcional; la seguridad aparente puede convertirse en falta de espacio y pasividad.',
    omegaPlan: 'Fijar las debilidades creadas por la extensión y abrir una columna antes de que Zero reorganice sus piezas.',
    reference: 'Caps. 11-12 · Super-Hipopótamo',
  },
  fluid: {
    id: 'fluid',
    name: 'Centro todavía fluido',
    evidence: 'sin transformación dominante',
    zeroPlan: 'Conservar opciones, completar solo los hitos útiles y esperar a que una decisión rival revele el plan correcto.',
    omegaPlan: 'Evitar jugadas de espera gratuitas: construir un centro coherente o crear una amenaza que obligue a Zero a definirse.',
    reference: 'Caps. 3, 5 y 11 · flexibilidad estructural',
  },
});

const CORE = Object.freeze({
  w: [
    ['g2g3', 'gPawn'], ['f1g2', 'kingBishop'], ['d2d3', 'dPawn'], ['b1d2', 'queenKnight'],
    ['e2e3', 'ePawn'], ['g1e2', 'kingKnight'], ['b2b3', 'bPawn'], ['c1b2', 'queenBishop'],
    ['h2h3', 'hPawn'], ['a2a3', 'aPawn'],
  ],
  b: [
    ['g7g6', 'gPawn'], ['f8g7', 'kingBishop'], ['d7d6', 'dPawn'], ['b8d7', 'queenKnight'],
    ['e7e6', 'ePawn'], ['g8e7', 'kingKnight'], ['b7b6', 'bPawn'], ['c8b7', 'queenBishop'],
    ['h7h6', 'hPawn'], ['a7a6', 'aPawn'],
  ],
});

const ALTERNATE_CORE = Object.freeze({
  w: [
    ['b2b3', 'bPawn'], ['c1b2', 'queenBishop'], ['e2e3', 'ePawn'], ['g1e2', 'kingKnight'],
    ['d2d3', 'dPawn'], ['b1d2', 'queenKnight'], ['g2g3', 'gPawn'], ['f1g2', 'kingBishop'],
    ['a2a3', 'aPawn'], ['h2h3', 'hPawn'],
  ],
  b: [
    ['b7b6', 'bPawn'], ['c8b7', 'queenBishop'], ['e7e6', 'ePawn'], ['g8e7', 'kingKnight'],
    ['d7d6', 'dPawn'], ['b8d7', 'queenKnight'], ['g7g6', 'gPawn'], ['f8g7', 'kingBishop'],
    ['a7a6', 'aPawn'], ['h7h6', 'hPawn'],
  ],
});

const CENTRAL_FILES = ['c', 'd', 'e', 'f'];
const moveToUci = (move) => `${move.from}${move.to}${move.promotion || ''}`;
const enemyOf = (color) => color === 'w' ? 'b' : 'w';
const homeRank = (color) => color === 'w' ? '1' : '8';
const pawnHomeRank = (color) => color === 'w' ? '2' : '7';
const advancedRank = (color) => color === 'w' ? '4' : '5';
const ownCentralRank = (color) => color === 'w' ? '4' : '5';

function hasPiece(chess, square, color, type = null) {
  const piece = chess.get(square);
  return Boolean(piece && piece.color === color && (!type || piece.type === type));
}

function fileHasPawn(chess, file) {
  for (let rank = 1; rank <= 8; rank++) {
    if (chess.get(`${file}${rank}`)?.type === 'p') return true;
  }
  return false;
}

function pawnSquare(color, file, side = 'enemy') {
  const pawnColor = side === 'enemy' ? enemyOf(color) : color;
  return `${file}${advancedRank(pawnColor)}`;
}

function centralPawnFiles(chess, color, side = 'enemy') {
  const pawnColor = side === 'enemy' ? enemyOf(color) : color;
  // Un peón central sigue definiendo la estructura aunque haya avanzado una
  // casilla más (e4-e5, d4-d5, etc.). Mirar solo e4/d4 ocultaba precisamente
  // las transformaciones que el libro considera críticas.
  return CENTRAL_FILES.filter((file) => [3, 4, 5, 6].some((rank) => hasPiece(chess, `${file}${rank}`, pawnColor, 'p')));
}

function playedOrAdvanced(chess, color, uci) {
  const to = uci.slice(2, 4);
  const file = to[0];
  const expectedRank = Number(to[1]);
  for (let rank = 1; rank <= 8; rank++) {
    const piece = chess.get(`${file}${rank}`);
    if (piece?.color !== color || piece.type !== 'p') continue;
    if (color === 'w' && rank >= expectedRank) return true;
    if (color === 'b' && rank <= expectedRank) return true;
  }
  return chess.history({ verbose: true }).some((move) => move.color === color && moveToUci(move) === uci);
}

function coreItemComplete(chess, color, uci, key) {
  const to = uci.slice(2, 4);
  if (['gPawn', 'dPawn', 'ePawn', 'bPawn', 'hPawn', 'aPawn'].includes(key)) return playedOrAdvanced(chess, color, uci);
  const expectedType = key.includes('Bishop') ? 'b' : 'n';
  return hasPiece(chess, to, color, expectedType);
}

export function hippoSetupStatus(chess, color) {
  const primary = CORE[color];
  const completed = primary.filter(([uci, key]) => coreItemComplete(chess, color, uci, key));
  const missing = primary.filter(([uci, key]) => !coreItemComplete(chess, color, uci, key));
  const bishops = ['kingBishop', 'queenBishop'].filter((key) => completed.some(([, item]) => item === key)).length;
  const knights = ['queenKnight', 'kingKnight'].filter((key) => completed.some(([, item]) => item === key)).length;
  const pawnPairs = [
    ['aPawn', 'bPawn'], ['dPawn', 'ePawn'], ['gPawn', 'hPawn'],
  ].filter((pair) => pair.every((key) => completed.some(([, item]) => item === key))).length;
  return {
    completed: completed.length,
    total: primary.length,
    percent: Math.round((completed.length / primary.length) * 100),
    missing: missing.map(([uci, key]) => ({ uci, key, ...MOVE_MEANINGS[key] })),
    completedKeys: completed.map(([, key]) => key),
    bishops,
    knights,
    pawnPairs,
    full: completed.length === primary.length && bishops === 2 && knights === 2,
    semi: completed.length >= 3 && !(completed.length === primary.length && bishops === 2 && knights === 2),
  };
}

function detectTransformation(chess, color) {
  const enemy = enemyOf(color);
  const contactRank = ownCentralRank(color);
  const ownRank = contactRank;
  const ownD = hasPiece(chess, `d${ownRank}`, color, 'p');
  const ownE = hasPiece(chess, `e${ownRank}`, color, 'p');
  const ownC = hasPiece(chess, `c${ownRank}`, color, 'p');
  const enemyD = hasPiece(chess, `d${contactRank}`, enemy, 'p');
  const enemyE = hasPiece(chess, `e${contactRank}`, enemy, 'p');
  if (enemyE && ownD) return HIPPO_CENTER_TYPES.french;
  if (enemyD && ownE) return HIPPO_CENTER_TYPES.kingsIndian;
  if (ownC && (enemyD || enemyE)) {
    const ownHomeE = color === 'w' ? 'e3' : 'e6';
    if (enemyD && hasPiece(chess, ownHomeE, color, 'p')) return HIPPO_CENTER_TYPES.benoni;
    return HIPPO_CENTER_TYPES.sicilian;
  }
  if (!fileHasPawn(chess, 'e')) return HIPPO_CENTER_TYPES.openE;
  if (!fileHasPawn(chess, 'd')) return HIPPO_CENTER_TYPES.openD;
  return null;
}

export function classifyHippoCenter(chess, color, schemeId = 'hippo') {
  const defendedColor = schemeId === 'counterHippo' ? enemyOf(color) : color;
  const attackerColor = enemyOf(defendedColor);
  const enemyFiles = centralPawnFiles(chess, defendedColor, 'enemy');
  const ownFiles = centralPawnFiles(chess, defendedColor, 'own');
  const transformation = detectTransformation(chess, defendedColor);
  const setup = hippoSetupStatus(chess, defendedColor);
  const cAux = defendedColor === 'w' ? 'c3' : 'c6';
  const fAux = defendedColor === 'w' ? 'f3' : 'f6';
  if (setup.completed >= 7 && hasPiece(chess, cAux, defendedColor, 'p') && hasPiece(chess, fAux, defendedColor, 'p')) {
    return { ...HIPPO_CENTER_TYPES.superHippo, enemyFiles, ownFiles, defendedColor, attackerColor };
  }
  if (transformation) return { ...transformation, enemyFiles, ownFiles, defendedColor, attackerColor };
  if (enemyFiles.includes('c') && enemyFiles.includes('d') && enemyFiles.includes('e') && enemyFiles.includes('f')) {
    return { ...HIPPO_CENTER_TYPES.fourPawns, enemyFiles, ownFiles, defendedColor, attackerColor };
  }
  if (enemyFiles.includes('d') && enemyFiles.includes('e') && enemyFiles.includes('f')) {
    return { ...HIPPO_CENTER_TYPES.austrian, enemyFiles, ownFiles, defendedColor, attackerColor };
  }
  if (enemyFiles.includes('c') && enemyFiles.includes('d') && enemyFiles.includes('e')) {
    return { ...HIPPO_CENTER_TYPES.queensThree, enemyFiles, ownFiles, defendedColor, attackerColor };
  }
  if (enemyFiles.includes('d') && enemyFiles.includes('e')) {
    return { ...HIPPO_CENTER_TYPES.kingsTwo, enemyFiles, ownFiles, defendedColor, attackerColor };
  }
  if (enemyFiles.includes('c') && enemyFiles.includes('d')) {
    return { ...HIPPO_CENTER_TYPES.queensTwo, enemyFiles, ownFiles, defendedColor, attackerColor };
  }
  if (enemyFiles.length === 1) {
    return { ...HIPPO_CENTER_TYPES.onePawn, enemyFiles, ownFiles, defendedColor, attackerColor };
  }
  return { ...HIPPO_CENTER_TYPES.fluid, enemyFiles, ownFiles, defendedColor, attackerColor };
}

function legalSet(chess) {
  return new Set(chess.moves({ verbose: true }).map(moveToUci));
}

function addPreference(target, legal, uci, plan, weight, detail, reference, ruleId) {
  if (!legal.has(uci)) return;
  const item = { uci, plan, weight, detail, reference, ruleId };
  const existing = target.find((candidate) => candidate.uci === uci);
  if (!existing) target.push(item);
  else if (weight > existing.weight) Object.assign(existing, item);
}

function corePreferences(chess, color, center, setup, target, legal) {
  const urgent = ['austrian', 'fourPawns', 'queensThree'].includes(center.id);
  const order = hasPiece(chess, color === 'w' ? 'b3' : 'b6', color, 'p') || hasPiece(chess, color === 'w' ? 'b2' : 'b7', color, 'b')
    ? ALTERNATE_CORE[color]
    : CORE[color];
  order.forEach(([uci, key], index) => {
    if (coreItemComplete(chess, color, uci, key)) return;
    const meaning = MOVE_MEANINGS[key];
    const slowWingMove = key === 'hPawn' || key === 'aPawn' || key === 'queenBishop';
    let weight = 190 - index * 5;
    if (urgent && slowWingMove) weight -= 95;
    if (center.id === 'onePawn' || center.id === 'fluid') weight += 22;
    if (key === 'hPawn' || key === 'aPawn') weight += setup.bishops === 2 ? 8 : -10;
    addPreference(target, legal, uci, meaning.plan, weight, meaning.detail, meaning.reference, `core-${key}`);
  });
}

function hippoBreakPreferences(chess, color, center, setup, target, legal) {
  const w = color === 'w';
  const moves = {
    f: w ? 'f2f4' : 'f7f5', c: w ? 'c2c4' : 'c7c5',
    e: w ? 'e3e4' : 'e6e5', d: w ? 'd3d4' : 'd6d5',
    g: w ? 'g3g4' : 'g6g5', b: w ? 'b3b4' : 'b6b5',
  };
  const enemy = enemyOf(color);
  const enemyCentralRanks = enemy === 'w' ? ['4', '5'] : ['5', '4'];
  const enemyE = enemyCentralRanks.some((rank) => hasPiece(chess, `e${rank}`, enemy, 'p'));
  const enemyD = enemyCentralRanks.some((rank) => hasPiece(chess, `d${rank}`, enemy, 'p'));
  if (enemyE) addPreference(target, legal, moves.d, 'cerrar el avance e con una transformación francesa', 292, 'La respuesta de cierre reduce el ataque rival y conduce a planes conocidos de cadena de peones.', 'Caps. 6, 11-12 · centro Francés', 'close-french');
  if (enemyD) addPreference(target, legal, moves.e, 'cerrar el avance d con una transformación india de rey', 292, 'La respuesta fija el centro y prepara el contragolpe f, siempre que las piezas puedan participar.', 'Caps. 6, 11-12 · centro Indio de Rey', 'close-kid');

  const developedEnough = setup.bishops + setup.knights >= 3 || chess.history().length >= 14;
  const activeBase = developedEnough ? 205 : 118;
  if (['austrian', 'fourPawns'].includes(center.id)) {
    addPreference(target, legal, moves.f, 'golpear el centro extendido con la ruptura f', 286, 'El Ataque Austríaco obliga a desviarse: la prioridad es impedir f5 del rival o atacar e4 antes de continuar el esquema.', 'Caps. 7-8 y 14 · antídotos al Austríaco', 'anti-austrian-f');
    addPreference(target, legal, moves.c, 'golpear el centro antes de que el rival complete su preparación', 278, 'La ruptura c es un semi-Hippo activo contra un centro amplio y puede transformar la posición en Siciliana.', 'Caps. 8, 12 y 14 · reacción ...c5', 'anti-austrian-c');
  } else if (center.id === 'queensThree') {
    addPreference(target, legal, moves.c, 'atacar la base del centro de dama extendido', 264, 'El centro c-d-e exige acción contra una base o una transformación rápida; completar el esquema mecánicamente es demasiado lento.', 'Caps. 11-12 y 14 · centro de dama extendido', 'attack-queen-center');
    addPreference(target, legal, moves.f, 'presionar e4 desde el flanco de rey', 248, 'La ruptura f cuestiona el peón delantero y evita que el espacio rival quede sin oposición.', 'Caps. 12 y 14 · centro c4-d4-e4', 'attack-e4');
  } else {
    addPreference(target, legal, moves.f, 'ruptura activa principal del Hipopótamo', activeBase + (center.enemyFiles.includes('e') ? 25 : 0), 'Debe elegirse cuando abre líneas para piezas ya coordinadas, no solo porque sea temática.', 'Cap. 6 · seis rupturas temáticas', 'break-f');
    addPreference(target, legal, moves.c, 'ruptura activa sobre el centro y el flanco de dama', activeBase + (center.enemyFiles.includes('d') ? 20 : 0), 'Puede transformar la posición en Siciliana y discutir la base del centro.', 'Cap. 6 · ruptura ...c5', 'break-c');
  }

  const hReady = setup.completedKeys.includes('hPawn');
  const aReady = setup.completedKeys.includes('aPawn');
  addPreference(target, legal, moves.g, 'expansión g apoyada por el peón h', hReady && developedEnough ? 214 : 105, 'La expansión puede ganar espacio o iniciar un ataque, pero abre líneas y exige que h6/h3 controle la casilla de entrada.', 'Caps. 6 y 12 · ataque h6-g5', 'break-g');
  addPreference(target, legal, moves.b, 'expansión b apoyada por el peón a', aReady && developedEnough ? 208 : 102, 'Gana tiempos sobre piezas adelantadas y puede iniciar contrajuego en el flanco de dama.', 'Caps. 6 y 12 · ataque a6-b5', 'break-b');
}

function counterPreferences(chess, color, center, enemySetup, target, legal) {
  const w = color === 'w';
  const centerMoves = {
    e: w ? 'e2e4' : 'e7e5', d: w ? 'd2d4' : 'd7d5', c: w ? 'c2c4' : 'c7c5', f: w ? 'f2f4' : 'f7f5',
    fPush: w ? 'f4f5' : 'f5f4', cPush: w ? 'c4c5' : 'c5c4', ePush: w ? 'e4e5' : 'e5e4', dPush: w ? 'd4d5' : 'd5d4',
    h: w ? 'h2h4' : 'h7h5', hPush: w ? 'h4h5' : 'h5h4', a: w ? 'a2a4' : 'a7a5', aPush: w ? 'a4a5' : 'a5a4',
    knight: w ? 'b1c3' : 'b8c6', bishop: w ? 'c1e3' : 'c8e6', queen: w ? 'd1d2' : 'd8d7', castle: w ? 'e1c1' : 'e8c8',
  };
  const files = new Set(centralPawnFiles(chess, color, 'own'));
  const build = [
    [centerMoves.e, 'ocupar e y limitar la libertad central de Zero', 228, 'Centro de rey'],
    [centerMoves.d, 'ocupar d y construir una base central estable', 232, 'Centro de rey'],
    [centerMoves.c, 'añadir el tercer peón del centro de dama', files.has('d') && files.has('e') ? 242 : 205, 'Centro de dama extendido'],
    [centerMoves.f, 'construir el Ataque Austríaco y disputar f5', files.has('d') && files.has('e') ? 252 : 204, 'Ataque Austríaco'],
    [centerMoves.knight, 'desarrollar sosteniendo e4/d5 y evitando un centro sin piezas', 220, 'Desarrollo del centro amplio'],
    [centerMoves.bishop, 'desarrollar con control de las rupturas y preparar el rey', 214, 'Ataque Austríaco / cuatro peones'],
    [centerMoves.queen, 'coordinar el desarrollo y el posible enroque largo', 184, 'Coordinación anti-Hippo'],
  ];
  build.forEach(([uci, plan, weight, theme]) => addPreference(target, legal, uci, plan, weight, 'Omega convierte el espacio en control solo si sus piezas sostienen el centro y el rey conserva una ruta segura.', `Caps. 11-14 · ${theme}`, `counter-build-${uci}`));

  const hippoSignals = enemySetup.completed;
  if (hippoSignals >= 2) {
    addPreference(target, legal, centerMoves.h, 'crear un punto de contacto contra el fianchetto de rey', 258, 'h4 limita la expansión g del Hipopótamo y puede fijar una debilidad, pero no debe sustituir el desarrollo.', 'Caps. 2, 12 y 15 · ataques tempranos h', 'counter-h');
    addPreference(target, legal, centerMoves.a, 'restringir la expansión b y asegurar la casilla c4/c5', 238, 'a4/a5 reduce el contrajuego ...b5 y conserva espacio en el flanco de dama.', 'Caps. 9 y 12 · restricción de ...b5', 'counter-a');
  }
  if (enemySetup.completedKeys.includes('gPawn') || enemySetup.completedKeys.includes('kingBishop')) {
    addPreference(target, legal, centerMoves.hPush, 'fijar el flanco de rey antes de la ruptura g', 270, 'El avance obliga a Zero a decidir la estructura y dificulta que use g5 en condiciones ideales.', 'Caps. 7-8 y 12 · lucha contra el fianchetto', 'counter-h-push');
  }
  if (enemySetup.completedKeys.includes('dPawn') && enemySetup.completedKeys.includes('ePawn')) {
    addPreference(target, legal, centerMoves.fPush, 'jugar f5 antes de que Zero ejecute su ruptura', 278, 'El avance es crítico en el Austríaco: debe estar respaldado por e4 y por piezas que respondan a capturas o bloqueos.', 'Caps. 7-8 y 14 · problema f4-f5', 'counter-f-push');
    addPreference(target, legal, centerMoves.cPush, 'ganar espacio y restringir la ruptura c de Zero', 258, 'c5 puede fijar el flanco de dama, aunque debe calcularse la transformación Benoni o la apertura de la columna.', 'Caps. 11-14 · centro de dama', 'counter-c-push');
  }
  const developed = [centerMoves.knight.slice(2, 4), centerMoves.bishop.slice(2, 4)].filter((sq) => hasPiece(chess, sq, color)).length;
  if (developed >= 2) {
    addPreference(target, legal, centerMoves.ePush, 'cerrar o ganar espacio en e con piezas preparadas', 222, 'El avance debe evaluarse según la respuesta de cierre d5 del Hipopótamo.', 'Caps. 6 y 12 · transformación francesa', 'counter-e-push');
    addPreference(target, legal, centerMoves.dPush, 'cerrar o ganar espacio en d con piezas preparadas', 218, 'El avance debe evaluarse según la respuesta e5 y el futuro contragolpe f5.', 'Caps. 6 y 12 · transformación india de rey', 'counter-d-push');
  }
  addPreference(target, legal, centerMoves.castle, 'poner el rey a salvo antes de abrir líneas', 178, 'El centro amplio no debe abrirse mientras el rey siga expuesto; el enroque largo es una opción, no una obligación.', 'Caps. 6, 12 y 15 · seguridad antes de abrir', 'counter-castle');
}

export function bookSchemePreferences(chess, schemeId, color) {
  if (!['hippo', 'counterHippo'].includes(schemeId)) return [];
  const legal = legalSet(chess);
  const target = [];
  const center = classifyHippoCenter(chess, color, schemeId);
  if (schemeId === 'hippo') {
    const setup = hippoSetupStatus(chess, color);
    corePreferences(chess, color, center, setup, target, legal);
    hippoBreakPreferences(chess, color, center, setup, target, legal);
  } else {
    const enemySetup = hippoSetupStatus(chess, enemyOf(color));
    counterPreferences(chess, color, center, enemySetup, target, legal);
  }
  return target;
}

function countPawnOnlyOpening(chess, color) {
  const moves = chess.history({ verbose: true }).filter((move) => move.color === color).slice(0, 8);
  if (!moves.length) return 0;
  return moves.filter((move) => move.piece === 'p').length;
}

function kingSquare(chess, color) {
  for (const row of chess.board()) for (const piece of row) {
    if (piece?.color === color && piece.type === 'k') return piece.square;
  }
  return '';
}

function developmentCount(chess, color) {
  const targets = color === 'w' ? ['c3', 'd2', 'e2', 'f3', 'b2', 'g2', 'e3'] : ['c6', 'd7', 'e7', 'f6', 'b7', 'g7', 'e6'];
  return targets.filter((square) => {
    const piece = chess.get(square);
    return piece?.color === color && ['n', 'b'].includes(piece.type);
  }).length;
}

function vulnerableAdvancedPawns(chess, ownerColor, attackerColor) {
  const targets = [];
  for (const row of chess.board()) for (const piece of row) {
    if (piece?.color !== ownerColor || piece.type !== 'p') continue;
    const rank = Number(piece.square[1]);
    const advanced = ownerColor === 'w' ? rank >= 4 : rank <= 5;
    if (!advanced) continue;
    const attackers = chess.attackers(piece.square, attackerColor);
    const defenders = chess.attackers(piece.square, ownerColor);
    if (attackers.length && !defenders.length) targets.push({ square: piece.square, attackers });
  }
  return targets;
}

function wingPressure(chess, attackingColor, files) {
  let count = 0;
  for (const file of files) for (let rank = 2; rank <= 7; rank++) {
    const piece = chess.get(`${file}${rank}`);
    if (piece?.color !== attackingColor || piece.type !== 'p') continue;
    const advanced = attackingColor === 'w' ? rank >= 4 : rank <= 5;
    if (advanced) count++;
  }
  return count;
}

function thematicBreaksPlayed(chess, color) {
  const exact = color === 'w'
    ? new Set(['f2f4', 'c2c4', 'g3g4', 'b3b4'])
    : new Set(['f7f5', 'c7c5', 'g6g5', 'b6b5']);
  return chess.history({ verbose: true })
    .filter((move) => move.color === color && exact.has(moveToUci(move)))
    .map(moveToUci);
}

function kingSafetyAdvice(chess, color, schemeId, center) {
  const square = kingSquare(chess, color);
  if (['g1', 'g8'].includes(square)) return 'El rey ya está enrocado corto: las rupturas del flanco de rey deben calcularse como aperturas alrededor de tu propio rey.';
  if (['c1', 'c8'].includes(square)) return 'El rey ya está enrocado largo: vigila a/b/c y busca el contrajuego principal lejos de su refugio.';
  if (!['e1', 'e8'].includes(square)) return 'El rey eligió una ruta manual; comprueba cada jaque y la conexión de las torres antes de abrir una columna.';

  const enemy = enemyOf(color);
  const kingWing = wingPressure(chess, enemy, ['f', 'g', 'h']);
  const queenWing = wingPressure(chess, enemy, ['a', 'b', 'c']);
  if (schemeId === 'counterHippo') {
    if (center.id === 'austrian' || center.id === 'fourPawns' || center.id === 'queensThree') {
      return 'Omega posee un centro amplio: antes de abrirlo, debe completar una ruta de seguridad —normalmente enroque largo si a/b/c siguen cerradas— y comprobar la respuesta de Zero.';
    }
    return 'Omega aún no debe comprometer el rey: primero define dónde abrirá el centro y qué flanco conservará cerrado.';
  }
  if (kingWing >= queenWing + 2) return 'La presión rival está concentrada en el flanco de rey: conserva el rey en e8/e1 o valora el enroque largo; el enroque corto sería una decisión, no una rutina.';
  if (queenWing >= kingWing + 2) return 'La presión rival está concentrada en el flanco de dama: conserva la opción de enroque corto o de rey central y evita caminar hacia el ataque.';
  if (kingWing && queenWing) return 'Hay peones avanzados en ambos flancos: el libro permite mantener el rey en el centro o enrocar a mano; elige solo después de calcular qué columna se abrirá.';
  return 'Todavía no existe un flanco claramente seguro. Mantén abiertas las cuatro soluciones del libro: enroque corto, largo, maniobra previa de caballo o rey central/a mano.';
}

function structuralChecklist(chess, color, schemeId, center, setup, best, kingPlan) {
  const active = thematicBreaksPlayed(chess, schemeId === 'counterHippo' ? enemyOf(color) : color);
  const list = [
    `Centro: ${center.name} (${center.evidence}).`,
    `Formación: ${setup.completed}/${setup.total} hitos; alfiles ${setup.bishops}/2, caballos ${setup.knights}/2.`,
    kingPlan,
  ];
  if (best) list.push(`Prioridad legal: ${best.uci} — ${best.plan}.`);
  if (schemeId === 'hippo') {
    list.push(active.length > 1
      ? `Ya se activaron ${active.length} rupturas (${active.join(', ')}): no abras un segundo frente si las piezas no pueden sostenerlo.`
      : 'Conserva varias rupturas disponibles, pero ejecuta solo una o dos relacionadas con el defecto real del rival.');
  } else {
    list.push('El espacio de Omega debe estar respaldado por desarrollo; cada avance debe restringir una ruptura concreta de Zero.');
  }
  return list;
}

export function analyzeHippoPosition(chess, color, schemeId = 'hippo') {
  const identity = schemeId === 'counterHippo' ? 'Omega' : 'Zero';
  const defendedColor = schemeId === 'counterHippo' ? enemyOf(color) : color;
  const center = classifyHippoCenter(chess, color, schemeId);
  const setup = hippoSetupStatus(chess, defendedColor);
  const preferences = bookSchemePreferences(chess, schemeId, color).sort((a, b) => b.weight - a.weight);
  const ownDevelopment = developmentCount(chess, color);
  const ownKing = kingSquare(chess, color);
  const warnings = [];
  const vulnerableEnemyPawns = vulnerableAdvancedPawns(chess, enemyOf(color), color);
  const vulnerableOwnPawns = vulnerableAdvancedPawns(chess, color, enemyOf(color));

  if (schemeId === 'hippo') {
    if (['austrian', 'fourPawns', 'queensThree'].includes(center.id) && preferences.some((item) => item.ruleId.startsWith('core-'))) {
      warnings.push('El centro rival ya es crítico: continuar el piloto automático puede ser más lento que la ruptura necesaria. Esta es una posición de semi-Hipopótamo.');
    }
    if (countPawnOnlyOpening(chess, color) >= 5 && setup.knights + setup.bishops < 2) {
      warnings.push('Se han movido demasiados peones sin desarrollar piezas; el libro identifica esta construcción mecánica como un error típico.');
    }
    if (setup.full) warnings.push('La formación básica está prácticamente completa: desde aquí la decisión debe surgir del defecto concreto del rival, no de otra jugada de espera.');
    if (setup.completed >= 7 && ['e1', 'e8'].includes(ownKing)) warnings.push('El rey puede permanecer en el centro, enrocar a cualquiera de los lados o caminar; no debe enrocarse automáticamente solo porque sea legal.');
    if (vulnerableEnemyPawns.length) warnings.push(`Objetivo táctico concreto: ${vulnerableEnemyPawns.map((item) => item.square).join(', ')} ${vulnerableEnemyPawns.length === 1 ? 'está avanzado y sin defensor' : 'están avanzados y sin defensor'}. Antes de maniobrar, calcula capturas, clavadas o tenedores sobre esos peones.`);
  } else {
    if (center.id === 'onePawn' || center.id === 'fluid') warnings.push('Omega todavía no ha impuesto un centro crítico. Zero puede completar el Hipopótamo con muy poca fricción.');
    if (['austrian', 'fourPawns', 'queensThree'].includes(center.id) && ownDevelopment < 2) warnings.push('El centro ocupa espacio pero carece de suficientes piezas detrás; abrirlo ahora puede convertir los peones en objetivos.');
    if (setup.full) warnings.push('Zero ya completó casi toda la formación: Omega debe crear una transformación concreta, no limitarse a acumular espacio.');
    if (vulnerableOwnPawns.length) warnings.push(`Debilidad táctica de Omega: ${vulnerableOwnPawns.map((item) => item.square).join(', ')} ${vulnerableOwnPawns.length === 1 ? 'carece' : 'carecen'} de defensor y ya ${vulnerableOwnPawns.length === 1 ? 'es atacado' : 'son atacados'}. El libro muestra que un centro amplio puede colapsar por un tenedor o una captura intermedia.`);
  }

  const breaksPlayed = thematicBreaksPlayed(chess, schemeId === 'counterHippo' ? defendedColor : color);
  if (schemeId === 'hippo' && breaksPlayed.length >= 2 && setup.bishops + setup.knights < 3) {
    warnings.push(`Se activaron varias rupturas (${breaksPlayed.join(', ')}) con pocas piezas listas; el libro recomienda concentrarse en una o dos, no abrir todo el tablero.`);
  }

  const best = preferences[0] || null;
  const phase = chess.history().length < 10 ? 'construcción'
    : ['austrian', 'fourPawns', 'queensThree', 'french', 'kingsIndian', 'sicilian', 'benoni', 'openE', 'openD'].includes(center.id) ? 'transformación'
      : setup.full ? 'elección de ruptura' : 'adaptación';
  const setupName = setup.full ? 'Hipopótamo completo' : setup.semi ? 'semi-Hipopótamo en construcción' : 'estructura inicial';
  const plan = schemeId === 'hippo' ? center.zeroPlan : center.omegaPlan;
  const kingPlan = kingSafetyAdvice(chess, color, schemeId, center);
  const checklist = structuralChecklist(chess, color, schemeId, center, setup, best, kingPlan);
  const missingNames = setup.missing.slice(0, 4).map((item) => item.uci.slice(2, 4)).join(', ');

  return {
    identity,
    schemeId,
    phase,
    center,
    setup,
    setupName,
    plan,
    kingPlan,
    checklist,
    breaksPlayed,
    tacticalTargets: schemeId === 'hippo' ? vulnerableEnemyPawns : vulnerableOwnPawns,
    warnings,
    bestBookMove: best,
    source: `${HIPPO_BOOK.author}, ${HIPPO_BOOK.title} · ${center.reference}`,
    summary: schemeId === 'hippo'
      ? `${center.name}. Zero tiene ${setup.completed}/${setup.total} hitos de la formación; ${missingNames ? `faltan ${missingNames}` : 'la estructura básica está completa'}. ${plan}`
      : `${center.name}. El Hipopótamo rival muestra ${setup.completed}/${setup.total} hitos. ${plan}`,
  };
}

function moveMeaningByUci(color, uci) {
  const primary = [...CORE[color], ...ALTERNATE_CORE[color]];
  const found = primary.find(([candidate]) => candidate === uci);
  return found ? MOVE_MEANINGS[found[1]] : null;
}

export function assessBookMove(chess, uci, schemeId, color) {
  if (!['hippo', 'counterHippo'].includes(schemeId)) return null;
  const move = chess.moves({ verbose: true }).find((candidate) => moveToUci(candidate) === uci);
  if (!move) return null;
  const analysis = analyzeHippoPosition(chess, color, schemeId);
  const preference = bookSchemePreferences(chess, schemeId, color).find((item) => item.uci === uci);
  const coreMeaning = schemeId === 'hippo' ? moveMeaningByUci(color, uci) : null;
  const detail = preference?.detail || coreMeaning?.detail || genericMoveDetail(move, schemeId, analysis);
  const plan = preference?.plan || coreMeaning?.plan || genericMovePlan(move, schemeId);
  const reference = preference?.reference || coreMeaning?.reference || analysis.center.reference;
  const warning = moveWarning(chess, move, schemeId, color, analysis, preference);
  return {
    plan,
    detail,
    reference,
    warning,
    centerName: analysis.center.name,
    setupName: analysis.setupName,
    weight: preference?.weight || 0,
    ruleId: preference?.ruleId || 'book-generic',
  };
}

function genericMovePlan(move, schemeId) {
  if (move.san.includes('#')) return 'mate forzado';
  if (move.san.includes('+')) return 'acción forzante sobre el rey';
  if (move.captured) return schemeId === 'hippo' ? 'eliminar un atacante o transformar la estructura' : 'abrir líneas contra la formación';
  if (move.san.startsWith('O-O')) return 'decidir la seguridad del rey';
  if (move.piece === 'p' && CENTRAL_FILES.includes(move.from[0])) return 'modificar la estructura central';
  return 'mejorar la coordinación antes de la transformación';
}

function genericMoveDetail(move, schemeId, analysis) {
  if (move.san.includes('+')) return 'La jugada obliga una respuesta concreta y debe compararse con la continuidad del plan estructural.';
  if (move.captured) return `La captura cambia el balance y puede llevar la posición desde ${analysis.center.name} a una estructura distinta.`;
  if (move.san.startsWith('O-O')) return schemeId === 'hippo'
    ? 'El libro presenta cuatro métodos de seguridad del rey; el enroque es correcto solo si coincide con el flanco donde se jugará.'
    : 'Poner el rey a salvo permite que el centro amplio se abra sin exponerlo.';
  return schemeId === 'hippo'
    ? 'La jugada debe conservar al menos dos rupturas posibles y reducir un defecto concreto de la posición.'
    : 'La jugada debe convertir el espacio en una amenaza y limitar una ruptura específica de Zero.';
}

function moveWarning(chess, move, schemeId, color, analysis, preference) {
  if (preference?.weight >= 230) return '';
  const setup = schemeId === 'hippo' ? analysis.setup : hippoSetupStatus(chess, enemyOf(color));
  if (schemeId === 'hippo' && move.piece === 'p' && ['c', 'f', 'g', 'b'].includes(move.from[0]) && setup.bishops + setup.knights < 3) {
    return 'La ruptura puede ser prematura: el libro exige que las piezas estén listas para aprovechar las líneas abiertas.';
  }
  if (schemeId === 'hippo' && move.san.startsWith('O-O') && analysis.center.id === 'fluid') {
    return 'Enrocar ahora revela el flanco del rey antes de conocer dónde atacará el rival.';
  }
  if (schemeId === 'counterHippo' && move.piece === 'p' && CENTRAL_FILES.includes(move.from[0]) && developmentCount(chess, color) < 2) {
    return 'El avance aumenta el espacio, pero puede dejar un centro grande sin suficientes piezas de apoyo.';
  }
  return '';
}

export function bookReviewForMove(chess, playedUci, bestUci, schemeId, color) {
  const analysis = analyzeHippoPosition(chess, color, schemeId);
  const played = assessBookMove(chess, playedUci, schemeId, color);
  const best = bestUci ? assessBookMove(chess, bestUci, schemeId, color) : null;
  const identity = schemeId === 'counterHippo' ? 'Omega' : 'Zero';
  const playedText = played
    ? `${played.plan}. ${played.detail}${played.warning ? ` Advertencia: ${played.warning}` : ''}`
    : 'La jugada no activa una regla temática reconocible y debe justificarse exclusivamente por la variante concreta.';
  const contrast = best && bestUci !== playedUci
    ? `La alternativa ${bestUci} aplica “${best.plan}”: ${best.detail}${best.warning ? ` Advertencia de esa alternativa: ${best.warning}` : ''}`
    : `La jugada coincide con la prioridad principal de ${identity} en esta estructura: ${analysis.bestBookMove?.plan || analysis.plan}.`;
  return {
    center: analysis.center.name,
    phase: analysis.phase,
    playedText,
    contrast,
    source: played?.reference || analysis.center.reference,
    warnings: analysis.warnings,
  };
}

export const HIPPO_CORE_TARGETS = CORE;

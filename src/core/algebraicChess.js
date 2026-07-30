import { Chess } from '../vendor/chess.js';

const EPS = 1e-10;
const FILES = 'abcdefgh';
const PIECE_VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 4 });

const zeroMatrix = (n = 8) => Array.from({ length: n }, () => Array(n).fill(0));
const cloneMatrix = (matrix) => matrix.map((row) => [...row]);
const isMatrix = (value) => Array.isArray(value) && Array.isArray(value[0]);
const isEntryMatrix = (value) => Boolean(value && value.__entryMatrix && isMatrix(value.matrix));
const unwrapEntry = (value) => isEntryMatrix(value) ? value.matrix : value;
const entryMatrix = (matrix) => ({ __entryMatrix: true, matrix });

export function identityMatrix(n = 8) {
  const matrix = zeroMatrix(n);
  for (let i = 0; i < n; i += 1) matrix[i][i] = 1;
  return matrix;
}

export function matrixAdd(left, right) {
  if (typeof left === 'number' && typeof right === 'number') return left + right;
  if (isEntryMatrix(left) || isEntryMatrix(right)) {
    const a = isEntryMatrix(left) ? left.matrix : left;
    const b = isEntryMatrix(right) ? right.matrix : right;
    if (typeof a === 'number' && isMatrix(b)) return entryMatrix(b.map((row) => row.map((value) => a + value)));
    if (isMatrix(a) && typeof b === 'number') return entryMatrix(a.map((row) => row.map((value) => value + b)));
    if (isMatrix(a) && isMatrix(b)) return entryMatrix(a.map((row, i) => row.map((value, j) => value + b[i][j])));
  }
  if (isMatrix(left) && isMatrix(right)) return left.map((row, i) => row.map((value, j) => value + right[i][j]));
  if (isMatrix(left) && typeof right === 'number') {
    const result = cloneMatrix(left);
    for (let i = 0; i < result.length; i += 1) result[i][i] += right;
    return result;
  }
  if (typeof left === 'number' && isMatrix(right)) return matrixAdd(right, left);
  throw new Error('Suma incompatible.');
}

export function matrixScale(matrix, scalar) {
  const raw = unwrapEntry(matrix);
  const result = raw.map((row) => row.map((value) => value * scalar));
  return isEntryMatrix(matrix) ? entryMatrix(result) : result;
}

export function matrixSubtract(left, right) {
  return matrixAdd(left, typeof right === 'number' ? -right : matrixScale(right, -1));
}

export function matrixMultiply(left, right) {
  if (typeof left === 'number' && typeof right === 'number') return left * right;
  if (typeof left === 'number' && (isMatrix(right) || isEntryMatrix(right))) return matrixScale(right, left);
  if ((isMatrix(left) || isEntryMatrix(left)) && typeof right === 'number') return matrixScale(left, right);
  if (isEntryMatrix(left) || isEntryMatrix(right)) {
    const a = unwrapEntry(left); const b = unwrapEntry(right);
    if (!isMatrix(a) || !isMatrix(b)) throw new Error('Producto entrada a entrada incompatible.');
    return entryMatrix(a.map((row, i) => row.map((value, j) => value * b[i][j])));
  }
  if (isMatrix(left) && isMatrix(right)) {
    const rows = left.length, cols = right[0].length, inner = right.length;
    const result = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i += 1) for (let k = 0; k < inner; k += 1) {
      const value = left[i][k];
      if (Math.abs(value) < EPS) continue;
      for (let j = 0; j < cols; j += 1) result[i][j] += value * right[k][j];
    }
    return result;
  }
  throw new Error('Producto incompatible.');
}

export function matrixTranspose(matrix) {
  const raw = unwrapEntry(matrix);
  return raw[0].map((_, column) => raw.map((row) => row[column]));
}

export function matrixPower(matrix, exponent) {
  if (isEntryMatrix(matrix)) return entryMatrix(matrix.matrix.map((row) => row.map((value) => value ** exponent)));
  if (typeof matrix === 'number') return matrix ** exponent;
  if (!Number.isInteger(exponent)) throw new Error('Las potencias matriciales deben ser enteras.');
  if (exponent === -1) return matrixInverse(matrix);
  if (exponent < 0) return matrixPower(matrixInverse(matrix), -exponent);
  let result = identityMatrix(matrix.length), base = cloneMatrix(matrix), power = exponent;
  while (power > 0) {
    if (power % 2 === 1) result = matrixMultiply(result, base);
    power = Math.floor(power / 2);
    if (power) base = matrixMultiply(base, base);
  }
  return result;
}

export function determinant(matrix) {
  const a = cloneMatrix(unwrapEntry(matrix));
  let det = 1;
  for (let column = 0; column < a.length; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < a.length; row += 1) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) < EPS) return 0;
    if (pivot !== column) { [a[pivot], a[column]] = [a[column], a[pivot]]; det *= -1; }
    const pivotValue = a[column][column]; det *= pivotValue;
    for (let row = column + 1; row < a.length; row += 1) {
      const factor = a[row][column] / pivotValue;
      for (let j = column + 1; j < a.length; j += 1) a[row][j] -= factor * a[column][j];
    }
  }
  return Math.abs(det) < EPS ? 0 : det;
}

export function matrixRank(matrix, tolerance = 1e-9) {
  const a = cloneMatrix(unwrapEntry(matrix));
  const rows = a.length, cols = a[0].length;
  let rank = 0, column = 0;
  while (rank < rows && column < cols) {
    let pivot = rank;
    for (let row = rank + 1; row < rows; row += 1) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) <= tolerance) { column += 1; continue; }
    [a[pivot], a[rank]] = [a[rank], a[pivot]];
    const value = a[rank][column];
    for (let j = column; j < cols; j += 1) a[rank][j] /= value;
    for (let row = 0; row < rows; row += 1) if (row !== rank) {
      const factor = a[row][column];
      if (Math.abs(factor) <= tolerance) continue;
      for (let j = column; j < cols; j += 1) a[row][j] -= factor * a[rank][j];
    }
    rank += 1; column += 1;
  }
  return rank;
}

export function matrixInverse(matrix) {
  const raw = unwrapEntry(matrix), n = raw.length;
  const a = raw.map((row, i) => [...row, ...identityMatrix(n)[i]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) < EPS) throw new Error('La matriz no es invertible.');
    [a[pivot], a[column]] = [a[column], a[pivot]];
    const value = a[column][column];
    for (let j = 0; j < 2 * n; j += 1) a[column][j] /= value;
    for (let row = 0; row < n; row += 1) if (row !== column) {
      const factor = a[row][column];
      for (let j = 0; j < 2 * n; j += 1) a[row][j] -= factor * a[column][j];
    }
  }
  return a.map((row) => row.slice(n));
}

export function frobeniusNorm(matrix) {
  const raw = unwrapEntry(matrix);
  return Math.sqrt(raw.flat().reduce((sum, value) => sum + value * value, 0));
}

function symmetricEigenvalues(matrix, tolerance = 1e-11, maxIterations = 180) {
  const a = cloneMatrix(matrix), n = a.length;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let p = 0, q = 1, max = 0;
    for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) {
      const value = Math.abs(a[i][j]);
      if (value > max) { max = value; p = i; q = j; }
    }
    if (max < tolerance) break;
    const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(phi), s = Math.sin(phi);
    const app = c * c * a[p][p] - 2 * s * c * a[p][q] + s * s * a[q][q];
    const aqq = s * s * a[p][p] + 2 * s * c * a[p][q] + c * c * a[q][q];
    for (let k = 0; k < n; k += 1) if (k !== p && k !== q) {
      const aik = a[k][p], akq = a[k][q];
      a[k][p] = a[p][k] = c * aik - s * akq;
      a[k][q] = a[q][k] = s * aik + c * akq;
    }
    a[p][p] = app; a[q][q] = aqq; a[p][q] = a[q][p] = 0;
  }
  return a.map((row, index) => row[index]).sort((x, y) => y - x);
}

export function singularValues(matrix) {
  const raw = unwrapEntry(matrix);
  const ata = matrixMultiply(matrixTranspose(raw), raw);
  return symmetricEigenvalues(ata).map((value) => Math.sqrt(Math.max(0, value))).sort((a, b) => b - a);
}

export function pseudoDeterminant(matrix) {
  const values = singularValues(matrix);
  const tolerance = Math.max(1e-8, Math.max(matrix.length, matrix[0].length) * Number.EPSILON * 10) * (values[0] || 1);
  const active = values.filter((value) => value > tolerance);
  if (!active.length) return 0;
  const logValue = active.reduce((sum, value) => sum + Math.log(value), 0);
  return logValue > 700 ? Infinity : Math.exp(logValue);
}

export function conditionNumber(matrix) {
  const values = singularValues(matrix);
  const tolerance = Math.max(1e-8, Math.max(matrix.length, matrix[0].length) * Number.EPSILON * 10) * (values[0] || 1);
  const active = values.filter((value) => value > tolerance);
  return active.length ? active[0] / active[active.length - 1] : Infinity;
}

export function spectralRadiusEstimate(matrix, iterations = 80) {
  const raw = unwrapEntry(matrix), n = raw.length;
  let vector = Array(n).fill(1 / Math.sqrt(n)), estimate = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = raw.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
    const norm = Math.sqrt(next.reduce((sum, value) => sum + value * value, 0));
    if (norm < EPS) return 0;
    vector = next.map((value) => value / norm); estimate = norm;
  }
  return estimate;
}

export function matrixExponential(matrix) {
  const raw = unwrapEntry(matrix), n = raw.length;
  const norm = Math.max(...raw.map((row) => row.reduce((sum, value) => sum + Math.abs(value), 0)));
  const scalePower = Math.max(0, Math.ceil(Math.log2(Math.max(1, norm))));
  const scaled = matrixScale(raw, 1 / (2 ** scalePower));
  let result = identityMatrix(n), term = identityMatrix(n);
  for (let k = 1; k <= 24; k += 1) {
    term = matrixScale(matrixMultiply(term, scaled), 1 / k);
    result = matrixAdd(result, term);
    if (frobeniusNorm(term) < 1e-12) break;
  }
  for (let i = 0; i < scalePower; i += 1) result = matrixMultiply(result, result);
  return result;
}

function squareToIndex(square) {
  return { row: 8 - Number(square[1]), column: FILES.indexOf(square[0]) };
}

function inBounds(row, column) { return row >= 0 && row < 8 && column >= 0 && column < 8; }

function addControl(matrix, row, column, sign) {
  if (inBounds(row, column)) matrix[row][column] += sign;
}

function addSlidingControls(chess, matrix, row, column, sign, directions) {
  for (const [dr, dc] of directions) {
    let r = row + dr, c = column + dc;
    while (inBounds(r, c)) {
      addControl(matrix, r, c, sign);
      const square = `${FILES[c]}${8 - r}`;
      if (chess.get(square)) break;
      r += dr; c += dc;
    }
  }
}

export function buildPositionMatrix(fen, options = {}) {
  const chess = new Chess(fen);
  const material = zeroMatrix(), control = zeroMatrix();
  const pieceValues = { ...PIECE_VALUES, ...(options.pieceValues || {}) };
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    const square = `${FILES[column]}${8 - row}`, piece = chess.get(square);
    if (!piece) continue;
    const sign = piece.color === 'w' ? 1 : -1;
    material[row][column] += sign * pieceValues[piece.type];
    if (piece.type === 'p') {
      const dr = piece.color === 'w' ? -1 : 1;
      addControl(control, row + dr, column - 1, sign); addControl(control, row + dr, column + 1, sign);
    } else if (piece.type === 'n') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) addControl(control, row + dr, column + dc, sign);
    } else if (piece.type === 'k') {
      for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) if (dr || dc) addControl(control, row + dr, column + dc, sign);
    } else {
      const diagonal = [[-1,-1],[-1,1],[1,-1],[1,1]], straight = [[-1,0],[1,0],[0,-1],[0,1]];
      addSlidingControls(chess, control, row, column, sign, piece.type === 'b' ? diagonal : piece.type === 'r' ? straight : [...diagonal, ...straight]);
    }
  }
  const materialWeight = Number(options.materialWeight ?? 1), controlWeight = Number(options.controlWeight ?? 1);
  const matrix = material.map((row, i) => row.map((value, j) => materialWeight * value + controlWeight * control[i][j]));
  return { matrix, material, control };
}

export function algebraicProperties(matrix) {
  const sv = singularValues(matrix), tolerance = Math.max(1e-8, Math.max(matrix.length, matrix[0].length) * Number.EPSILON * 10) * (sv[0] || 1);
  const active = sv.filter((value) => value > tolerance);
  return {
    determinant: determinant(matrix),
    rank: matrixRank(matrix),
    trace: matrix.reduce((sum, row, index) => sum + row[index], 0),
    frobenius: frobeniusNorm(matrix),
    condition: active.length ? active[0] / active[active.length - 1] : Infinity,
    pseudoDeterminant: pseudoDeterminant(matrix),
    lambdaMax: spectralRadiusEstimate(matrix),
    sigmaMax: active[0] || 0,
    sigmaMinPositive: active[active.length - 1] || 0,
    singularValues: sv,
  };
}

export function buildTimelineFromPgn(pgn, name = 'Partida importada') {
  const loaded = new Chess();
  if (pgn?.trim()) loaded.loadPgn(pgn);
  const history = loaded.history({ verbose: true });
  const fenHeader = pgn?.match(/\[FEN\s+"([^"]+)"\]/i)?.[1];
  const replay = fenHeader ? new Chess(fenHeader) : new Chess();
  const positions = [{ fen: replay.fen(), san: 'Inicio', ply: 0, label: 'Inicio', stockfish: null }];
  history.forEach((move, index) => {
    const applied = replay.move(move.san || move);
    if (!applied) return;
    const fullMove = Math.floor(index / 2) + 1;
    positions.push({
      fen: replay.fen(), san: applied.san, ply: index + 1,
      label: index % 2 === 0 ? `${fullMove}b` : `${fullMove}n`, stockfish: null,
    });
  });
  return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, pgn: pgn || '', positions, createdAt: Date.now(), source: 'pgn' };
}

export function splitPgnDatabase(text) {
  const normalized = String(text || '').replace(/\r/g, '').trim();
  if (!normalized) return [];
  const starts = [...normalized.matchAll(/^\[Event\s+/gm)].map((match) => match.index);
  if (starts.length <= 1) return [normalized];
  return starts.map((start, index) => normalized.slice(start, starts[index + 1] ?? normalized.length).trim()).filter(Boolean);
}

export function pgnDisplayName(pgn, fallback = 'Partida') {
  const header = (key) => pgn.match(new RegExp(`\\[${key}\\s+"([^"]*)"\\]`, 'i'))?.[1] || '';
  const white = header('White'), black = header('Black'), event = header('Event');
  return white || black ? `${white || 'Blancas'} vs ${black || 'Negras'}` : event || fallback;
}

// --- Calculadora matemática tipada -------------------------------------------------
function normalizeMathSource(source) {
  return String(source || '')
    .replace(/[−–—]/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/\bsen\b/gi, 'sin')
    .replace(/\btg\b/gi, 'tan')
    .replace(/\blog₁₀\b/gi, 'log10')
    .replace(/\blog₂\b/gi, 'log2')
    .replace(/\btr\b/gi, 'tr')
    .replace(/\|([A-Za-z][A-Za-z0-9_]*)\|/g, 'abs($1)')
    .replace(/(\d|\))\s*(?=[Aa]\b)/g, '$1*');
}

function tokenize(source) {
  const text = normalizeMathSource(source), tokens = [];
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index), space = rest.match(/^\s+/);
    if (space) { index += space[0].length; continue; }
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) { tokens.push({ type: 'number', value: Number(number[0]) }); index += number[0].length; continue; }
    const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) { tokens.push({ type: 'identifier', value: identifier[0] }); index += identifier[0].length; continue; }
    const char = rest[0];
    if ('+-*/^(),'.includes(char)) { tokens.push({ type: char, value: char }); index += 1; continue; }
    throw new Error(`Símbolo no reconocido: ${char}`);
  }
  tokens.push({ type: 'eof' }); return tokens;
}

function parseExpressionSource(source) {
  const tokens = tokenize(source); let position = 0;
  const peek = () => tokens[position]; const consume = (type) => { const token = peek(); if (token.type !== type) throw new Error(`Se esperaba ${type}.`); position += 1; return token; };
  const parsePrimary = () => {
    if (peek().type === 'number') return { type: 'number', value: consume('number').value };
    if (peek().type === 'identifier') {
      const name = consume('identifier').value;
      if (peek().type === '(') {
        consume('('); const args = [];
        if (peek().type !== ')') { do { args.push(parseAdditive()); if (peek().type !== ',') break; consume(','); } while (true); }
        consume(')'); return { type: 'call', name, args };
      }
      return { type: 'identifier', name };
    }
    if (peek().type === '(') { consume('('); const value = parseAdditive(); consume(')'); return value; }
    throw new Error('Expresión incompleta.');
  };
  const parseUnary = () => peek().type === '-' || peek().type === '+' ? { type: 'unary', op: consume(peek().type).type, value: parseUnary() } : parsePrimary();
  const parsePower = () => { let left = parseUnary(); if (peek().type === '^') { consume('^'); left = { type: 'binary', op: '^', left, right: parsePower() }; } return left; };
  const parseMultiplicative = () => { let left = parsePower(); while (peek().type === '*' || peek().type === '/') { const op = consume(peek().type).type; left = { type: 'binary', op, left, right: parsePower() }; } return left; };
  const parseAdditive = () => { let left = parseMultiplicative(); while (peek().type === '+' || peek().type === '-') { const op = consume(peek().type).type; left = { type: 'binary', op, left, right: parseMultiplicative() }; } return left; };
  const ast = parseAdditive(); if (peek().type !== 'eof') throw new Error('Hay texto adicional no válido.'); return ast;
}

function mapUnary(value, fn) {
  if (typeof value === 'number') return fn(value);
  if (isEntryMatrix(value)) return entryMatrix(value.matrix.map((row) => row.map(fn)));
  throw new Error('Esta función escalar necesita valores o una función en minúscula.');
}

function builtIn(name, args) {
  const lower = name.toLowerCase(), first = args[0];
  const scalar = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    ln: Math.log, log: Math.log, log10: Math.log10, log2: Math.log2, sqrt: Math.sqrt,
    abs: Math.abs, tanh: Math.tanh, sign: Math.sign,
  }[lower];
  if (scalar) return mapUnary(first, scalar);
  if (lower === 'exp') {
    if (isMatrix(first)) return matrixExponential(first);
    return mapUnary(first, Math.exp);
  }
  if (lower === 'expm') return matrixExponential(unwrapEntry(first));
  if (lower === 'det') return determinant(unwrapEntry(first));
  if (lower === 'rank') return matrixRank(unwrapEntry(first));
  if (lower === 'tr' || lower === 'trace') return unwrapEntry(first).reduce((sum, row, i) => sum + row[i], 0);
  if (lower === 'norm') return frobeniusNorm(first);
  if (lower === 'pdet') return pseudoDeterminant(unwrapEntry(first));
  if (lower === 'cond') return conditionNumber(unwrapEntry(first));
  if (lower === 'inv') return matrixInverse(unwrapEntry(first));
  if (lower === 'transpose' || lower === 'trans') return matrixTranspose(unwrapEntry(first));
  if (lower === 'eig' || lower === 'rho') return spectralRadiusEstimate(unwrapEntry(first));
  if (lower === 'svd') return singularValues(unwrapEntry(first))[0] || 0;
  throw new Error(`Función desconocida: ${name}`);
}

function parseDefinitions(lines) {
  const definitions = new Map();
  for (const line of lines) {
    const match = String(line || '').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*=\s*(.+)$/);
    if (!match) throw new Error(`Definición no válida: ${line}`);
    const [, name, paramsText, body] = match;
    definitions.set(name, { name, params: paramsText.split(',').map((value) => value.trim()).filter(Boolean), body, ast: parseExpressionSource(body) });
  }
  return definitions;
}

function evaluateAst(ast, environment, definitions, stack = []) {
  if (ast.type === 'number') return ast.value;
  if (ast.type === 'identifier') {
    if (Object.prototype.hasOwnProperty.call(environment, ast.name)) return environment[ast.name];
    if (ast.name === 'I') return identityMatrix(environment.A?.length || 8);
    if (ast.name === 'pi') return Math.PI;
    if (ast.name === 'e') return Math.E;
    throw new Error(`Variable desconocida: ${ast.name}`);
  }
  if (ast.type === 'unary') {
    const value = evaluateAst(ast.value, environment, definitions, stack);
    return ast.op === '-' ? (typeof value === 'number' ? -value : matrixScale(value, -1)) : value;
  }
  if (ast.type === 'binary') {
    const left = evaluateAst(ast.left, environment, definitions, stack), right = evaluateAst(ast.right, environment, definitions, stack);
    if (ast.op === '+') return matrixAdd(left, right);
    if (ast.op === '-') return matrixSubtract(left, right);
    if (ast.op === '*') return matrixMultiply(left, right);
    if (ast.op === '/') {
      if (typeof right !== 'number') throw new Error('Solo se admite división entre un escalar.');
      return typeof left === 'number' ? left / right : matrixScale(left, 1 / right);
    }
    if (ast.op === '^') {
      if (typeof right !== 'number') throw new Error('El exponente debe ser numérico.');
      return matrixPower(left, right);
    }
  }
  if (ast.type === 'call') {
    const args = ast.args.map((arg) => evaluateAst(arg, environment, definitions, stack));
    const definition = definitions.get(ast.name);
    if (!definition) return builtIn(ast.name, args);
    if (stack.includes(ast.name)) throw new Error(`Referencia circular en ${ast.name}.`);
    const local = { ...environment };
    definition.params.forEach((param, index) => { local[param] = args[index]; });
    return evaluateAst(definition.ast, local, definitions, [...stack, ast.name]);
  }
  throw new Error('Expresión no compatible.');
}

export function evaluateFunctionDefinitions(lines, matrix) {
  const definitions = parseDefinitions(lines), outputs = [];
  for (const definition of definitions.values()) {
    const args = definition.params.map((param) => param[0] === param[0].toLowerCase() ? entryMatrix(matrix) : matrix);
    const environment = { A: matrix, a: entryMatrix(matrix) };
    definition.params.forEach((param, index) => { environment[param] = args[index]; });
    let value = evaluateAst(definition.ast, environment, definitions, [definition.name]);
    if (isEntryMatrix(value)) value = value.matrix;
    outputs.push({
      name: definition.name,
      definition: `${definition.name}(${definition.params.join(',')})=${definition.body}`,
      value,
      scalar: typeof value === 'number' ? value : frobeniusNorm(value),
      kind: typeof value === 'number' ? 'scalar' : 'matrix',
    });
  }
  return outputs;
}

export function formatNumber(value, digits = 5) {
  if (value == null || Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';
  const abs = Math.abs(value);
  if ((abs > 0 && abs < 1e-4) || abs >= 1e6) return value.toExponential(3);
  return new Intl.NumberFormat('es-EC', { maximumFractionDigits: digits }).format(value);
}

export function evaluateScalarFunctionLine(line, x) {
  const definitions = parseDefinitions([line]);
  const definition = [...definitions.values()][0];
  if (!definition || !definition.params.length) throw new Error('No hay una función escalar válida.');
  const environment = { a: x, x, A: [[x]] };
  environment[definition.params[0]] = x;
  const value = evaluateAst(definition.ast, environment, definitions, [definition.name]);
  if (typeof value !== 'number') throw new Error('La función continua debe devolver un número.');
  return value;
}

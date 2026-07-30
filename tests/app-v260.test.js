import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildPositionMatrix, algebraicProperties, evaluateFunctionDefinitions, buildTimelineFromPgn } from '../src/core/algebraicChess.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Inicio incorpora el botón Transformada de Stockfish y dos pantallas dedicadas', async () => {
  const source = await read('src/main.js');
  assert.match(source, /Transformada de Stockfish/);
  assert.match(source, /stockfishTransform:'renderStockfishTransform'/);
  assert.match(source, /stockfishGraph:'renderStockfishGraph'/);
  assert.match(source, /Hojas e importaciones/);
  assert.match(source, /Ver gráfica/);
});

test('la calculadora distingue a y A y el graficador permite desplazamiento libre', async () => {
  const source = await read('src/main.js');
  assert.match(source, /a minúscula/);
  assert.match(source, /A mayúscula/);
  assert.match(source, /key==='a'\|\|key==='A'/);
  assert.match(source, /onpointermove/);
  assert.match(source, /onwheel/);
  assert.match(source, /Por semijugada/);
  assert.match(source, /Función continua/);
});

test('el beso de la muerte conserva det 0, rango 5 y pseudodeterminante singular 52', () => {
  const { matrix } = buildPositionMatrix('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
  const properties = algebraicProperties(matrix);
  assert.equal(properties.determinant, 0);
  assert.equal(properties.rank, 5);
  assert.ok(Math.abs(properties.frobenius - 12) < 1e-9);
  assert.ok(Math.abs(properties.pseudoDeterminant - 52) < 1e-6);
  assert.ok(Math.abs(properties.condition - 18.5172589828) < 1e-6);
});

test('las funciones minúsculas, mayúsculas y mixtas producen salidas evaluables', () => {
  const { matrix } = buildPositionMatrix('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
  const outputs = evaluateFunctionDefinitions([
    'f(a)=sin(a)+ln(1+abs(a))',
    'F(A)=A^2+exp(A)',
    'K(A,a)=F(A)+f(a)',
  ], matrix);
  assert.deepEqual(outputs.map((output) => output.name), ['f', 'F', 'K']);
  assert.ok(outputs.every((output) => Number.isFinite(output.scalar)));
  assert.ok(outputs.every((output) => output.kind === 'matrix'));
});

test('cada semijugada de un PGN crea una posición de la hoja', () => {
  const sheet = buildTimelineFromPgn('[Event "Prueba"]\n\n1. e4 e5 2. Nf3 Nc6', 'Prueba');
  assert.equal(sheet.positions.length, 5);
  assert.deepEqual(sheet.positions.map((position) => position.label), ['Inicio', '1b', '1n', '2b', '2n']);
});

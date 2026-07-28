import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess } from '../src/vendor/chess.js';
import { buildOpeningGraph, identifyOpeningByPosition } from '../src/core/openingGraph.js';
import { classifyMoveQuality, validCandidates } from '../src/core/moveQuality.js';
import { positionKey } from '../src/core/utils.js';
import { OPENINGS } from '../src/openings.js';
import { STRATEGY_START_PLY, STRATEGY_GAP_PLIES } from '../src/storage.js';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('Estrategia extrae posiciones desde el movimiento 7',()=>{
  assert.equal(STRATEGY_START_PLY,13);
  assert.equal(STRATEGY_GAP_PLIES,14);
  assert.match(main,/desde el movimiento 7/);
});

test('el grafo reconoce una apertura por posición y no solo por orden lineal',()=>{
  const graph=buildOpeningGraph(OPENINGS);
  const chess=new Chess();
  chess.move('Nf3'); chess.move('d5'); chess.move('d4'); chess.move('Nf6');
  const identified=identifyOpeningByPosition(graph,chess.fen(),OPENINGS);
  assert.ok(identified);
});

test('la clasificación diferencia precisión y errores',()=>{
  assert.equal(classifyMoveQuality({bestScore:50,playedScore:48}).key,'best');
  assert.equal(classifyMoveQuality({bestScore:200,playedScore:0}).key,'blunder');
});

test('las candidatas válidas dependen de la dificultad',()=>{
  const candidates=[{score:100},{score:70},{score:30}];
  assert.equal(validCandidates(candidates,'w','easy').length,3);
  assert.equal(validCandidates(candidates,'w','master').length,1);
});

test('la clave de transposición conserva estado legal relevante',()=>{
  assert.equal(positionKey('8/8/8/8/8/8/8/8 w - - 0 1'),'8/8/8/8/8/8/8/8 w - -');
});

test('v2 incluye IndexedDB, accesibilidad, WDL, navegación de análisis y biblioteca avanzada',()=>{
  for(const token of ['IndexedDB','Contraste alto','Visión del color','ANÁLISIS EN TIEMPO REAL','analysisTimeline','Comentario de la posición','Exportar seleccionadas','Continuar']) assert.match(main,new RegExp(token));
  assert.match(css,/@media\(max-width:850px\)/);
});

test('juego local incorpora promoción, tablas, abandono y pantalla completa',()=>{
  for(const token of ['Promocionar peón','Ofrecer tablas','Abandonar','Pantalla completa']) assert.match(main,new RegExp(token));
});

test('las pestañas rápida y avanzada preservan el formulario y cambian campos visibles',()=>{
  assert.match(main,/captureSetupForm\(\)/);
  assert.match(main,/data-setup-mode="quick"/);
  assert.match(main,/data-setup-mode="advanced"/);
  assert.match(main,/this\.captureSetupForm\(\);this\.cfg\.setupMode=button\.dataset\.setupMode/);
  assert.match(css,/\.form-grid\.quick-mode \.advanced-field\{display:none!important\}/);
  assert.match(css,/\.form-grid\.advanced-mode \.quick-only\{display:none!important\}/);
});

test('Estrategia muestra el tablero desde el bando que juega',()=>{
  assert.match(main,/this\.boardFlipped=originalTurn==='b'/);
  assert.match(main,/Vista desde \$\{turn\}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const utils=fs.readFileSync(new URL('../src/core/utils.js',import.meta.url),'utf8');

test('COM vs COM conserva el desplazamiento y deja pausa visible',()=>{
  assert.match(main,/gameAsideScroll/);
  assert.match(main,/game-live-controls/);
  assert.match(css,/game-live-controls\{position:sticky/);
});

test('anotaciones funcionan siempre con clic derecho y el lápiz solo cambia color',()=>{
  assert.match(main,/startRightAnnotation/);
  assert.match(main,/endRightAnnotation/);
  assert.match(main,/Clic derecho: casilla/);
  assert.doesNotMatch(main,/data-ann-mode/);
  assert.doesNotMatch(main,/this\.annotation\.mode/);
});

test('estrategia enlaza con análisis y permite volver',()=>{
  assert.match(main,/ANALIZAR ESTA POSICIÓN/);
  assert.match(main,/VOLVER A ESTRATEGIA/);
  assert.match(main,/openStrategyAnalysis/);
  assert.match(main,/analysisReturn/);
});

test('evaluaciones se presentan como números decimales sin sufijo cp',()=>{
  assert.match(utils,/value\.toFixed\(2\)/);
  assert.match(main,/scoreText\(candidate\)|scoreText\(this\.analysis\[0\]\)/);
  assert.doesNotMatch(main,/Math\.round\(Number\(c\.score\|\|0\)\)\} cp/);
});

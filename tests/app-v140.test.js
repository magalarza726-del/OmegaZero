import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('las flechas usan una punta geométrica visible',()=>{
  assert.match(main,/<polygon class=\"fill-\$\{c\}\"/);
  assert.match(main,/baseX=x2-42\*ux/);
  assert.match(css,/\.arrows polygon/);
});

test('un clic izquierdo en cualquier casilla limpia anotaciones',()=>{
  assert.match(main,/leftSquare\(sq\)\{this\.annotations\.clear\(\);this\.arrows=\[\]/);
  assert.match(main,/bindAnalysisBoard[\s\S]*this\.annotations\.clear\(\);this\.arrows=\[\]/);
  assert.match(main,/bindStrategyBoard[\s\S]*this\.annotations\.clear\(\);this\.arrows=\[\]/);
});

test('estrategia conserva el orden MultiPV desde el bando al turno',()=>{
  assert.match(main,/perspective:turn/);
  assert.match(main,/validCandidates\(raw,turn/);
  assert.match(main,/scoreText\(candidate\)/);
});

test('J1 vs COM admite de uno a cinco tableros simultáneos independientes',()=>{
  assert.match(main,/Partidas simultáneas/);
  assert.match(main,/min=\"1\" max=\"5\"/);
  assert.match(main,/startSimultaneousGames/);
  assert.match(main,/nextSimBoard/);
  assert.match(main,/data-sim-board/);
  assert.match(main,/board-id/);
});

test('la paleta incluye amarillo y morado y usa el nuevo logo',()=>{
  assert.match(main,/yellow:\{name:'Amarillo'/);
  assert.match(main,/purple:\{name:'Morado'/);
  assert.match(main,/omegazero-logo\.png/);
  assert.match(main,/omegazero-mark\.png/);
});

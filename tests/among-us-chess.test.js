import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  hiddenEloGuessOutcome, hiddenEloGuessWindow, nextEffectiveElo,
  eloToSkill, eloToDepth, chooseHiddenEloCandidate,
} from '../assets/v3.5.1-20260819051500/core/hiddenEloChess.js';

test('la acusación usa los umbrales ±100 / ±200',()=>{
  assert.equal(hiddenEloGuessOutcome(1800,1700).key,'win');
  assert.equal(hiddenEloGuessOutcome(1800,1901).key,'draw');
  assert.equal(hiddenEloGuessOutcome(1800,2001).key,'loss');
});

test('el botón de Elo se habilita en 10, 15, 20... jugadas completas',()=>{
  assert.equal(hiddenEloGuessWindow(18).enabled,false);
  assert.equal(hiddenEloGuessWindow(20).enabled,true);
  assert.equal(hiddenEloGuessWindow(28).enabled,false);
  assert.equal(hiddenEloGuessWindow(30).enabled,true);
  assert.equal(hiddenEloGuessWindow(40).enabled,true);
});

test('Sol puede elevar temporalmente su Elo y Luna puede ocultarlo',()=>{
  const sol=nextEffectiveElo({elo:1500,style:'sun',styleState:{burstLeft:0,burstBoost:0}},(()=>{const a=[0,.5,.5];let i=0;return()=>a[i++]??.5})());
  assert.ok(sol.effectiveElo>=2000);
  assert.equal(sol.tag,'erupción solar');
  const moon=nextEffectiveElo({elo:1800,style:'moon',styleState:{}},(()=>{const a=[0,.5];let i=0;return()=>a[i++]??.5})());
  assert.ok(moon.effectiveElo<=1500);
  assert.equal(moon.tag,'camuflaje lunar');
});

test('la fuerza efectiva escala parámetros del motor',()=>{
  assert.ok(eloToSkill(2500)>eloToSkill(500));
  assert.ok(eloToDepth(2500)>eloToDepth(500));
});

test('la selección probabilística conserva una candidata legal del conjunto',()=>{
  const candidates=[{uci:'e2e4',score:40},{uci:'d2d4',score:30},{uci:'g1f3',score:10}];
  const chosen=chooseHiddenEloCandidate(candidates,'w',1800,()=>.6);
  assert.ok(candidates.some(c=>c.uci===chosen.uci));
});


test('Among Us reutiliza la interfaz de simultáneas y el sistema común de anotaciones',()=>{
  const source=readFileSync(new URL('../assets/v3.5.1-20260819051500/features/amongUsChess.js',import.meta.url),'utf8');
  assert.ok(source.includes('game-layout simultaneous-game among-simultaneous'));
  assert.ok(source.includes('sim-board-tabs'));
  assert.ok(source.includes('this.annotationPanel()'));
  assert.ok(source.includes("this.startRightAnnotation(event,cell.dataset.square,'amongUs')"));
  assert.ok(source.includes('this.startVisualDrag(event,cell.dataset.square'));
});

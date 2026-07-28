import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess } from '../src/vendor/chess.js';
import { evaluationLoss, orderCandidatesForMover, validCandidates } from '../src/core/moveQuality.js';
import { fideGameState, timeoutResult } from '../src/core/fideRules.js';
import { OPENINGS, OPENING_CATEGORIES } from '../src/openings.js';
import { MASTER_GAMES, MASTER_PROBLEMS } from '../src/data/masterGames.js';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('las candidatas se ordenan desde la escala estándar según el bando que juega',()=>{
  const candidates=[
    {uci:'a1a2',score:-522},
    {uci:'a1b1',score:-531},
    {uci:'a1b2',score:-532},
  ];
  assert.deepEqual(orderCandidatesForMover(candidates,'w').map(c=>c.score),[-522,-531,-532]);
  assert.deepEqual(orderCandidatesForMover(candidates,'b').map(c=>c.score),[-532,-531,-522]);
  assert.deepEqual(validCandidates(candidates,'b','easy',3).map(c=>c.score),[-532,-531,-522]);
  assert.equal(evaluationLoss(-532,-522,'b'),10);
  assert.equal(evaluationLoss(-522,-532,'w'),10);
});

test('J1 vs COM admite hasta cinco partidas simultáneas',()=>{
  assert.match(main,/min="1" max="5"/);
  assert.match(main,/entre 1 y 5 contrincantes/);
  assert.match(main,/clamp\(e\.target\.value,1,5\)/);
});

test('la base de aperturas y la categoría magistral están integradas',()=>{
  assert.ok(OPENINGS.length>3500,`Se esperaban más de 3500 registros, hay ${OPENINGS.length}`);
  assert.ok(OPENING_CATEGORIES.includes('Partidas magistrales'));
  assert.ok(MASTER_GAMES.length>=10);
  assert.ok(MASTER_PROBLEMS.length>=30);
  assert.match(main,/Partidas propias/);
  assert.match(main,/Partidas magistrales/);
});

test('las reglas FIDE automáticas y reclamables se evalúan internamente',()=>{
  const seventyFive=new Chess('7k/8/8/8/8/8/8/R5K1 w - - 150 76');
  assert.deepEqual(fideGameState(seventyFive,[{fen:seventyFive.fen()}]).result,'1/2-1/2');
  assert.match(fideGameState(seventyFive,[{fen:seventyFive.fen()}]).reason,/75 movimientos/);

  const fifty=new Chess('7k/8/8/8/8/8/8/R5K1 w - - 100 51');
  const fiftyState=fideGameState(fifty,[{fen:fifty.fen()}]);
  assert.equal(fiftyState.terminal,false);
  assert.ok(fiftyState.claimable);
  assert.ok(fiftyState.claims.includes('regla de 50 movimientos'));

  const repetition=new Chess();
  const repeated=Array.from({length:5},()=>({fen:repetition.fen()}));
  assert.match(fideGameState(repetition,repeated).reason,/cinco repeticiones/);
});

test('la caída de bandera respeta la posibilidad material de mate',()=>{
  const bareKing=new Chess('7k/8/8/8/8/8/8/6K1 w - - 0 1');
  assert.equal(timeoutResult(bareKing,'w'),'1/2-1/2');
  const rookOpponent=new Chess('6rk/8/8/8/8/8/8/6K1 w - - 0 1');
  assert.equal(timeoutResult(rookOpponent,'w'),'0-1');
});

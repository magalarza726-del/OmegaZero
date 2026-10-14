import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../assets/v4.2.0-20260915193000/vendor/chess.js';
import { detectsHippo, resolveBotScheme } from '../assets/v4.2.0-20260915193000/bots.js';
import { chooseBotCandidate } from '../assets/v4.2.0-20260915193000/scheme.js';

test('Zero conserva el Hipopótamo como identidad base',()=>{
  const chess=new Chess();
  assert.equal(resolveBotScheme('zero','w','auto',0,chess),'hippo');
  const candidates=[
    {uci:'e2e4',score:30},
    {uci:'g2g3',score:20},
  ];
  const chosen=chooseBotCandidate(chess,candidates,'zero','hippo','w',{},'zero');
  assert.equal(chosen.uci,'g2g3');
});

test('Omega no activa Counter Hipopótamo en una posición normal',()=>{
  const chess=new Chess();
  assert.equal(resolveBotScheme('omega','w','auto',0,chess),'best');
  const candidates=[
    {uci:'e2e4',score:30},
    {uci:'d2d4',score:24},
    {uci:'g1f3',score:22},
  ];
  const chosen=chooseBotCandidate(chess,candidates,'omega','best','w',{},'omega');
  assert.equal(chosen.uci,'e2e4');
});

test('Omega activa Counter únicamente cuando detecta señales reales de Hipopótamo rival',()=>{
  const chess=new Chess();
  chess.move('e4');
  chess.move('g6');
  chess.move('d4');
  chess.move('Bg7');
  assert.equal(detectsHippo(chess,'b'),true);
  assert.equal(resolveBotScheme('omega','w','auto',0,chess),'counterHippo');
});

test('la detección de Hipopótamo no confunde un fianchetto incompleto aislado',()=>{
  const chess=new Chess();
  chess.move('e4');
  chess.move('g6');
  assert.equal(detectsHippo(chess,'b'),false);
  assert.equal(resolveBotScheme('omega','w','auto',0,chess),'best');
});

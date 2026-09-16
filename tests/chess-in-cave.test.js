import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initialCaveState,
  caveLegalMoves,
  caveVisibility,
  applyCaveMove
} from '../assets/v4.2.0-20260915193000/core/caveChess.js';
import { chooseCaveComMove } from '../assets/v4.2.0-20260915193000/core/caveBot.js';

test('Chess in the Cave starts with the expected white field of vision',()=>{
  const state=initialCaveState();
  const visible=caveVisibility(state,'w');
  assert.equal(visible.size,24);
  for(const file of 'abcdefgh')assert.equal(visible.has(`${file}3`),true);
  assert.equal(visible.has('e4'),false);
});

test('basic pawn movement remains legal in the cave rules',()=>{
  const state=initialCaveState();
  assert.deepEqual(caveLegalMoves(state,'e2').sort(),['e3','e4']);
  const moved=applyCaveMove(state,'e2','e4');
  assert.equal(moved.ok,true);
  assert.equal(state.turn,'b');
  assert.equal(state.ply,1);
});

test('the cave COM always returns a legal move for the side to move',()=>{
  const state=initialCaveState();
  const move=chooseCaveComMove(state,'w',{random:()=>0});
  assert.ok(move);
  assert.ok(caveLegalMoves(state,move.from).includes(move.to));
});

test('the cave COM prioritizes a visible king capture',()=>{
  const state={
    board:{
      e1:{id:'wk',color:'w',type:'k',moved:true},
      e7:{id:'bq',color:'b',type:'q',moved:true},
      e8:{id:'bk',color:'b',type:'k',moved:true}
    },
    turn:'b',winner:null,result:null,history:[],enPassant:null,ply:0
  };
  const move=chooseCaveComMove(state,'b',{random:()=>0});
  assert.equal(move.from,'e7');
  assert.equal(move.to,'e1');
  const result=applyCaveMove(state,move.from,move.to);
  assert.equal(result.ok,true);
  assert.equal(state.winner,'b');
  assert.equal(state.result,'0-1');
});

test('the cave COM does not move out of turn or after game over',()=>{
  const state=initialCaveState();
  assert.equal(chooseCaveComMove(state,'b',{random:()=>0}),null);
  state.winner='w';
  assert.equal(chooseCaveComMove(state,'w',{random:()=>0}),null);
});

test('Cave setup uses direct buttons for J1 vs J2 and J1 vs COM',()=>{
  const source=readFileSync(new URL('../assets/v4.2.0-20260915193000/features/chessInCaveSetupPatch.js',import.meta.url),'utf8');
  assert.match(source,/data-cave-mode=\"pvp\"/);
  assert.match(source,/data-cave-mode=\"pvc\"/);
  assert.match(source,/button\.onclick=event/);
  assert.doesNotMatch(source,/name=\"caveMode\"/);
});

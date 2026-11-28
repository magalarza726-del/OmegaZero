import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../assets/v4.3.0-20261104200000/vendor/chess.js';
import { fishSwapFen, fishSwaps } from '../assets/v4.3.0-20261104200000/core/fishChess.js';
import { newVariant, variantMoves, playVariantMove, variantResult, chooseVariantMove } from '../assets/v4.3.0-20261104200000/features/variantPlay.js';

test('swaps both colors, consumes turn and removes moved rook rights',()=>{
 const g=new Chess(),f=fishSwapFen(g,'a','b'),n=new Chess(f);
 assert.equal(n.turn(),'b');assert.equal(n.get('b1').type,'r');assert.equal(n.get('a8').type,'n');assert.equal(n.fen().split(' ')[2],'Kk');assert.equal(g.turn(),'w');
});
test('king cannot cross attacked squares',()=>{
 const g=new Chess('4k3/8/8/8/8/8/3r4/1K6 w - - 0 1');assert.equal(fishSwapFen(g,'b','f'),null);
});
test('king cannot finish under attack',()=>{
 const g=new Chess('4k3/8/8/8/8/8/4n3/1K6 w - - 0 1');assert.equal(fishSwapFen(g,'b','f'),null);
});
test('swap not involving king may expose check',()=>{
 const g=new Chess('4k3/8/8/8/8/8/8/r1N1K3 w - - 0 1');assert.equal(fishSwapFen(g,'c','f'),null);
});
test('normal movement and column swap share variant turn history',()=>{
 const l=newVariant('fish','pvp');assert.equal(variantMoves(l.chess,'fish').some(m=>m.kind==='swap'),true);
 const m=variantMoves(l.chess,'fish').find(m=>m.from==='e2'&&m.to==='e4');assert.equal(playVariantMove(l,m),true);
 assert.equal(playVariantMove(l,{kind:'swap',a:'a',b:'b'}),true);
 assert.equal(l.chess.turn(),'w');assert.equal(l.chess.fen().split(' ')[3],'-');assert.equal(l.history.length,2);assert.equal(l.last.length,16);
});
test('COM returns a legal normal move or swap',()=>{
 const l=newVariant('fish','cvc'),m=chooseVariantMove(l);assert.ok(m);assert.equal(playVariantMove(l,m),true);
});

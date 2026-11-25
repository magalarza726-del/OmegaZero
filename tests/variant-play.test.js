import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../assets/v4.3.0-20261104200000/vendor/chess.js';
import { newVariant, variantMoves, playVariantMove, chooseVariantMove, AntiBoard } from '../assets/v4.3.0-20261104200000/features/variantPlay.js';

test('King of the Hill ends when a king reaches the center',()=>{
 const g=newVariant('hill','pvp');g.chess=new Chess('7k/8/8/8/8/4K3/8/8 w - - 0 1');
 assert.ok(playVariantMove(g,{from:'e3',to:'e4'}));assert.equal(g.result.winner,'w');
});
test('Three-Check wins on third check',()=>{
 const g=newVariant('threecheck','pvp');g.chess=new Chess('7k/8/8/8/8/8/R7/K7 w - - 0 1');g.checks.w=2;
 assert.ok(playVariantMove(g,{from:'a2',to:'h2'}));assert.equal(g.result.winner,'w');
});
test('Racing Kings disallows checking and permits Black to equalize',()=>{
 const g=newVariant('racing','pvp');assert.ok(variantMoves(g.chess,'racing').every(m=>!/[+#]/.test(m.san)));
 g.chess=new Chess('8/K6k/8/8/8/8/8/8 w - - 0 1');assert.ok(playVariantMove(g,{from:'a7',to:'a8'}));assert.equal(g.result,null);
 assert.ok(playVariantMove(g,{from:'h7',to:'h8'}));assert.equal(g.result.winner,'draw');
});
test('Antichess forces captures and losing all pieces wins',()=>{
 const g=newVariant('antichess','pvp');assert.ok(playVariantMove(g,{from:'e2',to:'e4'}));assert.ok(playVariantMove(g,{from:'d7',to:'d5'}));
 assert.ok(variantMoves(g.chess,'antichess').every(m=>m.captured));assert.ok(playVariantMove(g,{from:'e4',to:'d5'}));
 g.chess=new AntiBoard({board:{a1:{color:'w',type:'k',id:'w',moved:true},b2:{color:'b',type:'r',id:'b',moved:true}},turn:'w',winner:null,history:[],enPassant:null,ply:0});
 assert.ok(playVariantMove(g,{from:'a1',to:'b2'}));assert.equal(g.result.winner,'b');
});
for(const id of ['hill','threecheck','racing','antichess'])test('COM legal move: '+id,()=>{
 const g=newVariant(id,'cvc'),m=chooseVariantMove(g);assert.ok(m);assert.ok(playVariantMove(g,m));
});

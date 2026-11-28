import test from 'node:test';
import assert from 'node:assert/strict';
import {backRank960,new960Research,researchMoves,play960Research,linkedSquare} from '../assets/v4.3.0-20261104200000/core/chess960Research.js';
const move=(l,b,u)=>researchMoves(l,b).find(m=>m.from+m.to+(m.promotion||'')===u);
const play=(l,b,u)=>assert.equal(play960Research(l,b,move(l,b,u)),true,u);
test('960 distinct starts, opposite bishops, king between rooks, unique identities',()=>{
 const rows=new Set();for(let i=0;i<960;i++){const row=backRank960(i);rows.add(row);assert.notEqual(row.indexOf('b')%2,row.lastIndexOf('b')%2);assert.ok(row.indexOf('r')<row.indexOf('k')&&row.indexOf('k')<row.lastIndexOf('r'));assert.equal(new Set(Object.values(new960Research(i).ids.random)).size,32);}
 assert.equal(rows.size,960);assert.equal(backRank960(518),'rnbqkbnr');
});
test('linked knight identity',()=>{const l=new960Research(0),id=l.ids.classic.b1;assert.equal(linkedSquare(l,'random',id),'d1');play(l,'classic','b1c3');assert.equal(linkedSquare(l,'random',id),'e3');assert.equal(linkedSquare(l,'classic',id),'c3');});
test('illegal standard move keeps both positions',()=>{const l=new960Research(20),f=l.classic.fen(),g=l.random.fen();assert.equal(play960Research(l,'classic',move(l,'classic','b1a3')),false);assert.equal(l.result,'Fin por movimiento ilegal');assert.equal(l.classic.fen(),f);assert.equal(l.random.fen(),g);});
test('960 priority keeps legal 960 move only',()=>{const l=new960Research(0);play(l,'classic','a2a4');play(l,'classic','a7a6');const f=l.classic.fen();assert.equal(play960Research(l,'random',move(l,'random','d1f2')),false);assert.equal(l.result,'Fin por movimiento ilegal');assert.equal(l.classic.fen(),f);assert.equal(l.random.get('f2').type,'n');});
test('en passant removes same pawn',()=>{const l=new960Research(518);for(const u of ['e2e4','a7a6','e4e5','d7d5','e5d6'])play(l,'classic',u);for(const b of ['classic','random']){assert.equal(l[b].get('d5'),undefined);assert.equal(linkedSquare(l,b,'bpd'),undefined);assert.equal(linkedSquare(l,b,'wpe'),'d6');}});
test('castling synchronizes king and rook',()=>{const l=new960Research(518);for(const u of ['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6','e1g1'])play(l,'classic',u);for(const b of ['classic','random']){assert.equal(l[b].get('g1').type,'k');assert.equal(linkedSquare(l,b,'wr1'),'f1');}assert.equal(l.rights.wk,false);});
test('960 king already on g1 can castle',()=>{const l=new960Research(0);for(const s of Object.keys(l.ids.random)){if(!['g1','h1','g8'].includes(s)){l.random.remove(s);delete l.ids.random[s];}}const m=researchMoves(l,'random','g1').find(m=>m.castle==='k');assert.ok(m);assert.equal(m.to,'g1');assert.equal(play960Research(l,'random',m),false);assert.equal(l.random.get('f1').type,'r');});

test('all initial knight translations have identical vectors',()=>{for(let i=0;i<960;i++){const initial=new960Research(i);for(const m of researchMoves(initial,'classic').filter(m=>m.piece==='n')){const l=new960Research(i),id=l.ids.classic[m.from],from=linkedSquare(l,'random',id);const f='abcdefgh',col=f.indexOf(from[0])+f.indexOf(m.to[0])-f.indexOf(m.from[0]),row=Number(from[1])+Number(m.to[1])-Number(m.from[1]);const to=f[col]+row,legal=researchMoves(l,'random',from).some(n=>n.to===to&&!n.captured);assert.equal(play960Research(l,'classic',m),legal);if(legal)assert.equal(linkedSquare(l,'random',id),to);}}});

test('each pawn is linked to the corresponding original back-rank piece in all 960 layouts',()=>{
 for(let i=0;i<960;i++){
  const l=new960Research(i);
  for(const [back,pawn] of [['1','2'],['8','7']]){
   for(const file of 'abcdefgh'){
    const piece=l.ids.classic[file+back],id=l.ids.classic[file+pawn];
    const counterpart=linkedSquare(l,'random',piece);
    assert.equal(linkedSquare(l,'random',id),counterpart[0]+pawn);
   }
  }
 }
});
test('position 392: king pawn e2-e3 mirrors g2-g3 even with a knight on e3',()=>{
 const l=new960Research(392);
 for(const u of ['d2d4','e7e6','g1f3','c7c5'])play(l,'classic',u);
 assert.equal(l.random.get('e3').type,'n');
 assert.equal(linkedSquare(l,'random','wpe'),'g2');
 play(l,'classic','e2e3');
 assert.equal(l.classic.get('e3').type,'p');
 assert.equal(l.random.get('g3').type,'p');
 assert.equal(l.random.get('e3').type,'n');
 assert.equal(l.result,null);
});
test('reverse mirror: 960 king pawn g2-g4 moves classical king pawn e2-e4',()=>{
 const l=new960Research(392);
 play(l,'random','g2g4');
 assert.equal(linkedSquare(l,'classic','wpe'),'e4');
 assert.equal(linkedSquare(l,'random','wpe'),'g4');
});
test('all initial pawn movements maintain their relative vector and piece identity',()=>{
 for(let i=0;i<960;i++){
  const initial=new960Research(i);
  for(const m of researchMoves(initial,'classic').filter(m=>m.piece==='p')){
   const l=new960Research(i),id=l.ids.classic[m.from],from=linkedSquare(l,'random',id);
   assert.equal(play960Research(l,'classic',m),true,i+': '+m.san);
   assert.equal(linkedSquare(l,'random',id),from[0]+m.to[1]);
  }
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../assets/v3.3.0-20260816051000/vendor/chess.js';
import { analyzeEnergyPosition, chooseEnergyMoveOnePly, energyHeight } from '../assets/v3.3.0-20260816051000/core/energyChess.js';

test('la altura energética es simétrica por color',()=>{
  assert.equal(energyHeight('w',1),0);
  assert.equal(energyHeight('w',8),7);
  assert.equal(energyHeight('b',8),0);
  assert.equal(energyHeight('b',1),7);
});

test('modo 1 usa masa 1/n y la posición inicial tiene ΔE cero',()=>{
  const chess=new Chess();
  const a=analyzeEnergyPosition(chess,{g:1,massMode:'uniform'});
  assert.equal(a.n,32);
  assert.ok(a.rows.every(row=>Math.abs(row.mass-1/32)<1e-12));
  assert.ok(Math.abs(a.rows.reduce((sum,row)=>sum+row.mass,0)-1)<1e-12);
  assert.ok(Math.abs(a.delta.E)<1e-12);
  assert.equal(a.rows.filter(row=>row.color==='w').reduce((sum,row)=>sum+row.v,0),20);
  assert.equal(a.rows.filter(row=>row.color==='b').reduce((sum,row)=>sum+row.v,0),20);
});

test('modo 2 aplica valor normalizado multiplicado por 1/n',()=>{
  const chess=new Chess();
  const a=analyzeEnergyPosition(chess,{g:1,massMode:'weighted',kingWeight:4});
  const sumMass=a.rows.reduce((sum,row)=>sum+row.mass,0);
  assert.ok(Math.abs(sumMass-1/a.n)<1e-12);
  const queen=a.rows.find(row=>row.square==='d1');
  const pawn=a.rows.find(row=>row.square==='d2');
  assert.ok(queen.mass>pawn.mass);
});

test('E-COM evalúa solo todas las candidatas de una semijugada',()=>{
  const chess=new Chess();
  const result=chooseEnergyMoveOnePly(chess,{g:1,massMode:'uniform'},'E');
  assert.equal(result.color,'w');
  assert.equal(result.priority,'E');
  assert.equal(result.candidates.length,20);
  assert.ok(result.best);
  assert.equal(result.best.objective,Math.max(...result.candidates.map(candidate=>candidate.objective)));
  const after=new Chess();
  after.move({from:result.best.from,to:result.best.to,promotion:result.best.promotion||'q'});
  assert.equal(after.history().length,1);
});

test('la prioridad puede cambiar entre E, U y K',()=>{
  const chess=new Chess();
  for(const metric of ['E','U','K']){
    const result=chooseEnergyMoveOnePly(chess,{g:1,massMode:'uniform'},metric);
    assert.equal(result.priority,metric);
    assert.equal(result.best.objective,Math.max(...result.candidates.map(candidate=>candidate.objective)));
  }
});

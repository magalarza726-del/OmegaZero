import test from 'node:test';
import assert from 'node:assert/strict';
import { determinant, matrixMultiply, matrixInverse, identityMatrix } from '../assets/v3.2.0-20260816035000/core/algebraicChess.js';
import { normalizeFiniteSeries, finiteExtent } from '../assets/v3.2.0-20260816035000/core/seriesMath.js';
import { stableTransformScore } from '../assets/v3.2.0-20260816035000/core/tcom.js';

const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} ≉ ${b}`);

test('álgebra matricial básica conserva resultados conocidos',()=>{
  assert.equal(determinant([[1,2],[3,4]]),-2);
  assert.deepEqual(matrixMultiply([[1,2],[3,4]],identityMatrix(2)),[[1,2],[3,4]]);
  const inv=matrixInverse([[4,7],[2,6]]);
  near(inv[0][0],0.6); near(inv[0][1],-0.7); near(inv[1][0],-0.2); near(inv[1][1],0.4);
});

test('normalización de series respeta límites y valores no finitos',()=>{
  const values=normalizeFiniteSeries([-2,0,2,NaN],-20,20);
  near(values[0],-20); near(values[1],0); near(values[2],20);
  assert.equal(values[3],null);
  assert.deepEqual(finiteExtent([-3,4,NaN]),{min:-3,max:4,count:2});
});

test('T-COM estabiliza valores numéricos',()=>{
  assert.equal(stableTransformScore(12,false),12);
  assert.ok(Number.isFinite(stableTransformScore(Infinity,true)));
});

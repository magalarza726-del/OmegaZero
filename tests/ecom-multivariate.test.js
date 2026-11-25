import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../assets/v4.3.0-20261104200000/vendor/chess.js';
import { evaluateParameters, chooseMultivariateMoveOnePly } from '../assets/v4.3.0-20261104200000/core/multivariateChess.js';
import { compileEcomFormula, DEFAULT_ECOM_FORMULA } from '../assets/v4.3.0-20261104200000/core/ecomExpressions.js';
test('initial parameters are finite, symmetric and independently defined',()=>{
 const w=evaluateParameters(new Chess(),'w'),b=evaluateParameters(new Chess(),'b');
 assert.equal(Object.keys(w).length,20);assert.ok(Object.values(w).every(Number.isFinite));assert.deepEqual(w,b);assert.equal(w.x1,20);assert.equal(w.x13,0);assert.equal(w.x20,1);
});
test('LaTeX and auxiliary definitions',()=>{
 assert.equal(compileEcomFormula('f=\\frac{x_{1}^{2}}{2}+\\sqrt{x_{2}}').evaluate({x1:3,x2:4}),6.5);
 assert.equal(compileEcomFormula('a=2\ng(t)=t^2\nf=g(x1)+ax2').evaluate({x1:3,x2:4}),17);
 assert.equal(compileEcomFormula('f=\\left\\{x_{1}>2:3,5\\right\\}').evaluate({x1:3}),3);
 assert.equal(compileEcomFormula('f=2x1x2').evaluate({x1:3,x2:4}),24);
 assert.throws(()=>compileEcomFormula('a=b\nb=a\nf=a'));
 assert.throws(()=>compileEcomFormula('f=window.alert(1)'));
});
test('one ply enumerates all legal candidates without changing the source',()=>{
 const p=new Chess(),fen=p.fen(),d=chooseMultivariateMoveOnePly(p,compileEcomFormula(DEFAULT_ECOM_FORMULA).evaluate);
 assert.equal(d.candidates.length,20);assert.equal(p.fen(),fen);assert.ok(d.candidates.every(c=>c.fen.split(' ')[1]==='b'));assert.equal(d.best.objective,Math.max(...d.candidates.map(c=>c.objective)));
});
test('immediate mate is mandatory and undefined functions do not fall back',()=>{
 const d=chooseMultivariateMoveOnePly(new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),()=>-9999);assert.ok(d.best.mate);
 const invalid=chooseMultivariateMoveOnePly(new Chess(),compileEcomFormula('f=1/0').evaluate);assert.equal(invalid.best,null);
});

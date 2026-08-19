import test from 'node:test';
import assert from 'node:assert/strict';
import { PAWN_STRUCTURE_CODES, decodePawnStructure, analyzePawnStructure } from '../assets/v3.5.1-20260819051500/core/pawnStructures.js';

test('el alfabeto contiene exactamente 625 códigos únicos',()=>{
  assert.equal(PAWN_STRUCTURE_CODES.length,625);
  assert.equal(new Set(PAWN_STRUCTURE_CODES).size,625);
  assert.equal(PAWN_STRUCTURE_CODES[0],'0000');
  assert.ok(PAWN_STRUCTURE_CODES.includes('1239'));
  assert.ok(PAWN_STRUCTURE_CODES.includes('9999'));
});

test('9 representa ausencia y nunca altura',()=>{
  const a=analyzePawnStructure('1239');
  assert.equal(a.presentPawns,3);
  assert.equal(a.absentPawns,1);
  assert.equal(a.totalAdvance,6);
  assert.deepEqual(a.gradient,[1,1,null]);
  assert.equal(a.openFileCount,1);
});

test('gradientes canónicos son reproducibles',()=>{
  assert.deepEqual(analyzePawnStructure('0123').gradient,[1,1,1]);
  assert.deepEqual(analyzePawnStructure('3210').gradient,[-1,-1,-1]);
  assert.deepEqual(analyzePawnStructure('0110').gradient,[1,0,-1]);
});

test('todas las estructuras satisfacen invariantes geométricos',()=>{
  for(const code of PAWN_STRUCTURE_CODES){
    const a=analyzePawnStructure(code);
    assert.equal(a.cells.length,36,code);
    assert.equal(a.presentPawns+a.absentPawns,4,code);
    assert.equal(a.openFileCount,a.absentPawns,code);
    assert.ok(a.controlledUniqueCount>=0 && a.controlledUniqueCount<=36,code);
    assert.ok(a.behindCount>=0 && a.behindCount<=36,code);
    assert.ok(a.aheadUncontrolledCount>=0 && a.aheadUncontrolledCount<=36,code);
    assert.equal(a.gradient.length,3,code);
  }
});

test('códigos inválidos son rechazados',()=>{
  for(const bad of ['','000','00000','0004','abcd','12 3']) assert.throws(()=>decodePawnStructure(bad));
});

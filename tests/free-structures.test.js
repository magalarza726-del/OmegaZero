import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRowWindow, freeFamilySignature, analyzeFreePieceConfiguration,
  buildFreePieceFamilies,
} from '../assets/v3.3.0-20260816051000/core/freePieceStructures.js';

test('la ventana libre admite filas 1-8 con amplitud máxima de cuatro',()=>{
  assert.deepEqual(normalizeRowWindow(2,5),{start:2,end:5,height:4});
  assert.deepEqual(normalizeRowWindow(1,3),{start:1,end:3,height:3});
  assert.deepEqual(normalizeRowWindow(6,8),{start:6,end:8,height:3});
  assert.deepEqual(normalizeRowWindow(1,8),{start:1,end:4,height:4});
});

test('traslaciones de una misma batería conservan la familia',()=>{
  const a=[{type:'Q',square:'d2'},{type:'R',square:'d3'},{type:'R',square:'d4'}];
  const b=[{type:'Q',square:'f3'},{type:'R',square:'f4'},{type:'R',square:'f5'}];
  assert.equal(freeFamilySignature(a).key,freeFamilySignature(b).key);
});

test('una pistola de Alekhine proyecta dos subacciones detrás de la pieza principal',()=>{
  const a=analyzeFreePieceConfiguration([{type:'Q',square:'d2'},{type:'R',square:'d3'},{type:'R',square:'d4'}]);
  for(const square of ['d5','d6','d7','d8'])assert.equal(a.subactionControl.get(square),2,square);
  assert.equal(a.family.battery,'O3');
});

test('caballos no generan subacciones lineales',()=>{
  const a=analyzeFreePieceConfiguration([{type:'N',square:'c3'},{type:'N',square:'e4'},{type:'N',square:'f2'},{type:'N',square:'g5'}]);
  assert.equal(a.subactionControl.size,0);
  assert.ok(a.actionControl.size>0);
});

test('el generador acepta piezas repetidas y conserva hasta diez ejemplos por familia',()=>{
  const result=buildFreePieceFamilies(['R','R','Q'],2,5);
  assert.ok(result.families.length>0);
  assert.ok(result.configurations>0);
  assert.ok(result.families.every(f=>f.examples.length<=10));
  assert.ok(result.families.some(f=>f.battery==='O3'));
});

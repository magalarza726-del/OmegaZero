import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeStructureBoard, standardEditorPosition } from '../assets/v3.5.0-20260819043000/core/structureBoardEditor.js';

test('el editor analiza un solo bando y conserva al rival como bloqueador',()=>{
  const pieces=[{color:'w',type:'r',square:'a1'},{color:'b',type:'p',square:'a4'},{color:'b',type:'r',square:'h8'}];
  const white=analyzeStructureBoard(pieces,'w');
  assert.equal(white.actionControl.get('a2'),1);
  assert.equal(white.actionControl.get('a3'),1);
  assert.equal(white.actionControl.get('a4'),1);
  assert.equal(white.actionControl.has('a5'),false);
  assert.equal(white.analyzedPieces,1);
  const black=analyzeStructureBoard(pieces,'b');
  assert.equal(black.analyzedPieces,2);
});

test('una pistola de Alekhine produce profundidad de subacción dos',()=>{
  const analysis=analyzeStructureBoard([
    {color:'w',type:'q',square:'d2'},
    {color:'w',type:'r',square:'d3'},
    {color:'w',type:'r',square:'d4'},
  ],'w');
  assert.equal(analysis.subactionControl.get('d5'),2);
  assert.equal(analysis.subactionControl.get('d8'),2);
  assert.ok(analysis.subactionDoubleCount>=4);
  assert.equal(analysis.maxSubaction,2);
});

test('una pieza rival o incompatible corta la cadena de subacción',()=>{
  const analysis=analyzeStructureBoard([
    {color:'w',type:'q',square:'d1'},
    {color:'b',type:'p',square:'d2'},
    {color:'w',type:'r',square:'d3'},
  ],'w');
  assert.equal(analysis.maxSubaction,0);
});

test('los peones controlan en la dirección correspondiente al color',()=>{
  const white=analyzeStructureBoard([{color:'w',type:'p',square:'d4'}],'w');
  assert.equal(white.actionControl.get('c5'),1);
  assert.equal(white.actionControl.get('e5'),1);
  const black=analyzeStructureBoard([{color:'b',type:'p',square:'d5'}],'b');
  assert.equal(black.actionControl.get('c4'),1);
  assert.equal(black.actionControl.get('e4'),1);
});

test('la posición inicial del editor contiene las 32 piezas',()=>{
  const position=standardEditorPosition();
  assert.equal(position.length,32);
  assert.equal(new Set(position.map(piece=>piece.square)).size,32);
});

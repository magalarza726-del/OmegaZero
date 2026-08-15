import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPawnFamilies, buildMinorFamilies, buildMajorFamilies,
  pawnFamilySignature, pieceFamilySignature, analyzePieceConfiguration,
  gradient2D, gradientDirection,
} from '../assets/v3.1.0-20260815173000/core/structureFamilies.js';

test('las 625 estructuras de peones se agrupan en familias de gradiente 1D',()=>{
  const families=buildPawnFamilies();
  assert.equal(families.length,68);
  assert.equal(new Set(families.map(f=>f.key)).size,families.length);
  assert.ok(families.every(f=>f.examples.length<=10));
  assert.equal(pawnFamilySignature('0123'),'1111:UUU');
  assert.equal(pawnFamilySignature('1239'),'1110:UUX');
});

test('las piezas menores generan 512 familias direccionales reproducibles',()=>{
  const families=buildMinorFamilies();
  assert.equal(families.length,512);
  assert.ok(families.every(f=>f.examples.length<=10));
  for(const family of families){
    for(const config of [family.representative,...family.examples]){
      assert.equal(pieceFamilySignature(config),family.key);
      const a=analyzePieceConfiguration('minor',config);
      assert.ok(a.pieces.every(p=>p.y>=2&&p.y<=5));
      assert.equal(new Set(a.squares).size,4);
    }
  }
});

test('las piezas mayores generan familias sobre filas 1 a 3',()=>{
  const families=buildMajorFamilies();
  assert.equal(families.length,452);
  assert.ok(families.every(f=>f.examples.length<=10));
  for(const family of families){
    for(const config of [family.representative,...family.examples]){
      assert.equal(pieceFamilySignature(config),family.key);
      const a=analyzePieceConfiguration('major',config);
      assert.ok(a.pieces.every(p=>p.y>=1&&p.y<=3));
      assert.equal(new Set(a.squares).size,4);
    }
  }
});

test('el gradiente 2D conserva vector exacto y dirección por separado',()=>{
  const g=gradient2D(['c3','f4','g2','f3']);
  assert.deepEqual(g,[{dx:3,dy:1},{dx:1,dy:-2},{dx:-1,dy:1}]);
  assert.deepEqual(g.map(gradientDirection),['NE','SE','NW']);
});

test('el mapa de control separa frente y retaguardia',()=>{
  const a=analyzePieceConfiguration('minor',['c3','d4','e4','f3']);
  assert.ok(a.frontControlledCount>0);
  assert.ok(a.backControlledCount>0);
  assert.equal(a.directionSignature,'NE|E|SE');
});

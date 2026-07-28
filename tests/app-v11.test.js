import test from 'node:test';
import assert from 'node:assert/strict';
import { OPENINGS, openingTreeHtml } from '../src/openings.js';

test('la biblioteca ampliada contiene categorías y familias',()=>{
  assert.ok(OPENINGS.length >= 90);
  for(const c of ['Abiertas','Semiabiertas','Cerradas','Semicerradas','De flanco','Irregulares']) assert.ok(OPENINGS.some(o=>o.category===c));
  assert.ok(OPENINGS.some(o=>o.name==='Siciliana Dragón'));
  assert.ok(OPENINGS.some(o=>o.family==='Defensa Siciliana · Abierta'));
});

test('el árbol de aperturas es navegable',()=>{
  const html=openingTreeHtml('B70');
  assert.match(html,/Abiertas/);
  assert.match(html,/Defensa Siciliana · Abierta/);
  assert.match(html,/Siciliana Dragón/);
  assert.match(html,/active/);
});

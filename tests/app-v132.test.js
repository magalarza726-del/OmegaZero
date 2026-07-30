import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../src/version.js',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const bat=fs.readFileSync(new URL('../INICIAR.bat',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('v1.3.3 incorpora la conversión Elo que bloqueaba las pantallas de partida',()=>{
  assert.match(main,/eloForSkill\(skill\)/);
  assert.match(main,/\[650,750,850/);
  assert.match(main,/3200/);
});

test('todas las llamadas this.metodo tienen una definición en la clase',()=>{
  const methods=new Set([...main.matchAll(/\n\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^\n{}]*\)\s*\{/g)].map(m=>m[1]));
  const calls=new Set([...main.matchAll(/this\.([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
  const missing=[...calls].filter(name=>!methods.has(name));
  assert.deepEqual(missing,[]);
});

test('un error de vista muestra recuperación y no una pantalla negra',()=>{
  assert.match(main,/renderViewError\(error\)/);
  assert.match(main,/No se pudo abrir esta sección/);
  assert.match(main,/VOLVER AL INICIO/);
  assert.match(main,/Reintentar/);
});

test('la versión visible y el iniciador coinciden con el paquete',()=>{
  assert.equal(pkg.version,'2.6.0');
  assert.match(version,/APP_VERSION = '2\.6\.0'/);
  assert.match(bat,/v2\.6\.0/);
  assert.match(html,/OmegaZero v2\.6\.0/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION, STORAGE_NAMESPACE } from '../src/version.js';

const storage=fs.readFileSync(new URL('../src/storage.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../SERVIDOR.py',import.meta.url),'utf8');

test('v2 usa un esquema de datos separado y versionado',()=>{
  assert.equal(APP_VERSION,'2.5.1');
  assert.equal(STORAGE_NAMESPACE,'omegazero:v2');
  assert.match(storage,/STORAGE_NAMESPACE/);
  assert.match(storage,/IndexedDB/);
  assert.match(storage,/schemaVersion: 2/);
});

test('los datos antiguos requieren una decisión de migración',()=>{
  assert.match(storage,/getMigrationInfo/);
  assert.match(storage,/migrateLegacyData/);
  assert.match(storage,/declineLegacyMigration/);
  assert.match(main,/Migrar datos anteriores/);
  assert.match(main,/Empezar limpio/);
});

test('borrar entrenamiento y restablecer son operaciones distintas',()=>{
  assert.match(storage,/clearGamesAndTraining/);
  assert.match(storage,/resetAllAppData/);
  assert.match(main,/Borrar partidas y entrenamiento/);
  assert.match(main,/Restablecer toda la aplicación/);
});

test('la compilación usa recursos únicos y manifiesto de versión',()=>{
  assert.match(build,/assets.*buildId/s);
  assert.match(build,/version\.json/);
});

test('el servidor busca otro puerto cuando el inicial está ocupado',()=>{
  assert.match(server,/choose_port/);
  assert.match(server,/--max-port/);
  assert.match(server,/ULTIMA_DIRECCION\.txt/);
  assert.match(server,/webbrowser\.open_new_tab/);
});

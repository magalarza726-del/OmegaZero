import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const asset=join(repo,'assets','v3.3.0-20260816051000');
function files(dir){return readdirSync(dir).flatMap(name=>{const p=join(dir,name);return statSync(p).isDirectory()?files(p):[p]})}

test('el repositorio se mantiene por debajo del límite de 100 archivos',()=>{
  const count=files(repo).length;
  assert.ok(count<100,`El proyecto contiene ${count} archivos`);
});

test('main.js es composition root y las áreas están modularizadas',()=>{
  const main=readFileSync(join(asset,'main.js'),'utf8');
  const lines=main.split(/\r?\n/).length;
  assert.ok(lines<100,`main.js aún tiene ${lines} líneas`);
  for(const module of ['appChrome','board','play','learn','library','pawnGallery','structureStudy','freeStructureStudy','energyAnalysis','tcom','transform']){
    assert.ok(readFileSync(join(asset,'features',module+'.js'),'utf8').includes(`export const ${module}Methods`),module);
    assert.ok(main.includes(`./features/${module}.js`),module);
  }
});

test('inicio expone Jugar, Aprender e Investigar',()=>{
  const chrome=readFileSync(join(asset,'features','appChrome.js'),'utf8');
  for(const label of ['>Jugar<','>Aprender<','>Investigar<']) assert.ok(chrome.includes(label),label);
  for(const destination of ['setup','analysis','strategy','library','stockfishTransform','tcomLab','energyAnalysis','structureStudy']) assert.ok(chrome.includes(`data-go=\"${destination}\"`),destination);
});


test('Estudiar estructuras ofrece vista Lista y Galería persistente',()=>{
  for(const module of ['pawnGallery','structureStudy','freeStructureStudy']){
    const source=readFileSync(join(asset,'features',module+'.js'),'utf8');
    assert.ok(source.includes('structureViewMode'),module);
    assert.ok(source.includes('data-structure-view=\"list\"'),module);
    assert.ok(source.includes('data-structure-view=\"gallery\"'),module);
    assert.ok(source.includes('gallery-mode'),module);
  }
});

test('la página de producción apunta solo al build v3',()=>{
  const html=readFileSync(join(repo,'index.html'),'utf8');
  assert.ok(html.includes('v3.3.0-20260816051000'));
  assert.ok(!html.includes('v3.0.0-20260813083000'));
  assert.ok(!html.includes('v2.8.6-20260812215800'));
});

test('la refactorización conserva el namespace de datos de v2',()=>{
  const version=readFileSync(join(asset,'version.js'),'utf8');
  assert.ok(version.includes("STORAGE_NAMESPACE = 'omegazero:v2'"));
});

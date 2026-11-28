import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(join(repo,'version.json'),'utf8'));
const asset=join(repo,manifest.assetRoot);
const features=join(asset,'features');
const html=readFileSync(join(repo,'index.html'),'utf8');
const main=readFileSync(join(asset,'main.js'),'utf8');
const featureSource=readdirSync(features)
  .filter(name=>name.endsWith('.js'))
  .map(name=>readFileSync(join(features,name),'utf8'))
  .join('\n');

test('producción apunta a un único build activo declarado por version.json',()=>{
  assert.ok(existsSync(asset),`No existe ${manifest.assetRoot}`);
  const referenced=[...html.matchAll(/\.\/assets\/([^/"'?]+)/g)].map(match=>match[1]);
  assert.ok(referenced.length>0,'index.html no referencia recursos versionados');
  assert.deepEqual([...new Set(referenced)],[basename(asset)]);
});

test('main.js es composition root y las áreas activas están modularizadas',()=>{
  const lines=main.split(/\r?\n/).length;
  assert.ok(lines<100,`main.js aún tiene ${lines} líneas`);
  for(const module of ['appChromeBase','board','playBase','variantPlay','chess960Research','chessInCave','learnBase','library','pawnGallery','structureStudyBase','freeStructureStudy','energyAnalysis','tcomBase','transform','modelLab']){
    assert.ok(main.includes(`./features/${module}.js`),module);
    assert.ok(existsSync(join(features,module+'.js')),module);
  }
});

test('inicio expone Jugar, Aprender e Investigar y sus destinos actuales',()=>{
  for(const label of ['Jugar','Aprender','Investigar']) assert.ok(featureSource.includes(label),label);
  for(const destination of ['setup','analysis','strategy','library','stockfishTransform','tcomLab','energyAnalysis','research960','chessInCave','structureStudy']){
    assert.ok(featureSource.includes(destination),destination);
  }
});

test('Estudiar estructuras conserva vistas Lista y Galería persistentes',()=>{
  for(const token of ['structureViewMode','data-structure-view="list"','data-structure-view="gallery"','gallery-mode']){
    assert.ok(featureSource.includes(token),token);
  }
});

test('la página de producción no mezcla builds históricos',()=>{
  assert.ok(html.includes(manifest.assetRoot));
  const builds=[...html.matchAll(/v\d+\.\d+\.\d+-\d{14}/g)].map(match=>match[0]);
  assert.deepEqual([...new Set(builds)],[basename(asset)]);
});

test('la refactorización conserva el namespace de datos de v2',()=>{
  const version=readFileSync(join(asset,'version.js'),'utf8');
  assert.ok(version.includes("STORAGE_NAMESPACE = 'omegazero:v2'"));
});

 test('960 Research comparte los motores visual y de decisión de Jugar',()=>{
  const research=readFileSync(join(features,'chess960Research.js'),'utf8');
  assert.ok(main.includes("research960:'render960Research'"));
  assert.ok(research.includes('this.boardHtml('));
  assert.ok(research.includes('this.chooseComBrainDecision('));
  assert.ok(!research.includes('this.engine.analyse('));
});

test('los botones de panel no sobrescriben las casillas del tablero compartido',()=>{
  for(const name of ['styles-base.css','styles-dashboard.css']){
    const css=readFileSync(join(asset,name),'utf8');
    assert.ok(css.includes('.panel button:not(.primary):not(.sq)'));
    assert.ok(!/\.panel button:not\(\.primary\)\s*\{/.test(css));
  }
  const research=readFileSync(join(features,'chess960Research.js'),'utf8');
  assert.ok(research.includes('class="research960-boards"'));
  assert.ok(research.includes('class="panel research960-game"'));
});

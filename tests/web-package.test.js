import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const manifest=JSON.parse(readFileSync(resolve(root,'version.json'),'utf8'));
const workflow=readFileSync(resolve(root,'.github/workflows/test.yml'),'utf8');
const active=resolve(root,manifest.assetRoot);
const main=readFileSync(resolve(active,'main.js'),'utf8');
const utils=readFileSync(resolve(active,'core/utils.js'),'utf8');
const engine=readFileSync(resolve(active,'engine.js'),'utf8');
const assets=readFileSync(resolve(active,'publicAssets.js'),'utf8');
const index=readFileSync(resolve(root,'index.html'),'utf8');

test('la distribución actual es exclusivamente web y no contiene Capacitor',()=>{
  assert.equal(pkg.version,manifest.version);
  assert.equal(pkg.name,'omegazero');
  assert.equal(pkg.dependencies,undefined);
  assert.doesNotMatch(main,/setupNativePlatform|Capacitor/);
  assert.doesNotMatch(utils,/Capacitor|Android WebView/);
  assert.equal(existsSync(resolve(root,'capacitor.config.json')),false);
  assert.equal(existsSync(resolve(root,'android')),false);
});

test('CI ejecuta la suite y la raíz está preparada para GitHub Pages',()=>{
  assert.match(workflow,/actions\/checkout@v4/);
  assert.match(workflow,/actions\/setup-node@v4/);
  assert.match(workflow,/npm ci/);
  assert.match(workflow,/npm test/);
  assert.ok(existsSync(resolve(root,'.nojekyll')));
  assert.ok(index.includes(manifest.assetRoot));
});

test('incluye guía y recursos locales del motor',()=>{
  assert.ok(existsSync(resolve(root,'GUIA_GITHUB_PAGES.md')));
  assert.ok(existsSync(resolve(root,'public/engine/stockfish-18-lite-single.js')));
  assert.ok(existsSync(resolve(root,'public/engine/stockfish-18-lite-single.wasm')));
});

test('las rutas de recursos del build activo son compatibles con GitHub Pages',()=>{
  assert.match(index,/\.\/public\/manifest\.webmanifest/);
  assert.match(engine,/publicAsset\('engine\/stockfish-18-lite-single\.js'/);
  assert.match(assets,/new URL\(`\.\/public\//);
  assert.doesNotMatch(engine,/new Worker\('\.\/engine\//);
});

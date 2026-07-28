import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const workflow=readFileSync(resolve(root,'.github/workflows/deploy-pages.yml'),'utf8');
const main=readFileSync(resolve(root,'src/main.js'),'utf8');
const utils=readFileSync(resolve(root,'src/core/utils.js'),'utf8');

test('la distribución es exclusivamente web y no contiene Capacitor',()=>{
  assert.equal(pkg.version,'2.5.0');
  assert.equal(pkg.name,'omegazero-chess-web');
  assert.equal(pkg.dependencies,undefined);
  assert.doesNotMatch(main,/setupNativePlatform|Capacitor/);
  assert.doesNotMatch(utils,/Capacitor|Android WebView/);
  assert.equal(existsSync(resolve(root,'capacitor.config.json')),false);
  assert.equal(existsSync(resolve(root,'android')),false);
});

test('GitHub Pages prueba, construye y publica dist',()=>{
  assert.match(workflow,/actions\/checkout@v6/);
  assert.match(workflow,/actions\/setup-node@v6/);
  assert.match(workflow,/npm test/);
  assert.match(workflow,/npm run build/);
  assert.match(workflow,/actions\/upload-pages-artifact@v3/);
  assert.match(workflow,/actions\/deploy-pages@v4/);
  assert.match(workflow,/path: dist/);
});

test('incluye guía y recursos locales del motor',()=>{
  assert.ok(existsSync(resolve(root,'GUIA_GITHUB_PAGES.md')));
  assert.ok(existsSync(resolve(root,'public/engine/stockfish-18-lite-single.js')));
  assert.ok(existsSync(resolve(root,'public/engine/stockfish-18-lite-single.wasm')));
});

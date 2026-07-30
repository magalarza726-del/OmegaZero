import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Stockfish recibe una URL WASM explícita compatible con GitHub Pages', async () => {
  const source = await read('src/engine.js');
  assert.match(source, /stockfish-18-lite-single\.wasm/);
  assert.match(source, /#\$\{encodeURIComponent\(wasmUrl\)\}/);
  assert.match(source, /ENGINE_INIT_TIMEOUT_MS = 90000/);
});

test('el binario Stockfish incluye fallback de instantiateStreaming', async () => {
  const source = await read('public/engine/stockfish-18-lite-single.js');
  assert.match(source, /\.clone\(\)/);
  assert.match(source, /arrayBuffer\(\)/);
  assert.match(source, /WebAssembly\.instantiate\(e,n\)/);
});

test('la interfaz muestra el error real del motor', async () => {
  const source = await read('src/main.js');
  assert.match(source, /Motor no disponible · \$\{error\?\.message/);
});

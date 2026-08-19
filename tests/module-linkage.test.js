import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key),
  key: index => [...memory.keys()][index] ?? null,
  get length(){ return memory.size; },
};

const modules = ['appChrome','board','play','learn','library','pawnGallery','structureStudy','freeStructureStudy','amongUsChess','tcom','transform'];

test('todos los módulos de features enlazan sus imports y exportan métodos', async () => {
  const names = new Set();
  let total = 0;
  for (const moduleName of modules) {
    const mod = await import(`../assets/v3.5.0-20260819043000/features/${moduleName}.js`);
    const methods = mod[`${moduleName}Methods`];
    assert.ok(methods && typeof methods === 'object', moduleName);
    for (const [name, fn] of Object.entries(methods)) {
      assert.equal(typeof fn, 'function', `${moduleName}.${name}`);
      assert.ok(!names.has(name), `método duplicado: ${name}`);
      names.add(name);
      total += 1;
    }
  }
  // La refactorización conserva al menos los 222 métodos funcionales de v3.0 y añade Estudiar estructuras.
  assert.ok(total >= 222, `solo se enlazaron ${total} métodos`);
});

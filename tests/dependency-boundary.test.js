import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const version=JSON.parse(readFileSync(resolve(root,'version.json'),'utf8'));
const depsPath=resolve(root,version.assetRoot,'app/deps.js');
const source=readFileSync(depsPath,'utf8');

test('app/deps.js no exporta dos veces el mismo identificador',()=>{
  const exported=[];
  for(const match of source.matchAll(/export\s*\{([^}]+)\}\s*from/g)){
    for(const raw of match[1].split(',')){
      const token=raw.trim();
      if(!token)continue;
      const alias=token.match(/\bas\s+([\w$]+)$/)?.[1];
      const direct=token.match(/^([\w$]+)/)?.[1];
      exported.push(alias||direct);
    }
  }
  const duplicates=exported.filter((name,index)=>exported.indexOf(name)!==index);
  assert.deepEqual([...new Set(duplicates)],[]);
});

test('la frontera común conserva ambos selectores DOM $ y $$',()=>{
  assert.match(source,/export\s*\{[^}]*\$\s*,\s*\$\$/s);
});

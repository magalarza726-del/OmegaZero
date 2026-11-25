import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRANDMASTER_MATRIX, APPENDIX_MATRIX} from '../assets/v4.3.0-20261104200000/features/gameMatrices.js';

const read=p=>readFileSync(new URL('../assets/v4.3.0-20261104200000/manual-chapters/'+p,import.meta.url),'utf8');
test('Grandmaster matrix retains all original texts and saved progress IDs',()=>{
 const originals=['08a.html','08b.html','08c.html','08d.html'].flatMap(p=>[...read(p).matchAll(/data-gm-check="([^"]+)"><span class="gm-level-number">(\d+)<\/span><span>(.*?)<\/span>/g)].map(m=>({id:m[1],level:Number(m[2]),text:m[3]})));
 assert.equal(GRANDMASTER_MATRIX.length,20);
 assert.ok(GRANDMASTER_MATRIX.every(g=>g.items.length===5));
 assert.equal(new Set(originals.map(i=>i.id)).size,100);
 assert.deepEqual(GRANDMASTER_MATRIX.flatMap(g=>g.items),originals);
});
test('Appendix matrix converts all nine original actions into checks',()=>{
 assert.equal(APPENDIX_MATRIX.length,3);
 assert.ok(APPENDIX_MATRIX.every(g=>g.items.length===3));
 assert.deepEqual(APPENDIX_MATRIX.flatMap(g=>g.items.map(i=>i.text)),[...read('10.html').matchAll(/<li>(.*?)<\/li>/g)].map(m=>m[1]));
});

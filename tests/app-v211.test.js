import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('J1 vs COM no encadena una jugada de la IA sobre el turno humano',()=>{
  assert.match(main,/this\.cfg\.mode==='pvc'&&this\.chess\.turn\(\)!==this\.cfg\.humanColor/);
  assert.match(main,/this\.cfg\.mode==='pvc'&&this\.chess\.turn\(\)===this\.cfg\.humanColor\)return/);
});

test('la configuración se sincroniza y persiste mientras se edita',()=>{
  assert.match(main,/bindLiveSetupPersistence/);
  assert.match(main,/persistSetupConfig/);
  assert.match(main,/gameConfig/);
});

test('el análisis usa barra vertical, lista compacta y mejores continuaciones',()=>{
  for(const token of ['analysis-eval-rail','analysis-moves-list','Mejores continuaciones','Herramientas y configuración']) assert.match(main,new RegExp(token));
  assert.match(css,/\.analysis-workspace/);
  assert.match(css,/\.analysis-eval-rail/);
  assert.match(css,/\.candidate-line/);
});

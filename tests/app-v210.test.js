import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPlayerEloStats } from '../src/core/statistics.js';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const statistics=fs.readFileSync(new URL('../src/core/statistics.js',import.meta.url),'utf8');

test('el estimador probabilístico calcula media, mediana y desviación desde J1 vs COM',()=>{
  const stats=buildPlayerEloStats([
    {id:'a',mode:'pvc',result:'1-0',humanColor:'w',engineElo:1500},
    {id:'b',mode:'pvc',result:'1/2-1/2',humanColor:'b',engineElo:1700},
    {id:'c',mode:'pvc-simultaneous',result:'0-1',humanColor:'w',engineElo:1900},
    {id:'x',mode:'cvc',result:'1-0',engineElo:3200},
  ]);
  assert.equal(stats.count,3);
  assert.ok(stats.mean>1600&&stats.mean<1750);
  assert.ok(stats.median>1600&&stats.median<1750);
  assert.ok(stats.standardDeviation>150);
  assert.ok(stats.credibleLow<stats.median&&stats.credibleHigh>stats.median);
});

test('perder contra 3200 apenas cambia la estimación y no aplica -191',()=>{
  const high=buildPlayerEloStats([{mode:'pvc',result:'0-1',humanColor:'w',engineElo:3200}]);
  const low=buildPlayerEloStats([{mode:'pvc',result:'0-1',humanColor:'w',engineElo:1200}]);
  assert.ok(high.mean>1400&&high.mean<1650);
  assert.ok(low.mean<1100);
  assert.ok(high.mean-low.mean>400);
  assert.doesNotMatch(statistics,/\+191|−191|-191/);
});

test('vencer a un bot 3200 aporta mucha más evidencia que perder contra él',()=>{
  const win=buildPlayerEloStats([{mode:'pvc',result:'1-0',humanColor:'w',engineElo:3200}]);
  const loss=buildPlayerEloStats([{mode:'pvc',result:'0-1',humanColor:'w',engineElo:3200}]);
  assert.ok(win.mean>2800);
  assert.ok(win.mean-loss.mean>1200);
  assert.equal(loss.reliability,'Preliminar');
});

test('las partidas antiguas sin nivel no se estiman silenciosamente',()=>{
  const stats=buildPlayerEloStats([{mode:'pvc',result:'1-0',white:'J1',black:'Zero'}]);
  assert.equal(stats.count,0);
  assert.equal(stats.missingMetadata,1);
  assert.equal(stats.excluded,1);
});

test('las nuevas partidas J1 vs COM guardan metadatos del motor',()=>{
  for(const token of ['engineElo:this.eloForSkill','engineSkill:Number','humanColor:this.cfg.humanColor','engineDepth:Number']) assert.match(main,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('la pantalla principal presenta el panel permanente de Elo probabilístico',()=>{
  for(const token of ['Elo probabilístico estimado','Media','Mediana','Desviación estándar','no existe una suma o resta fija por partida']) assert.match(main,new RegExp(token));
  assert.match(css,/\.elo-stat-grid/);
});

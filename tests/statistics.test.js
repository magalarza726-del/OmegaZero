import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGameStats, buildTrainingStats, estimateWdl } from '../assets/v3.2.0-20260816035000/core/statistics.js';

test('estadísticas vacías no producen NaN',()=>{
  const games=buildGameStats([]),training=buildTrainingStats([]);
  assert.equal(games.total,0);
  assert.equal(training.total,0);
  assert.ok(Number.isFinite(training.average));
});

test('estimación WDL cambia con el signo de la evaluación',()=>{
  const positive=estimateWdl(200),negative=estimateWdl(-200);
  assert.ok(positive.white>negative.white);
  assert.ok(positive.black<negative.black);
});

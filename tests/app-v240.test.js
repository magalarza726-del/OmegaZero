import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const sounds = readFileSync(new URL('../src/ui/sounds.js', import.meta.url), 'utf8');
const storage = readFileSync(new URL('../src/storage.js', import.meta.url), 'utf8');

 test('partidas simultáneas incluyen reloj independiente configurable', () => {
  assert.match(main, /id="independentSimClocks"/);
  assert.match(main, /this\.cfg\.independentSimClocks/);
  assert.match(main, /Reloj independiente para cada partida/);
  assert.match(main, /sessions=this\.cfg\.independentSimClocks\?this\.simultaneous\.games/);
});

test('COM vs COM conserva los desplazamientos durante el redibujado', () => {
  assert.match(main, /captureGameScroll\(\)/);
  assert.match(main, /restoreGameScroll\(scrollState\)/);
  assert.match(main, /requestAnimationFrame\(\(\)=>\{apply\(\);requestAnimationFrame\(apply\)/);
});

test('Estrategia revisa una jugada fuera de las tres candidatas', () => {
  assert.match(main, /buildStrategyReview/);
  assert.match(main, /strategyReviewHtml/);
  assert.match(main, /reviewPrev/);
  assert.match(main, /reviewNext/);
  assert.match(main, /REINICIAR EJERCICIO Y VOLVER A INTENTAR/);
});

test('explorador de aperturas tiene desplazamiento táctil confinado', () => {
  assert.match(css, /\.opening-tree\{[^}]*overflow-y:auto/);
  assert.match(css, /touch-action:pan-y/);
  assert.match(css, /\.opening-dialog\{height:min\(92dvh,900px\)/);
});

test('partidas magistrales muestran título, evento y jugadores', () => {
  assert.match(main, /masterGameTitle/);
  assert.match(main, /game\.event/);
  assert.match(main, /masterTitle/);
});

test('galería de sonidos usa presets sintetizados y persistentes', () => {
  for (const pack of ['chesscom', 'lichess', 'wood', 'minimal', 'arcade']) assert.match(sounds, new RegExp(pack));
  assert.match(main, /Galería de sonidos/);
  assert.match(main, /data-preview-sound/);
  assert.match(storage, /soundPack: 'chesscom'/);
  assert.match(storage, /soundVolume: 70/);
});

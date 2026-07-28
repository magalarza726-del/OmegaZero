import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const buildId = `v${pkg.version}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
const assetRoot = resolve(dist, 'assets', buildId);

await rm(dist, { recursive: true, force: true });
await mkdir(assetRoot, { recursive: true });
await cp(resolve(root, 'src'), assetRoot, { recursive: true });
await mkdir(resolve(dist, 'public'), { recursive: true });
await cp(resolve(root, 'public'), resolve(dist, 'public'), { recursive: true });
// robots.txt también se copia a la raíz para que los crawlers lo encuentren.
try { await cp(resolve(root, 'public', 'robots.txt'), resolve(dist, 'robots.txt')); } catch {}
await cp(resolve(root, 'CHESS_JS_LICENSE.md'), resolve(dist, 'CHESS_JS_LICENSE.md'));
await cp(resolve(root, 'CHESSBOARD_ELEMENT_LICENSE.md'), resolve(dist, 'CHESSBOARD_ELEMENT_LICENSE.md'));
for (const doc of ['FIDE_RULES.md', 'DATA_SOURCES.md', 'README.md', 'GUIA_GITHUB_PAGES.md', 'MASTER_GAMES_LICENSE.txt', 'OPENINGS_CC0_LICENSE.txt', 'COPYING.txt']) {
  try { await cp(resolve(root, doc), resolve(dist, doc)); } catch {}
}

let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html
  .replace(/\.\/src\/styles\.css(?:\?[^\"']*)?/, `./assets/${buildId}/styles.css`)
  .replace(/\.\/src\/main\.js(?:\?[^\"']*)?/, `./assets/${buildId}/main.js`);
await writeFile(resolve(dist, 'index.html'), html, 'utf8');
await writeFile(resolve(dist, '404.html'), html, 'utf8');
await writeFile(resolve(dist, '.nojekyll'), '', 'utf8');
await writeFile(resolve(dist, 'version.json'), JSON.stringify({ version: pkg.version, buildId, builtAt: new Date().toISOString() }, null, 2), 'utf8');
console.log(`OmegaZero ${pkg.version} construido en dist/ (${buildId})`);

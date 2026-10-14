import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const android=resolve(root,'android-app');
const manifest=readFileSync(resolve(android,'app/src/main/AndroidManifest.xml'),'utf8');
const activity=readFileSync(resolve(android,'app/src/main/java/com/maverick/omegazero/MainActivity.kt'),'utf8');
const appGradle=readFileSync(resolve(android,'app/build.gradle'),'utf8');
const workflow=readFileSync(resolve(root,'.github/workflows/android-apk.yml'),'utf8');
const version=JSON.parse(readFileSync(resolve(root,'version.json'),'utf8'));
const utils=readFileSync(resolve(root,version.assetRoot,'core/utils.js'),'utf8');
const main=readFileSync(resolve(root,version.assetRoot,'main.js'),'utf8');
const index=readFileSync(resolve(root,'index.html'),'utf8');

test('el APK está diseñado para ejecutar OmegaZero sin permiso de Internet',()=>{
  assert.equal(existsSync(android),true);
  assert.doesNotMatch(manifest,/<uses-permission[^>]+android\.permission\.INTERNET/);
  assert.match(activity,/WebViewAssetLoader/);
  assert.match(activity,/appassets\.androidplatform\.net\/assets\/www\/index\.html/);
  assert.match(activity,/uri\.host != APP_HOST/);
});

test('Gradle empaqueta solo el build web activo y Stockfish local',()=>{
  assert.match(appGradle,/versionMeta\.assetRoot/);
  assert.match(appGradle,/activeAssetRoot/);
  assert.match(appGradle,/public\/engine\/stockfish-18-lite-single\.js/);
  assert.match(appGradle,/public\/engine\/stockfish-18-lite-single\.wasm/);
  assert.match(appGradle,/noCompress \+= \['wasm'\]/);
});

test('las exportaciones web tienen un puente nativo Android',()=>{
  assert.match(activity,/addJavascriptInterface\(AndroidBridge\(\), "OmegaZeroAndroid"\)/);
  assert.match(activity,/ACTION_CREATE_DOCUMENT/);
  assert.match(utils,/OmegaZeroAndroid/);
  assert.match(utils,/bridge\.saveText/);
});

test('el arranque Android evita APIs que dejaban WebViews antiguos en blanco',()=>{
  assert.doesNotMatch(main,/\nawait prepareBuild\(\)/);
  assert.match(main,/prepareBuild\(\)\.then\(startOmegaZero/);
  assert.doesNotMatch(utils,/\.replaceAll\(/);
  assert.match(index,/id="omega-boot"/);
  assert.match(index,/String\.prototype\.replaceAll/);
  assert.match(index,/Tiempo de espera agotado al cargar los módulos/);
  assert.match(activity,/LOAD_NO_CACHE/);
  assert.match(activity,/onConsoleMessage/);
});

test('GitHub Actions compila y publica el APK como artefacto',()=>{
  assert.match(workflow,/gradle -p android-app :app:assembleDebug/);
  assert.match(workflow,/actions\/upload-artifact@v4/);
  assert.match(workflow,/OmegaZero-offline-debug\.apk/);
});

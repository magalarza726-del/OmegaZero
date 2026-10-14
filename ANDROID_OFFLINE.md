# OmegaZero Android offline

OmegaZero conserva su arquitectura web actual y se empaqueta dentro de un host Android mínimo en Kotlin. No se reescribió el laboratorio en otra tecnología: la lógica de ajedrez, los módulos de investigación, las aperturas, partidas maestras y Stockfish siguen siendo exactamente los mismos archivos del build web activo.

## Arquitectura

El proyecto Android está en `android-app/`. Durante cada compilación, Gradle lee `version.json`, obtiene `assetRoot` y copia únicamente el build web activo, `index.html`, `version.json` y `public/` a los assets del APK. Esto evita empaquetar todas las versiones históricas del repositorio.

La Activity Kotlin usa `WebViewAssetLoader` y carga:

`https://appassets.androidplatform.net/assets/www/index.html`

Ese origen HTTPS local permite usar módulos ES, Web Workers y el WASM de Stockfish sin depender de un servidor ni de Internet. El manifiesto no solicita `android.permission.INTERNET`.

Los archivos `public/engine/stockfish-18-lite-single.js` y `public/engine/stockfish-18-lite-single.wasm` se verifican durante el build. Si faltan, la compilación falla.

Las exportaciones de texto/PGN/JSON usan el puente `OmegaZeroAndroid.saveText(...)` y abren el selector de archivos de Android. En navegador se mantiene el comportamiento web normal.

## Compilar en GitHub

El workflow `.github/workflows/android-apk.yml` se ejecuta en cada cambio relevante de `main` y también manualmente desde **Actions → OmegaZero Android APK → Run workflow**.

El artefacto resultante se llama:

`OmegaZero-offline-debug.apk`

Es un APK debug instalable y no necesita conexión a Internet durante el uso.

## Compilar localmente

Con JDK 17, Android SDK 35 y Gradle 8.9:

```bash
gradle -p android-app :app:assembleDebug
```

El APK queda en:

`android-app/app/build/outputs/apk/debug/app-debug.apk`

También puede abrirse la carpeta `android-app` como proyecto Gradle en Android Studio. El repositorio completo debe mantenerse como carpeta padre porque el build Android toma de allí el build web activo y los recursos locales.

## Identidad Omega / Zero

- **Zero** mantiene Hipopótamo/semi-Hipopótamo, profilaxis, seguridad del rey, elasticidad y contraataque.
- **Omega** mantiene el perfil táctico e hiperagresivo, pero el módulo **Counter Hipopótamo es condicional**: se activa únicamente al detectar señales reales de Hipopótamo rival. Si no hay Hipopótamo, Omega usa literalmente la primera línea de Stockfish.

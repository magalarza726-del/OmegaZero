# Publicar OmegaZero v2.8.4 en GitHub Pages

Esta edición usa rutas relativas a `public/` y funciona incluso cuando GitHub Pages publica el proyecto bajo una dirección como:

`https://USUARIO.github.io/OmegaZero/`

No depende de `127.0.0.1`, Python ni un servidor propio.

## Método A — Solo desde la web de GitHub (recomendado)

1. Abre tu repositorio.
2. Usa **Add file → Upload files** y reemplaza los archivos con el contenido de esta versión.
3. Comprueba que en la raíz estén `index.html`, `src/` y `public/`.
4. Entra en **Settings → Pages**.
5. En **Source**, selecciona **Deploy from a branch**.
6. Selecciona la rama `main` y la carpeta `/(root)`.
7. Pulsa **Save**.
8. Espera unos minutos y abre la URL mostrada por GitHub.

Este método no necesita la carpeta oculta `.github` ni Node.js. Es el más cómodo cuando todo se administra desde el navegador.

## Método B — GitHub Actions

1. Asegúrate de subir `.github/workflows/deploy-pages.yml`.
2. En **Settings → Pages → Source**, selecciona **GitHub Actions**.
3. Abre **Actions → Probar y publicar OmegaZero** y espera a que termine en verde.

El flujo ejecuta pruebas, construye `dist/` y publica esa compilación.

## Verificación rápida

Al abrir la página deben cumplirse estas tres señales:

- El logo aparece en la cabecera y en la portada.
- La esquina superior derecha cambia a **Motor listo · Stockfish 18**.
- La cabecera muestra **v2.8.4**.

Las rutas esperadas, sustituyendo tu usuario y repositorio, son:

- `https://USUARIO.github.io/REPOSITORIO/public/omegazero-logo.png`
- `https://USUARIO.github.io/REPOSITORIO/public/engine/stockfish-18-lite-single.js`
- `https://USUARIO.github.io/REPOSITORIO/public/engine/stockfish-18-lite-single.wasm`

Si alguna devuelve 404, vuelve a subir la carpeta `public` completa.

## Actualizar desde la web

1. **Add file → Upload files**.
2. Arrastra todos los archivos de la nueva versión.
3. Confirma el reemplazo y crea el commit.
4. Espera la republicación y recarga con `Ctrl + Shift + R`.

## Datos personales

Partidas, estadísticas y preferencias viven en IndexedDB dentro de cada navegador y dirección web. Reemplazar archivos del repositorio no las borra. Cambiar el nombre del repositorio sí crea un origen diferente; antes de hacerlo exporta un respaldo desde Configuración.

# Publicar OmegaZero v3.1.0 en GitHub Pages

La aplicación usa rutas relativas y puede publicarse directamente desde la raíz del repositorio, incluso bajo una URL como `https://USUARIO.github.io/REPOSITORIO/`.

## Publicación desde la web de GitHub

1. Sube **todo el contenido** del ZIP a la rama `main`.
2. Comprueba que en la raíz estén `index.html`, `assets/`, `public/`, `package.json` y `.nojekyll`.
3. En **Settings → Pages**, selecciona **Deploy from a branch**.
4. Elige `main` y `/(root)`.
5. Guarda y espera la publicación.

La versión v3.1.0 contiene menos de 100 archivos para seguir siendo cómoda de subir desde la interfaz web de GitHub.

## Pruebas

Si trabajas desde un PC con Node.js 22 o superior:

```bash
npm test
```

El workflow `.github/workflows/test.yml` ejecuta automáticamente la misma suite en cada push y pull request. Ese workflow **prueba el proyecto; no modifica la configuración de GitHub Pages**.

## Verificación rápida

Al abrir la página deben aparecer las tres áreas principales: **Jugar**, **Aprender** e **Investigar**. La cabecera debe mostrar **v3.1.0** y, tras cargar el WASM, el estado del motor debería pasar a **Motor listo · Stockfish 18**.

Las rutas públicas importantes son relativas al repositorio:

- `public/omegazero-logo.png`
- `public/engine/stockfish-18-lite-single.js`
- `public/engine/stockfish-18-lite-single.wasm`

## Actualizar una versión existente

1. Exporta un respaldo desde Configuración si quieres una copia externa de tus datos.
2. Reemplaza los archivos del repositorio por los de la nueva versión.
3. Haz commit.
4. Espera la republicación y recarga la página.

Las partidas y preferencias continúan usando el mismo namespace de almacenamiento `omegazero:v2`, de modo que la refactorización v3 no borra deliberadamente los datos existentes del navegador.

## Estructura

Consulta `ARCHITECTURE.md` para la separación por módulos y `TESTING.md` para la suite de pruebas.

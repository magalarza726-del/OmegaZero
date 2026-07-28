# Publicar OmegaZero en GitHub Pages

## 1. Crear el repositorio

Crea un repositorio nuevo y vacío. Un nombre práctico es `omegazero`.

No selecciones una plantilla inicial si vas a subir esta carpeta completa.

## 2. Subir el proyecto

Puedes usar GitHub Desktop, VS Code, Git o la carga web de GitHub. Asegúrate de que la rama principal se llame `main` y de que `.github/workflows/deploy-pages.yml` esté incluido.

Con Git desde una terminal:

```bash
git init
git add .
git commit -m "Publicar OmegaZero web"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

## 3. Activar Pages

En el repositorio:

1. Abre **Settings**.
2. Entra en **Pages**.
3. En **Build and deployment → Source**, selecciona **GitHub Actions**.

El flujo se ejecuta al subir cambios a `main`. También puede iniciarse manualmente desde la pestaña **Actions**.

## 4. Verificar la publicación

Abre **Actions → Probar y publicar OmegaZero**. Cuando los trabajos `build` y `deploy` terminen correctamente, GitHub mostrará la dirección pública.

## 5. Actualizar la app

Edita el proyecto y vuelve a subir los cambios:

```bash
git add .
git commit -m "Actualizar OmegaZero"
git push
```

Cada `push` a `main` ejecuta pruebas y publica una compilación nueva con recursos versionados.

## 6. Conservar los datos del navegador

GitHub Pages sirve una app estática. Las partidas y preferencias viven en IndexedDB dentro del navegador del usuario. No forman parte del repositorio.

Antes de cambiar de dominio, nombre del repositorio, computadora o navegador, crea un respaldo desde Configuración. Después impórtalo en la nueva dirección.

## 7. Solución rápida de problemas

- **La página está vacía:** abre Actions y revisa que `npm test` y `npm run build` hayan terminado correctamente.
- **Stockfish no carga:** confirma que `public/engine/stockfish-18-lite-single.js` y `.wasm` estén en el repositorio.
- **Los cambios no aparecen:** espera a que finalice el flujo y recarga sin caché. Los recursos construidos usan un identificador único.
- **Pages muestra un README:** confirma que el origen sea GitHub Actions, no una carpeta de la rama.

# OmegaZero v2.5.0 — Aplicación web personal

OmegaZero es una aplicación web de ajedrez para jugar, analizar y convertir partidas propias o magistrales en entrenamiento estratégico. Funciona enteramente en el navegador con Stockfish 18 local.

## Funciones principales

- J1 vs J2, J1 vs COM y COM vs COM.
- Hasta cinco partidas simultáneas contra configuraciones independientes.
- Estilos **Zero** (defensivo y de contraataque) y **Omega** (hiperagresivo y táctico).
- Análisis continuo con variantes, barra de evaluación y calidad de jugada.
- Estrategia desde partidas propias y partidas magistrales.
- Biblioteca de 3.968 aperturas, defensas, líneas y esquemas.
- Reglamento FIDE integrado.
- Estimador probabilístico de Elo.
- Personalización de tableros, piezas, anotaciones y sonidos.
- Persistencia local mediante IndexedDB.

## Publicar en GitHub Pages

La publicación está automatizada. Consulta [GUIA_GITHUB_PAGES.md](GUIA_GITHUB_PAGES.md).

Resumen:

1. Crea un repositorio vacío en GitHub.
2. Sube todo el contenido de esta carpeta a la rama `main`.
3. En **Settings → Pages**, selecciona **GitHub Actions** como origen.
4. El flujo `Probar y publicar OmegaZero` ejecutará las pruebas, construirá `dist/` y publicará el sitio.

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm ci
npm run dev
```

Para probar exactamente la compilación que se publicará:

```bash
npm run build
npm run preview
```

En Windows también puedes ejecutar `INICIAR.bat`.

## Datos personales

Las partidas, problemas, preferencias e imágenes personalizadas se guardan en el navegador. No se suben al repositorio ni se sincronizan entre dispositivos. Cambiar el nombre del repositorio o el dominio de GitHub Pages cambia el origen web y, por tanto, crea un almacenamiento separado. Usa la exportación de respaldo de OmegaZero antes de cambiar de URL o navegador.

## Estructura

- `src/`: aplicación.
- `public/`: Stockfish, manifest e imágenes.
- `tests/`: pruebas de regresión.
- `scripts/`: construcción y servidor local.
- `.github/workflows/`: pruebas y publicación automática.
- `dist/`: salida generada; no se versiona.

## Licencias y fuentes

Consulta `COPYING.txt`, `DATA_SOURCES.md`, `OPENINGS_CC0_LICENSE.txt`, `MASTER_GAMES_LICENSE.txt`, `CHESS_JS_LICENSE.md` y `CHESSBOARD_ELEMENT_LICENSE.md`.

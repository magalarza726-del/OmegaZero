# Arquitectura de OmegaZero v3.1.0

## Principio

`main.js` es el **composition root**: crea el estado principal y ensambla módulos de características. La lógica de dominio reutilizable permanece en `core/`; las vistas y flujos de producto se separan en `features/`.

## Áreas de producto

- **Jugar**: configuración de partidas, J1 vs J2, J1 vs COM, COM vs COM y personalización visual.
- **Aprender**: análisis, estrategia, biblioteca y estadísticas.
- **Investigar**: Estudiar estructuras, T-COM y Transformada de Stockfish.

## Módulos

- `features/appChrome.js`: shell, configuración, migración, inicio y navegación.
- `features/board.js`: tablero compartido, arrastre y anotaciones.
- `features/play.js`: partidas y simultáneas.
- `features/learn.js`: análisis y entrenamiento estratégico.
- `features/library.js`: biblioteca, importación y personalización.
- `features/structureStudy.js`: entrada a Estudiar estructuras y galerías de familias de piezas menores/mayores.
- `features/pawnGallery.js`: familias de peones, tableros 6×6 y detalle/anotaciones de códigos concretos.
- `features/tcom.js`: laboratorio T-COM.
- `features/transform.js`: Transformada de Stockfish.
- `core/structureFamilies.js`: gradientes 2D, generación de familias y mapas de control de piezas.
- `core/pawnStructures.js`: codificación y geometría elemental de peones.
- `app/deps.js`: frontera explícita de dependencias entre features y módulos base.
- `app/config.js`: temas de tablero y configuración visual compartida.

## Estudiar estructuras

La UI nunca necesita renderizar todas las configuraciones exactas de piezas. El núcleo recorre el universo permitido, genera una firma geométrica y retiene un representante y hasta diez ejemplos por familia.

- Peones: patrón de presencia + signo del gradiente 1D.
- Piezas menores: `CD · AD · AR · CR`, filas 2–5, familia por dirección de los tres vectores del gradiente 2D.
- Piezas mayores: `TD · D · R · TR`, filas 1–3, familia por dirección de los tres vectores del gradiente 2D.

Los tableros 8×8 heredan `--light` y `--dark` del tema activo. El verde claro marca control hacia delante y el azul control hacia atrás.

## Restricción de archivos

La suite de tests falla si el repositorio llega a 100 archivos. OmegaZero v3.1.0 se mantiene por debajo de ese límite.

## Pruebas

```bash
npm test
```

El workflow `.github/workflows/test.yml` ejecuta la misma suite en cada push y pull request.

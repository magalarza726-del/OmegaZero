# Arquitectura de OmegaZero v3.2.0

## Principio

`main.js` es el **composition root**: crea el estado principal y ensambla módulos de características. La lógica de dominio reutilizable permanece en `core/`; las vistas y flujos de producto se separan en `features/`.

## Áreas de producto

- **Jugar**: configuración de partidas, J1 vs J2, J1 vs COM, COM vs COM y personalización visual.
- **Aprender**: análisis, estrategia, biblioteca y estadísticas.
- **Investigar**: Estudiar estructuras, Análisis energético de piezas, T-COM y Transformada de Stockfish.

## Módulos

- `features/appChrome.js`: shell, configuración, migración, inicio y navegación.
- `features/board.js`: tablero compartido, arrastre y anotaciones.
- `features/play.js`: partidas y simultáneas.
- `features/learn.js`: análisis y entrenamiento estratégico.
- `features/library.js`: biblioteca, importación y personalización.
- `features/structureStudy.js`: entrada a Estudiar estructuras y galerías de familias de piezas menores/mayores.
- `features/pawnGallery.js`: familias de peones, tableros 6×6 y detalle/anotaciones de códigos concretos.
- `features/energyAnalysis.js`: laboratorio U/K/E, historial energético y modos E-COM.
- `core/energyChess.js`: masa, altura, movilidad legal, U, K, E y selección E-COM a una semijugada.
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

Los tableros heredan `--light` y `--dark` del tema activo. En Estudiar estructuras, verde = control por una pieza, azul = control por dos piezas y morado = control por tres o más piezas.


## Análisis energético

El modelo implementa `U = mgh`, `K = ½mv²` y `E = U + K`, con `v` definido como el número de casillas legales distintas alcanzables por la pieza en la posición actual. La altura es simétrica: blancas `h=r−1`, negras `h=8−r`.

- Masa uniforme: `m=1/n`.
- Masa ponderada: `mᵢ=(wᵢ/Σw)·(1/n)`, con P=1, N=3, B=3.25, R=5, Q=9 y peso de rey experimental configurable.
- E-COM: genera todas las jugadas legales, calcula la posición resultante y elige la que maximiza E, U o K del propio bando. No busca la respuesta rival.
- Modos: E-COM vs E-COM, J1 vs E-COM, Análisis Libre y análisis de partidas guardadas.
- Cada semijugada es seleccionable y reconstruye la tabla U/K/E por pieza y los balances ΔU, ΔK y ΔE.

## Restricción de archivos

La suite de tests falla si el repositorio llega a 100 archivos. OmegaZero v3.2.0 se mantiene por debajo de ese límite.

## Pruebas

```bash
npm test
```

El workflow `.github/workflows/test.yml` ejecuta la misma suite en cada push y pull request.

### Presentación de familias

`structureViewMode` es una preferencia compartida por los módulos de peones y piezas. Lista prioriza lectura compacta; Galería usa vistas previas con carga diferida (`IntersectionObserver`) sin alterar el modelo de familias.

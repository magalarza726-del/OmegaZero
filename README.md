# OmegaZero v2.8.6 — Aplicación web personal

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
- Laboratorio **Transformada de Stockfish** con matriz posición-control, propiedades algebraicas, funciones escalares/matriciales y gráfica por semijugada.
- **Alfabeto estructural de peones**: galería interactiva de 625 microestructuras usando los estados `0`, `1`, `2`, `3` y `9`, con mapa cromático objetivo y detalle geométrico por estructura.



## Alfabeto estructural de peones

Desde Inicio, la tarjeta **Alfabeto estructural** abre una galería generada algorítmicamente con las 625 combinaciones teóricas de cuatro archivos contiguos. Cada dígito usa `0`–`3` para el avance desde la posición inicial y `9` para indicar que el peón de ese archivo ya no está.

La visualización usa una orientación canónica con avance hacia arriba:

- azul claro: casillas situadas detrás del peón de ese archivo;
- verde: casillas atacadas por un peón y, por tanto, posibles casillas de captura o apoyo;
- naranja: casillas situadas delante del peón que no están controladas por el propio bloque;
- `2`: casilla sometida a doble control de peones.

Los márgenes laterales tenues permiten ver ataques que salen de los cuatro archivos estudiados. Al abrir una estructura se muestran, sin asignar valoración buena/mala, el avance acumulado, profundidad geométrica, gradiente, control, doble control, peones apoyados, retaguardia y frente no controlado.


## Gráficas por función y selector a/A

La calculadora del laboratorio muestra dos selectores explícitos:

- **a**: aplica la operación a cada valor de la matriz, entrada por entrada.
- **A**: aplica la operación a la matriz completa.

Cada expresión crea una pestaña gráfica independiente. Dentro de esa pestaña se siguen por semijugada la salida de la función, la valoración de Stockfish y las propiedades algebraicas de la matriz transformada: determinante, rango, traza, norma de Frobenius, condición efectiva, pseudodeterminante singular, radio espectral aproximado y menor valor singular positivo. Los cálculos se realizan por lotes para mantener la interfaz receptiva.

## T-COM vs T-COM

OmegaZero 2.8.0 añade un laboratorio separado del COM vs COM tradicional para enfrentar **motores simbólicos de una sola semijugada**. Cada módulo:

1. genera todas las jugadas legales del turno;
2. construye la matriz de cada posición hija;
3. aplica funciones escalares `f(a)`, matriciales `F(A)` o mixtas;
4. reduce la salida a un valor mediante norma, traza, determinante, pseudodeterminante, radio espectral o condición;
5. elige la mejor semijugada sin calcular respuestas ni variantes.

Ejemplos válidos:

```text
X(a)=exp(a)
X(A)=exp(A)
X(A,a)=sin(A)+cos(a)
```

El laboratorio permite torneos de 1 a 1000 partidas, alternancia de colores, aperturas aleatorias, diversidad entre valores cercanos, comparación contra Stockfish, exportación PGN/CSV y guardado opcional en la biblioteca. Para evitar congelamientos en series largas utiliza procesamiento por bloques y una caché limitada de evaluaciones.

También incluye una **partida individual jugable** dentro del mismo laboratorio. Puedes controlar blancas, negras o ambos bandos mediante clic o arrastre. Cuando controlas un solo color, el módulo T-COM o Stockfish configurado para el rival puede responder automáticamente; también se puede deshacer el último turno o solicitar manualmente la semijugada del módulo.

## Optimización de la Transformada de Stockfish

La gráfica por semijugadas ahora usa análisis por límite de nodos, cachés de series, evaluación perezosa de funciones personalizadas, renderizado con `requestAnimationFrame`, cálculo exclusivo del rango visible y reducción adaptativa de puntos. Estas medidas evitan recalcular toda la partida durante cada desplazamiento o zoom y conservan resultados parciales si el análisis se interrumpe.

## Transformada de Stockfish

El nuevo laboratorio se abre desde Inicio o con el acceso `ƒ(A)` de la cabecera. La pantalla de resumen reúne hojas e importaciones, tablero, semijugadas y parámetros algebraicos; **Ver gráfica** abre la calculadora matemática y el graficador desplazable.

- Las funciones con variables minúsculas, como `f(a)`, actúan entrada por entrada.
- Las funciones con variables mayúsculas, como `F(A)`, operan sobre la matriz completa.
- Las expresiones mixtas, como `K(A,a)=F(A)+f(a)`, están admitidas.
- PGN y bases PGN crean hojas completas. Un PNG se conserva como referencia visual; para reconstruir exactamente la posición debe indicarse su FEN.

## Publicar en GitHub Pages

La versión 2.8.6 funciona de dos maneras y en ambas conserva el nombre del repositorio en las rutas:

**Método recomendado para subir únicamente desde la web de GitHub:**

1. Sube todo el contenido de esta carpeta a `main`.
2. En **Settings → Pages**, selecciona **Deploy from a branch**.
3. Selecciona `main` y `/(root)`.
4. Guarda. No se necesita compilar ni subir `dist/`.

**Método con GitHub Actions:** selecciona **GitHub Actions** como origen. El flujo incluido prueba, construye y publica `dist/`.

Consulta [GUIA_GITHUB_PAGES.md](GUIA_GITHUB_PAGES.md).

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

## Diagnóstico del motor

Si GitHub Pages muestra que el motor no está disponible, abre `diagnostico-stockfish.html` dentro de la misma dirección pública. La página comprueba el archivo JavaScript, el WASM, su tipo MIME y la respuesta `uciok`.

## Cambios v2.8.2

- El Alfabeto Estructural admite ahora el estado `9` = peón ausente, elevando el espacio teórico de 256 a 625 microestructuras.
- Las métricas ignoran el `9` como altura; los tramos de gradiente que cruzan una ausencia se muestran como `—`.
- La tarjeta ampliada incorpora navegación anterior/siguiente mediante botones ←/→ y teclado.
- Los peones de la galería usan el recurso `public/pieces/alpha/wP.png` incluido en OmegaZero.
- El color semántico se aplica como una capa sobre un tablero ajedrecístico alternado para una lectura más formal.
- No se modificó la lógica de navegación ni el funcionamiento de los demás botones.


## Cambios v2.8.6

- El filtro de la Galería Estructural conserva su consulta al perder el foco, abrir/cerrar tarjetas y ante rerenders de la vista.
- Se añade la casilla **Pintar columnas abiertas (morado)**; desactivarla oculta solo esa capa visual y no modifica el estado `9` ni las métricas.
- La preferencia de mostrar morado se guarda en la configuración local.
- Se refuerza explícitamente la prioridad visual del verde sobre el morado cuando ambas capas coinciden.
- Se conservan las 625 microestructuras, la navegación, las anotaciones tipo Lichess y el resto de módulos sin cambios funcionales.

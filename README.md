# OmegaZero v3.5.0

## Arquitectura v3

La aplicación se organiza alrededor de tres áreas de producto: **Jugar**, **Aprender** e **Investigar**. `main.js` es ahora un composition root pequeño; las funciones de UI y dominio viven en módulos de `features/`, mientras que la lógica matemática reutilizable permanece en `core/`.

El proyecto incluye una suite de pruebas con `npm test` y un control automático para mantener el repositorio por debajo de 100 archivos.


OmegaZero es una aplicación web de ajedrez para jugar, analizar y convertir partidas propias o magistrales en entrenamiento estratégico. Funciona enteramente en el navegador con Stockfish 18 local.

## Funciones principales

- J1 vs J2, J1 vs COM y COM vs COM.
- Hasta cinco partidas simultáneas contra configuraciones independientes.
- **Among Us Chess**: 3–6 tableros simultáneos contra rivales con nombre, Elo y estilo ocultos; victoria posible por mate, bandera o identificación de Elo.
- Estilos **Zero** (defensivo y de contraataque) y **Omega** (hiperagresivo y táctico).
- Análisis continuo con variantes, barra de evaluación y calidad de jugada.
- Estrategia desde partidas propias y partidas magistrales.
- Biblioteca de 3.968 aperturas, defensas, líneas y esquemas.
- Reglamento FIDE integrado.
- Estimador probabilístico de Elo.
- Personalización de tableros, piezas, anotaciones y sonidos.
- Persistencia local mediante IndexedDB.
- Laboratorio **Transformada de Stockfish** con matriz posición-control, propiedades algebraicas, funciones escalares/matriciales y gráfica por semijugada.
- **Estudiar estructuras**: familias geométricas de peones, piezas menores y piezas mayores; conserva códigos exactos como ejemplos, gradientes y mapas de control sincronizados con el tema del tablero.



## Estudiar estructuras

Desde **Investigar → Estudiar estructuras**, OmegaZero combina tres catálogos curados y un laboratorio libre:

- **Peones**: conserva el tablero 6×6, los estados `0`, `1`, `2`, `3`, `9`, el mapa de multiplicidad de control y las anotaciones. Los códigos se agrupan por patrón de presencia y signo del gradiente 1D.
- **Piezas menores**: `CD · AD · AR · CR` en tablero 8×8, con ubicaciones limitadas a filas 2–5. Las familias usan la dirección de los tres vectores del gradiente 2D.
- **Piezas mayores**: `TD · D · R · TR` en tablero 8×8, con ubicaciones limitadas a filas 1–3. El rey se incluye por su relación geométrica con la retaguardia.
- **Piezas libres**: permite elegir de 1 a 4 caballos, alfiles, torres, damas o reyes, con repeticiones. La ventana vertical puede ubicarse en cualquier fila 1–8 y tener amplitud máxima de cuatro filas. Las configuraciones se agrupan automáticamente por composición, gradiente direccional, topología de alineaciones y baterías.

Cada familia conserva un representante y hasta diez ejemplos adicionales. En **Acción**, verde = control de 1 pieza, azul = 2 y morado = 3 o más. En **Subacción**, amarillo = una pieza compatible detrás de la principal, naranja = dos y rojo = tres. Todos los tableros heredan el color seleccionado en Configuración.

La agrupación es descriptiva: la magnitud exacta del gradiente permanece visible en cada ejemplo aunque la familia utilice solo su dirección para evitar miles de casi-duplicados.


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

La versión 3.5.0 funciona de dos maneras y en ambas conserva el nombre del repositorio en las rutas:

**Método recomendado para subir únicamente desde la web de GitHub:**

1. Sube todo el contenido de esta carpeta a `main`.
2. En **Settings → Pages**, selecciona **Deploy from a branch**.
3. Selecciona `main` y `/(root)`.
4. Guarda. No se necesita compilar ni subir `dist/`.

**Método con GitHub Actions:** selecciona **GitHub Actions** como origen. El flujo incluido prueba, construye y publica `dist/`.

Consulta [GUIA_GITHUB_PAGES.md](GUIA_GITHUB_PAGES.md).

## Desarrollo local

La aplicación es estática y no requiere compilación. Para servirla localmente desde la raíz del proyecto puedes usar, por ejemplo:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000/`. Para ejecutar las pruebas se requiere Node.js 22 o superior:

```bash
npm test
```


## Datos personales

Las partidas, problemas, preferencias e imágenes personalizadas se guardan en el navegador. No se suben al repositorio ni se sincronizan entre dispositivos. Cambiar el nombre del repositorio o el dominio de GitHub Pages cambia el origen web y, por tanto, crea un almacenamiento separado. Usa la exportación de respaldo de OmegaZero antes de cambiar de URL o navegador.

## Estructura

- `assets/v3.5.0-20260819043000/`: código JavaScript y CSS versionado de la aplicación.
- `assets/.../features/`: módulos de UI y flujos de producto.
- `assets/.../core/`: lógica matemática y de dominio reutilizable.
- `public/`: Stockfish, manifest, logotipos y piezas.
- `tests/`: pruebas de regresión.
- `.github/workflows/`: ejecución automática de pruebas.


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


## Cambios v3.1.0

- **Alfabeto estructural** pasa a llamarse **Estudiar estructuras** dentro de Investigar.
- Se añade una portada con Peones, Piezas menores y Piezas mayores.
- Los peones pasan de la galería plana a familias de gradiente 1D sin modificar su tablero 6×6 ni sus capas analíticas.
- Se incorporan tableros 8×8 para piezas menores (filas 2–5) y mayores (filas 1–3).
- Las piezas se agrupan por dirección del gradiente 2D y cada familia muestra un representante y hasta diez ejemplos.
- Los nuevos tableros heredan el tema activo y separan control frontal (verde claro) y posterior (azul).
- Se añaden pruebas de familias, límites de filas, gradientes y control.

## Cambios v3.0.0

- El filtro de la Galería Estructural conserva su consulta al perder el foco, abrir/cerrar tarjetas y ante rerenders de la vista.
- Se añade la casilla **Pintar columnas abiertas (morado)**; desactivarla oculta solo esa capa visual y no modifica el estado `9` ni las métricas.
- La preferencia de mostrar morado se guarda en la configuración local.
- Se refuerza explícitamente la prioridad visual del verde sobre el morado cuando ambas capas coinciden.
- Se conservan las 625 microestructuras, la navegación, las anotaciones tipo Lichess y el resto de módulos sin cambios funcionales.
## Cambios v3.1.1

- Estudiar estructuras permite alternar entre **Lista** y **Galería**.
- La preferencia de visualización se guarda y se comparte entre Peones, Piezas menores y Piezas mayores.
- La Galería carga las vistas previas de los tableros de forma diferida para evitar renderizar cientos de tableros fuera de pantalla.


## Cambios v3.5.0

- Se añade **Piezas libres** dentro de Estudiar estructuras.
- El usuario puede escoger 1–4 piezas, incluso repetidas, y una ventana vertical entre filas 1–8 con amplitud máxima de cuatro.
- Un Web Worker agrupa configuraciones normalizadas sin bloquear la interfaz en los casos grandes.
- La firma de familia combina composición, gradiente direccional, topología de alineaciones y baterías; los reflejos horizontales pueden considerarse equivalentes.
- Nuevo selector **Acción / Subacción**. Acción usa verde/azul/morado según multiplicidad de control; Subacción usa amarillo/naranja/rojo según profundidad de soporte tras la pieza principal.
- Dama+torre, dama+alfil, torre+torre, alfil+alfil y combinaciones compatibles forman baterías; caballos y reyes no producen subacción lineal.


## Among Us Chess · v3.5.0

Desde **Jugar → Among Us Chess**, J1 se enfrenta simultáneamente a 3–6 rivales con identidad oculta. Cada rival recibe un Elo real distinto entre 500 y 2500 y un estilo secreto: **Sol** puede entrar durante 1–3 turnos en ráfagas de +500 a +1000 Elo efectivo, **Tierra** permanece cerca de su nivel real y **Luna** intenta camuflarse mediante periodos de −300 a −700. El botón **Descubrir Elo** se habilita al completar las jugadas 10, 15, 20, 25…: error ≤100 = victoria, 101–200 = tablas y >200 = derrota. Los tableros conservan relojes independientes y también pueden terminar por mate, bandera o resultado FIDE. La simulación de Elo usa Stockfish local para generar candidatas y una selección probabilística cuya dispersión depende del Elo efectivo; el cálculo real del motor se serializa para evitar competencia entre los 3–6 tableros.

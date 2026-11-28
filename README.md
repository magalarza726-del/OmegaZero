# OmegaZero

OmegaZero: Chess Laboratory — aplicación web para jugar, aprender e investigar ajedrez con Stockfish y modelos experimentales.

## 960 Research · 960-COM (v4.4.0)

- Acceso desde Investigar, Modelos COM o las tres modalidades de Jugar. Posición aleatoria o número Scharnagl 0–959 (518 = clásica).
- El módulo reutiliza `chooseComBrainDecision` y los selectores de Jugar: S-COM, T-COM y E-COM; cada COM analiza exclusivamente la posición clásica. Cada pieza conserva su identidad: torres y caballos por orden inicial, alfiles por color de casilla, peones por la identidad de la pieza que tienen detrás en la posición inicial (rey, dama, torre, caballo o alfil). Las jugadas comparten el vector de desplazamiento relativo (dirección y distancia), no necesariamente la casilla de destino y las capturas deben eliminar la misma identidad; enroques por flanco.
- Al no existir una réplica legal, la sesión se detiene con «Fin por movimiento ilegal». Si la jugada nació en 960 y era legal allí, se conserva solo en 960. Selección sincronizada, historial de ambas posiciones y pausa para COM.
- Ambos tableros reutilizan el renderizador `boardHtml`, la personalización, navegación por teclado, arrastre y promoción de Jugar, con estado visual independiente por tablero.
- Pruebas del núcleo en `tests/chess960Research.test.js`.

## v4.4.0

- E-COM multivariable: 20 métricas posicionales, funciones independientes por bando, expresiones matemáticas con sintaxis LaTeX compatible y vista MathML local, constantes, funciones auxiliares y expresiones por tramos.
- Laboratorio FEN: tabla de todas las candidatas legales, puntuación y veinte variables; una sola semijugada, sin ejecutar respuestas rivales ni consultar Stockfish.
- La función por defecto es equilibrada; seis plantillas incluidas. El modo energético U/K/E se conserva como opción por bando. Las expresiones inválidas no producen jugadas aleatorias.
- Movilidad y amenazas son geométricas, no predicciones tácticas; x9 representa material propio atacado y sin defensa. El editor es local, inspirado en Desmos, no la interfaz oficial de Desmos.

## v4.3.3

- Identidad visual cálida: esmeralda, ámbar, coral y ciruela; iconos SVG locales, degradados, menú lateral en escritorio y navegación horizontal en móvil.
- Inicio conserva las tres modalidades, las dos herramientas de aprendizaje y los tres laboratorios de investigación. Las matrices continúan disponibles durante las partidas.
- La paleta de las piezas y casillas sigue siendo configurable por separado. El menú lateral se limita al inicio para preservar el espacio del tablero.

## v4.3.2

- Inicio compacto y responsive: Jugar, Aprender e Investigar, sin cabecera promocional ni franja decorativa.
- El lector del Manual del Gran Maestro se retira de la interfaz. En las partidas se pueden abrir la Matriz del Gran Maestro (20 habilidades, 100 casillas) y la Matriz Apéndice (9 casillas en 3 fases), con progreso local persistente.
- Consultar las matrices no modifica la posición ni pausa los relojes o los motores.

## v4.3.1

- Jugar: J1 vs J2, J1 vs COM y COM vs COM; cada modo permite elegir Ajedrez clásico, King of the Hill, Three-Check, Racing Kings, Antichess o In the night.
- Las variantes nuevas tienen reglas y COM local específicos; el ajedrez clásico conserva los motores S-COM, T-COM y E-COM. In the night reutiliza el motor de Chess in the Cave y el modificador Niebla.
- Paletas invertidas; sin acceso a Among Us Chess, estimador de Elo probabilístico ni botón de biblioteca en inicio. El análisis conserva evaluación y líneas sin etiquetas de calidad de jugada.
- Las variantes adicionales no comparten todavía todas las opciones de configuración, exportación y estadísticas del ajedrez clásico.

## Android offline

La app Android empaqueta el build web activo y Stockfish dentro del APK, sin permiso de Internet. Consulta [ANDROID_OFFLINE.md](./ANDROID_OFFLINE.md). GitHub Actions genera el artefacto `OmegaZero-offline-debug.apk`.

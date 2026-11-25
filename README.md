# OmegaZero

OmegaZero: Chess Laboratory — aplicación web para jugar, aprender e investigar ajedrez con Stockfish y modelos experimentales.

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

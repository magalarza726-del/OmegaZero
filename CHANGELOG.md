# v2.6.0

- Nuevo laboratorio **Transformada de Stockfish** accesible desde Inicio y desde la cabecera.
- Pantalla de resumen con hojas agrupadas por decenas, centenas y miles, importación PGN/base, PNG de referencia y FEN.
- Matriz posición-control con material firmado, controles acumulados y rey de valor 4.
- Cálculo de determinante, rango, traza, norma de Frobenius, condición efectiva, pseudodeterminante singular, valores singulares y radio espectral aproximado.
- Calculadora matemática tipada: minúsculas para operaciones entrada por entrada y mayúsculas para funciones matriciales; admite funciones mixtas.
- Graficador por semijugada y de función continua con desplazamiento libre, zoom, ajuste de vista y control de series.
- Análisis Stockfish de una posición o de una hoja completa, con normalización comparativa.
- Paneles colapsables para reducir la saturación visual.

# v2.5.2

- Rutas universales `public/` compatibles con GitHub Pages desde `main/(root)` y con la compilación `dist/`.
- Reparados logo, piezas, manifiesto y Stockfish cuando el repositorio se publica bajo una subcarpeta.
- Publicación web sin GitHub Actions disponible para usuarios que suben archivos desde el navegador.
- Caché de recursos invalidada con la versión 2.5.2.

# Historial de cambios

## 2.5.0

- Edición exclusivamente web y preparada para GitHub Pages.
- Añadidos despliegue automático, pruebas continuas, documentación y tareas web de VS Code.
- Se conservan las funciones ajedrecísticas y los datos locales de OmegaZero v2.4.x.

# OmegaZero v3.2.0 — pruebas

La suite usa el runner nativo de Node.js.

## Ejecutar

```bash
npm test
```

Las pruebas cubren:

- invariantes de las 625 microestructuras de peones;
- estado `9`, gradiente, control y mapas de espacio;
- agrupación de peones en 68 familias geométricas de gradiente 1D;
- 512 familias direccionales de piezas menores y restricción de filas 2–5;
- 452 familias direccionales de piezas mayores y restricción de filas 1–3;
- multiplicidad visual de control estructural: 1×, 2× y 3+×;
- gradiente 2D exacto frente a la dirección usada por la familia;
- energía U/K/E, simetría de altura, ambos modos de masa y E-COM de una semijugada;
- operaciones algebraicas, T-COM y estadísticas;
- imports entre módulos;
- menos de 100 archivos y `main.js` como composition root;
- presencia de Jugar, Aprender e Investigar.

La carpeta `tests/` no participa en la ejecución de la app en GitHub Pages.

### Vista de estructuras

La suite comprueba que Peones y las familias de piezas exponen los modos Lista/Galería y que la preferencia usa `structureViewMode`.

/** Obtiene mínimo y máximo finitos sin usar spread sobre arreglos grandes. */
export function finiteExtent(values) {
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const value of values || []) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
    count += 1;
  }
  return count ? { min, max, count } : null;
}

/** Normalización min-max a un intervalo configurable, conservando huecos como null. */
export function normalizeFiniteSeries(values, lower = -20, upper = 20) {
  const extent = finiteExtent(values);
  if (!extent) return (values || []).map(() => null);
  const range = extent.max - extent.min;
  if (Math.abs(range) < 1e-12) {
    const midpoint = (lower + upper) / 2;
    return values.map((value) => Number.isFinite(value) ? midpoint : null);
  }
  const scale = (upper - lower) / range;
  return values.map((value) => Number.isFinite(value)
    ? lower + (value - extent.min) * scale
    : null);
}

/** Extensión de muchas series sin materializar un arreglo plano adicional. */
export function finiteExtentOfSeries(series) {
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const item of series || []) {
    for (const value of item?.values || []) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
      count += 1;
    }
  }
  return count ? { min, max, count } : null;
}

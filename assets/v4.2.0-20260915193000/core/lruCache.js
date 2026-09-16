/**
 * Obtiene un valor y lo mueve al final del Map para conservar orden LRU.
 * Devuelve undefined cuando la clave no existe.
 */
export function lruGet(cache, key) {
  if (!cache?.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

/**
 * Inserta o actualiza una clave y expulsa las entradas menos usadas.
 */
export function lruSet(cache, key, value, maxEntries) {
  if (!cache) return value;
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  const limit = Math.max(1, Number(maxEntries) || 1);
  while (cache.size > limit) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  return value;
}

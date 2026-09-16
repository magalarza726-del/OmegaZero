/**
 * Construye URLs de recursos públicos que funcionan en los dos modos admitidos:
 * 1) GitHub Pages publicado directamente desde main/(root), donde viven en public/.
 * 2) La compilación dist/, que conserva exactamente la misma carpeta public/.
 *
 * Nunca usa rutas que comiencen por `/`, porque esas rutas apuntarían al dominio
 * github.io y perderían el nombre del repositorio (por ejemplo /OmegaZero/).
 */
export function publicAsset(path, version = '') {
  const clean = String(path || '').replace(/^\/+/, '');
  const url = new URL(`./public/${clean}`, document.baseURI);
  if (version) url.searchParams.set('v', String(version));
  return url.href;
}

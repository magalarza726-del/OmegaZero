export function applyAccessibility(settings = {}) {
  const root = document.documentElement;
  root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  root.dataset.colorVision = settings.colorVision || 'default';
  root.style.fontSize = `${Number(settings.fontScale || 100)}%`;
  root.classList.toggle('reduce-motion', Boolean(settings.reduceMotion));
}

export function boardSquareAria(square, piece, selected = false) {
  const color = piece?.color === 'w' ? 'blanca' : 'negra';
  const type = ({ p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' })[piece?.type];
  return `${square}${piece ? `, ${type} ${color}` : ', vacía'}${selected ? ', seleccionada' : ''}`;
}

export function announce(message) {
  let live = document.getElementById('omega-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'omega-live';
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}

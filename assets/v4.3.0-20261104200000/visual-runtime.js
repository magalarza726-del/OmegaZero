const ART = {
  setupPvp: 4,
  setupPvc: 1,
  setupCvc: 0,
  amongUsChess: 6,
  analysis: 3,
  strategy: 5,
  library: 2,
  structureStudy: 6,
  modelLab: 8,
  stockfishTransform: 7,
};

function artNode(index, className = 'omega-card-art') {
  const art = document.createElement('i');
  art.className = `${className} oz-art oz-art-${index}`;
  art.setAttribute('aria-hidden', 'true');
  return art;
}

function decorateHome() {
  const view = document.querySelector('#view');
  if (!view) return;
  const hero = view.querySelector(':scope > .hero');
  const domains = [...view.querySelectorAll(':scope > .home-domain')];
  if (!hero || domains.length < 3 || hero.dataset.omegaVisual === '1') return;

  hero.dataset.omegaVisual = '1';
  view.classList.add('oz-immersive-home');
  hero.classList.add('omega-hero');
  const copy = hero.firstElementChild;
  if (copy) copy.classList.add('omega-hero-copy');
  hero.querySelector('.hero-logo')?.remove();

  const gallery = document.createElement('div');
  gallery.className = 'omega-hero-gallery';
  gallery.setAttribute('aria-hidden', 'true');
  gallery.innerHTML = '<i class="oz-art oz-art-2 omega-mural"></i><i class="oz-art oz-art-0 omega-emblem"></i><i class="oz-art oz-art-3 omega-face"></i><span class="omega-orbit"></span>';
  hero.append(gallery);

  if (copy && !copy.querySelector('.omega-hero-actions')) {
    const actions = document.createElement('div');
    actions.className = 'omega-hero-actions';
    actions.innerHTML = '<button type="button" class="primary" data-omega-action="play">JUGAR AHORA</button><button type="button" data-omega-action="lab">ABRIR LABORATORIO ƒ(A)</button>';
    const metrics = copy.querySelector('.hero-metrics');
    copy.insertBefore(actions, metrics || null);
    actions.querySelector('[data-omega-action="play"]').onclick = () => view.querySelector('[data-go="setup"][data-mode="pvc"]')?.click();
    actions.querySelector('[data-omega-action="lab"]').onclick = () => view.querySelector('[data-go="stockfishTransform"]')?.click();
  }

  const strip = document.createElement('section');
  strip.className = 'omega-identity-strip';
  strip.innerHTML = '<span>♞ SISTEMA OMEGAZERO</span><b>LA EVOLUCIÓN NO SE DETIENE · EL TABLERO ES TU LABORATORIO</b><span>Stockfish 18 · Local</span>';
  hero.after(strip);

  domains.forEach(section => {
    section.classList.add('omega-domain');
    section.querySelector('.home-grid')?.classList.add('omega-card-grid');
  });

  view.querySelectorAll('.home-domain button[data-go]').forEach((button, index) => {
    button.classList.add('omega-art-card');
    if (button.matches('[data-go="setup"][data-mode="pvc"]')) button.classList.add('omega-feature-card');
    if (button.matches('[data-go="library"]')) button.classList.add('omega-library-card');
    if (button.querySelector('.omega-card-art')) return;
    let key = button.dataset.go || '';
    if (key === 'setup') key += button.dataset.mode === 'pvp' ? 'Pvp' : button.dataset.mode === 'cvc' ? 'Cvc' : 'Pvc';
    button.append(artNode(ART[key] ?? (index % 9)));
  });

  const elo = view.querySelector(':scope > .player-elo');
  if (elo && !elo.querySelector('.omega-elo-watermark')) {
    elo.classList.add('omega-elo-panel');
    elo.prepend(artNode(4, 'omega-elo-watermark'));
  }
}

function decorateShell() {
  document.querySelector('.app')?.classList.add('omega-visual-shell');
}

function refreshVisualIdentity() {
  decorateShell();
  decorateHome();
}

const root = document.querySelector('#app');
if (root) {
  const observer = new MutationObserver(() => queueMicrotask(refreshVisualIdentity));
  observer.observe(root, { childList: true, subtree: true });
}
refreshVisualIdentity();

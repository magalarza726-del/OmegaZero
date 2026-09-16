import { $, $$, saveDb } from '../app/deps.js';

export function installVisibilityPatch(App) {
  const p = App.prototype;
  const baseRenderStockfishGraph = p.renderStockfishGraph;
  const baseDisposeTransformGraphBinding = p.disposeTransformGraphBinding;

  // La visibilidad es una preferencia ligera. Agrupamos escrituras para que
  // marcar varias series seguidas no reescriba IndexedDB en cada clic.
  p.persistTransformConfig = function persistTransformConfigVisibilitySafe() {
    const lab = this.ensureTransformLab();
    this.db.settings.transformLabConfig = {
      expressions: [...lab.expressions], visibility: {...lab.visibility}, graphMode: lab.graphMode,
      normalized: lab.normalized, depth: lab.depth, batchNodes: lab.batchNodes,
      activeExpression: lab.activeExpression, activeGraphFunction: lab.activeGraphFunction,
      applicationTarget: lab.applicationTarget, liveAuto: lab.liveAuto, liveMultiPv: lab.liveMultiPv,
    };
    clearTimeout(lab.visibilityPersistTimer);
    lab.visibilityPersistTimer = setTimeout(() => saveDb(this.db), 500);
  };

  p.disposeTransformGraphBinding = function disposeTransformGraphBindingVisibilitySafe() {
    const lab = this.transformLab;
    if (lab?.visibilityFrame) {
      (globalThis.cancelAnimationFrame || clearTimeout)(lab.visibilityFrame);
      lab.visibilityFrame = null;
    }
    if (lab?.visibilityResizeFallback) {
      window.removeEventListener('resize', lab.visibilityResizeFallback);
      lab.visibilityResizeFallback = null;
    }
    return baseDisposeTransformGraphBinding.call(this);
  };

  p.renderStockfishGraph = function renderStockfishGraphVisibilitySafe() {
    baseRenderStockfishGraph.call(this);
    const lab = this.ensureTransformLab();

    // El observador original vigilaba a la vez canvas y contenedor. Cambiar la
    // leyenda podía alterar layout, disparar ResizeObserver, redibujar el canvas
    // y volver a alterar el layout. Ese bucle era el origen principal del bug.
    lab.graphResizeObserver?.disconnect?.();
    lab.graphResizeObserver = null;
    if (lab.graphResizeFallback) {
      window.removeEventListener('resize', lab.graphResizeFallback);
      lab.graphResizeFallback = null;
    }
    if (lab.visibilityResizeFallback) window.removeEventListener('resize', lab.visibilityResizeFallback);
    lab.visibilityResizeFallback = () => {
      if (this.screen === 'stockfishGraph') this.scheduleTransformGraphDraw();
    };
    window.addEventListener('resize', lab.visibilityResizeFallback, {passive:true});

    const scheduleRefresh = () => {
      if (lab.visibilityFrame) return;
      const raf = globalThis.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
      lab.visibilityFrame = raf(() => {
        lab.visibilityFrame = null;
        if (this.screen !== 'stockfishGraph') return;
        this.updateTransformLegend();
        this.drawTransformGraph();
      });
    };

    $$('.transform-function-controls label').forEach((label) => {
      const input = label.querySelector('[data-transform-visibility]');
      if (!input) return;

      // Un botón dentro del mismo <label> del checkbox puede activar dos veces
      // el control en algunos navegadores. Se vuelve un indicador decorativo.
      const oldButton = label.querySelector('button');
      if (oldButton) {
        const state = document.createElement('span');
        state.className = 'transform-visibility-state';
        state.textContent = '◉';
        state.setAttribute('aria-hidden', 'true');
        state.style.pointerEvents = 'none';
        state.style.color = '#6d8da1';
        oldButton.replaceWith(state);
      }
      const state = label.querySelector('.transform-visibility-state');
      const syncState = () => { if (state) state.style.opacity = input.checked ? '.9' : '.25'; };
      syncState();

      input.onchange = (event) => {
        event.stopPropagation();
        const key = input.dataset.transformVisibility;
        lab.visibility[key] = input.checked;
        lab.graphSeriesCache = null;
        syncState();
        this.persistTransformConfig();
        scheduleRefresh();
      };
    });
  };
}

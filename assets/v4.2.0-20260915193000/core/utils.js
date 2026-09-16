export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function clamp(value, min, max) {
  const parsed = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : min));
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function uciToMove(uci = '') {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' };
}

export function moveToUci(move) {
  return `${move.from}${move.to}${move.promotion || ''}`;
}

export function positionKey(fen = '') {
  return String(fen).split(' ').slice(0, 4).join(' ');
}

export function scoreInPawns(candidate, perspective = null) {
  if (candidate?.mate) return candidate.mate > 0 ? 100 : -100;
  let value = Number(candidate?.displayScore ?? candidate?.score ?? 0) / 100;
  if (perspective === 'b') value *= -1;
  return value;
}

export function scoreText(candidate, perspective = null) {
  if (candidate?.mate) {
    const sign = perspective === 'b' ? -1 : 1;
    const mate = candidate.mate * sign;
    return `${mate > 0 ? '' : '-'}M${Math.abs(mate)}`;
  }
  const value = scoreInPawns(candidate, perspective);
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

export function phaseFromFen(fen = '') {
  const board = fen.split(' ')[0] || '';
  const material = [...board].reduce((sum, char) => sum + ({ q: 9, r: 5, b: 3, n: 3 }[char.toLowerCase()] || 0), 0);
  const fullmove = Number(fen.split(' ')[5] || 1);
  if (fullmove <= 12 && material >= 52) return 'apertura';
  if (material <= 26) return 'final';
  return 'medio juego';
}

export function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  fallbackDownload(blob, filename);
}

function fallbackDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

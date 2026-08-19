const RICKROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function installPruebaButton() {
  const topBar = document.querySelector('header.top');
  if (!topBar || topBar.querySelector('[data-prueba-rickroll]')) return;

  if (!document.getElementById('prueba-rickroll-style')) {
    const style = document.createElement('style');
    style.id = 'prueba-rickroll-style';
    style.textContent = `
      .prueba-rickroll {
        min-height: 40px;
        padding: 0 14px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 10px;
        background: rgba(255,255,255,.07);
        color: inherit;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }
      .prueba-rickroll:hover {
        background: rgba(255,255,255,.14);
      }
    `;
    document.head.appendChild(style);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prueba-rickroll';
  button.dataset.pruebaRickroll = '';
  button.textContent = 'Prueba';
  button.title = 'Prueba';
  button.addEventListener('click', () => window.location.assign(RICKROLL_URL));

  const settingsButton = topBar.querySelector('[data-settings]');
  topBar.insertBefore(button, settingsButton || null);
}

installPruebaButton();

const appRoot = document.getElementById('app');
if (appRoot) {
  new MutationObserver(installPruebaButton).observe(appRoot, {
    childList: true,
    subtree: true,
  });
}

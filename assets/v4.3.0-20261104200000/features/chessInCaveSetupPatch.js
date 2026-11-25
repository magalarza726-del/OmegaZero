import { $ } from '../app/deps.js';

function validMode(value){return ['pvp','pvc','cvc'].includes(value)?value:'pvp'}
function validColor(value){return value==='b'?'b':'w'}

export const chessInCaveSetupPatch={
  renderCaveSetup(){
    const v=$('#view'),cfg=this.caveConfig();
    let mode=validMode(cfg.mode);
    let humanColor=validColor(cfg.humanColor);

    v.innerHTML=`<section class="page-head cave-page-head"><button type="button" data-cave-back>←</button><div><small>VARIANTE · INFORMACIÓN PARCIAL</small><h1>In the night</h1></div></section>
    <section class="cave-intro-grid">
      <article class="panel cave-intro">
        <small>REGLA CENTRAL</small><h2>Ves únicamente lo que tus piezas revelan.</h2>
        <p>Las casillas fuera de tu campo de visión son oscuridad absoluta: no muestran color, ocupación ni piezas enemigas. Las piezas deslizantes ven hasta el primer bloqueo. Los peones revelan su avance inmediato y sus casillas de captura.</p>
        <div class="cave-rule-grid">
          <span><b>Sin jaque</b>El rey puede entrar en peligro y la partida termina cuando es capturado.</span>
          <span><b>Perspectiva privada</b>Blancas y Negras tienen mapas de visión distintos.</span>
          <span><b>Historial oculto</b>Las jugadas se revelan únicamente al terminar la partida.</span>
          <span><b>Tres modalidades</b>J1 vs J2 usa cortina de cambio; J1 vs COM mantiene la perspectiva del jugador; COM vs COM simula ambos bandos.</span>
        </div>
      </article>
      <article class="panel cave-setup-card">
        <small>CONFIGURAR PARTIDA</small><h2>Entrar en la noche</h2>
        <p><b>${mode==='cvc'?'COM vs COM':mode==='pvc'?'J1 vs COM':'J1 vs J2'}</b></p>
        <div id="caveHumanColorWrap" class="cave-color-picker">
          <span>Color de J1</span>
          <button type="button" class="cave-color-option" data-cave-color="w">Blancas</button>
          <button type="button" class="cave-color-option" data-cave-color="b">Negras</button>
        </div>
        <label class="cave-fog-toggle"><input id="caveFog" type="checkbox" ${cfg.fog?'checked':''}><span><b>Modo difícil · Niebla</b>Una pieza propia no iluminada por otra pieza propia se ve como peón hasta que se mueva o vuelva a ser iluminada.</span></label>
        <button type="button" id="startCave" class="primary">INICIAR PARTIDA</button>
        <p class="hint">El COM usa el motor propio de esta variante: rey capturable, sin jaque ni mate estándar.</p>
      </article>
    </section>`;

    const paint=()=>{
      document.querySelectorAll('[data-cave-mode]').forEach(button=>{
        const active=button.dataset.caveMode===mode;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',String(active));
      });
      const colorWrap=$('#caveHumanColorWrap');
      if(colorWrap)colorWrap.classList.toggle('is-hidden',mode!=='pvc');
      document.querySelectorAll('[data-cave-color]').forEach(button=>{
        const active=button.dataset.caveColor===humanColor;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',String(active));
      });
    };

    document.querySelectorAll('[data-cave-mode]').forEach(button=>{
      button.onclick=event=>{
        event.preventDefault();
        event.stopPropagation();
        mode=validMode(button.dataset.caveMode);
        paint();
      };
    });
    document.querySelectorAll('[data-cave-color]').forEach(button=>{
      button.onclick=event=>{
        event.preventDefault();
        event.stopPropagation();
        humanColor=validColor(button.dataset.caveColor);
        paint();
      };
    });

    $('[data-cave-back]').onclick=()=>{this.cancelCaveCom();this.caveLab=null;this.screen='variantPicker';this.render()};
    $('#startCave').onclick=()=>this.startCaveGame(Boolean($('#caveFog')?.checked),{mode,humanColor});
    paint();
  }
};

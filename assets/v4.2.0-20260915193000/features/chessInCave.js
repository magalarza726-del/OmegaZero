import { $, $$, playTone, saveDb } from '../app/deps.js';
import { initialCaveState, cavePieceAt, caveLegalMoves, caveVisibility, caveDisplayType, applyCaveMove } from '../core/caveChess.js';
import { chooseCaveComMove } from '../core/caveBot.js';

const FILES='abcdefgh';
const SIDE={w:'Blancas',b:'Negras'};
const TYPE_NAME={p:'Peón',n:'Caballo',b:'Alfil',r:'Torre',q:'Dama',k:'Rey'};
const ALL_SQUARES=new Set(Array.from({length:8},(_,r)=>Array.from({length:8},(_,f)=>FILES[f]+(r+1))).flat());

function squareOrder(perspective){
  return perspective==='w'
    ? {ranks:[8,7,6,5,4,3,2,1],files:[0,1,2,3,4,5,6,7]}
    : {ranks:[1,2,3,4,5,6,7,8],files:[7,6,5,4,3,2,1,0]};
}

function validMode(value){return value==='pvc'?'pvc':'pvp'}
function validColor(value){return value==='b'?'b':'w'}

export const chessInCaveMethods={
  caveConfig(){
    return {
      fog:Boolean(this.db.settings?.caveFog),
      mode:validMode(this.db.settings?.caveMode),
      humanColor:validColor(this.db.settings?.caveHumanColor)
    };
  },

  persistCaveConfig({fog,mode,humanColor}){
    this.db.settings.caveFog=Boolean(fog);
    this.db.settings.caveMode=validMode(mode);
    this.db.settings.caveHumanColor=validColor(humanColor);
    Promise.resolve(saveDb(this.db)).catch(()=>{});
  },

  renderChessInCave(){
    if(!this.caveLab||this.caveLab.phase==='setup')this.renderCaveSetup();
    else this.renderCaveGame();
  },

  renderCaveSetup(){
    const v=$('#view'),cfg=this.caveConfig();
    v.innerHTML=`<section class="page-head cave-page-head"><button data-cave-back>←</button><div><small>VARIANTE · INFORMACIÓN PARCIAL</small><h1>Chess in the Cave</h1></div></section>
    <section class="cave-intro-grid">
      <article class="panel cave-intro">
        <small>REGLA CENTRAL</small><h2>Ves únicamente lo que tus piezas revelan.</h2>
        <p>Las casillas fuera de tu campo de visión son oscuridad absoluta: no muestran color, ocupación ni piezas enemigas. Las piezas deslizantes ven hasta el primer bloqueo. Los peones revelan su avance inmediato y sus casillas de captura.</p>
        <div class="cave-rule-grid">
          <span><b>Sin jaque</b>El rey puede entrar en peligro y la partida termina cuando es capturado.</span>
          <span><b>Perspectiva privada</b>Blancas y Negras tienen mapas de visión distintos.</span>
          <span><b>Historial oculto</b>Las jugadas se revelan únicamente al terminar la partida.</span>
          <span><b>Dos modalidades</b>J1 vs J2 usa cortina de cambio; J1 vs COM mantiene siempre la perspectiva del jugador.</span>
        </div>
      </article>
      <article class="panel cave-setup-card">
        <small>CONFIGURAR PARTIDA</small><h2>Entrar a la cueva</h2>
        <div class="cave-mode-picker" role="radiogroup" aria-label="Modalidad">
          <label><input type="radio" name="caveMode" value="pvp" ${cfg.mode==='pvp'?'checked':''}><span><b>J1 vs J2</b><small>Dos jugadores · hot-seat</small></span></label>
          <label><input type="radio" name="caveMode" value="pvc" ${cfg.mode==='pvc'?'checked':''}><span><b>J1 vs COM</b><small>Computadora de la variante</small></span></label>
        </div>
        <div id="caveHumanColorWrap" class="cave-color-picker ${cfg.mode==='pvc'?'':'is-hidden'}">
          <span>Color de J1</span>
          <label><input type="radio" name="caveHumanColor" value="w" ${cfg.humanColor==='w'?'checked':''}> Blancas</label>
          <label><input type="radio" name="caveHumanColor" value="b" ${cfg.humanColor==='b'?'checked':''}> Negras</label>
        </div>
        <label class="cave-fog-toggle"><input id="caveFog" type="checkbox" ${cfg.fog?'checked':''}><span><b>Modo difícil · Niebla</b>Una pieza propia no iluminada por otra pieza propia se ve como peón hasta que se mueva o vuelva a ser iluminada.</span></label>
        <button id="startCave" class="primary">INICIAR PARTIDA</button>
        <p class="hint">El COM usa el motor propio de esta variante: rey capturable, sin jaque ni mate estándar.</p>
      </article>
    </section>`;

    $('[data-cave-back]').onclick=()=>{this.cancelCaveCom();this.caveLab=null;this.screen='home';this.render()};
    $$('input[name="caveMode"]').forEach(input=>input.onchange=()=>{
      const pvc=$('input[name="caveMode"]:checked')?.value==='pvc';
      $('#caveHumanColorWrap')?.classList.toggle('is-hidden',!pvc);
    });
    $('#startCave').onclick=()=>{
      const mode=validMode($('input[name="caveMode"]:checked')?.value);
      const humanColor=validColor($('input[name="caveHumanColor"]:checked')?.value);
      this.startCaveGame(Boolean($('#caveFog').checked),{mode,humanColor});
    };
  },

  startCaveGame(fog=false,{mode='pvp',humanColor='w'}={}){
    this.cancelCaveCom();
    mode=validMode(mode);humanColor=validColor(humanColor);
    this.persistCaveConfig({fog,mode,humanColor});
    this.caveLab={
      phase:'game',state:initialCaveState(),fog:Boolean(fog),mode,humanColor,
      selected:null,legal:[],handoff:false,comThinking:false,comTimer:null,session:1
    };
    this.renderCaveGame();
    if(mode==='pvc'&&this.caveLab.state.turn!==humanColor)this.scheduleCaveComMove();
  },

  cavePerspective(){
    const lab=this.caveLab;
    if(!lab?.state)return'w';
    return lab.mode==='pvc'?validColor(lab.humanColor):lab.state.turn;
  },

  caveVisibleSquares(){
    const lab=this.caveLab,state=lab?.state;
    if(!state)return new Set();
    if(state.winner)return ALL_SQUARES;
    return caveVisibility(state,this.cavePerspective());
  },

  caveBoardHtml(){
    const lab=this.caveLab,state=lab.state,perspective=this.cavePerspective(),visible=this.caveVisibleSquares(),revealAll=Boolean(state.winner);
    const {ranks,files}=squareOrder(perspective);
    let out='';

    const squareAt=(ri,ci)=>{
      if(ri<0||ri>=ranks.length||ci<0||ci>=files.length)return null;
      return FILES[files[ci]]+ranks[ri];
    };
    const visibleAt=(ri,ci)=>{
      const square=squareAt(ri,ci);
      return square?visible.has(square):true;
    };

    for(let ri=0;ri<ranks.length;ri++)for(let ci=0;ci<files.length;ci++){
      const rank=ranks[ri],fi=files[ci],square=FILES[fi]+rank,piece=cavePieceAt(state,square);
      const isVisible=visible.has(square),own=piece?.color===perspective,showPiece=piece&&(revealAll||own||isVisible);
      const displayType=showPiece?(revealAll?piece.type:caveDisplayType(state,square,perspective,{fog:lab.fog})):null;
      const selected=lab.selected===square,legal=isVisible&&lab.legal.includes(square),base=(fi+rank)%2?'light':'dark';
      const edgeClasses=[];
      if(!revealAll&&isVisible){
        if(!visibleAt(ri-1,ci))edgeClasses.push('cave-fade-top');
        if(!visibleAt(ri+1,ci))edgeClasses.push('cave-fade-bottom');
        if(!visibleAt(ri,ci-1))edgeClasses.push('cave-fade-left');
        if(!visibleAt(ri,ci+1))edgeClasses.push('cave-fade-right');
      }else if(!revealAll&&!isVisible){
        if(visibleAt(ri-1,ci))edgeClasses.push('cave-glow-top');
        if(visibleAt(ri+1,ci))edgeClasses.push('cave-glow-bottom');
        if(visibleAt(ri,ci-1))edgeClasses.push('cave-glow-left');
        if(visibleAt(ri,ci+1))edgeClasses.push('cave-glow-right');
      }
      const label=isVisible?(piece?`${square}: ${SIDE[piece.color]} ${TYPE_NAME[displayType]}`:`${square}: visible`):`${square}: oscuridad`;
      out+=`<button class="cave-sq ${isVisible?`cave-visible ${base}`:'cave-unseen'} ${edgeClasses.join(' ')} ${selected?'selected':''} ${legal?'cave-legal':''}" data-cave-square="${square}" aria-label="${label}" ${isVisible||own?'':'tabindex="-1"'}>${showPiece?`<img src="${this.pieceSrc(piece.color,displayType)}" draggable="false" alt="">`:''}${rank===(perspective==='w'?1:8)?`<i class="file">${FILES[fi]}</i>`:''}${fi===(perspective==='w'?0:7)?`<i class="rank">${rank}</i>`:''}</button>`;
    }
    return out;
  },

  renderCaveGame(){
    const lab=this.caveLab;if(!lab)return this.renderCaveSetup();
    const state=lab.state,v=$('#view');

    if(lab.mode==='pvp'&&lab.handoff&&!state.winner){
      v.innerHTML=`<section class="cave-handoff"><div class="panel"><small>CAMBIO DE PERSPECTIVA</small><h1>Turno de ${SIDE[state.turn]}</h1><p>Entrega el dispositivo al siguiente jugador. El tablero permanece oculto para no revelar la perspectiva rival.</p><button id="enterCaveTurn" class="primary">MOSTRAR MI TABLERO</button><button data-cave-exit>Salir</button></div></section>`;
      $('#enterCaveTurn').onclick=()=>{lab.handoff=false;lab.selected=null;lab.legal=[];this.renderCaveGame()};
      $('[data-cave-exit]').onclick=()=>this.exitCaveGame();
      return;
    }

    const visible=this.caveVisibleSquares(),gameOver=Boolean(state.winner);
    const winner=state.winner==='draw'?'Tablas':state.winner?`${SIDE[state.winner]} ganan`:'';
    const isComTurn=lab.mode==='pvc'&&!gameOver&&state.turn!==lab.humanColor;
    const heading=gameOver?winner:(isComTurn?(lab.comThinking?'COM explorando la cueva…':'Turno del COM'):`Turno de ${SIDE[state.turn]}`);
    const modeLabel=lab.mode==='pvc'?`J1 (${SIDE[lab.humanColor]}) vs COM`:'J1 vs J2';
    const history=gameOver?`<section class="cave-history"><h3>Historial revelado</h3><div>${state.history.map((m,i)=>`<span><b>${i+1}.</b> ${m.notation}</span>`).join('')}</div></section>`:'';

    v.innerHTML=`<section class="page-head cave-page-head"><button data-cave-exit>←</button><div><small>CHESS IN THE CAVE · ${modeLabel}${lab.fog?' · NIEBLA':''}</small><h1>${heading}</h1></div><span class="cave-vision-count">${gameOver?'64':visible.size} casillas visibles</span></section>
    <section class="cave-game-layout">
      <div class="cave-board-shell ${isComTurn?'cave-com-active':''}"><div id="caveBoard" class="cave-board" style="${this.customBoardStyle()}">${this.caveBoardHtml()}</div><div class="cave-board-caption">${gameOver?'LA CUEVA SE ABRIÓ · TABLERO COMPLETO':isComTurn?'EL COM ESTÁ EXPLORANDO':'VES LO QUE TUS PIEZAS REVELAN'}</div></div>
      <aside class="panel cave-side-panel"><small>REGLAS ACTIVAS · ${modeLabel}</small><h2>${gameOver?'Partida terminada':isComTurn?'COM pensando…':'Información parcial'}</h2>
      ${gameOver?`<div class="cave-result"><strong>${winner}</strong><p>${state.result||''} · Al terminar se revela el tablero completo y el historial.</p></div>`:`<p>La oscuridad no revela color, ocupación ni piezas enemigas. El borde de penumbra es únicamente visual y no añade información.</p>`}
      <div class="cave-rules-mini"><span>◈ Tu pieza siempre revela su propia casilla.</span><span>◈ Peón: avance inmediato visible + diagonales de captura.</span><span>◈ Torre, alfil y dama: línea continua hasta el primer bloqueo.</span><span>◈ Caballo y rey: casillas alcanzadas por su geometría.</span><span>◈ El rey se captura directamente.</span>${lab.fog?'<span>◈ Niebla: piezas aliadas aisladas aparentan ser peones.</span>':''}${lab.mode==='pvc'?'<span>◈ El COM no usa reglas de jaque estándar; juega con el motor propio de la variante.</span>':''}</div>
      ${history}<div class="row"><button id="restartCave">Nueva partida</button></div></aside>
    </section>`;

    $$('[data-cave-square]').forEach(button=>button.onclick=()=>this.caveClickSquare(button.dataset.caveSquare));
    $('[data-cave-exit]').onclick=()=>this.exitCaveGame();
    $('#restartCave').onclick=()=>{this.cancelCaveCom();this.caveLab.phase='setup';this.renderCaveSetup()};
  },

  caveClickSquare(square){
    const lab=this.caveLab,state=lab?.state;
    if(!lab||!state||state.winner||lab.handoff||lab.comThinking)return;
    if(lab.mode==='pvc'&&state.turn!==lab.humanColor)return;

    const perspective=this.cavePerspective(),visible=caveVisibility(state,perspective);
    if(!visible.has(square))return;

    const piece=cavePieceAt(state,square),own=piece?.color===state.turn;
    if(lab.selected&&lab.legal.includes(square)){
      const moving=cavePieceAt(state,lab.selected);let promotion='q';
      if(moving?.type==='p'&&(square.endsWith('8')||square.endsWith('1'))){
        const answer=(prompt('Promoción: Q, R, B o N','Q')||'Q').toLowerCase();
        promotion=['q','r','b','n'].includes(answer)?answer:'q';
      }
      const result=applyCaveMove(state,lab.selected,square,{promotion});
      if(result.ok){
        playTone?.(result.move?.captured?'capture':'move',{enabled:this.db.settings.sound!==false,pack:this.db.settings.soundPack||'minimal',volume:(this.db.settings.soundVolume??70)/100});
        lab.selected=null;lab.legal=[];
        if(!state.winner&&lab.mode==='pvp')lab.handoff=true;
        this.renderCaveGame();
        if(!state.winner&&lab.mode==='pvc')this.scheduleCaveComMove();
        return;
      }
    }

    if(own){
      lab.selected=square;
      lab.legal=caveLegalMoves(state,square).filter(target=>visible.has(target));
      this.renderCaveGame();
      return;
    }
    lab.selected=null;lab.legal=[];this.renderCaveGame();
  },

  scheduleCaveComMove(delay=520){
    const lab=this.caveLab,state=lab?.state;
    if(!lab||lab.mode!=='pvc'||state.winner||state.turn===lab.humanColor||lab.comThinking)return;
    this.cancelCaveCom(false);
    lab.comThinking=true;
    const token=lab.session;
    this.renderCaveGame();

    lab.comTimer=setTimeout(()=>{
      const current=this.caveLab;
      if(!current||current!==lab||current.session!==token||this.screen!=='chessInCave'||current.mode!=='pvc'||current.state.winner||current.state.turn===current.humanColor){
        if(current===lab)current.comThinking=false;
        return;
      }
      current.comTimer=null;
      const move=chooseCaveComMove(current.state,current.state.turn);
      if(!move){
        current.comThinking=false;
        if(!current.state.winner){current.state.winner='draw';current.state.result='1/2-1/2'}
        this.renderCaveGame();
        return;
      }
      const result=applyCaveMove(current.state,move.from,move.to,{promotion:move.promotion||'q'});
      current.comThinking=false;
      current.selected=null;current.legal=[];
      if(result.ok)playTone?.(result.move?.captured?'capture':'move',{enabled:this.db.settings.sound!==false,pack:this.db.settings.soundPack||'minimal',volume:(this.db.settings.soundVolume??70)/100});
      this.renderCaveGame();
    },delay);
  },

  cancelCaveCom(invalidate=true){
    const lab=this.caveLab;
    if(!lab)return;
    if(lab.comTimer){clearTimeout(lab.comTimer);lab.comTimer=null}
    lab.comThinking=false;
    if(invalidate)lab.session=(lab.session||0)+1;
  },

  exitCaveGame(){
    if(this.caveLab?.phase==='game'&&!this.caveLab.state.winner&&this.caveLab.state.ply>0&&!confirm('¿Salir de Chess in the Cave? La partida actual se perderá.'))return;
    this.cancelCaveCom();
    this.caveLab=null;this.screen='home';this.render();
  }
};

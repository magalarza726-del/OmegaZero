import { $, $$, playTone } from '../app/deps.js';
import { initialCaveState, cavePieceAt, caveLegalMoves, caveVisibility, caveDisplayType, applyCaveMove } from '../core/caveChess.js';

const FILES='abcdefgh';
const SIDE={w:'Blancas',b:'Negras'};
const TYPE_NAME={p:'Peón',n:'Caballo',b:'Alfil',r:'Torre',q:'Dama',k:'Rey'};

function squareOrder(perspective){
  return perspective==='w'
    ? {ranks:[8,7,6,5,4,3,2,1],files:[0,1,2,3,4,5,6,7]}
    : {ranks:[1,2,3,4,5,6,7,8],files:[7,6,5,4,3,2,1,0]};
}

export const chessInCaveMethods={
  caveConfig(){return {fog:Boolean(this.db.settings?.caveFog)}},
  renderChessInCave(){if(!this.caveLab||this.caveLab.phase==='setup')this.renderCaveSetup();else this.renderCaveGame()},
  renderCaveSetup(){
    const v=$('#view'),cfg=this.caveConfig();
    v.innerHTML=`<section class="page-head cave-page-head"><button data-cave-back>←</button><div><small>VARIANTE · INFORMACIÓN PARCIAL</small><h1>Chess in the Cave</h1></div></section><section class="cave-intro-grid"><article class="panel cave-intro"><small>REGLA CENTRAL</small><h2>Ves únicamente lo que tus piezas revelan.</h2><p>Las casillas fuera de tu campo de visión son oscuridad absoluta: no muestran color, ocupación ni piezas enemigas. Las piezas deslizantes ven hasta el primer bloqueo. Los peones revelan su avance inmediato y sus casillas de captura.</p><div class="cave-rule-grid"><span><b>Sin jaque</b>El rey puede entrar en peligro y la partida termina cuando es capturado.</span><span><b>Perspectiva privada</b>Blancas y Negras tienen mapas de visión distintos.</span><span><b>Historial oculto</b>Las jugadas se revelan únicamente al terminar la partida.</span><span><b>Hot-seat seguro</b>Entre turnos aparece una cortina para entregar el dispositivo.</span></div></article><article class="panel cave-setup-card"><small>PARTIDA LOCAL · J1 VS J2</small><h2>Entrar a la cueva</h2><label class="cave-fog-toggle"><input id="caveFog" type="checkbox" ${cfg.fog?'checked':''}><span><b>Modo difícil · Niebla</b>Una pieza propia no iluminada por otra pieza propia se ve como peón hasta que se mueva o vuelva a ser iluminada.</span></label><button id="startCave" class="primary">INICIAR PARTIDA</button><p class="hint">Este módulo usa un motor de variante propio: no aplica jaque ni mate; el rey se captura directamente.</p></article></section>`;
    $('[data-cave-back]').onclick=()=>{this.caveLab=null;this.screen='home';this.render()};
    $('#caveFog').onchange=e=>{this.db.settings.caveFog=e.target.checked};
    $('#startCave').onclick=()=>this.startCaveGame(Boolean($('#caveFog').checked));
  },
  startCaveGame(fog=false){this.db.settings.caveFog=fog;this.caveLab={phase:'game',state:initialCaveState(),fog,selected:null,legal:[],handoff:false};this.renderCaveGame()},
  caveBoardHtml(){
    const lab=this.caveLab,state=lab.state,perspective=state.turn,visible=caveVisibility(state,perspective),{ranks,files}=squareOrder(perspective);let out='';
    for(const rank of ranks)for(const fi of files){
      const square=FILES[fi]+rank,piece=cavePieceAt(state,square),isVisible=visible.has(square),own=piece?.color===perspective,showPiece=piece&&(own||isVisible),displayType=showPiece?caveDisplayType(state,square,perspective,{fog:lab.fog}):null,selected=lab.selected===square,legal=lab.legal.includes(square),base=(fi+rank)%2?'light':'dark';
      const label=isVisible?(piece?`${square}: ${SIDE[piece.color]} ${TYPE_NAME[displayType]}`:`${square}: visible`):`${square}: oscuridad`;
      out+=`<button class="cave-sq ${isVisible?`cave-visible ${base}`:'cave-unseen'} ${selected?'selected':''} ${legal?'cave-legal':''}" data-cave-square="${square}" aria-label="${label}" ${isVisible||own?'':'tabindex="-1"'}>${showPiece?`<img src="${this.pieceSrc(piece.color,displayType)}" draggable="false" alt="">`:''}${rank===(perspective==='w'?1:8)?`<i class="file">${FILES[fi]}</i>`:''}${fi===(perspective==='w'?0:7)?`<i class="rank">${rank}</i>`:''}</button>`;
    }
    return out;
  },
  renderCaveGame(){
    const lab=this.caveLab;if(!lab)return this.renderCaveSetup();const state=lab.state,v=$('#view');
    if(lab.handoff&&!state.winner){v.innerHTML=`<section class="cave-handoff"><div class="panel"><small>CAMBIO DE PERSPECTIVA</small><h1>Turno de ${SIDE[state.turn]}</h1><p>Entrega el dispositivo al siguiente jugador. El tablero permanece oculto para no revelar la perspectiva rival.</p><button id="enterCaveTurn" class="primary">MOSTRAR MI TABLERO</button><button data-cave-exit>Salir</button></div></section>`;$('#enterCaveTurn').onclick=()=>{lab.handoff=false;lab.selected=null;lab.legal=[];this.renderCaveGame()};$('[data-cave-exit]').onclick=()=>this.exitCaveGame();return}
    const visible=caveVisibility(state,state.turn),gameOver=Boolean(state.winner),winner=state.winner==='draw'?'Tablas':state.winner?`${SIDE[state.winner]} ganan`:'';
    const history=gameOver?`<section class="cave-history"><h3>Historial revelado</h3><div>${state.history.map((m,i)=>`<span><b>${i+1}.</b> ${m.notation}</span>`).join('')}</div></section>`:'';
    v.innerHTML=`<section class="page-head cave-page-head"><button data-cave-exit>←</button><div><small>CHESS IN THE CAVE ${lab.fog?'· NIEBLA':''}</small><h1>${gameOver?winner:`Turno de ${SIDE[state.turn]}`}</h1></div><span class="cave-vision-count">${visible.size} casillas visibles</span></section><section class="cave-game-layout"><div class="cave-board-shell"><div id="caveBoard" class="cave-board" style="${this.customBoardStyle()}">${this.caveBoardHtml()}</div><div class="cave-board-caption">${gameOver?'LA CUEVA SE ABRE AL FINAL':'VES LO QUE TUS PIEZAS REVELAN'}</div></div><aside class="panel cave-side-panel"><small>REGLAS ACTIVAS</small><h2>${gameOver?'Partida terminada':'Información parcial'}</h2>${gameOver?`<div class="cave-result"><strong>${winner}</strong><p>${state.result||''} · El rey fue capturado o no quedan movimientos.</p></div>`:`<p>Las casillas negras son información inexistente desde tu perspectiva. No hay indicador de jaque ni historial de movimientos.</p>`}<div class="cave-rules-mini"><span>◈ Tu pieza siempre revela su propia casilla.</span><span>◈ Peón: avance inmediato visible + diagonales de captura.</span><span>◈ Torre, alfil y dama: línea continua hasta el primer bloqueo.</span><span>◈ Caballo y rey: casillas alcanzadas por su geometría.</span><span>◈ El rey se captura directamente.</span>${lab.fog?'<span>◈ Niebla: piezas aliadas aisladas aparentan ser peones.</span>':''}</div>${history}<div class="row"><button id="restartCave">Nueva partida</button></div></aside></section>`;
    $$('[data-cave-square]').forEach(button=>button.onclick=()=>this.caveClickSquare(button.dataset.caveSquare));$('[data-cave-exit]').onclick=()=>this.exitCaveGame();$('#restartCave').onclick=()=>{this.caveLab.phase='setup';this.renderCaveSetup()};
  },
  caveClickSquare(square){
    const lab=this.caveLab,state=lab?.state;if(!lab||!state||state.winner||lab.handoff)return;const piece=cavePieceAt(state,square),own=piece?.color===state.turn;
    if(lab.selected&&lab.legal.includes(square)){const moving=cavePieceAt(state,lab.selected);let promotion='q';if(moving?.type==='p'&&(square.endsWith('8')||square.endsWith('1'))){const answer=(prompt('Promoción: Q, R, B o N','Q')||'Q').toLowerCase();promotion=['q','r','b','n'].includes(answer)?answer:'q'}const result=applyCaveMove(state,lab.selected,square,{promotion});if(result.ok){playTone?.(result.move?.captured?'capture':'move',{enabled:this.db.settings.sound!==false,pack:this.db.settings.soundPack||'minimal',volume:(this.db.settings.soundVolume??70)/100});lab.selected=null;lab.legal=[];if(!state.winner)lab.handoff=true;this.renderCaveGame();return}}
    if(own){lab.selected=square;lab.legal=caveLegalMoves(state,square);this.renderCaveGame();return}lab.selected=null;lab.legal=[];this.renderCaveGame();
  },
  exitCaveGame(){if(this.caveLab?.phase==='game'&&!this.caveLab.state.winner&&this.caveLab.state.ply>0&&!confirm('¿Salir de Chess in the Cave? La partida actual se perderá.'))return;this.caveLab=null;this.screen='home';this.render()}
};

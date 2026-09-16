import {
  Chess, saveDb, addGame, addProblemsFromGame, $, $$, clamp, esc, uciToMove,
  fideGameState, timeoutResult,
  HIDDEN_ELO_STYLE_LABELS, hiddenEloGuessOutcome, hiddenEloGuessWindow,
  randomHiddenElo, randomHiddenStyle, nextEffectiveElo, eloToSkill, eloToDepth,
  hiddenEloRandomMoveChance, hiddenEloThinkSeconds, chooseHiddenEloCandidate,
} from '../app/deps.js';

const DEFAULT_CONFIG=Object.freeze({boards:3,minutes:5,increment:0});
const SECRET_NAMES=Object.freeze(['Orion','Vega','Atlas','Nova','Mira','Altair','Lyra','Ceres','Aster','Nadir','Sirius','Helios','Gaia','Selene','Aquila','Zenith','Draco','Lumen']);
const STYLE_ICON=Object.freeze({sun:'☀️',earth:'🌍',moon:'🌙'});
const outcomeText=key=>key==='win'?'Victoria':key==='draw'?'Tablas':'Derrota';

function resultFromHumanOutcome(humanColor,outcome){
  if(outcome==='draw')return '1/2-1/2';
  const humanWon=outcome==='win';
  const whiteWon=(humanColor==='w'&&humanWon)||(humanColor==='b'&&!humanWon);
  return whiteWon?'1-0':'0-1';
}

export const amongUsChessMethods={
 amongUsConfig(){return {...DEFAULT_CONFIG,...(this.db.settings.amongUsConfig||{})}},
 persistAmongUsConfig(next){this.db.settings.amongUsConfig={...this.amongUsConfig(),...next};saveDb(this.db)},
 stopAmongUsClock(){if(this.amongUsLab?.timer){clearInterval(this.amongUsLab.timer);this.amongUsLab.timer=null}},
 resetAmongUsLab(){this.stopAmongUsClock();this.amongUsLab={active:false,activeIndex:0,games:[],timer:null,guessIndex:null,guessValue:1500,startedAt:null};this.amongEngineQueue=Promise.resolve()},
 amongRandomName(used){const pool=SECRET_NAMES.filter(name=>!used.has(name));const name=(pool.length?pool:SECRET_NAMES)[Math.floor(Math.random()*(pool.length?pool.length:SECRET_NAMES.length))];used.add(name);return name},
 renderAmongUsChess(){const lab=this.amongUsLab;if(!lab?.active){this.renderAmongUsSetup();return}this.renderAmongUsSession()},
 renderAmongUsSetup(){
  const v=$('#view'),cfg=this.amongUsConfig();
  v.innerHTML=`<section class="page-head among-head"><button data-among-home>←</button><div><small>JUGAR · DEDUCCIÓN DE FUERZA</small><h1>Among Us Chess</h1><p>Juega simultáneamente contra identidades ocultas. Puedes ganar por mate, por bandera o descubriendo el Elo real del rival.</p></div></section>
  <section class="among-setup panel"><header><div><small>CONFIGURACIÓN DE SESIÓN</small><h2>Rivales ocultos</h2></div><span>3–6 tableros simultáneos</span></header><div class="among-setup-grid"><label>Número de rivales / tableros<input data-among-boards type="range" min="3" max="6" step="1" value="${cfg.boards}"><output data-among-boards-out>${cfg.boards}</output></label><label>Minutos por jugador<input data-among-minutes type="number" min="1" max="60" step="1" value="${cfg.minutes}"></label><label>Incremento por jugada (s)<input data-among-increment type="number" min="0" max="60" step="1" value="${cfg.increment}"></label></div><div class="among-rules"><article><b>🔎 Descubrir Elo</b><p>Se habilita al completar la jugada 10 y luego únicamente en 15, 20, 25…</p></article><article><b>±100</b><p>Victoria por identificación.</p></article><article><b>±200</b><p>Tablas por identificación.</p></article><article><b>&gt;200</b><p>Derrota por identificación.</p></article></div><div class="among-style-preview"><span><b>☀️ Sol</b> ráfagas temporales de +500 a +1000 Elo.</span><span><b>🌍 Tierra</b> juega aproximadamente a su Elo real.</span><span><b>🌙 Luna</b> disimula con periodos de −300 a −700 Elo.</span></div><button data-among-start class="primary">INICIAR SESIÓN</button><small class="among-disclaimer">El Elo es una simulación experimental basada en la selección probabilística de candidatas de Stockfish; no representa con exactitud el comportamiento de una persona de ese rating.</small></section>`;
  $('[data-among-home]').onclick=()=>{this.screen='home';this.render()};
  $('[data-among-boards]')?.addEventListener('input',event=>$('[data-among-boards-out]').textContent=event.target.value);
  $('[data-among-start]').onclick=()=>{const next={boards:clamp($('[data-among-boards]').value,3,6),minutes:clamp($('[data-among-minutes]').value,1,60),increment:clamp($('[data-among-increment]').value,0,60)};this.persistAmongUsConfig(next);this.startAmongUsSession(next)};
 },
 startAmongUsSession(config=this.amongUsConfig()){
  this.stopAmongUsClock();const used=new Set(),usedElos=new Set(),now=performance.now();
  const nextElo=()=>{let elo=randomHiddenElo();while(usedElos.has(elo))elo=randomHiddenElo();usedElos.add(elo);return elo};
  const games=Array.from({length:clamp(config.boards,3,6)},(_,index)=>{
   const humanColor=index%2===0?'w':'b',elo=nextElo(),style=randomHiddenStyle(),chess=new Chess();
   return {id:`Tablero ${index+1}`,chess,humanColor,profile:{name:this.amongRandomName(used),elo,style,styleState:{burstLeft:0,burstBoost:0}},selected:null,legal:[],lastMove:null,annotations:new Map(),arrows:[],boardFlipped:humanColor==='b',positions:[{fen:chess.fen(),ply:0}],clock:{human:Number(config.minutes)*60,opponent:Number(config.minutes)*60,last:now},thinking:false,resolved:false,outcome:null,reason:null,revealed:false,guess:null,gameSaved:false,effectiveTrace:[]};
  });
  this.amongUsLab={active:true,activeIndex:0,games,timer:null,guessIndex:null,guessValue:1500,startedAt:new Date().toISOString(),config:{...config}};this.amongEngineQueue=Promise.resolve();this.activateAmongBoard(0,false,true);this.renderAmongUsSession();this.startAmongUsClock();
  games.forEach((game,index)=>{if(game.chess.turn()!==game.humanColor)this.enqueueAmongReply(index)});
 },
 amongActiveGame(){const lab=this.amongUsLab;return lab?.games?.[lab.activeIndex??0]||null},
 syncAmongActiveGame(){
  const lab=this.amongUsLab,game=this.amongActiveGame();if(!lab?.active||!game||this.chess!==game.chess)return;
  game.selected=this.selected;game.legal=[...(this.legal||[])];game.lastMove=this.lastMove?[...this.lastMove]:null;game.annotations=this.annotations;game.arrows=this.arrows;game.boardFlipped=this.boardFlipped;
 },
 activateAmongBoard(index,paint=true,skipSync=false){
  const lab=this.amongUsLab;if(!lab?.active||!lab.games.length)return;if(!skipSync)this.syncAmongActiveGame();const total=lab.games.length;lab.activeIndex=(Number(index)+total)%total;const game=lab.games[lab.activeIndex];
  this.chess=game.chess;this.selected=game.selected;this.legal=[...(game.legal||[])];this.lastMove=game.lastMove?[...game.lastMove]:null;this.annotations=game.annotations||new Map();this.arrows=game.arrows||[];this.boardFlipped=Boolean(game.boardFlipped);if(paint)this.renderAmongUsSession();
 },
 nextAmongBoard(){
  const lab=this.amongUsLab;if(!lab?.active)return;const start=lab.activeIndex,total=lab.games.length;let chosen=(start+1)%total;
  for(let n=1;n<=total;n+=1){const i=(start+n)%total,g=lab.games[i];if(!g.resolved&&!g.thinking&&g.chess.turn()===g.humanColor){chosen=i;break}}
  this.activateAmongBoard(chosen);
 },
 amongClockForColor(game,color){return color===game.humanColor?game.clock.human:game.clock.opponent},
 amongMoveList(game){const h=game.chess.history();let html='';for(let i=0;i<h.length;i+=2)html+=`<div><b>${i/2+1}.</b><span>${h[i]||''}</span><span>${h[i+1]||''}</span></div>`;return html||'<p>La partida todavía no tiene jugadas.</p>'},
 amongSessionSummaryHtml(compact=false){
  const lab=this.amongUsLab,done=lab.games.filter(game=>game.resolved),wins=done.filter(game=>game.outcome==='win').length,draws=done.filter(game=>game.outcome==='draw').length,losses=done.filter(game=>game.outcome==='loss').length,guesses=done.filter(game=>game.guess),mean=guesses.length?Math.round(guesses.reduce((sum,game)=>sum+game.guess.error,0)/guesses.length):null;
  return `<section class="among-session-summary panel ${compact?'among-sidebar-summary':''}"><span><b>${wins}</b> victorias</span><span><b>${draws}</b> tablas</span><span><b>${losses}</b> derrotas</span><span><b>${done.length}/${lab.games.length}</b> resueltos</span><span><b>${mean==null?'—':mean}</b> error Elo medio</span></section>`;
 },
 amongOverviewHtml(){
  const lab=this.amongUsLab;return `<div class="sim-overview">${lab.games.map((game,index)=>{const reveal=game.revealed||game.resolved,status=game.resolved?`${outcomeText(game.outcome)} · ${game.reason}`:game.thinking?'Calculando…':game.chess.turn()===game.humanColor?'Tu turno':'Turno rival';return `<button data-among-board="${index}" class="${index===lab.activeIndex?'active':''}"><b>${game.id}</b><span>${esc(status)}</span><small>${reveal?`${STYLE_ICON[game.profile.style]} Elo ${game.profile.elo}`:'??? · Elo ???'}</small></button>`}).join('')}</div>`;
 },
 amongGuessModal(){
  const lab=this.amongUsLab,index=lab?.guessIndex;if(index==null)return'';const game=lab.games[index];if(!game||game.resolved)return'';
  return `<div class="modal among-guess-modal"><div class="dialog"><header><div><small>${game.id} · ACUSACIÓN</small><h2>¿Cuál es su Elo?</h2></div><button data-among-guess-close>×</button></header><p>Esta decisión termina este tablero. ±100 = victoria, ±200 = tablas, más de 200 = derrota.</p><label>Elo estimado<input data-among-guess-value type="number" min="500" max="2500" step="25" value="${lab.guessValue||1500}"></label><input data-among-guess-slider type="range" min="500" max="2500" step="25" value="${lab.guessValue||1500}"><div class="among-guess-actions"><button data-among-guess-close>Cancelar</button><button data-among-guess-submit class="primary">REVELAR IDENTIDAD</button></div></div></div>`;
 },
 renderAmongUsSession(){
  const lab=this.amongUsLab;if(!lab?.active){this.renderAmongUsSetup();return}if(!this.amongActiveGame())lab.activeIndex=0;if(this.chess!==this.amongActiveGame()?.chess)this.activateAmongBoard(lab.activeIndex,false,true);
  const v=$('#view'),game=this.amongActiveGame(),index=lab.activeIndex,allDone=lab.games.every(item=>item.resolved),windowInfo=hiddenEloGuessWindow(game.chess.history().length),humanTurn=!game.resolved&&!game.thinking&&game.chess.turn()===game.humanColor,reveal=game.revealed||game.resolved;
  const identity=reveal?`${esc(game.profile.name)} · Elo ${game.profile.elo} · ${STYLE_ICON[game.profile.style]} ${HIDDEN_ELO_STYLE_LABELS[game.profile.style]}`:'Identidad ??? · Elo ??? · Estilo ???';
  const status=game.resolved?`${outcomeText(game.outcome)} · ${esc(game.reason)}`:game.thinking?'El rival calcula…':humanTurn?'Tu turno':'Turno rival';
  const wClock=this.amongClockForColor(game,'w'),bClock=this.amongClockForColor(game,'b'),guessText=windowInfo.enabled?'🔎 DESCUBRIR ELO':`🔒 Próxima: jugada ${windowInfo.next}`;
  const tabs=`<div class="sim-board-tabs">${lab.games.map((item,i)=>`<button data-among-board="${i}" class="${i===index?'active':''} ${item.thinking?'thinking':''} ${item.resolved?'finished':''}">${i+1}</button>`).join('')}</div><div class="game-live-controls sim-nav"><button data-among-prev>← Tablero anterior</button><button data-among-next>Tablero siguiente →</button></div>`;
  v.innerHTML=`<section class="game-layout simultaneous-game among-simultaneous"><div><div class="clocks"><span class="${game.chess.turn()==='b'&&!game.resolved?'active':''}">Negras <b data-among-clock-b>${this.timeText(bClock)}</b></span><span class="${game.chess.turn()==='w'&&!game.resolved?'active':''}">Blancas <b data-among-clock-w>${this.timeText(wClock)}</b></span></div><div class="board-stage"><div class="board-wrap" style="${this.customBoardStyle()}"><div class="board-id">${game.id}</div><div class="board" id="board">${this.boardHtml(game.chess,true)}</div>${this.arrowsSvg()}</div>${this.annotationPanel()}</div></div><aside><button data-among-exit>← Salir</button><small>AMONG US CHESS · ${index+1}/${lab.games.length}</small><h2>${identity}</h2>${this.amongSessionSummaryHtml(true)}${this.amongOverviewHtml()}${tabs}<div class="evalbox"><b>${status}</b><span>J1 ${game.humanColor==='w'?'blancas':'negras'} · Jugadas completas ${windowInfo.fullMoves}${game.guess?` · estimación ${game.guess.value} · error ${game.guess.error}`:''}</span></div><div class="moves">${this.amongMoveList(game)}</div><div class="actions"><button data-among-guess="${index}" ${game.resolved||game.thinking||!windowInfo.enabled?'disabled':''}>${guessText}</button><button data-among-fullscreen>⛶ Pantalla completa</button><button data-among-clear>Borrar marcas</button></div><p class="hint">Misma interacción que las simultáneas J1 vs COM: clic izquierdo o arrastre para mover. Clic derecho marca una casilla; mantén y arrastra con clic derecho para crear una flecha.</p></aside></section>${allDone?'<div class="among-complete-strip">SESIÓN COMPLETA · todas las identidades han sido resueltas</div>':''}${this.amongGuessModal()}`;
  this.bindAmongBoard(game,index,humanTurn);this.bindAnnotationPanel();
  $('[data-among-exit]').onclick=()=>{if(!allDone&&!confirm('¿Salir de la sesión actual? Los tableros inconclusos no se guardarán.'))return;this.syncAmongActiveGame();this.stopAmongUsClock();this.amongUsLab=null;this.screen='home';this.render()};
  $$('[data-among-board]').forEach(button=>button.onclick=()=>this.activateAmongBoard(Number(button.dataset.amongBoard)));$('[data-among-prev]')?.addEventListener('click',()=>this.activateAmongBoard(index-1));$('[data-among-next]')?.addEventListener('click',()=>this.activateAmongBoard(index+1));
  $$('[data-among-guess]').forEach(button=>button.onclick=()=>{if(button.disabled)return;lab.guessIndex=Number(button.dataset.amongGuess);lab.guessValue=1500;this.renderAmongUsSession()});
  $$('[data-among-guess-close]').forEach(button=>button.onclick=()=>{lab.guessIndex=null;this.renderAmongUsSession()});
  const input=$('[data-among-guess-value]'),slider=$('[data-among-guess-slider]');input?.addEventListener('input',()=>{lab.guessValue=clamp(input.value,500,2500);if(slider)slider.value=lab.guessValue});slider?.addEventListener('input',()=>{lab.guessValue=Number(slider.value);if(input)input.value=slider.value});$('[data-among-guess-submit]')?.addEventListener('click',()=>this.submitAmongGuess());
  $('[data-among-fullscreen]')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{/* Puede bloquearse sin gesto válido. */}});
  $('[data-among-clear]')?.addEventListener('click',()=>{this.annotations.clear();this.arrows=[];this.syncAmongActiveGame();this.renderAmongUsSession()});
 },
 bindAmongBoard(game,index,humanTurn){
  const board=$('#board');if(!board)return;this.bindKeyboardBoard(board);board.oncontextmenu=event=>event.preventDefault();
  $$('[data-square]',board).forEach(cell=>{
   cell.onclick=()=>{if(Date.now()<(this.suppress||0))return;this.amongSelectSquare(index,cell.dataset.square)};
   cell.onpointerdown=event=>{if(event.button===2)this.startRightAnnotation(event,cell.dataset.square,'amongUs');else if(humanTurn)this.startVisualDrag(event,cell.dataset.square,'amongUs',game.chess)};
   cell.onpointermove=event=>{this.dragMove(event);this.moveRightAnnotation(event)};
   cell.onpointerup=event=>this.rightAnnotation?this.endRightAnnotation(event):this.endVisualDrag(event,(from,to)=>this.amongPlayMove(index,from,to));
   cell.onpointercancel=event=>{this.cancelRightAnnotation(event);this.endVisualDrag(event,(from,to)=>this.amongPlayMove(index,from,to))};
  });
 },
 amongSelectSquare(index,square){
  const lab=this.amongUsLab,game=lab?.games?.[index];if(!game||index!==lab.activeIndex||game.resolved||game.thinking||game.chess.turn()!==game.humanColor)return;
  this.annotations.clear();this.arrows=[];if(game.selected&&game.legal.includes(square)){this.syncAmongActiveGame();this.amongPlayMove(index,game.selected,square);return}
  const piece=game.chess.get(square);if(piece?.color===game.humanColor){game.selected=square;game.legal=game.chess.moves({square,verbose:true}).map(move=>move.to)}else{game.selected=null;game.legal=[]}this.selected=game.selected;this.legal=[...game.legal];this.syncAmongActiveGame();this.renderAmongUsSession();
 },
 async amongPlayMove(index,from,to){
  const lab=this.amongUsLab,game=lab?.games?.[index];if(!game||game.resolved||game.thinking||game.chess.turn()!==game.humanColor)return;if(index===lab.activeIndex)this.syncAmongActiveGame();const legal=game.chess.moves({square:from,verbose:true}).filter(move=>move.to===to);if(!legal.length)return;let promotion='q';if(legal.some(move=>move.promotion))promotion=await this.choosePromotion();let move=null;try{move=game.chess.move({from,to,promotion})}catch{return}if(!move)return;game.selected=null;game.legal=[];game.lastMove=[move.from,move.to];game.positions.push({fen:game.chess.fen(),ply:game.chess.history().length});game.clock.human+=Number(lab.config.increment)||0;game.clock.last=performance.now();if(index===lab.activeIndex)this.activateAmongBoard(index,false,true);if(this.resolveAmongChessState(index))return;this.enqueueAmongReply(index);this.nextAmongBoard();
 },
 resolveAmongChessState(index){
  const game=this.amongUsLab?.games?.[index];if(!game||game.resolved)return true;const state=fideGameState(game.chess,game.positions);if(!state.terminal)return false;let outcome='draw';if(state.result!=='1/2-1/2'){const humanWon=(state.result==='1-0'&&game.humanColor==='w')||(state.result==='0-1'&&game.humanColor==='b');outcome=humanWon?'win':'loss'}this.finishAmongBoard(index,outcome,state.reason||'final FIDE',true);return true;
 },
 enqueueAmongReply(index){
  const game=this.amongUsLab?.games?.[index];if(!game||game.resolved||game.thinking||game.chess.turn()===game.humanColor)return;game.thinking=true;if(index===this.amongUsLab.activeIndex)this.renderAmongUsSession();this.amongEngineQueue=this.amongEngineQueue.catch(()=>{}).then(()=>this.runAmongReply(index));
 },
 async runAmongReply(index){
  const lab=this.amongUsLab,game=lab?.games?.[index];if(!lab?.active||!game||game.resolved)return;const before=game.chess.fen(),color=game.chess.turn();
  try{
   const effective=nextEffectiveElo(game.profile);game.profile.styleState={...effective.styleState};const skill=eloToSkill(effective.effectiveElo),depth=eloToDepth(effective.effectiveElo);let chosen=null,randomPick=false;
   if(Math.random()<hiddenEloRandomMoveChance(effective.effectiveElo)){const legal=game.chess.moves({verbose:true});const move=legal[Math.floor(Math.random()*legal.length)];if(move){chosen={uci:move.from+move.to+(move.promotion||''),score:null};randomPick=true}}
   if(!chosen){const candidates=await this.engine.analyse(before,{depth,multiPv:10,skill});if(game.resolved||game.chess.fen()!==before)return;chosen=chooseHiddenEloCandidate(candidates,color,effective.effectiveElo)||candidates[0]}
   const think=hiddenEloThinkSeconds(effective.effectiveElo);game.clock.opponent=Math.max(0,game.clock.opponent-think);game.effectiveTrace.push({ply:game.chess.history().length+1,effectiveElo:effective.effectiveElo,tag:effective.tag,randomPick,thinkSeconds:think});
   if(game.clock.opponent<=0){const chessResult=timeoutResult(game.chess,color),draw=chessResult==='1/2-1/2';this.finishAmongBoard(index,draw?'draw':'win',draw?'bandera rival sin material de mate':'caída de bandera rival',true);return}
   const move=chosen?game.chess.move(uciToMove(chosen.uci)):null;if(move){game.lastMove=[move.from,move.to];game.positions.push({fen:game.chess.fen(),ply:game.chess.history().length});game.clock.opponent+=Number(lab.config.increment)||0;game.clock.last=performance.now()}
  }catch(error){console.error('Among Us Chess: el rival no pudo mover',error)}finally{
   if(!game.resolved)game.thinking=false;if(!game.resolved&&this.resolveAmongChessState(index))return;if(lab.active){if(index===lab.activeIndex)this.activateAmongBoard(index,false,true);this.renderAmongUsSession()}
  }
 },
 startAmongUsClock(){
  const lab=this.amongUsLab;if(!lab?.active||lab.timer)return;let last=performance.now();lab.timer=setInterval(()=>{if(!lab.active)return;const now=performance.now(),dt=Math.max(0,(now-last)/1000);last=now;for(let index=0;index<lab.games.length;index+=1){const game=lab.games[index];if(game.resolved||game.thinking||game.chess.turn()!==game.humanColor)continue;game.clock.human=Math.max(0,game.clock.human-dt);if(game.clock.human<=0){const chessResult=timeoutResult(game.chess,game.humanColor),draw=chessResult==='1/2-1/2';this.finishAmongBoard(index,draw?'draw':'loss',draw?'bandera sin material de mate':'caída de bandera de J1',true)}}if(lab.games.every(game=>game.resolved)){this.stopAmongUsClock();return}const active=this.amongActiveGame();if(active){const w=$('[data-among-clock-w]'),b=$('[data-among-clock-b]');if(w)w.textContent=this.timeText(this.amongClockForColor(active,'w'));if(b)b.textContent=this.timeText(this.amongClockForColor(active,'b'))}},200);
 },
 submitAmongGuess(){
  const lab=this.amongUsLab,index=lab?.guessIndex,game=lab?.games?.[index];if(index==null||!game||game.resolved)return;const windowInfo=hiddenEloGuessWindow(game.chess.history().length);if(!windowInfo.enabled){lab.guessIndex=null;this.renderAmongUsSession();return}const guess=clamp(lab.guessValue,500,2500),verdict=hiddenEloGuessOutcome(game.profile.elo,guess);game.guess={value:guess,error:verdict.error,verdict:verdict.key,move:windowInfo.fullMoves};lab.guessIndex=null;this.finishAmongBoard(index,verdict.key,`${verdict.label} por identificación · Elo real ${game.profile.elo} · error ${verdict.error}`,true);
 },
 finishAmongBoard(index,outcome,reason,reveal=true){
  const lab=this.amongUsLab,game=lab?.games?.[index];if(!game||game.resolved)return;game.resolved=true;game.outcome=outcome;game.reason=reason;game.revealed=Boolean(reveal);game.thinking=false;game.selected=null;game.legal=[];this.saveAmongBoard(game);if(index===lab.activeIndex)this.activateAmongBoard(index,false,true);if(lab.games.every(item=>item.resolved))this.stopAmongUsClock();this.renderAmongUsSession();
 },
 saveAmongBoard(game){
  if(game.gameSaved)return;const result=resultFromHumanOutcome(game.humanColor,game.outcome),white=game.humanColor==='w'?'J1':game.profile.name,black=game.humanColor==='b'?'J1':game.profile.name;const record={id:crypto.randomUUID?.()||String(Date.now()+Math.random()),date:new Date().toISOString(),mode:'among-us-chess',white,black,result,pgn:game.chess.pgn(),fen:game.chess.fen(),reason:game.reason,positions:game.positions,humanColor:game.humanColor,hiddenElo:game.profile.elo,hiddenStyle:game.profile.style,hiddenName:game.profile.name,guess:game.guess,effectiveTrace:game.effectiveTrace,timeControl:{minutes:this.amongUsLab.config.minutes,increment:this.amongUsLab.config.increment}};addGame(this.db,record);addProblemsFromGame(this.db,record);game.gameSaved=true;
 }
};

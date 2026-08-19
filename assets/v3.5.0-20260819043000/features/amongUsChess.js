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
 resetAmongUsLab(){this.stopAmongUsClock();this.amongUsLab={active:false,games:[],timer:null,guessIndex:null,guessValue:1500,startedAt:null};this.amongEngineQueue=Promise.resolve()},
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
   const humanColor=index%2===0?'w':'b',elo=nextElo(),style=randomHiddenStyle();
   const chess=new Chess();
   return {id:`Tablero ${index+1}`,chess,humanColor,profile:{name:this.amongRandomName(used),elo,style,styleState:{burstLeft:0,burstBoost:0}},selected:null,legal:[],lastMove:null,positions:[{fen:chess.fen(),ply:0}],clock:{human:Number(config.minutes)*60,opponent:Number(config.minutes)*60,last:now},thinking:false,resolved:false,outcome:null,reason:null,revealed:false,guess:null,gameSaved:false,effectiveTrace:[]};
  });
  this.amongUsLab={active:true,games,timer:null,guessIndex:null,guessValue:1500,startedAt:new Date().toISOString(),config:{...config}};this.amongEngineQueue=Promise.resolve();this.renderAmongUsSession();this.startAmongUsClock();
  games.forEach((game,index)=>{if(game.chess.turn()!==game.humanColor)this.enqueueAmongReply(index)});
 },
 amongBoardHtml(game,index){
  const files='abcdefgh',flipped=game.humanColor==='b',ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],fs=flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7],humanTurn=!game.resolved&&!game.thinking&&game.chess.turn()===game.humanColor;let out='';
  for(const rank of ranks)for(const fileIndex of fs){const square=files[fileIndex]+rank,piece=game.chess.get(square),selected=game.selected===square,legal=game.legal.includes(square),last=game.lastMove?.includes(square);out+=`<button type="button" class="among-sq ${(fileIndex+rank)%2?'light':'dark'} ${selected?'selected':''} ${legal?'legal':''} ${last?'last':''}" data-among-index="${index}" data-among-square="${square}" ${humanTurn?'':'disabled'} aria-label="${square}">${piece?`<img src="${this.pieceSrc(piece.color,piece.type)}" draggable="false" alt="">`:''}</button>`}
  return `<div class="among-board" style="${this.customBoardStyle()}" aria-label="${game.id}">${out}</div>`;
 },
 amongCardHtml(game,index){
  const windowInfo=hiddenEloGuessWindow(game.chess.history().length),humanTurn=!game.resolved&&!game.thinking&&game.chess.turn()===game.humanColor,reveal=game.revealed||game.resolved;
  const identity=reveal?`${esc(game.profile.name)} · Elo ${game.profile.elo} · ${STYLE_ICON[game.profile.style]} ${HIDDEN_ELO_STYLE_LABELS[game.profile.style]}`:'Identidad ??? · Elo ??? · Estilo ???';
  const status=game.resolved?`${outcomeText(game.outcome)} · ${esc(game.reason)}`:game.thinking?'Rival pensando…':humanTurn?'Tu turno':'Esperando rival';
  const guessText=windowInfo.enabled?'DESCUBRIR ELO':`Próxima: jugada ${windowInfo.next}`;
  return `<article class="among-card ${game.resolved?'resolved '+game.outcome:''}" data-among-card="${index}"><header><div><small>${game.id} · J1 ${game.humanColor==='w'?'BLANCAS':'NEGRAS'}</small><h2>${identity}</h2></div><span class="among-status">${status}</span></header><div class="among-clock-row"><span class="${humanTurn?'active':''}">J1 <b data-among-human-clock="${index}">${this.timeText(game.clock.human)}</b></span><span class="${game.thinking?'active':''}">??? <b data-among-opponent-clock="${index}">${this.timeText(game.clock.opponent)}</b></span></div>${this.amongBoardHtml(game,index)}<footer><div><span>Jugadas completas: <b>${windowInfo.fullMoves}</b></span>${game.guess?`<span>Estimación: <b>${game.guess.value}</b> · error ${game.guess.error}</span>`:''}</div><button type="button" data-among-guess="${index}" ${game.resolved||game.thinking||!windowInfo.enabled?'disabled':''}>🔎 ${guessText}</button></footer></article>`;
 },
 amongSessionSummaryHtml(){
  const lab=this.amongUsLab,done=lab.games.filter(game=>game.resolved),wins=done.filter(game=>game.outcome==='win').length,draws=done.filter(game=>game.outcome==='draw').length,losses=done.filter(game=>game.outcome==='loss').length,guesses=done.filter(game=>game.guess),mean=guesses.length?Math.round(guesses.reduce((sum,game)=>sum+game.guess.error,0)/guesses.length):null;
  return `<section class="among-session-summary panel"><span><b>${wins}</b> victorias</span><span><b>${draws}</b> tablas</span><span><b>${losses}</b> derrotas</span><span><b>${done.length}/${lab.games.length}</b> resueltos</span><span><b>${mean==null?'—':mean}</b> error Elo medio</span></section>`;
 },
 amongGuessModal(){
  const lab=this.amongUsLab,index=lab.guessIndex;if(index==null)return'';const game=lab.games[index];if(!game||game.resolved)return'';
  return `<div class="modal among-guess-modal"><div class="dialog"><header><div><small>${game.id} · ACUSACIÓN</small><h2>¿Cuál es su Elo?</h2></div><button data-among-guess-close>×</button></header><p>Esta decisión termina este tablero. ±100 = victoria, ±200 = tablas, más de 200 = derrota.</p><label>Elo estimado<input data-among-guess-value type="number" min="500" max="2500" step="25" value="${lab.guessValue||1500}"></label><input data-among-guess-slider type="range" min="500" max="2500" step="25" value="${lab.guessValue||1500}"><div class="among-guess-actions"><button data-among-guess-close>Cancelar</button><button data-among-guess-submit class="primary">REVELAR IDENTIDAD</button></div></div></div>`;
 },
 renderAmongUsSession(){
  const lab=this.amongUsLab;if(!lab?.active){this.renderAmongUsSetup();return}const v=$('#view'),allDone=lab.games.every(game=>game.resolved);
  v.innerHTML=`<section class="page-head among-live-head"><button data-among-exit>←</button><div><small>AMONG US CHESS · ${lab.games.length} TABLEROS</small><h1>${allDone?'Sesión finalizada':'Identidades ocultas'}</h1><p>Los relojes de J1 corren simultáneamente en todos los tableros donde sea tu turno.</p></div>${allDone?'<span class="among-complete-badge">SESIÓN COMPLETA</span>':''}</section>${this.amongSessionSummaryHtml()}<section class="among-grid">${lab.games.map((game,index)=>this.amongCardHtml(game,index)).join('')}</section>${this.amongGuessModal()}`;
  $('[data-among-exit]').onclick=()=>{if(!allDone&&!confirm('¿Salir de la sesión actual? Los tableros inconclusos no se guardarán.'))return;this.stopAmongUsClock();this.amongUsLab=null;this.screen='home';this.render()};
  $$('[data-among-square]').forEach(cell=>cell.onclick=()=>this.amongSelectSquare(Number(cell.dataset.amongIndex),cell.dataset.amongSquare));
  $$('[data-among-guess]').forEach(button=>button.onclick=()=>{lab.guessIndex=Number(button.dataset.amongGuess);lab.guessValue=1500;this.renderAmongUsSession()});
  $$('[data-among-guess-close]').forEach(button=>button.onclick=()=>{lab.guessIndex=null;this.renderAmongUsSession()});
  const input=$('[data-among-guess-value]'),slider=$('[data-among-guess-slider]');
  input?.addEventListener('input',()=>{lab.guessValue=clamp(input.value,500,2500);if(slider)slider.value=lab.guessValue});slider?.addEventListener('input',()=>{lab.guessValue=Number(slider.value);if(input)input.value=slider.value});
  $('[data-among-guess-submit]')?.addEventListener('click',()=>this.submitAmongGuess());
 },
 amongSelectSquare(index,square){
  const game=this.amongUsLab?.games?.[index];if(!game||game.resolved||game.thinking||game.chess.turn()!==game.humanColor)return;
  if(game.selected&&game.legal.includes(square)){this.amongPlayMove(index,game.selected,square);return}
  const piece=game.chess.get(square);if(piece?.color===game.humanColor){game.selected=square;game.legal=game.chess.moves({square,verbose:true}).map(move=>move.to)}else{game.selected=null;game.legal=[]}this.renderAmongUsSession();
 },
 async amongPlayMove(index,from,to){
  const game=this.amongUsLab?.games?.[index];if(!game||game.resolved||game.thinking||game.chess.turn()!==game.humanColor)return;const legal=game.chess.moves({square:from,verbose:true}).filter(move=>move.to===to);if(!legal.length)return;let promotion='q';if(legal.some(move=>move.promotion))promotion=await this.choosePromotion();let move=null;try{move=game.chess.move({from,to,promotion})}catch{return}if(!move)return;game.selected=null;game.legal=[];game.lastMove=[move.from,move.to];game.positions.push({fen:game.chess.fen(),ply:game.chess.history().length});game.clock.human+=Number(this.amongUsLab.config.increment)||0;game.clock.last=performance.now();if(this.resolveAmongChessState(index))return;this.renderAmongUsSession();this.enqueueAmongReply(index);
 },
 resolveAmongChessState(index){
  const game=this.amongUsLab?.games?.[index];if(!game||game.resolved)return true;const state=fideGameState(game.chess,game.positions);if(!state.terminal)return false;let outcome='draw';if(state.result!=='1/2-1/2'){const humanWon=(state.result==='1-0'&&game.humanColor==='w')||(state.result==='0-1'&&game.humanColor==='b');outcome=humanWon?'win':'loss'}this.finishAmongBoard(index,outcome,state.reason||'final FIDE',true);return true;
 },
 enqueueAmongReply(index){
  const game=this.amongUsLab?.games?.[index];if(!game||game.resolved||game.thinking||game.chess.turn()===game.humanColor)return;game.thinking=true;this.renderAmongUsSession();this.amongEngineQueue=this.amongEngineQueue.catch(()=>{}).then(()=>this.runAmongReply(index));
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
   if(!game.resolved)game.thinking=false;if(!game.resolved&&this.resolveAmongChessState(index))return;if(lab.active)this.renderAmongUsSession();
  }
 },
 startAmongUsClock(){
  const lab=this.amongUsLab;if(!lab?.active||lab.timer)return;let last=performance.now();lab.timer=setInterval(()=>{if(!lab.active)return;const now=performance.now(),dt=Math.max(0,(now-last)/1000);last=now;let changed=false;for(let index=0;index<lab.games.length;index+=1){const game=lab.games[index];if(game.resolved||game.thinking||game.chess.turn()!==game.humanColor)continue;game.clock.human=Math.max(0,game.clock.human-dt);changed=true;if(game.clock.human<=0){const chessResult=timeoutResult(game.chess,game.humanColor),draw=chessResult==='1/2-1/2';this.finishAmongBoard(index,draw?'draw':'loss',draw?'bandera sin material de mate':'caída de bandera de J1',true)}}if(lab.games.every(game=>game.resolved)){this.stopAmongUsClock();return}if(changed){lab.games.forEach((game,index)=>{const h=$(`[data-among-human-clock="${index}"]`),o=$(`[data-among-opponent-clock="${index}"]`);if(h)h.textContent=this.timeText(game.clock.human);if(o)o.textContent=this.timeText(game.clock.opponent)})}},200);
 },
 submitAmongGuess(){
  const lab=this.amongUsLab,index=lab?.guessIndex,game=lab?.games?.[index];if(index==null||!game||game.resolved)return;const windowInfo=hiddenEloGuessWindow(game.chess.history().length);if(!windowInfo.enabled){lab.guessIndex=null;this.renderAmongUsSession();return}const guess=clamp(lab.guessValue,500,2500),verdict=hiddenEloGuessOutcome(game.profile.elo,guess);game.guess={value:guess,error:verdict.error,verdict:verdict.key,move:windowInfo.fullMoves};lab.guessIndex=null;this.finishAmongBoard(index,verdict.key,`${verdict.label} por identificación · Elo real ${game.profile.elo} · error ${verdict.error}`,true);
 },
 finishAmongBoard(index,outcome,reason,reveal=true){
  const lab=this.amongUsLab,game=lab?.games?.[index];if(!game||game.resolved)return;game.resolved=true;game.outcome=outcome;game.reason=reason;game.revealed=Boolean(reveal);game.thinking=false;game.selected=null;game.legal=[];this.saveAmongBoard(game);if(lab.games.every(item=>item.resolved))this.stopAmongUsClock();this.renderAmongUsSession();
 },
 saveAmongBoard(game){
  if(game.gameSaved)return;const result=resultFromHumanOutcome(game.humanColor,game.outcome),white=game.humanColor==='w'?'J1':game.profile.name,black=game.humanColor==='b'?'J1':game.profile.name;const record={id:crypto.randomUUID?.()||String(Date.now()+Math.random()),date:new Date().toISOString(),mode:'among-us-chess',white,black,result,pgn:game.chess.pgn(),fen:game.chess.fen(),reason:game.reason,positions:game.positions,humanColor:game.humanColor,hiddenElo:game.profile.elo,hiddenStyle:game.profile.style,hiddenName:game.profile.name,guess:game.guess,effectiveTrace:game.effectiveTrace,timeControl:{minutes:this.amongUsLab.config.minutes,increment:this.amongUsLab.config.increment}};addGame(this.db,record);addProblemsFromGame(this.db,record);game.gameSaved=true;
 }
};

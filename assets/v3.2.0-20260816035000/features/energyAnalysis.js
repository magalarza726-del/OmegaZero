import {
  Chess, saveDb, addGame, $, $$, esc, fideGameState,
  analyzeEnergyPosition, chooseEnergyMoveOnePly, energyFormulaText,
} from '../app/deps.js';

const DEFAULT_ENERGY_CONFIG=Object.freeze({
  g:1,
  massMode:'uniform',
  kingWeight:4,
  humanColor:'w',
  priorityW:'E',
  priorityB:'E',
});
const PIECE_NAME=Object.freeze({p:'Peón',n:'Caballo',b:'Alfil',r:'Torre',q:'Dama',k:'Rey'});
const PIECE_GLYPH=Object.freeze({wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'});
const fmt=(value,digits=3)=>Number(value||0).toLocaleString('es-EC',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const metricName=metric=>metric==='U'?'U · potencial':metric==='K'?'K · cinética':'E · total';

function timelineFromPgn(pgn){
  const loaded=new Chess();
  if(pgn){try{loaded.loadPgn(pgn)}catch{/* Se conserva inicio si el PGN no es compatible. */}}
  const sans=loaded.history();
  const replay=new Chess(),timeline=[{ply:0,san:'Inicio',fen:replay.fen(),move:null}];
  for(let index=0;index<sans.length;index+=1){
    let move=null;
    try{move=replay.move(sans[index])}catch{break}
    if(!move)break;
    timeline.push({ply:index+1,san:move.san,fen:replay.fen(),move:{from:move.from,to:move.to,color:move.color}});
  }
  return timeline;
}

function energyResult(chess,timeline){
  const state=fideGameState(chess,timeline.map(item=>({fen:item.fen,ply:item.ply})));
  return state.terminal?state:null;
}

export const energyAnalysisMethods={
 energyConfig(){
  return {...DEFAULT_ENERGY_CONFIG,...(this.db.settings.energyConfig||{})};
 },
 persistEnergyConfig(next={}){
  this.db.settings.energyConfig={...this.energyConfig(),...next};
  saveDb(this.db);
  if(this.energyLab){this.energyLab.config={...this.db.settings.energyConfig};this.energyLab.cache=new Map()}
 },
 resetEnergyLab(){
  this.energyLab={active:false,mode:null,chess:new Chess(),timeline:[],selectedPly:0,thinking:false,paused:false,lastDecision:null,gameSaved:false,cache:new Map(),config:this.energyConfig(),sourceGame:null};
  this.selected=null;this.legal=[];this.lastMove=null;
 },
 ensureEnergyLab(){if(!this.energyLab)this.resetEnergyLab();return this.energyLab},
 energyOptions(){const config=this.ensureEnergyLab().config;return {g:Number(config.g),massMode:config.massMode,kingWeight:Number(config.kingWeight)}},
 energySnapshot(fen){
  const lab=this.ensureEnergyLab(),options=this.energyOptions(),key=`${fen}|${options.g}|${options.massMode}|${options.kingWeight}`;
  if(lab.cache.has(key))return lab.cache.get(key);
  const value=analyzeEnergyPosition(fen,options);lab.cache.set(key,value);return value;
 },
 energyHistoryHtml(){
  const lab=this.ensureEnergyLab();let html='';
  for(let i=1;i<lab.timeline.length;i+=2){const white=lab.timeline[i],black=lab.timeline[i+1];html+=`<div class="energy-history-row"><b>${Math.ceil(i/2)}.</b><button type="button" data-energy-ply="${white.ply}" class="${lab.selectedPly===white.ply?'active':''}">${esc(white.san)}</button>${black?`<button type="button" data-energy-ply="${black.ply}" class="${lab.selectedPly===black.ply?'active':''}">${esc(black.san)}</button>`:'<span>…</span>'}</div>`}
  return html||'<p class="energy-empty-history">Todavía no hay movimientos.</p>';
 },
 energyTablesHtml(analysis){
  const make=color=>{
   const rows=analysis.rows.filter(row=>row.color===color);
   return `<section class="energy-piece-table"><header><h3>${color==='w'?'Blancas':'Negras'}</h3><span>${rows.length} piezas</span></header><div class="energy-table-scroll"><table><thead><tr><th>Pieza</th><th>m</th><th>h</th><th>v</th><th>U</th><th>K</th><th>E</th></tr></thead><tbody>${rows.map(row=>`<tr><td><b>${PIECE_GLYPH[row.color+row.type]}</b><span>${PIECE_NAME[row.type]} ${row.square}</span></td><td>${fmt(row.mass,5)}</td><td>${row.h}</td><td title="${row.destinations.join(', ')}">${row.v}</td><td>${fmt(row.U)}</td><td>${fmt(row.K)}</td><td><strong>${fmt(row.E)}</strong></td></tr>`).join('')}</tbody><tfoot><tr><th>Total</th><td></td><td></td><td></td><td>${fmt(analysis.totals[color].U)}</td><td>${fmt(analysis.totals[color].K)}</td><td>${fmt(analysis.totals[color].E)}</td></tr></tfoot></table></div></section>`;
  };
  return `<div class="energy-tables">${make('w')}${make('b')}</div>`;
 },
 energySummaryHtml(analysis,entry){
  const delta=analysis.delta.E,cls=delta>1e-9?'white':delta<-1e-9?'black':'even';
  return `<section class="energy-summary"><article class="energy-delta ${cls}"><small>ΔE = E blancas − E negras</small><strong>${delta>=0?'+':''}${fmt(delta)}</strong><span>${Math.abs(delta)<1e-9?'Equilibrio energético':delta>0?'Mayor E blanca':'Mayor E negra'}</span></article><article><small>U blancas / negras</small><b>${fmt(analysis.totals.w.U)} <i>/</i> ${fmt(analysis.totals.b.U)}</b><span>ΔU ${analysis.delta.U>=0?'+':''}${fmt(analysis.delta.U)}</span></article><article><small>K blancas / negras</small><b>${fmt(analysis.totals.w.K)} <i>/</i> ${fmt(analysis.totals.b.K)}</b><span>ΔK ${analysis.delta.K>=0?'+':''}${fmt(analysis.delta.K)}</span></article><article><small>E blancas / negras</small><b>${fmt(analysis.totals.w.E)} <i>/</i> ${fmt(analysis.totals.b.E)}</b><span>${entry.ply?`Tras ${Math.ceil(entry.ply/2)}${entry.ply%2?'… blancas':'… negras'} · ${esc(entry.san)}`:'Posición inicial'}</span></article></section>`;
 },
 energyDecisionHtml(){
  const decision=this.ensureEnergyLab().lastDecision;if(!decision)return'';
  const top=decision.candidates.slice(0,5);
  return `<section class="energy-decision panel"><header><div><small>E-COM · BÚSQUEDA DE UNA SEMIJUGADA</small><h3>${decision.color==='w'?'Blancas':'Negras'} priorizó ${metricName(decision.priority)}</h3></div><b>${decision.best?esc(decision.best.san):'—'}</b></header><p>Se evaluaron ${decision.candidates.length} candidatas legales y no se calculó respuesta rival.</p><div>${top.map((candidate,index)=>`<span class="${index===0?'best':''}"><b>${index+1}. ${esc(candidate.san)}</b><em>${decision.priority} ${fmt(candidate.objective)}</em><small>E ${fmt(candidate.E)} · ΔE ${candidate.deltaE>=0?'+':''}${fmt(candidate.deltaE)}</small></span>`).join('')}</div></section>`;
 },
 renderEnergyMenu(){
  const v=$('#view'),config=this.energyConfig(),games=this.db.games.slice(0,300);
  v.innerHTML=`<section class="page-head energy-head"><button data-energy-home>←</button><div><small>INVESTIGAR · MODELO MECÁNICO</small><h1>Análisis energético de piezas</h1><p>U = mgh · K = ½mv² · E = U + K. Aquí <b>v</b> es el número de casillas legales distintas que una pieza puede alcanzar en la posición actual.</p></div></section>
  <section class="energy-config panel"><header><div><small>PARÁMETROS DEL EXPERIMENTO</small><h2>Modelo energético</h2></div><code data-energy-formula>${esc(energyFormulaText(config))}</code></header><div class="energy-config-grid"><label>g<input data-energy-g type="number" step="0.01" min="-1000" max="1000" value="${config.g}"></label><label>Modo de masa<select data-energy-mass><option value="uniform" ${config.massMode==='uniform'?'selected':''}>Modo 1 · m = 1/n</option><option value="weighted" ${config.massMode==='weighted'?'selected':''}>Modo 2 · valor ponderado normalizado × 1/n</option></select></label><label class="${config.massMode==='weighted'?'':'energy-weight-hidden'}" data-king-weight-label>Peso operativo del rey<input data-energy-king-weight type="number" min="0" max="100" step="0.25" value="${config.kingWeight}"><small>Experimental: el PDF deja al rey fuera de los valores materiales ordinarios.</small></label><label>Color de J1<select data-energy-human-color><option value="w" ${config.humanColor==='w'?'selected':''}>Blancas</option><option value="b" ${config.humanColor==='b'?'selected':''}>Negras</option></select></label><label>Prioridad E-COM blancas<select data-energy-priority-w>${['E','U','K'].map(x=>`<option ${config.priorityW===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Prioridad E-COM negras<select data-energy-priority-b>${['E','U','K'].map(x=>`<option ${config.priorityB===x?'selected':''}>${x}</option>`).join('')}</select></label></div><footer><span>P=1 · N=3 · B=3.25 · R=5 · Q=9</span><span>Modo 2: mᵢ=(wᵢ/Σw)·(1/n)</span></footer></section>
  <section class="energy-mode-grid"><button data-energy-mode="ecom-ecom"><small>SIMULACIÓN</small><h2>E-COM vs E-COM</h2><p>Ambos bandos examinan todas sus jugadas legales a una semijugada y maximizan su prioridad.</p></button><button data-energy-mode="human-ecom"><small>PARTIDA EXPERIMENTAL</small><h2>J1 vs E-COM</h2><p>Juega contra un agente energético puro, sin Stockfish y sin variantes futuras.</p></button><button data-energy-mode="free"><small>PRÁCTICA LIBRE</small><h2>Análisis Libre</h2><p>Mueve ambos bandos y observa cómo cambian U, K, E y ΔE después de cada semijugada.</p></button><button data-energy-mode="saved" ${games.length?'':'disabled'}><small>BIBLIOTECA</small><h2>Análisis de partidas guardadas</h2><p>${games.length?`${games.length} partidas disponibles para reconstruir energía por semijugada.`:'Aún no existen partidas guardadas.'}</p></button></section>
  ${games.length?`<section class="energy-saved-picker panel"><label>Partida para análisis<select data-energy-saved>${games.map(game=>`<option value="${game.id}">${esc(`${new Date(game.date).toLocaleString()} · ${game.white} vs ${game.black} · ${game.result||'*'}`)}</option>`).join('')}</select></label></section>`:''}`;
  $('[data-energy-home]').onclick=()=>{this.energyLab=null;this.screen='home';this.render()};
  const update=()=>{const next={g:Number($('[data-energy-g]')?.value??config.g),massMode:$('[data-energy-mass]')?.value||'uniform',kingWeight:Number($('[data-energy-king-weight]')?.value??config.kingWeight),humanColor:$('[data-energy-human-color]')?.value||'w',priorityW:$('[data-energy-priority-w]')?.value||'E',priorityB:$('[data-energy-priority-b]')?.value||'E'};this.persistEnergyConfig(next);$('[data-energy-formula]').textContent=energyFormulaText(next);$('[data-king-weight-label]')?.classList.toggle('energy-weight-hidden',next.massMode!=='weighted')};
  $$('[data-energy-g],[data-energy-mass],[data-energy-king-weight],[data-energy-human-color],[data-energy-priority-w],[data-energy-priority-b]').forEach(control=>control.addEventListener('change',update));
  $$('[data-energy-mode]').forEach(button=>button.onclick=()=>{update();const mode=button.dataset.energyMode;if(mode==='saved'){const id=$('[data-energy-saved]')?.value;if(id)this.startEnergySavedAnalysis(id)}else this.startEnergySession(mode)});
 },
 startEnergySession(mode){
  const lab=this.ensureEnergyLab();lab.active=true;lab.mode=mode;lab.config=this.energyConfig();lab.chess=new Chess();lab.timeline=[{ply:0,san:'Inicio',fen:lab.chess.fen(),move:null}];lab.selectedPly=0;lab.thinking=false;lab.paused=false;lab.lastDecision=null;lab.gameSaved=false;lab.cache=new Map();lab.sourceGame=null;this.selected=null;this.legal=[];this.lastMove=null;this.renderEnergyAnalysis();
  if(mode==='human-ecom'&&lab.chess.turn()!==lab.config.humanColor)setTimeout(()=>this.energyComMove(),100);
  if(mode==='ecom-ecom')setTimeout(()=>this.energyComMove(),120);
 },
 startEnergySavedAnalysis(id){
  const game=this.db.games.find(item=>item.id===id);if(!game)return;
  const lab=this.ensureEnergyLab();lab.active=true;lab.mode='saved';lab.config=this.energyConfig();lab.timeline=timelineFromPgn(game.pgn);lab.selectedPly=Math.max(0,lab.timeline.length-1);lab.chess=new Chess(lab.timeline.at(-1)?.fen||undefined);lab.thinking=false;lab.paused=true;lab.lastDecision=null;lab.gameSaved=true;lab.cache=new Map();lab.sourceGame=game;this.selected=null;this.legal=[];this.lastMove=null;this.renderEnergyAnalysis();
 },
 renderEnergyAnalysis(){
  const lab=this.ensureEnergyLab();if(!lab.active){this.renderEnergyMenu();return}
  const v=$('#view'),entry=lab.timeline[lab.selectedPly]||lab.timeline.at(-1),display=new Chess(entry.fen),analysis=this.energySnapshot(entry.fen),present=lab.selectedPly===lab.timeline.length-1,canMove=this.energyCanHumanMove()&&present;
  const modeTitle={ 'ecom-ecom':'E-COM vs E-COM','human-ecom':'J1 vs E-COM','free':'Análisis Libre','saved':'Partida guardada' }[lab.mode]||'Análisis energético';
  const state=energyResult(lab.chess,lab.timeline);
  v.innerHTML=`<section class="page-head energy-head"><button data-energy-back>←</button><div><small>ANÁLISIS ENERGÉTICO · ${esc(modeTitle.toUpperCase())}</small><h1>${esc(modeTitle)}</h1><p>${esc(energyFormulaText(lab.config))}</p></div></section>
  <section class="energy-live-toolbar panel"><label>g<input data-live-energy-g type="number" step="0.01" value="${lab.config.g}"></label><label>Masa<select data-live-energy-mass><option value="uniform" ${lab.config.massMode==='uniform'?'selected':''}>1/n</option><option value="weighted" ${lab.config.massMode==='weighted'?'selected':''}>Ponderada × 1/n</option></select></label><label>Rey w<input data-live-energy-king type="number" step="0.25" min="0" value="${lab.config.kingWeight}" ${lab.config.massMode==='weighted'?'':'disabled'}></label>${lab.mode==='ecom-ecom'?`<label>E-COM blancas<select data-live-priority-w>${['E','U','K'].map(x=>`<option ${lab.config.priorityW===x?'selected':''}>${x}</option>`).join('')}</select></label><label>E-COM negras<select data-live-priority-b>${['E','U','K'].map(x=>`<option ${lab.config.priorityB===x?'selected':''}>${x}</option>`).join('')}</select></label>`:lab.mode==='human-ecom'?`<label>Prioridad E-COM<select data-live-priority-${lab.config.humanColor==='w'?'b':'w'}>${['E','U','K'].map(x=>`<option ${(lab.config.humanColor==='w'?lab.config.priorityB:lab.config.priorityW)===x?'selected':''}>${x}</option>`).join('')}</select></label>`:''}${lab.mode!=='saved'?`<span>${state?`Final: ${esc(state.reason)}`:lab.thinking?'E-COM evaluando candidatas…':present?'Posición actual':`Revisando semijugada ${lab.selectedPly}`}</span>`:''}</section>
  <section class="energy-workspace"><div class="energy-board-column"><div class="board-wrap energy-board-wrap" style="${this.customBoardStyle()}"><div class="board" id="energy-board">${this.boardHtml(display,canMove)}</div></div>${!present?'<button class="energy-return-live" data-energy-present>Volver a la posición actual</button>':''}<div class="energy-controls">${lab.mode==='ecom-ecom'?`<button data-energy-pause>${lab.paused?'▶ Reanudar':'⏸ Pausa'}</button><button data-energy-step ${lab.thinking||state?'disabled':''}>▶ Una semijugada</button>`:''}${lab.mode!=='saved'?`<button data-energy-undo ${lab.thinking||lab.timeline.length<=1?'disabled':''}>↶ Deshacer</button><button data-energy-reset>↺ Reiniciar</button><button data-energy-save ${lab.gameSaved?'disabled':''}>Guardar partida</button>`:''}</div>${this.energyDecisionHtml()}</div><aside class="energy-history-panel"><header><div><small>HISTORIAL CLICABLE</small><h2>Semijugadas</h2></div><span>${lab.timeline.length-1}</span></header><div class="energy-history">${this.energyHistoryHtml()}</div><p>Selecciona cualquier movimiento para reconstruir U, K y E pieza por pieza.</p></aside></section>
  <section class="energy-analysis-detail"><header><div><small>${entry.ply?`SEMijugada ${entry.ply}`:'POSICIÓN INICIAL'}</small><h2>${entry.ply?esc(entry.san):'Inicio'}</h2></div><code>${esc(entry.fen)}</code></header>${this.energySummaryHtml(analysis,entry)}${this.energyTablesHtml(analysis)}</section>`;
  $('[data-energy-back]').onclick=()=>{lab.active=false;lab.thinking=false;this.selected=null;this.legal=[];this.renderEnergyAnalysis()};
  $$('[data-energy-ply]').forEach(button=>button.onclick=()=>{lab.selectedPly=Number(button.dataset.energyPly);this.selected=null;this.legal=[];this.lastMove=lab.timeline[lab.selectedPly]?.move?[lab.timeline[lab.selectedPly].move.from,lab.timeline[lab.selectedPly].move.to]:null;this.renderEnergyAnalysis()});
  $('[data-energy-present]')?.addEventListener('click',()=>{lab.selectedPly=lab.timeline.length-1;this.lastMove=lab.timeline.at(-1)?.move?[lab.timeline.at(-1).move.from,lab.timeline.at(-1).move.to]:null;this.renderEnergyAnalysis()});
  if(canMove)this.bindEnergyBoard(display);
  const recalc=()=>{lab.config={...lab.config,g:Number($('[data-live-energy-g]').value),massMode:$('[data-live-energy-mass]').value,kingWeight:Number($('[data-live-energy-king]').value),priorityW:$('[data-live-priority-w]')?.value||lab.config.priorityW,priorityB:$('[data-live-priority-b]')?.value||lab.config.priorityB};this.persistEnergyConfig(lab.config);lab.cache=new Map();this.renderEnergyAnalysis()};
  $('[data-live-energy-g]')?.addEventListener('change',recalc);$('[data-live-energy-mass]')?.addEventListener('change',recalc);$('[data-live-energy-king]')?.addEventListener('change',recalc);$('[data-live-priority-w]')?.addEventListener('change',recalc);$('[data-live-priority-b]')?.addEventListener('change',recalc);
  $('[data-energy-pause]')?.addEventListener('click',()=>{lab.paused=!lab.paused;this.renderEnergyAnalysis();if(!lab.paused&&!energyResult(lab.chess,lab.timeline))setTimeout(()=>this.energyComMove(),80)});
  $('[data-energy-step]')?.addEventListener('click',()=>this.energyComMove(true));
  $('[data-energy-undo]')?.addEventListener('click',()=>this.energyUndo());$('[data-energy-reset]')?.addEventListener('click',()=>this.startEnergySession(lab.mode));$('[data-energy-save]')?.addEventListener('click',()=>this.saveEnergyGame());
 },
 energyCanHumanMove(){
  const lab=this.ensureEnergyLab();if(!lab.active||lab.thinking||lab.mode==='saved'||lab.mode==='ecom-ecom')return false;
  if(lab.mode==='free')return true;
  return lab.mode==='human-ecom'&&lab.chess.turn()===lab.config.humanColor;
 },
 bindEnergyBoard(display){
  const lab=this.ensureEnergyLab(),board=$('#energy-board');if(!board)return;this.bindKeyboardBoard(board);board.oncontextmenu=e=>e.preventDefault();
  $$('[data-square]',board).forEach(cell=>{
   cell.onclick=()=>{if(Date.now()<(this.suppress||0))return;this.energyLeftSquare(cell.dataset.square)};
   cell.onpointerdown=e=>{if(e.button===0&&this.energyCanHumanMove())this.startVisualDrag(e,cell.dataset.square,'energy',lab.chess)};
   cell.onpointermove=e=>this.dragMove(e);
   cell.onpointerup=e=>this.endVisualDrag(e,(from,to)=>this.energyPlayMove(from,to));
   cell.onpointercancel=e=>this.endVisualDrag(e,(from,to)=>this.energyPlayMove(from,to));
  });
 },
 energyLeftSquare(square){
  const lab=this.ensureEnergyLab();if(!this.energyCanHumanMove())return;const piece=lab.chess.get(square);
  if(this.selected&&this.legal.includes(square)){this.energyPlayMove(this.selected,square);return}
  if(piece?.color===lab.chess.turn()){this.selected=square;this.legal=lab.chess.moves({square,verbose:true}).map(move=>move.to);this.renderEnergyAnalysis()}else{this.selected=null;this.legal=[];this.renderEnergyAnalysis()}
 },
 async energyPlayMove(from,to){
  const lab=this.ensureEnergyLab();if(!this.energyCanHumanMove())return;const options=lab.chess.moves({square:from,verbose:true}).filter(move=>move.to===to);let promotion='q';if(options.some(move=>move.promotion))promotion=await this.choosePromotion();let move=null;try{move=lab.chess.move({from,to,promotion})}catch{return}if(move)this.afterEnergyMove(move)
 },
 afterEnergyMove(move){
  const lab=this.ensureEnergyLab();this.selected=null;this.legal=[];this.lastMove=[move.from,move.to];lab.timeline.push({ply:lab.timeline.length,san:move.san,fen:lab.chess.fen(),move:{from:move.from,to:move.to,color:move.color}});lab.selectedPly=lab.timeline.length-1;lab.gameSaved=false;this.renderEnergyAnalysis();
  if(energyResult(lab.chess,lab.timeline))return;
  if(lab.mode==='human-ecom'&&lab.chess.turn()!==lab.config.humanColor)setTimeout(()=>this.energyComMove(),120);
  else if(lab.mode==='ecom-ecom'&&!lab.paused)setTimeout(()=>this.energyComMove(),160);
 },
 async energyComMove(force=false){
  const lab=this.ensureEnergyLab();if(!lab.active||lab.thinking||lab.mode==='saved'||lab.mode==='free'||energyResult(lab.chess,lab.timeline))return;if(lab.mode==='ecom-ecom'&&lab.paused&&!force)return;if(lab.mode==='human-ecom'&&lab.chess.turn()===lab.config.humanColor)return;
  lab.selectedPly=lab.timeline.length-1;lab.thinking=true;this.selected=null;this.legal=[];this.renderEnergyAnalysis();await new Promise(resolve=>setTimeout(resolve,20));
  try{
   const color=lab.chess.turn(),priority=color==='w'?lab.config.priorityW:lab.config.priorityB,decision=chooseEnergyMoveOnePly(lab.chess,this.energyOptions(),priority);lab.lastDecision=decision;
   if(!decision.best){lab.thinking=false;this.renderEnergyAnalysis();return}
   const move=lab.chess.move({from:decision.best.from,to:decision.best.to,promotion:decision.best.promotion||'q'});lab.thinking=false;if(move)this.afterEnergyMove(move);else this.renderEnergyAnalysis();
  }catch(error){console.error('E-COM no pudo elegir jugada',error);lab.thinking=false;this.renderEnergyAnalysis()}
 },
 energyUndo(){
  const lab=this.ensureEnergyLab();if(lab.thinking||lab.timeline.length<=1||lab.mode==='saved')return;let count=1;
  if(lab.mode==='human-ecom'&&lab.timeline.length>2){const currentTurn=lab.chess.turn();count=currentTurn===lab.config.humanColor?2:1}
  for(let i=0;i<count&&lab.timeline.length>1;i+=1){lab.chess.undo();lab.timeline.pop()}
  lab.selectedPly=lab.timeline.length-1;lab.lastDecision=null;lab.gameSaved=false;this.selected=null;this.legal=[];this.lastMove=lab.timeline.at(-1)?.move?[lab.timeline.at(-1).move.from,lab.timeline.at(-1).move.to]:null;this.renderEnergyAnalysis();
 },
 saveEnergyGame(){
  const lab=this.ensureEnergyLab();if(lab.gameSaved||lab.timeline.length<3)return alert('Juega al menos una jugada completa antes de guardar.');const state=energyResult(lab.chess,lab.timeline),result=state?.result||'*';
  const mode=lab.mode==='ecom-ecom'?'energy-ecom':lab.mode==='human-ecom'?'energy-pve':'energy-free';
  const human=lab.config.humanColor,white=lab.mode==='ecom-ecom'?'E-COM':lab.mode==='human-ecom'?(human==='w'?'J1':'E-COM'):'J1',black=lab.mode==='ecom-ecom'?'E-COM':lab.mode==='human-ecom'?(human==='b'?'J1':'E-COM'):'J2';
  const game={id:crypto.randomUUID?.()||String(Date.now()),date:new Date().toISOString(),mode,white,black,result,pgn:lab.chess.pgn(),fen:lab.chess.fen(),reason:state?.reason||'guardada',positions:lab.timeline.map(item=>({fen:item.fen,ply:item.ply})),energyConfig:{...lab.config}};addGame(this.db,game);lab.gameSaved=true;this.renderEnergyAnalysis();
 }
};

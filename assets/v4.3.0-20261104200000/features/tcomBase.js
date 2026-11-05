import { Chess, OPENINGS, saveDb, addGame, $, $$, clamp, esc, uciToMove, downloadText, fideGameState, formatNumber, chooseTransformMoveOnePly, lruGet, lruSet } from '../app/deps.js';
export const tcomMethods = {
 ensureTComLab(){
  if(this.tcomLab)return this.tcomLab;
  const saved=this.db.settings.tcomLabConfig||{};
  const normalizeModule=(module,fallback)=>({
   type:module?.type==='stockfish'?'stockfish':'transform',
   name:String(module?.name||fallback.name),
   expressions:Array.isArray(module?.expressions)&&module.expressions.length?module.expressions:[...fallback.expressions],
   reducer:module?.reducer||'auto',stabilize:module?.stabilize!==false,
  });
  this.tcomLab={
   white:normalizeModule(saved.white,{name:'X · exp(a)',expressions:['X(a)=exp(a)']}),
   black:normalizeModule(saved.black,{name:'Y · exp(A)',expressions:['Y(A)=exp(A)']}),
   gamesTarget:clamp(Number(saved.gamesTarget||100),1,1000),maxPlies:clamp(Number(saved.maxPlies||220),20,600),
   diversity:clamp(Number(saved.diversity||4),0,50),openingPlies:clamp(Number(saved.openingPlies??4),0,16),
   delay:clamp(Number(saved.delay??20),0,1000),stockfishDepth:clamp(Number(saved.stockfishDepth||8),1,24),
   speed:[.25,.5,.75,1,1.25,1.5,2].includes(Number(saved.speed))?Number(saved.speed):1,
   annotateStockfish:saved.annotateStockfish!==false,stockfishEvalNodes:clamp(Number(saved.stockfishEvalNodes||1200),200,50000),
   alternateColors:saved.alternateColors!==false,saveGames:Boolean(saved.saveGames),
   boardControl:['off','w','b','both'].includes(saved.boardControl)?saved.boardControl:'both',autoReply:saved.autoReply!==false,
   running:false,paused:false,token:null,current:null,results:[],progress:'Listo para iniciar.',
   evalCache:new Map(),stockfishEvalCache:new Map(),seriesStartedAt:0,lastError:'',boardSelected:null,boardLegal:[],manualThinking:false,
   activeEditorSide:'white',activeEditorIndex:0,
  };
  return this.tcomLab;
 },
 persistTComConfig(){const lab=this.ensureTComLab();this.db.settings.tcomLabConfig={white:{...lab.white,expressions:[...lab.white.expressions]},black:{...lab.black,expressions:[...lab.black.expressions]},gamesTarget:lab.gamesTarget,maxPlies:lab.maxPlies,diversity:lab.diversity,openingPlies:lab.openingPlies,delay:lab.delay,speed:lab.speed,stockfishDepth:lab.stockfishDepth,annotateStockfish:lab.annotateStockfish,stockfishEvalNodes:lab.stockfishEvalNodes,alternateColors:lab.alternateColors,saveGames:lab.saveGames,boardControl:lab.boardControl,autoReply:lab.autoReply};saveDb(this.db)},
 cloneTComModule(module){return {...module,expressions:[...(module?.expressions||[])]}},
 tcomMoveTailHtml(chess,limit=24){const history=chess?.history?.()||[],start=Math.max(0,history.length-limit);return history.slice(start).map((san,index)=>{const ply=start+index,move=Math.floor(ply/2)+1,prefix=ply%2===0?`${move}.`:`${move}...`;return `<span>${prefix} ${esc(san)}</span>`}).join('')},
 tcomReducerOptions(selected){return [['auto','Automático / norma F'],['trace','Traza'],['determinant','Determinante'],['pseudoDeterminant','Pseudodeterminante'],['spectralRadius','Radio espectral'],['condition','Condición efectiva']].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')},
 tcomSpeedOptions(selected){return [.25,.5,.75,1,1.25,1.5,2].map(value=>`<option value="${value}" ${Number(selected)===value?'selected':''}>x${value}</option>`).join('')},
 tcomModuleCriterion(module){
  if(module?.type==='stockfish')return `Stockfish · profundidad ${this.ensureTComLab().stockfishDepth}`;
  const expressions=(module?.expressions||[]).join(' ; ')||'Sin función';
  const reducer={auto:'norma de Frobenius',trace:'traza',determinant:'determinante',pseudoDeterminant:'pseudodeterminante',spectralRadius:'radio espectral',condition:'condición efectiva'}[module?.reducer]||module?.reducer||'automático';
  return `${expressions} | reductor: ${reducer} | estabilización: ${module?.stabilize===false?'no':'signo·ln(1+|x|)'}`;
 },
 async tcomStockfishEvaluation(fen,token){
  const lab=this.ensureTComLab();if(!lab.annotateStockfish)return null;
  const key=`${lab.stockfishEvalNodes}|${String(fen).split(' ').slice(0,4).join(' ')}`,cached=lruGet(lab.stockfishEvalCache,key);if(cached!==undefined)return cached;
  try{
   await this.engine.init();if(token&&lab.token!==token)return null;
   const result=await this.engine.analyse(fen,{nodes:lab.stockfishEvalNodes,multiPv:1,skill:20,timeoutMs:60000}),best=result?.[0];
   if(!best||!Number.isFinite(best.score))return lruSet(lab.stockfishEvalCache,key,{cp:null,mate:null,error:'Sin evaluación'},12000);
   return lruSet(lab.stockfishEvalCache,key,{cp:best.score,mate:Number.isFinite(best.mate)?best.mate:null,error:''},12000);
  }catch(error){
   if(String(error?.message||'').includes('cancel'))return null;
   return lruSet(lab.stockfishEvalCache,key,{cp:null,mate:null,error:error?.message||'Error de Stockfish'},12000);
  }
 },
 tcomDecisionRecord(current,move,decision,stockfish){
  const module=move.color==='w'?current.white:current.black,chosen=decision?.chosen||{};
  return {ply:current.chess.history().length,color:move.color,san:move.san,uci:chosen.uci||`${move.from}${move.to}${move.promotion||''}`,moduleName:module.name,moduleType:module.type,criterion:this.tcomModuleCriterion(module),reducer:module.reducer||'auto',stabilize:module.stabilize!==false,score:Number.isFinite(chosen.score)?chosen.score:null,rawScore:Number.isFinite(chosen.rawScore)?chosen.rawScore:null,stockfishCp:Number.isFinite(stockfish?.cp)?stockfish.cp:null,stockfishMate:Number.isFinite(stockfish?.mate)?stockfish.mate:null,stockfishError:stockfish?.error||''};
 },
 tcomCalculatorKeysHtml(side){
  const rows=[
   ['sin(','cos(','tan(','exp(','ln(','log10('],
   ['sqrt(','abs(','tanh(','sign(','det(','pdet('],
   ['tr(','rank(','norm(','cond(','eig(','svd('],
   ['+','-','*','/','^','(',')'],
   ['I','pi','e',',','←'],
  ];
  return `<div class="tcom-target-keys"><button type="button" data-tcom-key-side="${side}" data-tcom-key="a"><b>a</b><span>valor</span></button><button type="button" data-tcom-key-side="${side}" data-tcom-key="A"><b>A</b><span>matriz</span></button></div><div class="tcom-math-keypad">${rows.flat().map(key=>`<button type="button" data-tcom-key-side="${side}" data-tcom-key="${esc(key)}">${esc(key)}</button>`).join('')}</div>`;
 },
 tcomExpressionRowsHtml(side,module){
  return (module.expressions||[]).map((expression,index)=>{const info=this.transformExpressionInfo(expression,index);return `<div class="tcom-expression-row"><span class="transform-expression-scope ${info.target==='a+A'?'mixed':''}">${info.target}</span><input data-tcom-expression="${side}.${index}" value="${esc(expression)}" spellcheck="false" aria-label="Función ${index+1} de ${side==='white'?'blancas':'negras'}"><button type="button" data-tcom-delete-expression="${side}.${index}" title="Eliminar función">×</button></div>`}).join('');
 },
 tcomModuleEditorHtml(side,module){
  const title=side==='white'?'Módulo de blancas':'Módulo de negras',isStockfish=module.type==='stockfish';
  return `<details class="tcom-module-card transform-card" open><summary>${title}<span>${isStockfish?'Stockfish':'T-COM'}</span></summary><div class="transform-card-body"><label>Tipo de jugador<select data-tcom-field="${side}.type"><option value="transform" ${module.type==='transform'?'selected':''}>T-COM · transformación de un ply</option><option value="stockfish" ${isStockfish?'selected':''}>Stockfish · referencia</option></select></label><label>Nombre<input data-tcom-field="${side}.name" value="${esc(module.name)}"></label>${isStockfish?`<div class="tcom-stockfish-card"><b>Stockfish de referencia</b><span>Usará la profundidad configurada para elegir la semijugada. Puedes enfrentar T-COM vs Stockfish o Stockfish vs Stockfish.</span></div>`:`<section class="tcom-calculator" data-tcom-calculator="${side}"><header><div><b>Calculadora matemática</b><small>Usa <strong>a</strong> para valores y <strong>A</strong> para la matriz completa.</small></div><button type="button" data-tcom-add-expression="${side}">＋ Función</button></header><div class="tcom-expression-list">${this.tcomExpressionRowsHtml(side,module)}</div>${this.tcomCalculatorKeysHtml(side)}</section><label>Reductor de salida<select data-tcom-field="${side}.reducer">${this.tcomReducerOptions(module.reducer)}</select></label><label class="toggle"><input data-tcom-field="${side}.stabilize" type="checkbox" ${module.stabilize?'checked':''}><span>Estabilizar con signo·ln(1+|x|)</span></label>`}<small>${isStockfish?'Stockfish sí calcula variantes internas según su profundidad.':'El módulo genera todas las semijugadas legales, evalúa únicamente la posición inmediata y elige la mejor. No calcula respuestas ni variantes.'}</small></div></details>`;
 },
 tcomActiveExpressionInput(side){
  const lab=this.ensureTComLab(),resolvedSide=side||lab.activeEditorSide||'white';
  let index=resolvedSide===lab.activeEditorSide?lab.activeEditorIndex:0;
  let input=$(`[data-tcom-expression="${resolvedSide}.${index}"]`);
  if(!input){input=$(`[data-tcom-expression^="${resolvedSide}."]`);index=Number(input?.dataset.tcomExpression?.split('.')[1]||0)}
  if(input){lab.activeEditorSide=resolvedSide;lab.activeEditorIndex=index}
  return input;
 },
 insertTComKey(side,key){
  const lab=this.ensureTComLab(),module=lab[side],input=this.tcomActiveExpressionInput(side);if(!input||!module)return;
  const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
  if(key==='←'){
   if(start!==end){input.value=input.value.slice(0,start)+input.value.slice(end);input.setSelectionRange(start,start)}
   else if(start>0){input.value=input.value.slice(0,start-1)+input.value.slice(start);input.setSelectionRange(start-1,start-1)}
  }else{
   input.value=input.value.slice(0,start)+key+input.value.slice(end);const next=start+key.length;input.setSelectionRange(next,next);
  }
  const index=Number(input.dataset.tcomExpression.split('.')[1]);module.expressions[index]=input.value;lab.activeEditorSide=side;lab.activeEditorIndex=index;input.focus();this.persistTComConfig();
 },
 addTComExpression(side){
  const lab=this.ensureTComLab(),module=lab[side];if(!module)return;const index=module.expressions.length+1,usesMatrix=module.expressions.some(line=>this.transformExpressionInfo(line).target==='A');
  module.expressions.push(usesMatrix?`F${index}(A)=A`:`f${index}(a)=a`);lab.activeEditorSide=side;lab.activeEditorIndex=module.expressions.length-1;this.persistTComConfig();this.renderTComLab();
 },
 deleteTComExpression(side,index){
  const lab=this.ensureTComLab(),module=lab[side];if(!module||module.expressions.length<=1)return;module.expressions.splice(index,1);lab.activeEditorSide=side;lab.activeEditorIndex=clamp(index-1,0,module.expressions.length-1);this.persistTComConfig();this.renderTComLab();
 },
 tcomStats(){const lab=this.ensureTComLab(),results=lab.results;let white=0,black=0,draw=0;for(const result of results){if(result.result==='1-0')white++;else if(result.result==='0-1')black++;else draw++}return {total:results.length,white,black,draw,avg:results.length?results.reduce((sum,item)=>sum+item.plies,0)/results.length:0}},
 tcomEffectiveDelay(){const lab=this.ensureTComLab();return Math.max(0,Number(lab.delay||0)/Math.max(.25,Number(lab.speed||1)))},
 tcomBoardControlOptions(selected){return [['off','Solo observar'],['w','Jugar con blancas'],['b','Jugar con negras'],['both','Mover ambos bandos']].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')},
 tcomBoardInteractive(){const lab=this.ensureTComLab(),current=lab.current;if(!current||!current.manualGame||lab.running||lab.manualThinking||lab.boardControl==='off')return false;return lab.boardControl==='both'||lab.boardControl===current.chess.turn()},
 tcomTurnModule(current=this.ensureTComLab().current){if(!current)return null;return current.chess.turn()==='w'?current.white:current.black},
 tcomTurnText(){const lab=this.ensureTComLab(),current=lab.current;if(!current)return 'Crea una partida jugable o inicia el torneo';const color=current.chess.turn()==='w'?'blancas':'negras',module=this.tcomTurnModule(current);if(lab.manualThinking)return `${module?.name||'Módulo'} calcula…`;if(this.tcomBoardInteractive())return lab.boardControl==='both'?`Mueve ${color} en el tablero`:`Tu turno con ${color}`;return `${module?.name||'Módulo'} · turno de ${color}`},
 tcomQueueAutoReply(){const lab=this.ensureTComLab(),module=this.tcomTurnModule();if(!lab.current?.manualGame||!lab.autoReply||lab.running||lab.manualThinking||this.tcomBoardInteractive()||module?.type==='human')return;setTimeout(()=>this.stepTComOnce({auto:true}),0)},
 prepareTComPlayableGame(){const lab=this.ensureTComLab();if(lab.running)return null;const opening=this.tcomOpening();let white=this.cloneTComModule(lab.white),black=this.cloneTComModule(lab.black);if(lab.boardControl==='w'||lab.boardControl==='both')white={type:'human',name:lab.boardControl==='both'?'Jugador manual · blancas':'Jugador · blancas',expressions:[],reducer:'auto',stabilize:true};if(lab.boardControl==='b'||lab.boardControl==='both')black={type:'human',name:lab.boardControl==='both'?'Jugador manual · negras':'Jugador · negras',expressions:[],reducer:'auto',stabilize:true};lab.current={number:lab.results.length+1,chess:opening.chess,openingName:opening.name,white,black,positions:opening.positions.map(position=>({...position})),lastMove:null,lastDecision:null,decisions:[],startedAt:Date.now(),manualGame:true};lab.boardSelected=null;lab.boardLegal=[];lab.manualThinking=false;lab.progress=`Partida jugable preparada: ${white.name} vs ${black.name}.`;return lab.current},
 bindTComBoard(){const board=$('#tcomBoard'),lab=this.ensureTComLab(),current=lab.current;if(!board||!current)return;this.bindKeyboardBoard(board);board.oncontextmenu=event=>event.preventDefault();$$('[data-square]',board).forEach(square=>{square.onclick=()=>{if(Date.now()<(this.suppress||0))return;this.tcomSelectSquare(square.dataset.square)};square.onpointerdown=event=>this.startVisualDrag(event,square.dataset.square,'tcom',current.chess);square.onpointermove=event=>this.dragMove(event);square.onpointerup=event=>this.endVisualDrag(event,(from,to)=>this.playTComManualMove(from,to));square.onpointercancel=event=>this.endVisualDrag(event,(from,to)=>this.playTComManualMove(from,to))})},
 tcomSelectSquare(square){const lab=this.ensureTComLab();if(!this.tcomBoardInteractive())return;const current=lab.current,chess=current.chess;if(lab.boardSelected&&lab.boardLegal.includes(square)){this.playTComManualMove(lab.boardSelected,square);return}const piece=chess.get(square);if(piece?.color===chess.turn()){lab.boardSelected=square;lab.boardLegal=chess.moves({square,verbose:true}).map(move=>move.to)}else{lab.boardSelected=null;lab.boardLegal=[]}this.updateTComLive()},
 async playTComManualMove(from,to){
  const lab=this.ensureTComLab();if(!this.tcomBoardInteractive())return;
  const current=lab.current,chess=current.chess,options=chess.moves({square:from,verbose:true}).filter(move=>move.to===to);if(!options.length)return;
  let promotion='q';if(options.some(move=>move.promotion))promotion=await this.choosePromotion();
  let move;try{move=chess.move({from,to,promotion})}catch{return}if(!move)return;
  const decision={manual:true,module:move.color==='w'?current.white.name:current.black.name,candidates:[],chosen:{uci:move.from+move.to+(move.promotion||''),san:move.san,score:0,rawScore:0}};
  current.lastMove=[move.from,move.to];current.lastDecision=decision;lab.boardSelected=null;lab.boardLegal=[];lab.progress=`Jugada manual: ${move.san}. Evaluando con Stockfish…`;this.updateTComLive();
  const ownsToken=!lab.token,token=lab.token||crypto.randomUUID?.()||String(Date.now());if(ownsToken)lab.token=token;
  const stockfish=await this.tcomStockfishEvaluation(chess.fen(),token);if(ownsToken&&lab.token===token)lab.token=null;
  current.decisions.push(this.tcomDecisionRecord(current,move,decision,stockfish));
  current.positions.push({fen:chess.fen(),ply:chess.history().length,stockfish:Number.isFinite(stockfish?.cp)?stockfish.cp:null});
  lab.progress=`Jugada manual: ${move.san}${Number.isFinite(stockfish?.cp)?` · SF ${(stockfish.cp/100).toFixed(2)}`:''}.`;
  const after=fideGameState(chess,current.positions);if(after.terminal){this.finishTComGame(after.result,after.reason);return}
  if(after.claimable)lab.progress=`${lab.progress} Tablas reclamables por ${after.claims.join(' y ')}.`;
  if(chess.history().length>=lab.maxPlies){this.finishTComGame('1/2-1/2',`límite de ${lab.maxPlies} semijugadas`);return}
  this.updateTComLive(true);this.tcomQueueAutoReply();
 },
 undoTComPlayableMove(){const lab=this.ensureTComLab(),current=lab.current;if(!current||lab.running||lab.manualThinking)return;const control=lab.boardControl;let move=current.chess.undo();if(!move)return;if((control==='w'||control==='b')&&current.chess.history().length&&current.chess.turn()!==control)current.chess.undo();const plies=current.chess.history().length;current.positions=current.positions.slice(0,plies+1);current.decisions=(current.decisions||[]).filter(decision=>decision.ply<=plies);const previous=current.chess.history({verbose:true}).at(-1);current.lastMove=previous?[previous.from,previous.to]:null;current.lastDecision=null;lab.boardSelected=null;lab.boardLegal=[];lab.progress='Se deshizo la última jugada del tablero jugable.';this.renderTComLab()},
 tcomBoardHtml(){const lab=this.ensureTComLab(),chess=lab.current?.chess||new Chess();const previousFlip=this.boardFlipped,previousSelected=this.selected,previousLegal=this.legal,previousLast=this.lastMove;this.boardFlipped=Boolean(lab.current?.manualGame&&lab.boardControl==='b');this.selected=lab.boardSelected;this.legal=lab.boardLegal;this.lastMove=lab.current?.lastMove||null;const board=this.boardHtml(chess,this.tcomBoardInteractive());this.boardFlipped=previousFlip;this.selected=previousSelected;this.legal=previousLegal;this.lastMove=previousLast;return board},
 renderTComLab(){
  const lab=this.ensureTComLab(),stats=this.tcomStats(),current=lab.current,v=$('#view');
  const moveTail=this.tcomMoveTailHtml(current?.chess,24);
  const candidates=(current?.lastDecision?.candidates||[]).slice(0,8).map((candidate,index)=>`<tr><td>${index+1}</td><td>${esc(candidate.san||candidate.uci)}</td><td>${formatNumber(candidate.score,5)}</td><td>${formatNumber(candidate.rawScore,5)}</td></tr>`).join('');
  const canUndo=Boolean(current?.chess?.history?.().length)&&!lab.running&&!lab.manualThinking;
  v.innerHTML=`<section class="transform-page-head"><button data-tcom-back>← Inicio</button><div><small>LABORATORIO DE MOTORES SIMBÓLICOS</small><h1>T-COM vs T-COM</h1></div><div class="transform-head-actions"><button data-tcom-start class="primary" ${lab.running?'disabled':''}>▶ Iniciar ${lab.gamesTarget} partidas</button><button data-tcom-pause ${lab.running?'':'disabled'}>${lab.paused?'▶ Reanudar':'⏸ Pausar'}</button><button data-tcom-stop ${lab.running?'':'disabled'}>■ Detener</button><button data-tcom-new-playable ${lab.running?'disabled':''}>♟ Nueva partida jugable</button></div></section>
  <section class="tcom-layout"><aside class="tcom-config-column">${this.tcomModuleEditorHtml('white',lab.white)}${this.tcomModuleEditorHtml('black',lab.black)}<details class="transform-card" open><summary>Control del tablero <span>Jugar</span></summary><div class="transform-card-body tcom-play-settings"><label>Quién mueve manualmente<select data-tcom-board-control>${this.tcomBoardControlOptions(lab.boardControl)}</select></label><label class="toggle"><input data-tcom-auto-reply type="checkbox" ${lab.autoReply?'checked':''}><span>Respuesta automática del módulo rival</span></label><small>En una partida jugable puedes tocar o arrastrar las piezas. El módulo del bando contrario responde con su transformación de una sola semijugada, sin calcular variantes.</small></div></details><details class="transform-card"><summary>Configuración del torneo <span>＋</span></summary><div class="transform-card-body tcom-settings"><label>Partidas<input data-tcom-setting="gamesTarget" type="number" min="1" max="1000" value="${lab.gamesTarget}"></label><label>Máximo de semijugadas<input data-tcom-setting="maxPlies" type="number" min="20" max="600" value="${lab.maxPlies}"></label><label>Diversidad entre empates (%)<input data-tcom-setting="diversity" type="number" min="0" max="50" value="${lab.diversity}"></label><label>Semijugadas iniciales de apertura<input data-tcom-setting="openingPlies" type="number" min="0" max="16" value="${lab.openingPlies}"></label><label>Velocidad de las partidas<select data-tcom-setting="speed">${this.tcomSpeedOptions(lab.speed)}</select></label><label>Pausa base por semijugada (ms)<input data-tcom-setting="delay" type="number" min="0" max="1000" value="${lab.delay}"></label><label>Profundidad Stockfish rival<input data-tcom-setting="stockfishDepth" type="number" min="1" max="24" value="${lab.stockfishDepth}"></label><label>Nodos SF para anotaciones<input data-tcom-setting="stockfishEvalNodes" type="number" min="200" max="50000" step="200" value="${lab.stockfishEvalNodes}"></label><label class="toggle"><input data-tcom-setting="annotateStockfish" type="checkbox" ${lab.annotateStockfish?'checked':''}><span>Anotar cada semijugada con evaluación de Stockfish</span></label><label class="toggle"><input data-tcom-setting="alternateColors" type="checkbox" ${lab.alternateColors?'checked':''}><span>Alternar módulos de color</span></label><label class="toggle"><input data-tcom-setting="saveGames" type="checkbox" ${lab.saveGames?'checked':''}><span>Guardar partidas en biblioteca</span></label></div></details></aside>
  <main class="tcom-board-column"><section class="transform-card-static tcom-board-card"><header><div><small id="tcomGameLabel">${current?`Partida ${current.number}${current.manualGame?' · tablero jugable':`/${lab.gamesTarget}`} · ${esc(current.openingName)}`:'Vista previa'}</small><h2 id="tcomTurnLabel">${esc(this.tcomTurnText())}</h2></div><span class="tcom-one-ply-badge">${current?.manualGame?'Tablero jugable':'1 ply · sin variantes'}</span></header><div class="transform-board-shell"><div class="board-wrap" style="${this.customBoardStyle()}"><div class="board" id="tcomBoard">${this.tcomBoardHtml()}</div></div></div><div class="tcom-play-controls"><button data-tcom-new-playable ${lab.running?'disabled':''}>Nueva partida</button><button data-tcom-undo ${canUndo?'':'disabled'}>↶ Deshacer turno</button><button data-tcom-step ${lab.running||lab.manualThinking?'disabled':''}>▶ Mover módulo actual</button><span>${this.tcomBoardInteractive()?'Tablero activo: mueve por clic o arrastre.':lab.manualThinking?'El módulo está calculando…':'Selecciona un control manual y crea una partida jugable.'}</span></div><div class="tcom-moves" id="tcomMoves">${moveTail||'<span>Sin jugadas todavía.</span>'}</div><div class="transform-status ${lab.running||lab.manualThinking?'busy':''}" id="tcomProgress">${esc(lab.progress)}</div></section><details class="transform-card" open><summary>Última decisión del módulo <span>Top 8</span></summary><div class="transform-card-body tcom-candidate-wrap"><table><thead><tr><th>#</th><th>Semijugada</th><th>Puntuación estable</th><th>Valor bruto</th></tr></thead><tbody id="tcomCandidates">${candidates||'<tr><td colspan="4">Todavía no hay una decisión automática.</td></tr>'}</tbody></table></div></details></main>
  <aside class="tcom-results-column"><details class="transform-card" open><summary>Resumen de la serie <span>${stats.total}/${lab.gamesTarget}</span></summary><div class="transform-card-body"><div class="tcom-stat-grid"><span><b id="tcomTotal">${stats.total}</b> terminadas</span><span><b id="tcomWhiteWins">${stats.white}</b> victorias blancas</span><span><b id="tcomBlackWins">${stats.black}</b> victorias negras</span><span><b id="tcomDraws">${stats.draw}</b> tablas</span><span><b id="tcomAvg">${formatNumber(stats.avg,1)}</b> semijugadas promedio</span><span><b>${lab.evalCache.size}</b> evaluaciones en caché</span></div><button data-tcom-export ${stats.total?'':'disabled'}>Exportar PGN + CSV detallado</button><button data-tcom-clear ${lab.running?'disabled':''}>Limpiar resultados</button></div></details><details class="transform-card" open><summary>Partidas terminadas <span>⌃</span></summary><div class="transform-card-body tcom-results-list" id="tcomResults">${lab.results.slice(-100).reverse().map(item=>`<article><b>#${item.number} · ${item.result}</b><span>${esc(item.white)} vs ${esc(item.black)}</span><small>${item.plies} semijugadas · ${esc(item.reason)}${Number.isFinite(item.finalStockfish)?` · SF ${(item.finalStockfish/100).toFixed(2)}`:''}</small></article>`).join('')||'<p>No hay partidas terminadas.</p>'}</div></details><details class="transform-card"><summary>Metodología <span>＋</span></summary><div class="transform-card-body"><p>Cada T-COM enumera solo las jugadas legales del turno, crea la matriz de cada posición hija, aplica sus funciones y selecciona el mejor valor. Blancas maximizan; negras minimizan.</p><p>El tablero jugable utiliza exactamente la misma matriz y los mismos módulos que el torneo, pero permite que una persona controle blancas, negras o ambos bandos.</p><p>Las posiciones y transformaciones repetidas se almacenan en una caché LRU para acelerar series largas.</p></div></details></aside></section>`;
  $('[data-tcom-back]').onclick=()=>{if(lab.running&&!confirm('La serie sigue activa. ¿Detener y salir?'))return;this.stopTComTournament(false);this.screen='home';this.render()};
  $('[data-tcom-start]').onclick=()=>this.startTComTournament();$('[data-tcom-pause]').onclick=()=>{lab.paused=!lab.paused;lab.progress=lab.paused?'Serie pausada.':'Serie reanudada.';this.updateTComLive(true)};$('[data-tcom-stop]').onclick=()=>this.stopTComTournament();$$('[data-tcom-step]').forEach(button=>button.onclick=()=>this.stepTComOnce());
  $$('[data-tcom-new-playable]').forEach(button=>button.onclick=()=>{if(lab.boardControl==='off')lab.boardControl='both';this.prepareTComPlayableGame();this.persistTComConfig();this.renderTComLab();this.tcomQueueAutoReply()});$('[data-tcom-undo]').onclick=()=>this.undoTComPlayableMove();
  $('[data-tcom-board-control]').onchange=event=>{lab.boardControl=event.target.value;lab.boardSelected=null;lab.boardLegal=[];this.persistTComConfig();if(lab.current?.manualGame)this.prepareTComPlayableGame();this.renderTComLab();this.tcomQueueAutoReply()};
  $('[data-tcom-auto-reply]').onchange=event=>{lab.autoReply=event.target.checked;this.persistTComConfig()};
  $$('[data-tcom-field],[data-tcom-setting],[data-tcom-expression],[data-tcom-key-side],[data-tcom-add-expression],[data-tcom-delete-expression]').forEach(input=>{input.disabled=lab.running});
  $$('[data-tcom-field]').forEach(input=>input.onchange=()=>{const [side,key]=input.dataset.tcomField.split('.'),module=lab[side];module[key]=key==='stabilize'?input.checked:input.value;this.persistTComConfig();if(key==='type')this.renderTComLab()});
  $$('[data-tcom-expression]').forEach(input=>{
   input.onfocus=()=>{const [side,index]=input.dataset.tcomExpression.split('.');lab.activeEditorSide=side;lab.activeEditorIndex=Number(index)};
   input.oninput=()=>{const [side,index]=input.dataset.tcomExpression.split('.');lab[side].expressions[Number(index)]=input.value;lab.activeEditorSide=side;lab.activeEditorIndex=Number(index);this.persistTComConfig()};
  });
  $$('[data-tcom-key-side]').forEach(button=>button.onclick=()=>this.insertTComKey(button.dataset.tcomKeySide,button.dataset.tcomKey));
  $$('[data-tcom-add-expression]').forEach(button=>button.onclick=()=>this.addTComExpression(button.dataset.tcomAddExpression));
  $$('[data-tcom-delete-expression]').forEach(button=>button.onclick=()=>{const [side,index]=button.dataset.tcomDeleteExpression.split('.');this.deleteTComExpression(side,Number(index))});
  $$('[data-tcom-setting]').forEach(input=>input.onchange=()=>{const key=input.dataset.tcomSetting;lab[key]=input.type==='checkbox'?input.checked:Number(input.value);if(key==='gamesTarget')lab[key]=clamp(lab[key],1,1000);if(key==='maxPlies')lab[key]=clamp(lab[key],20,600);if(key==='speed')lab[key]=[.25,.5,.75,1,1.25,1.5,2].includes(lab[key])?lab[key]:1;if(key==='stockfishEvalNodes')lab[key]=clamp(lab[key],200,50000);this.persistTComConfig()});
  $('[data-tcom-export]').onclick=()=>this.exportTComResults();$('[data-tcom-clear]').onclick=()=>{lab.results=[];lab.current=null;lab.boardSelected=null;lab.boardLegal=[];lab.evalCache.clear();lab.stockfishEvalCache.clear();lab.progress='Resultados eliminados.';this.renderTComLab()};
  this.bindTComBoard();
 },
 tcomOpening(){
  const lab=this.ensureTComLab(),plies=lab.openingPlies;
  const initial=new Chess(),initialPositions=[{fen:initial.fen(),ply:0}];
  if(!plies)return {chess:initial,name:'Posición inicial',positions:initialPositions};
  const options=OPENINGS.filter(opening=>opening.moves?.length>=plies&&opening.moves.length<=Math.max(plies+8,16));
  for(let attempt=0;attempt<30;attempt++){
   const opening=options[Math.floor(Math.random()*options.length)];if(!opening)break;
   const chess=new Chess(),positions=[{fen:chess.fen(),ply:0}];let valid=true;
   for(const san of opening.moves.slice(0,plies)){if(!chess.move(san)){valid=false;break}positions.push({fen:chess.fen(),ply:chess.history().length})}
   if(valid)return {chess,name:opening.name,positions};
  }
  return {chess:initial,name:'Posición inicial',positions:initialPositions}
 },
 prepareTComGame(number=1){
  const lab=this.ensureTComLab(),opening=this.tcomOpening(),baseWhite=lab.seriesModules?.white||lab.white,baseBlack=lab.seriesModules?.black||lab.black,swap=lab.alternateColors&&number%2===0,white=this.cloneTComModule(swap?baseBlack:baseWhite),black=this.cloneTComModule(swap?baseWhite:baseBlack);
  lab.current={number,chess:opening.chess,openingName:opening.name,white,black,positions:opening.positions.map(position=>({...position})),lastMove:null,lastDecision:null,decisions:[],startedAt:Date.now(),manualGame:false};lab.boardSelected=null;lab.boardLegal=[];lab.manualThinking=false;lab.progress=`Partida ${number}/${lab.gamesTarget}: ${white.name} vs ${black.name}`;return lab.current
 },
 async chooseTComSideMove(current,token){const lab=this.ensureTComLab(),color=current.chess.turn(),module=color==='w'?current.white:current.black;if(module.type==='human')throw new Error('Es el turno del jugador en el tablero.');if(module.type==='stockfish'){await this.engine.init();const result=await this.engine.analyse(current.chess.fen(),{depth:lab.stockfishDepth,multiPv:1,skill:20,timeoutMs:90000});const chosen=result?.[0];if(!chosen)throw new Error('Stockfish no devolvió una jugada.');return {chosen:{...chosen,san:chosen.uci,rawScore:chosen.score/100},candidates:result.map(item=>({...item,san:item.uci,rawScore:item.score/100}))}}
  return chooseTransformMoveOnePly(current.chess,module,{cache:lab.evalCache,diversity:lab.diversity,chunkSize:4,cancelled:()=>lab.token!==token,yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0))}) },
 async playTComPly(token,options){
  options=options||{};const render=options.render!==false,lab=this.ensureTComLab(),current=lab.current||this.prepareTComGame(lab.results.length+1);
  if(lab.token!==token)throw new Error('Cálculo cancelado.');
  const state=fideGameState(current.chess,current.positions);if(state.terminal)return this.finishTComGame(state.result,state.reason);
  const decision=await this.chooseTComSideMove(current,token);if(lab.token!==token)return;
  const move=current.chess.move(uciToMove(decision.chosen.uci));if(!move)throw new Error(`La semijugada ${decision.chosen.uci} no fue legal.`);
  current.lastMove=[move.from,move.to];current.lastDecision={...decision,module:move.color==='w'?current.white.name:current.black.name};
  lab.progress=current.manualGame?`${current.lastDecision.module}: ${move.san}. Evaluando posición elegida con Stockfish…`:`Partida ${current.number}/${lab.gamesTarget} · ${current.lastDecision.module}: ${move.san}. Evaluando con Stockfish…`;
  if(render)this.updateTComLive();
  const stockfish=await this.tcomStockfishEvaluation(current.chess.fen(),token);if(lab.token!==token)return;
  current.decisions.push(this.tcomDecisionRecord(current,move,decision,stockfish));
  current.positions.push({fen:current.chess.fen(),ply:current.chess.history().length,stockfish:Number.isFinite(stockfish?.cp)?stockfish.cp:null});
  const sfText=Number.isFinite(stockfish?.cp)?` · SF ${(stockfish.cp/100).toFixed(2)}`:stockfish?.error?' · SF no disponible':'';
  lab.progress=current.manualGame?`${current.lastDecision.module}: ${move.san} · ${decision.candidates.length} candidatas de un ply${sfText}.`:`Partida ${current.number}/${lab.gamesTarget} · ${current.lastDecision.module}: ${move.san} · ${decision.candidates.length} candidatas de un ply${sfText}.`;
  const after=fideGameState(current.chess,current.positions);if(after.terminal)return this.finishTComGame(after.result,after.reason);
  if(after.claimable)return this.finishTComGame('1/2-1/2',`tablas reclamables: ${after.claims.join(' y ')}`);
  if(current.chess.history().length>=lab.maxPlies)return this.finishTComGame('1/2-1/2',`límite de ${lab.maxPlies} semijugadas`);
  if(render)this.updateTComLive();return null;
 },
 finishTComGame(result,reason){
  const lab=this.ensureTComLab(),current=lab.current;if(!current)return null;
  current.chess.setHeader?.('Result',result);
  const decisions=(current.decisions||[]).map(item=>({...item})),finalStockfish=[...decisions].reverse().find(item=>Number.isFinite(item.stockfishCp))?.stockfishCp??null;
  const item={number:current.number,result,reason,white:current.white.name,black:current.black.name,whiteModule:this.cloneTComModule(current.white),blackModule:this.cloneTComModule(current.black),whiteCriterion:this.tcomModuleCriterion(current.white),blackCriterion:this.tcomModuleCriterion(current.black),plies:current.chess.history().length,pgn:current.chess.pgn(),fen:current.chess.fen(),openingName:current.openingName,durationMs:Date.now()-current.startedAt,decisions,finalStockfish,stockfishAnnotation:lab.annotateStockfish,stockfishEvalNodes:lab.stockfishEvalNodes};
  lab.results.push(item);
  if(lab.saveGames&&item.plies>=2){
   const game={id:crypto.randomUUID?.()||String(Date.now()),date:new Date().toISOString(),mode:'tcom',white:item.white,black:item.black,result:item.result,pgn:this.tcomAnnotatedPgn(item),fen:item.fen,reason:item.reason,openingName:item.openingName,positions:current.positions,decisions:item.decisions,whiteCriterion:item.whiteCriterion,blackCriterion:item.blackCriterion};
   addGame(this.db,game);saveDb(this.db);
  }
  lab.progress=`Partida ${item.number} terminada: ${item.result} · ${item.reason}`;lab.current=null;lab.boardSelected=null;lab.boardLegal=[];lab.manualThinking=false;this.updateTComLive(true);return item;
 },
 tcomPgnSafe(value){return String(value??'').replace(/["\\\r\n]/g,character=>character==='"'?"'":character==='\\'?'/' :' ')},
 tcomCommentSafe(value){return String(value??'').replace(/[{}\r\n]/g,' ').replace(/\s+/g,' ').trim()},
 tcomStockfishText(decision){if(Number.isFinite(decision?.stockfishMate))return `#${decision.stockfishMate}`;if(Number.isFinite(decision?.stockfishCp))return `${decision.stockfishCp>=0?'+':''}${(decision.stockfishCp/100).toFixed(2)}`;return 'N/D'},
 tcomAnnotatedPgn(item){
  const history=[];try{const chess=new Chess();if(item.pgn)chess.loadPgn(item.pgn);history.push(...chess.history())}catch{/* Conserva una exportación parcial si un PGN antiguo falla. */}
  const decisionByPly=new Map((item.decisions||[]).map(decision=>[decision.ply,decision])),tokens=[];
  history.forEach((san,index)=>{const ply=index+1,moveNumber=Math.floor(index/2)+1,decision=decisionByPly.get(ply);if(index%2===0)tokens.push(`${moveNumber}.`);tokens.push(san);if(decision){const comment=`criterio=${decision.criterion}; score=${formatNumber(decision.score,6)}; bruto=${formatNumber(decision.rawScore,6)}; Stockfish=${this.tcomStockfishText(decision)}`;tokens.push(`{${this.tcomCommentSafe(comment)}}`)}});
  tokens.push(item.result||'*');
  return `[Event "T-COM vs T-COM"]
[Round "${item.number}"]
[White "${this.tcomPgnSafe(item.white)}"]
[Black "${this.tcomPgnSafe(item.black)}"]
[Result "${item.result||'*'}"]
[Opening "${this.tcomPgnSafe(item.openingName)}"]
[WhiteCriterion "${this.tcomPgnSafe(item.whiteCriterion)}"]
[BlackCriterion "${this.tcomPgnSafe(item.blackCriterion)}"]
[StockfishAnnotation "${item.stockfishAnnotation?`${item.stockfishEvalNodes} nodes por posición`:'desactivada'}"]

${tokens.join(' ')}`;
 },
 async startTComTournament(){const lab=this.ensureTComLab();if(lab.running)return;lab.results=[];lab.evalCache.clear();lab.stockfishEvalCache.clear();lab.seriesModules={white:this.cloneTComModule(lab.white),black:this.cloneTComModule(lab.black)};lab.running=true;lab.paused=false;lab.manualThinking=false;lab.boardSelected=null;lab.boardLegal=[];lab.lastError='';lab.seriesStartedAt=Date.now();const token=crypto.randomUUID?.()||String(Date.now());lab.token=token;this.prepareTComGame(1);this.renderTComLab();try{for(let gameNumber=1;gameNumber<=lab.gamesTarget&&lab.token===token;gameNumber++){if(!lab.current)this.prepareTComGame(gameNumber);while(lab.current&&lab.token===token){while(lab.paused&&lab.token===token)await new Promise(resolve=>setTimeout(resolve,100));if(lab.token!==token)break;const ply=lab.current.chess.history().length;const effectiveDelay=this.tcomEffectiveDelay();await this.playTComPly(token,{render:effectiveDelay>=30||ply%4===0});await new Promise(resolve=>setTimeout(resolve,effectiveDelay))}if(lab.token===token&&gameNumber%10===0){this.engine.clearHash?.();await new Promise(resolve=>setTimeout(resolve,0))}}if(lab.token===token)lab.progress=`Serie completada: ${lab.results.length} partidas.`}catch(error){if(lab.token===token){lab.lastError=error.message;lab.progress=`Serie detenida: ${error.message}`}}finally{if(lab.token===token){lab.running=false;lab.paused=false;lab.token=null;lab.seriesModules=null;this.updateTComLive(true)}} },
 stopTComTournament(render=true){const lab=this.ensureTComLab();lab.token=null;lab.running=false;lab.paused=false;lab.manualThinking=false;lab.seriesModules=null;this.engine.stop?.();lab.progress='Serie detenida por el usuario.';if(render&&this.screen==='tcomLab')this.renderTComLab()},
 async stepTComOnce(options){options=options||{};const auto=Boolean(options.auto),lab=this.ensureTComLab();if(lab.running||lab.manualThinking)return;if(!lab.current){if(auto)return;this.prepareTComPlayableGame()}const module=this.tcomTurnModule();if(module?.type==='human'){lab.progress='Es el turno del jugador: mueve una pieza en el tablero.';this.renderTComLab();return}const token=crypto.randomUUID?.()||String(Date.now());lab.token=token;lab.manualThinking=true;this.updateTComLive(true);try{await this.playTComPly(token,{render:false})}catch(error){lab.progress=`No se pudo avanzar: ${error.message}`}finally{if(lab.token===token)lab.token=null;lab.manualThinking=false;if(this.screen==='tcomLab')this.renderTComLab()}},
 updateTComLive(force=false){if(this.screen!=='tcomLab')return;const lab=this.ensureTComLab(),current=lab.current,stats=this.tcomStats();if(force){this.renderTComLab();return}const board=$('#tcomBoard');if(board){board.innerHTML=this.tcomBoardHtml();this.bindTComBoard()}const gameLabel=$('#tcomGameLabel');if(gameLabel)gameLabel.textContent=current?`Partida ${current.number}${current.manualGame?' · tablero jugable':`/${lab.gamesTarget}`} · ${current.openingName}`:'Serie';const turn=$('#tcomTurnLabel');if(turn)turn.textContent=this.tcomTurnText();const moves=$('#tcomMoves');if(moves)moves.innerHTML=this.tcomMoveTailHtml(current?.chess,24)||'<span>Sin jugadas todavía.</span>';const progress=$('#tcomProgress');if(progress)progress.textContent=lab.progress;const candidates=$('#tcomCandidates');if(candidates)candidates.innerHTML=(current?.lastDecision?.candidates||[]).slice(0,8).map((candidate,index)=>`<tr><td>${index+1}</td><td>${esc(candidate.san||candidate.uci)}</td><td>${formatNumber(candidate.score,5)}</td><td>${formatNumber(candidate.rawScore,5)}</td></tr>`).join('')||'<tr><td colspan="4">Todavía no hay una decisión automática.</td></tr>';const set=(id,value)=>{const el=$(id);if(el)el.textContent=value};set('#tcomTotal',stats.total);set('#tcomWhiteWins',stats.white);set('#tcomBlackWins',stats.black);set('#tcomDraws',stats.draw);set('#tcomAvg',formatNumber(stats.avg,1)) },
 exportTComResults(){
  const lab=this.ensureTComLab();if(!lab.results.length)return;
  const quoted=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  const pgn=lab.results.map(item=>this.tcomAnnotatedPgn(item)).join('\n\n');
  downloadText(`T-COM-serie-${lab.results.length}-anotada.pgn`,pgn,'application/x-chess-pgn');
  const summaryHeader=['partida','blancas','negras','resultado','semijugadas','motivo','apertura','criterio_blancas','criterio_negras','stockfish_final'];
  const summary=[summaryHeader.join(','),...lab.results.map(item=>[item.number,item.white,item.black,item.result,item.plies,item.reason,item.openingName,item.whiteCriterion,item.blackCriterion,Number.isFinite(item.finalStockfish)?item.finalStockfish/100:''].map(quoted).join(','))].join('\n');
  const detailHeader=['partida','semijugada','color','san','uci','modulo','tipo','criterio_seleccion','reductor','estabilizado','puntuacion_estable','valor_bruto','stockfish_peones','stockfish_mate','error_stockfish'];
  const detailRows=lab.results.flatMap(item=>(item.decisions||[]).map(decision=>[item.number,decision.ply,decision.color,decision.san,decision.uci,decision.moduleName,decision.moduleType,decision.criterion,decision.reducer,decision.stabilize,decision.score,decision.rawScore,Number.isFinite(decision.stockfishCp)?decision.stockfishCp/100:'',Number.isFinite(decision.stockfishMate)?decision.stockfishMate:'',decision.stockfishError||''].map(quoted).join(',')));
  const detail=[detailHeader.join(','),...detailRows].join('\n');
  setTimeout(()=>downloadText(`T-COM-serie-${lab.results.length}-resumen.csv`,summary,'text/csv'),250);
  setTimeout(()=>downloadText(`T-COM-serie-${lab.results.length}-decisiones.csv`,detail,'text/csv'),500);
 }
};

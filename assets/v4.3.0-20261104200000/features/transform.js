import { Chess, saveDb, $, $$, clamp, esc, uciToMove, scoreText, buildPositionMatrix, algebraicProperties, buildTimelineFromPgn, splitPgnDatabase, pgnDisplayName, compileFunctionDefinitions, evaluateCompiledFunctionDefinitions, compileScalarFunctionLine, formatNumber, finiteExtentOfSeries, normalizeFiniteSeries } from '../app/deps.js';
export const transformMethods = {
 ensureTransformLab(){
  if(this.transformLab)return this.transformLab;
  const saved=this.db.settings.transformLabConfig||{},savedVisibility=saved.visibility||saved.metricVisibility||{};
  const expressions=Array.isArray(saved.expressions)&&saved.expressions.length?saved.expressions:[
   'f(a)=sin(a)+ln(1+abs(a))',
   'F(A)=A^2+exp(A)',
   'K(A,a)=F(A)+f(a)',
  ];
  this.transformLab={
   sheets:[],selectedId:null,ply:0,busy:false,progress:'',analysisToken:null,
   expressions,
   visibility:{
    stockfish:true,output:true,determinant:true,rank:true,trace:true,frobenius:true,
    condition:true,pseudoDeterminant:true,lambdaMax:true,sigmaMinPositive:true,
    ...savedVisibility,
   },
   graphMode:saved.graphMode||'semimove',normalized:saved.normalized!==false,depth:Number(saved.depth||8),batchNodes:clamp(Number(saved.batchNodes||12000),1000,100000),
   graph:{xMin:0,xMax:40,yMin:-20,yMax:20},
   activeExpression:clamp(Number(saved.activeExpression||0),0,Math.max(0,expressions.length-1)),
   activeGraphFunction:clamp(Number(saved.activeGraphFunction||0),0,Math.max(0,expressions.length-1)),
   applicationTarget:saved.applicationTarget==='A'?'A':'a',
   drag:null,cacheRevision:0,stockfishRevision:0,rawSeriesCache:null,graphSeriesCache:null,drawFrame:null,drawRetry:null,continuousCache:null,
   functionAnalysisToken:null,functionAnalysisProgress:'',compiledDefinitionsCache:null,
   boardSelected:null,boardLegal:[],boardLastMove:null,
   liveAuto:saved.liveAuto!==false,liveMultiPv:clamp(Number(saved.liveMultiPv||3),1,5),
   liveCandidates:[],liveAnalysisFen:'',liveBusy:false,liveError:'',liveToken:null,liveTimer:null,
  };
  const storedGames=(this.db.games||[]).filter(game=>game.pgn).slice(0,500);
  for(const game of storedGames){try{const sheet=buildTimelineFromPgn(game.pgn,`${game.white||'Blancas'} vs ${game.black||'Negras'}`);sheet.source='biblioteca';this.transformLab.sheets.push(sheet)}catch{/* Se omite un PGN antiguo no compatible. */}}
  if(!this.transformLab.sheets.length){const sheet=buildTimelineFromPgn('', 'Hoja 001 · Posición inicial');sheet.source='nuevo';this.transformLab.sheets.push(sheet)}
  this.transformLab.selectedId=this.transformLab.sheets[0].id;
  return this.transformLab;
 },
 persistTransformConfig(){
  const lab=this.ensureTransformLab();
  this.db.settings.transformLabConfig={
   expressions:[...lab.expressions],visibility:{...lab.visibility},graphMode:lab.graphMode,
   normalized:lab.normalized,depth:lab.depth,batchNodes:lab.batchNodes,
   activeExpression:lab.activeExpression,activeGraphFunction:lab.activeGraphFunction,
   applicationTarget:lab.applicationTarget,liveAuto:lab.liveAuto,liveMultiPv:lab.liveMultiPv,
  };
  saveDb(this.db);
 },
 invalidateTransformGraphCache(){
  const lab=this.ensureTransformLab();
  lab.cacheRevision=(lab.cacheRevision||0)+1;
  lab.stockfishRevision=(lab.stockfishRevision||0)+1;
  lab.rawSeriesCache=null;lab.graphSeriesCache=null;lab.continuousCache=null;
  lab.compiledDefinitionsCache=null;lab.functionAnalysisToken=null;lab.functionAnalysisProgress='';
 },
 invalidateTransformStockfishSeries(){const lab=this.ensureTransformLab();lab.stockfishRevision=(lab.stockfishRevision||0)+1;lab.rawSeriesCache=null;lab.graphSeriesCache=null},
 disposeTransformGraphBinding(){
  const lab=this.transformLab;if(!lab)return;
  lab.graphResizeObserver?.disconnect?.();lab.graphResizeObserver=null;
  if(lab.graphResizeFallback){window.removeEventListener?.('resize',lab.graphResizeFallback);lab.graphResizeFallback=null}
  if(lab.drawFrame){globalThis.cancelAnimationFrame?.(lab.drawFrame);lab.drawFrame=null}
  if(lab.drawRetry){clearTimeout(lab.drawRetry);lab.drawRetry=null}
  if(this.screen!=='stockfishGraph')lab.functionAnalysisToken=null;
  lab.drag=null;
 },
 disposeTransformLiveAnalysis(){
  const lab=this.transformLab;if(!lab)return;
  if(lab.liveTimer){clearTimeout(lab.liveTimer);lab.liveTimer=null}
  if(lab.liveBusy){lab.liveToken=null;lab.liveBusy=false;try{this.engine.stop?.()}catch{/* Motor ya detenido. */}}
 },
 scheduleTransformGraphDraw(){const lab=this.ensureTransformLab();if(lab.drawFrame)return;const raf=globalThis.requestAnimationFrame||((callback)=>setTimeout(callback,16));lab.drawFrame=raf(()=>{lab.drawFrame=null;if(this.screen==='stockfishGraph')this.drawTransformGraph()})},
 activeTransformSheet(){const lab=this.ensureTransformLab();return lab.sheets.find(sheet=>sheet.id===lab.selectedId)||lab.sheets[0]},
 activeTransformPosition(){const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet();lab.ply=clamp(lab.ply,0,Math.max(0,sheet.positions.length-1));return sheet.positions[lab.ply]},
 transformPositionData(position=this.activeTransformPosition()){
  if(!position.algebra){const built=buildPositionMatrix(position.fen),properties=algebraicProperties(built.matrix);position.algebra={...built,properties}}
  return position.algebra;
 },
 transformExpressionInfo(expression,index=0){
  const match=String(expression||'').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*=\s*(.*)$/);
  const name=match?.[1]||`f${index+1}`,params=(match?.[2]||'').split(',').map(value=>value.trim()).filter(Boolean),body=match?.[3]||'';
  const hasScalar=params.some(param=>param&&param[0]===param[0].toLowerCase()),hasMatrix=params.some(param=>param&&param[0]===param[0].toUpperCase());
  const target=hasScalar&&hasMatrix?'a+A':hasMatrix?'A':'a';
  return {index,name,params,body,target,label:`${name}(${params.join(',')||target})`};
 },
 transformFunctionTabsHtml(){
  const lab=this.ensureTransformLab();
  return lab.expressions.map((expression,index)=>{const info=this.transformExpressionInfo(expression,index);return `<button type="button" data-transform-function-tab="${index}" class="${index===lab.activeGraphFunction?'active':''}" title="${esc(expression)}"><b>${esc(info.label)}</b><span>${info.target==='a'?'valores':info.target==='A'?'matriz':'mixta'}</span></button>`}).join('');
 },
 setTransformApplicationTarget(target,{insert=false}={}){
  const lab=this.ensureTransformLab();lab.applicationTarget=target==='A'?'A':'a';this.persistTransformConfig();
  if(insert)this.insertTransformKey(lab.applicationTarget);
 },
 transformFunctionCache(position,signature){
  if(position.transformFunctionCache?.signature!==signature)position.transformFunctionCache={signature,byIndex:{}};
  return position.transformFunctionCache;
 },
 transformSheetGroupsHtml(){
  const lab=this.ensureTransformLab(),sheets=lab.sheets;
  if(!sheets.length)return '<p class="transform-empty">No hay hojas.</p>';
  const tenGroups=[];
  for(let start=0;start<sheets.length;start+=10)tenGroups.push({start,items:sheets.slice(start,start+10)});
  const hundredGroups=[];
  for(let start=0;start<tenGroups.length;start+=10)hundredGroups.push({start:start*10,tens:tenGroups.slice(start,start+10)});
  const thousandGroups=[];
  for(let start=0;start<hundredGroups.length;start+=10)thousandGroups.push({start:start*100,hundreds:hundredGroups.slice(start,start+10)});
  let html='';
  thousandGroups.forEach((thousand,ti)=>{
   const thousandCount=thousand.hundreds.reduce((sum,hundred)=>sum+hundred.tens.reduce((sub,ten)=>sub+ten.items.length,0),0);
   html+=`<details class="transform-tree-level" ${ti===0?'open':''}><summary><span>▣ ${thousand.start+1}-${thousand.start+1000}</span><b>${thousandCount}</b></summary>`;
   thousand.hundreds.forEach((hundred,hi)=>{
    const hundredCount=hundred.tens.reduce((sum,ten)=>sum+ten.items.length,0);
    html+=`<details ${ti===0&&hi===0?'open':''}><summary><span>▤ ${hundred.start+1}-${hundred.start+100}</span><b>${hundredCount}</b></summary>`;
    hundred.tens.forEach((ten,di)=>{
     html+=`<details ${ti===0&&hi===0&&di===0?'open':''}><summary><span>📁 ${ten.start+1}-${ten.start+10}</span><b>${ten.items.length}</b></summary><div class="transform-sheet-list">`;
     ten.items.forEach((sheet,offset)=>{const index=ten.start+offset,displayName=sheet.name||('Hoja '+String(index+1).padStart(3,'0'));html+=`<button data-transform-sheet="${sheet.id}" class="${sheet.id===lab.selectedId?'active':''}"><span>${sheet.source==='png'?'🖼':'♟'} ${esc(displayName)}</span><small>${sheet.positions.length-1} semijugadas</small></button>`});
     html+='</div></details>';
    });
    html+='</details>';
   });
   html+='</details>';
  });
  return html;
 },
 transformMatrixHtml(matrix){return `<div class="transform-matrix" aria-label="Matriz A de 8 por 8">${matrix.map(row=>`<div>${row.map(value=>`<span>${formatNumber(value,2)}</span>`).join('')}</div>`).join('')}</div>`},
 transformMoveStripHtml(sheet,ply){
  const start=Math.max(0,ply-5),end=Math.min(sheet.positions.length,ply+6);
  return sheet.positions.slice(start,end).map((position,index)=>{const absolute=start+index;return `<button data-transform-ply="${absolute}" class="${absolute===ply?'active':''}" title="${esc(position.san||position.label)}"><b>${position.label}</b><span>${esc(position.san||'')}</span></button>`}).join('');
 },
 transformLiveCandidatesHtml(position){
  const lab=this.ensureTransformLab(),ready=lab.liveAnalysisFen===position.fen,candidates=ready?lab.liveCandidates:[];
  if(lab.liveBusy&&!candidates.length)return '<div class="transform-live-loading"><i></i><span>Stockfish está analizando la posición…</span></div>';
  if(lab.liveError&&!candidates.length)return `<p class="transform-live-error">${esc(lab.liveError)}</p>`;
  if(!candidates.length)return '<p class="transform-live-empty">Las mejores jugadas aparecerán automáticamente.</p>';
  return candidates.map((candidate,index)=>`<article><span>${index+1}</span><div><b>${esc(candidate.san||candidate.uci)}</b><small>${esc((candidate.variation||[]).slice(0,10).join(' '))||'Sin variante'}</small></div><strong>${scoreText(candidate)}</strong></article>`).join('');
 },
 transformLiveScore(position){
  const lab=this.ensureTransformLab(),candidate=lab.liveAnalysisFen===position.fen?lab.liveCandidates[0]:null;
  if(candidate)return scoreText(candidate);
  if(Number.isFinite(position.stockfish))return `${position.stockfish>=0?'+':''}${(position.stockfish/100).toFixed(2)}`;
  return lab.liveBusy?'…':'Sin analizar';
 },
 resetTransformLiveState(keepLastMove=false){
  const lab=this.ensureTransformLab();if(lab.liveTimer){clearTimeout(lab.liveTimer);lab.liveTimer=null}lab.liveToken=null;lab.liveBusy=false;lab.liveCandidates=[];lab.liveAnalysisFen='';lab.liveError='';lab.boardSelected=null;lab.boardLegal=[];if(!keepLastMove)lab.boardLastMove=null;
 },
 scheduleTransformLiveAnalysis(delay=90){
  const lab=this.ensureTransformLab();if(!lab.liveAuto||this.screen!=='stockfishTransform'||lab.busy)return;
  const position=this.activeTransformPosition();if(!position||lab.liveBusy||lab.liveAnalysisFen===position.fen)return;
  if(lab.liveTimer)clearTimeout(lab.liveTimer);lab.liveTimer=setTimeout(()=>{lab.liveTimer=null;this.runTransformLiveAnalysis()},delay);
 },
 async runTransformLiveAnalysis(){
  const lab=this.ensureTransformLab(),position=this.activeTransformPosition();if(!position||lab.liveBusy||lab.busy)return;
  const fen=position.fen,token=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;lab.liveToken=token;lab.liveBusy=true;lab.liveError='';
  if(this.screen==='stockfishTransform')this.renderStockfishTransform();
  try{
   await this.engine.init();
   const raw=await this.engine.analyse(fen,{depth:lab.depth,multiPv:lab.liveMultiPv,skill:20,timeoutMs:90000});
   if(lab.liveToken!==token||this.screen!=='stockfishTransform'||this.activeTransformPosition()?.fen!==fen)return;
   lab.liveCandidates=(raw||[]).map((candidate,index)=>{const test=new Chess(fen),move=test.move(uciToMove(candidate.uci));return {...candidate,rank:index+1,san:move?.san||candidate.uci}});
   const score=lab.liveCandidates[0]?.score;position.stockfish=Number.isFinite(score)?score:position.stockfish;lab.liveAnalysisFen=fen;this.invalidateTransformStockfishSeries();
  }catch(error){if(lab.liveToken===token)lab.liveError=error.message||'No se pudo analizar la posición.'}
  finally{if(lab.liveToken===token){lab.liveToken=null;lab.liveBusy=false;if(this.screen==='stockfishTransform')this.renderStockfishTransform()}}
 },
 async playTransformManualMove(from,to){
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet(),position=this.activeTransformPosition(),chess=new Chess(position.fen);
  const legal=chess.moves({square:from,verbose:true}).find(move=>move.to===to);if(!legal)return;let promotion='q';if(legal.promotion)promotion=await this.choosePromotion();const played=chess.move({from,to,promotion});if(!played)return;
  sheet.positions=sheet.positions.slice(0,lab.ply+1);const parts=position.fen.split(' '),fullMove=Math.max(1,Number(parts[5]||1)),label=parts[1]==='b'?`${fullMove}n`:`${fullMove}b`;
  sheet.positions.push({fen:chess.fen(),san:played.san,ply:sheet.positions.length,label,stockfish:null});sheet.pgn='';sheet.source=sheet.source==='nuevo'?'manual':sheet.source;lab.ply=sheet.positions.length-1;
  lab.boardSelected=null;lab.boardLegal=[];lab.boardLastMove=[played.from,played.to];lab.liveCandidates=[];lab.liveAnalysisFen='';lab.liveError='';this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform();this.scheduleTransformLiveAnalysis(30);
 },
 undoTransformManualMove(){
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet();if(lab.ply<=0)return;
  if(lab.ply===sheet.positions.length-1)sheet.positions=sheet.positions.slice(0,-1);lab.ply=Math.max(0,lab.ply-1);lab.boardSelected=null;lab.boardLegal=[];lab.boardLastMove=null;lab.liveCandidates=[];lab.liveAnalysisFen='';lab.liveError='';this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform();this.scheduleTransformLiveAnalysis(30);
 },
 bindTransformLiveBoard(){
  const board=$('#transformLiveBoard'),lab=this.ensureTransformLab(),position=this.activeTransformPosition();if(!board||!position)return;const chess=new Chess(position.fen);this.bindKeyboardBoard(board);board.oncontextmenu=event=>event.preventDefault();
  const play=(from,to)=>this.playTransformManualMove(from,to);
  $$('[data-square]',board).forEach(square=>{
   square.onclick=()=>{if(Date.now()<(this.suppress||0))return;const sq=square.dataset.square;if(lab.boardSelected&&lab.boardLegal.includes(sq)){play(lab.boardSelected,sq);return}const piece=chess.get(sq);if(piece?.color===chess.turn()){lab.boardSelected=sq;lab.boardLegal=chess.moves({square:sq,verbose:true}).map(move=>move.to)}else{lab.boardSelected=null;lab.boardLegal=[]}this.renderStockfishTransform()};
   square.onpointerdown=event=>this.startVisualDrag(event,square.dataset.square,'transform',chess);square.onpointermove=event=>this.dragMove(event);square.onpointerup=event=>this.endVisualDrag(event,play);square.onpointercancel=event=>this.endVisualDrag(event,play);
  });
 },
 renderStockfishTransform(){
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet(),position=this.activeTransformPosition(),data=this.transformPositionData(position),p=data.properties,v=$('#view');
  const preview=sheet.imageUrl?`<details class="transform-reference"><summary>Imagen PNG de referencia</summary><img src="${sheet.imageUrl}" alt="Posición importada como PNG"><p>La imagen queda adjunta como referencia. La matriz usa el FEN indicado debajo del tablero.</p></details>`:'';
  const sf=position.stockfish==null?'Sin analizar':`${position.stockfish>=0?'+':''}${(position.stockfish/100).toFixed(2)}`,liveScore=this.transformLiveScore(position),liveCandidates=this.transformLiveCandidatesHtml(position);
  const previousFlip=this.boardFlipped,previousSelected=this.selected,previousLegal=this.legal,previousLast=this.lastMove;this.boardFlipped=false;this.selected=lab.boardSelected;this.legal=lab.boardLegal;this.lastMove=lab.boardLastMove;const board=this.boardHtml(new Chess(position.fen),false);this.boardFlipped=previousFlip;this.selected=previousSelected;this.legal=previousLegal;this.lastMove=previousLast;
  v.innerHTML=`<section class="transform-page-head"><button data-back>← Inicio</button><div><small>LABORATORIO ALGEBRAICO</small><h1>Transformada de Stockfish</h1></div><div class="transform-head-actions"><button data-transform-new>＋ Nueva hoja</button><button data-transform-current-analysis ${lab.busy?'disabled':''}>${lab.busy?'Calculando…':'Analizar posición'}</button><label>Profundidad<input data-transform-depth type="number" min="4" max="32" value="${lab.depth}"></label></div></section>
  <section class="transform-summary-layout">
   <aside class="transform-left-column">
    <details class="transform-card" open><summary>Hojas e importaciones <span>${lab.sheets.length}</span></summary><div class="transform-card-body"><div class="transform-tree">${this.transformSheetGroupsHtml()}</div></div></details>
    <details class="transform-card" open><summary>Importar <span>＋</span></summary><div class="transform-card-body transform-imports"><label class="file-button">Importar PNG<input data-transform-png type="file" accept="image/png,image/jpeg"></label><label class="file-button">Importar PGN / base<input data-transform-pgn type="file" multiple accept=".pgn,.txt,application/x-chess-pgn,text/plain"></label><label>Crear hoja desde FEN<input data-transform-fen placeholder="Pega un FEN válido"><button data-transform-add-fen>Crear hoja</button></label><small>Cada partida de una base PGN crea una hoja independiente. Los PNG se adjuntan como referencia y pueden asociarse a un FEN.</small></div></details>
   </aside>
   <main class="transform-board-card transform-card-static"><header><div><small>${esc(sheet.name)}</small><h2>Tablero jugable · ${position.label} ${esc(position.san||'')}</h2></div><div class="transform-board-header-actions"><span class="transform-live-badge">● Stockfish en vivo</span><button data-transform-delete-sheet title="Eliminar hoja">🗑</button></div></header><div class="transform-board-shell"><div class="board-wrap" style="${this.customBoardStyle()}"><div class="board" id="transformLiveBoard">${board}</div></div></div>${preview}<div class="transform-board-playbar"><button data-transform-undo ${lab.ply<=0?'disabled':''}>↶ Deshacer</button><button data-transform-live-analyse ${lab.liveBusy?'disabled':''}>${lab.liveBusy?'Analizando…':'Analizar ahora'}</button><span>Mueve por clic o arrastre. Si juegas desde una semijugada anterior, se crea una nueva rama desde ese punto.</span></div><div class="transform-fen-row"><input data-transform-current-fen value="${esc(position.fen)}" aria-label="FEN de la posición"><button data-transform-apply-fen>Aplicar FEN</button></div><div class="transform-ply-nav"><button data-transform-prev ${lab.ply<=0?'disabled':''}>|‹</button><button data-transform-prev-one ${lab.ply<=0?'disabled':''}>‹</button><div class="transform-move-strip">${this.transformMoveStripHtml(sheet,lab.ply)}</div><button data-transform-next-one ${lab.ply>=sheet.positions.length-1?'disabled':''}>›</button><button data-transform-next ${lab.ply>=sheet.positions.length-1?'disabled':''}>›|</button></div></main>
   <aside class="transform-right-column"><details class="transform-card" open><summary>Stockfish en tiempo real <span>${esc(liveScore)}</span></summary><div class="transform-card-body"><div class="transform-live-score"><small>VALORACIÓN ACTUAL</small><strong>${esc(liveScore)}</strong><span>${position.fen.split(' ')[1]==='w'?'Juegan blancas':'Juegan negras'}</span></div><div class="transform-live-settings"><label class="toggle"><input data-transform-live-auto type="checkbox" ${lab.liveAuto?'checked':''}><span>Análisis automático</span></label><label>Jugadas recomendadas<select data-transform-live-pv><option value="1" ${lab.liveMultiPv===1?'selected':''}>1</option><option value="2" ${lab.liveMultiPv===2?'selected':''}>2</option><option value="3" ${lab.liveMultiPv===3?'selected':''}>3</option><option value="4" ${lab.liveMultiPv===4?'selected':''}>4</option><option value="5" ${lab.liveMultiPv===5?'selected':''}>5</option></select></label></div><div class="transform-live-candidates">${liveCandidates}</div></div></details><details class="transform-card" open><summary>Cuadro resumen <span>⌃</span></summary><div class="transform-card-body"><div class="transform-property-grid"><span>det(A)<b>${formatNumber(p.determinant)}</b></span><span>rank(A)<b>${p.rank}</b></span><span>tr(A)<b>${formatNumber(p.trace)}</b></span><span>‖A‖<sub>F</sub><b>${formatNumber(p.frobenius)}</b></span><span>cond⁺(A)<b>${formatNumber(p.condition)}</b></span><span>pdet<sub>σ</sub>(A)<b>${formatNumber(p.pseudoDeterminant)}</b></span><span>λ<sub>max</sub> aprox.<b>${formatNumber(p.lambdaMax)}</b></span><span>σ<sub>min+</sub><b>${formatNumber(p.sigmaMinPositive)}</b></span><span>Stockfish guardado<b>${sf}</b></span></div><details class="transform-matrix-preview"><summary>Vista previa de A</summary>${this.transformMatrixHtml(data.matrix)}</details><button class="primary transform-graph-button" data-transform-graph>Ver gráfica</button></div></details><details class="transform-card"><summary>Parámetros de la matriz <span>＋</span></summary><div class="transform-card-body"><label>Peso material<input data-transform-material-weight type="number" step="0.1" value="1" disabled></label><label>Peso control<input data-transform-control-weight type="number" step="0.1" value="1" disabled></label><p>Versión actual: material firmado + control acumulado. Rey = 4.</p></div></details><div class="transform-status ${lab.busy||lab.liveBusy?'busy':''}">${lab.progress||lab.liveError||'Listo para analizar.'}</div></aside>
  </section>`;
  $('[data-back]').onclick=()=>{this.screen='home';this.render()};
  $('[data-transform-graph]').onclick=()=>{this.screen='stockfishGraph';this.render()};
  $('[data-transform-depth]').onchange=event=>{lab.depth=clamp(Number(event.target.value),4,32);this.persistTransformConfig()};
  $('[data-transform-new]').onclick=()=>{const number=lab.sheets.length+1,sheetNew=buildTimelineFromPgn('',`Hoja ${String(number).padStart(3,'0')} · Posición inicial`);sheetNew.source='nuevo';lab.sheets.push(sheetNew);lab.selectedId=sheetNew.id;lab.ply=0;this.resetTransformLiveState();this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform()};
  $('[data-transform-delete-sheet]').onclick=()=>{if(lab.sheets.length===1)return alert('Debe conservarse al menos una hoja.');if(!confirm('¿Eliminar esta hoja del laboratorio?'))return;lab.sheets=lab.sheets.filter(item=>item.id!==sheet.id);lab.selectedId=lab.sheets[0].id;lab.ply=0;this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform()};
  $$('[data-transform-sheet]').forEach(button=>button.onclick=()=>{lab.selectedId=button.dataset.transformSheet;lab.ply=0;this.resetTransformLiveState();this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform()});
  $$('[data-transform-ply]').forEach(button=>button.onclick=()=>{lab.ply=Number(button.dataset.transformPly);this.resetTransformLiveState();this.renderStockfishTransform()});
  $('[data-transform-prev]').onclick=()=>{lab.ply=0;this.resetTransformLiveState();this.renderStockfishTransform()};$('[data-transform-prev-one]').onclick=()=>{lab.ply=Math.max(0,lab.ply-1);this.resetTransformLiveState();this.renderStockfishTransform()};$('[data-transform-next-one]').onclick=()=>{lab.ply=Math.min(sheet.positions.length-1,lab.ply+1);this.resetTransformLiveState();this.renderStockfishTransform()};$('[data-transform-next]').onclick=()=>{lab.ply=sheet.positions.length-1;this.resetTransformLiveState();this.renderStockfishTransform()};
  $('[data-transform-current-analysis]').onclick=()=>this.analyseTransformPosition();
  $('[data-transform-pgn]').onchange=event=>this.importTransformPgnFiles([...event.target.files]);
  $('[data-transform-png]').onchange=event=>this.importTransformPng(event.target.files?.[0]);
  $('[data-transform-add-fen]').onclick=()=>this.addTransformFenSheet($('[data-transform-fen]').value);
  $('[data-transform-apply-fen]').onclick=()=>this.applyTransformFen($('[data-transform-current-fen]').value);
  $('[data-transform-undo]')?.addEventListener('click',()=>this.undoTransformManualMove());
  $('[data-transform-live-analyse]')?.addEventListener('click',()=>{lab.liveAnalysisFen='';lab.liveCandidates=[];this.runTransformLiveAnalysis()});
  $('[data-transform-live-auto]')?.addEventListener('change',event=>{lab.liveAuto=event.target.checked;this.persistTransformConfig();if(lab.liveAuto)this.scheduleTransformLiveAnalysis(20)});
  $('[data-transform-live-pv]')?.addEventListener('change',event=>{lab.liveMultiPv=clamp(Number(event.target.value),1,5);lab.liveAnalysisFen='';lab.liveCandidates=[];this.persistTransformConfig();this.scheduleTransformLiveAnalysis(20)});
  this.bindTransformLiveBoard();this.scheduleTransformLiveAnalysis();
 },
 addTransformFenSheet(fen){const lab=this.ensureTransformLab();try{const chess=new Chess(String(fen).trim()),sheet={id:crypto.randomUUID?.()||String(Date.now()),name:`Hoja ${String(lab.sheets.length+1).padStart(3,'0')} · FEN`,pgn:'',source:'fen',positions:[{fen:chess.fen(),san:'FEN',ply:0,label:'FEN',stockfish:null}],createdAt:Date.now()};lab.sheets.push(sheet);lab.selectedId=sheet.id;lab.ply=0;this.resetTransformLiveState();this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform()}catch{alert('El FEN no es válido.')}},
 applyTransformFen(fen){const sheet=this.activeTransformSheet(),lab=this.ensureTransformLab();try{const chess=new Chess(String(fen).trim());sheet.positions=[{fen:chess.fen(),san:'FEN',ply:0,label:'FEN',stockfish:null}];sheet.pgn='';sheet.name=`${sheet.name.split(' · ')[0]} · FEN`;lab.ply=0;this.resetTransformLiveState();this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform()}catch{alert('El FEN no es válido.')}},
 async importTransformPgnFiles(files){const lab=this.ensureTransformLab();let imported=0,failed=0;for(const file of files){try{const text=await file.text(),games=splitPgnDatabase(text);for(const [index,pgn] of games.entries()){try{const fallback=`${file.name.replace(/\.[^.]+$/,'')} ${games.length>1?index+1:''}`.trim(),sheet=buildTimelineFromPgn(pgn,pgnDisplayName(pgn,fallback));sheet.source='pgn';lab.sheets.push(sheet);imported++}catch{failed++}}}catch{failed++}}if(imported){lab.selectedId=lab.sheets[lab.sheets.length-imported].id;lab.ply=0;this.resetTransformLiveState();this.invalidateTransformGraphCache();this.resetTransformGraphView()}this.renderStockfishTransform();if(failed)alert(`${imported} partidas importadas; ${failed} no pudieron leerse.`)},
 async importTransformPng(file){if(!file)return;if(file.size>5_000_000)return alert('La imagen no puede superar 5 MB.');const lab=this.ensureTransformLab(),data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});const currentFen=this.activeTransformPosition()?.fen||new Chess().fen(),sheet={id:crypto.randomUUID?.()||String(Date.now()),name:`${file.name} · PNG`,source:'png',imageUrl:data,pgn:'',positions:[{fen:currentFen,san:'PNG',ply:0,label:'PNG',stockfish:null}],createdAt:Date.now()};lab.sheets.push(sheet);lab.selectedId=sheet.id;lab.ply=0;this.resetTransformLiveState();this.invalidateTransformGraphCache();this.resetTransformGraphView();this.renderStockfishTransform();alert('PNG adjuntado como referencia. Pega o aplica el FEN correspondiente para calcular la matriz exacta.')},
 async analyseTransformPosition(){
  const lab=this.ensureTransformLab(),position=this.activeTransformPosition();if(lab.busy)return;
  lab.busy=true;lab.progress=`Analizando ${position.label} a profundidad ${lab.depth}…`;this.renderStockfishTransform();
  try{
   await this.engine.init();
   const result=await this.engine.analyse(position.fen,{depth:lab.depth,multiPv:1,skill:20,timeoutMs:90000}),score=result?.[0]?.score;
   position.stockfish=Number.isFinite(score)?score:null;this.invalidateTransformStockfishSeries();
   lab.progress=position.stockfish==null?'Stockfish no devolvió valoración.':`Valoración guardada: ${(position.stockfish/100).toFixed(2)} peones.`
  }catch(error){lab.progress=`No se pudo analizar: ${error.message}`}
  finally{
   lab.busy=false;
   if(this.screen==='stockfishTransform')this.renderStockfishTransform();
   else if(this.screen==='stockfishGraph')this.renderStockfishGraph();
  }
 },
 async analyseTransformSheet(){
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet();if(lab.busy)return;
  const pending=sheet.positions.filter(position=>!Number.isFinite(position.stockfish));
  if(!pending.length){lab.progress='La hoja ya tiene una valoración de Stockfish en cada semijugada.';this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();return}
  if(lab.liveTimer){clearTimeout(lab.liveTimer);lab.liveTimer=null}lab.liveToken=null;lab.liveBusy=false;
  const token=crypto.randomUUID?.()||String(Date.now());lab.analysisToken=token;lab.busy=true;
  let completed=0,failed=0,processed=0;
  try{
   await this.engine.init();
   for(const position of pending){
    if(lab.analysisToken!==token)break;
    lab.progress=`Stockfish: ${processed+1}/${pending.length} · ${position.label}`;this.updateTransformGraphStatus();
    let score=null,lastError=null;
    for(let attempt=0;attempt<2&&!Number.isFinite(score);attempt++){
     try{
      const result=await this.engine.analyse(position.fen,{nodes:lab.batchNodes,multiPv:1,skill:20,timeoutMs:90000});
      const candidate=result?.[0]?.score;if(Number.isFinite(candidate))score=candidate;else lastError=new Error('Stockfish no devolvió puntuación.');
     }catch(error){lastError=error;if(lab.analysisToken!==token)break;if(attempt===0){this.engine.clearHash?.();await new Promise(resolve=>setTimeout(resolve,20))}}
    }
    if(lab.analysisToken!==token)break;
    if(Number.isFinite(score)){position.stockfish=score;completed++}else{failed++;position.stockfish=null;lab.progress=`Sin valoración en ${position.label}: ${lastError?.message||'error desconocido'}`}
    processed++;this.invalidateTransformStockfishSeries();this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();
    await new Promise(resolve=>globalThis.requestAnimationFrame?requestAnimationFrame(()=>resolve()):setTimeout(resolve,0));
    if(processed%16===0)this.engine.clearHash?.();
   }
  }catch(error){if(lab.analysisToken===token)lab.progress=`Stockfish no pudo iniciar: ${error.message}`}
  finally{
   this.invalidateTransformStockfishSeries();
   if(lab.analysisToken===token){
    lab.busy=false;lab.analysisToken=null;
    if(!lab.progress.startsWith('Stockfish no pudo'))lab.progress=`Serie Stockfish: ${completed}/${pending.length} semijugadas nuevas${failed?` · ${failed} sin resultado tras reintento`:''}.`;
    if(this.screen==='stockfishGraph'){this.updateTransformGraphStatus();this.updateTransformLegend();this.scheduleTransformGraphDraw()}
    else if(this.screen==='stockfishTransform')this.renderStockfishTransform();
   }else if(this.screen==='stockfishGraph')this.scheduleTransformGraphDraw();
  }
 },
 stopTransformAnalysis(){
  const lab=this.ensureTransformLab();lab.analysisToken=null;lab.busy=false;this.engine.stop?.();lab.progress='Análisis detenido por el usuario.';
  if(this.screen==='stockfishGraph')this.renderStockfishGraph();
  else if(this.screen==='stockfishTransform')this.renderStockfishTransform();
 },
 transformFunctionSeriesData(functionIndex=this.ensureTransformLab().activeGraphFunction){
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet(),index=clamp(Number(functionIndex),0,Math.max(0,lab.expressions.length-1)),signature=lab.expressions.join('\n'),cacheKey=`${sheet.id}|${sheet.positions.length}|${signature}|${index}|${lab.cacheRevision}|sf:${lab.stockfishRevision}`;
  if(lab.rawSeriesCache?.key===cacheKey)return lab.rawSeriesCache.value;
  const functionInfo=this.transformExpressionInfo(lab.expressions[index],index),points=[];let completed=0,kind='unknown',firstError='';
  for(let positionIndex=0;positionIndex<sheet.positions.length;positionIndex++){
   const position=sheet.positions[positionIndex],cache=this.transformFunctionCache(position,signature),analysis=cache.byIndex[index],properties=analysis?.properties||null;
   if(analysis){completed+=1;if(kind==='unknown'&&analysis.kind)kind=analysis.kind;if(!firstError&&analysis.error)firstError=analysis.error}
   points.push({
    index:positionIndex,label:position.label,stockfish:Number.isFinite(position.stockfish)?position.stockfish/100:null,
    output:analysis?.scalar??null,
    determinant:properties?.determinant??null,rank:properties?.rank??null,trace:properties?.trace??null,
    frobenius:properties?.frobenius??null,condition:properties?.condition??null,
    pseudoDeterminant:properties?.pseudoDeterminant??null,lambdaMax:properties?.lambdaMax??null,
    sigmaMinPositive:properties?.sigmaMinPositive??null,error:analysis?.error||'',
   });
  }
  const value={points,functionInfo,kind,completed,total:sheet.positions.length,error:firstError};lab.rawSeriesCache={key:cacheKey,value};return value;
 },
 async analyseTransformFunctionTab(functionIndex=this.ensureTransformLab().activeGraphFunction){
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet(),index=clamp(Number(functionIndex),0,Math.max(0,lab.expressions.length-1)),signature=lab.expressions.join('\n');
  const token=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;lab.functionAnalysisToken=token;lab.functionAnalysisProgress=`Preparando ${this.transformExpressionInfo(lab.expressions[index],index).label}…`;this.updateTransformGraphStatus();
  let definitions;
  try{
   if(lab.compiledDefinitionsCache?.signature===signature)definitions=lab.compiledDefinitionsCache.value;
   else{definitions=compileFunctionDefinitions(lab.expressions);lab.compiledDefinitionsCache={signature,value:definitions}}
  }catch(error){
   lab.functionAnalysisProgress=`Error de fórmula: ${error.message}`;lab.functionAnalysisToken=null;this.updateTransformGraphStatus();return;
  }
  let completed=0,computed=0,errors=0;
  for(let positionIndex=0;positionIndex<sheet.positions.length;positionIndex++){
   if(lab.functionAnalysisToken!==token||this.screen!=='stockfishGraph'||lab.activeGraphFunction!==index)return;
   const position=sheet.positions[positionIndex],cache=this.transformFunctionCache(position,signature);
   if(!cache.byIndex[index]){
    try{
     const data=this.transformPositionData(position),outputs=evaluateCompiledFunctionDefinitions(definitions,data.matrix),output=outputs[index];
     if(!output)throw new Error('La función seleccionada no produjo salida.');
     const properties=output.kind==='matrix'?algebraicProperties(output.value):null;
     cache.byIndex[index]={name:output.name,kind:output.kind,scalar:output.scalar,properties,error:''};
    }catch(error){cache.byIndex[index]={name:this.transformExpressionInfo(lab.expressions[index],index).name,kind:'error',scalar:null,properties:null,error:error.message};errors+=1}
    computed+=1;
   }
   completed+=1;
   if(completed%3===0||completed===sheet.positions.length){
    lab.rawSeriesCache=null;lab.graphSeriesCache=null;
    lab.functionAnalysisProgress=`${this.transformExpressionInfo(lab.expressions[index],index).label}: ${completed}/${sheet.positions.length}${errors?` · ${errors} errores`:''}`;
    this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();
    await new Promise(resolve=>globalThis.requestAnimationFrame?requestAnimationFrame(()=>resolve()):setTimeout(resolve,0));
   }
  }
  if(lab.functionAnalysisToken===token){
   lab.functionAnalysisToken=null;lab.functionAnalysisProgress=`${this.transformExpressionInfo(lab.expressions[index],index).label}: ${sheet.positions.length} semijugadas listas${computed?` · ${computed} calculadas`:''}${errors?` · ${errors} errores`:''}.`;
   lab.rawSeriesCache=null;lab.graphSeriesCache=null;this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();
  }
 },
 normalizedTransformSeries(values){return normalizeFiniteSeries(values,-20,20)},
 transformGraphSeries(){
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet(),index=clamp(lab.activeGraphFunction,0,Math.max(0,lab.expressions.length-1)),visibilityKey=Object.entries(lab.visibility).filter(([,value])=>value).map(([key])=>key).join(','),cacheKey=`${lab.cacheRevision}|sf:${lab.stockfishRevision}|${lab.normalized}|${visibilityKey}|${lab.expressions.join('\n')}|${index}|${sheet.id}|${sheet.positions.length}`;
  if(lab.graphSeriesCache?.key===cacheKey)return lab.graphSeriesCache.value;
  const data=this.transformFunctionSeriesData(index),points=data.points;
  const definitions=[
   ['stockfish','Stockfish',points.map(point=>point.stockfish),'#4ea9e8'],
   ['output',`Salida ${data.functionInfo.label}`,points.map(point=>point.output),'#55c2ff'],
   ['determinant','det(B)',points.map(point=>point.determinant),'#55c991'],
   ['rank','rank(B)',points.map(point=>point.rank),'#f2b84b'],
   ['trace','tr(B)',points.map(point=>point.trace),'#ff9f55'],
   ['frobenius','‖B‖F',points.map(point=>point.frobenius),'#57c7cf'],
   ['condition','cond⁺(B)',points.map(point=>point.condition),'#a879e8'],
   ['pseudoDeterminant','pdetσ(B)',points.map(point=>point.pseudoDeterminant),'#ef6868'],
   ['lambdaMax','λmax(B)',points.map(point=>point.lambdaMax),'#d8d05b'],
   ['sigmaMinPositive','σmin+(B)',points.map(point=>point.sigmaMinPositive),'#d18fff'],
  ];
  const series=definitions.filter(([id])=>lab.visibility[id]).map(([id,label,values,color])=>({id,label,color,values:lab.normalized?this.normalizedTransformSeries(values):values}));
  const value={...data,series};lab.graphSeriesCache={key:cacheKey,value};return value;
 },
 transformLegendHtml(){return this.transformGraphSeries().series.map(series=>`<span><i style="--legend-color:${series.color}"></i>${esc(series.label)}</span>`).join('')||'<span class="transform-empty-legend">No hay series visibles.</span>'},
 updateTransformLegend(){const legend=$('.transform-legend');if(legend)legend.innerHTML=this.transformLegendHtml()},
 renderStockfishGraph(){
  this.disposeTransformGraphBinding();
  const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet();lab.activeExpression=clamp(lab.activeExpression,0,Math.max(0,lab.expressions.length-1));lab.activeGraphFunction=clamp(lab.activeGraphFunction,0,Math.max(0,lab.expressions.length-1));
  const data=this.transformGraphSeries(),activeInfo=this.transformExpressionInfo(lab.expressions[lab.activeGraphFunction],lab.activeGraphFunction),v=$('#view');
  const expressionRows=lab.expressions.map((expression,index)=>{const info=this.transformExpressionInfo(expression,index);return `<div class="transform-expression-row ${index===lab.activeExpression?'active':''}" data-expression-row="${index}"><i style="--series-color:${['#55c2ff','#55c991','#f2b84b','#a879e8'][index%4]}"></i><input data-transform-expression="${index}" value="${esc(expression)}" spellcheck="false" aria-label="Definición de ${esc(info.label)}"><span class="transform-expression-scope ${info.target==='a+A'?'mixed':''}">${info.target}</span><button data-transform-expression-delete="${index}" title="Eliminar">×</button></div>`}).join('');
  const metricControls=[
   ['stockfish','Stockfish'],['output','Salida de la función'],['determinant','det(B)'],['rank','rank(B)'],['trace','tr(B)'],
   ['frobenius','‖B‖F'],['condition','cond⁺(B)'],['pseudoDeterminant','pdetσ(B)'],['lambdaMax','λmax(B)'],['sigmaMinPositive','σmin+(B)'],
  ].map(([id,label])=>`<label><input data-transform-visibility="${id}" type="checkbox" ${lab.visibility[id]?'checked':''}><span class="transform-control-dot ${id}"></span>${label}<button type="button" title="Mostrar u ocultar">◉</button></label>`).join('');
  const variableButtons=`<div class="transform-target-picker" role="group" aria-label="Objeto al que se aplica la función"><button type="button" data-transform-target="a" class="${lab.applicationTarget==='a'?'active':''}"><b>a</b><span>Aplicar a cada valor</span><small>Entrada por entrada</small></button><button type="button" data-transform-target="A" class="${lab.applicationTarget==='A'?'active':''}"><b>A</b><span>Aplicar a la matriz</span><small>Operación matricial</small></button></div>`;
  v.innerHTML=`<section class="transform-page-head compact"><button data-transform-summary>← Volver al resumen</button><div><small>LABORATORIO ALGEBRAICO</small><h1>Transformada de Stockfish</h1></div><div class="transform-graph-toolbar"><div class="segmented"><button data-transform-mode="semimove" class="${lab.graphMode==='semimove'?'active':''}">Por semijugada</button><button data-transform-mode="continuous" class="${lab.graphMode==='continuous'?'active':''}">Función continua</button></div><label><input data-transform-normalized type="checkbox" ${lab.normalized?'checked':''}> Normalizar</label><label class="transform-node-limit">Nodos/posición<input data-transform-batch-nodes type="number" min="1000" max="100000" step="1000" value="${lab.batchNodes}"></label><button data-transform-analyse-sheet ${lab.busy?'disabled':''}>${lab.busy?'Analizando…':'Analizar hoja con Stockfish'}</button>${lab.busy?'<button data-transform-stop>Detener</button>':''}</div></section>
  <section class="transform-graph-layout"><aside class="transform-calculator-column"><details class="transform-card" open><summary>Calculadora / Expresiones <span>⌃</span></summary><div class="transform-card-body"><p class="transform-apply-title">¿A qué se aplica la próxima operación?</p>${variableButtons}<p class="transform-target-help">Pulsa <b>a</b> o <b>A</b> para insertarlo en la fórmula activa. Ejemplo: <code>exp(a)</code> transforma cada celda; <code>exp(A)</code> calcula la exponencial matricial.</p><div class="transform-expression-list">${expressionRows}<button data-transform-add-expression>＋ Agregar función ${lab.applicationTarget==='A'?'matricial':'sobre valores'}</button></div><div class="transform-keyboard"><div class="transform-keyboard-tabs"><b>123</b><b class="active">f(x)</b><b>ABC</b><b>#&¬</b></div><div class="transform-variable-keys"><button data-transform-key="a"><b>a</b><span>Valores</span></button><button data-transform-key="A"><b>A</b><span>Matriz</span></button></div><div class="transform-key-grid">${['sen','cos','tg','sen⁻¹','cos⁻¹','tg⁻¹','ln','log10','log2','e^x','10^x','sqrt(','abs(','det(','rank(','tr(','norm(','pdet(','cond(','inv(','exp(','(',')','^','+','-','*','/','I','←'].map(key=>`<button data-transform-key="${esc(key)}">${key}</button>`).join('')}</div></div><p class="transform-calc-help"><b>a minúscula</b>: aplica la operación a cada valor de la matriz. <b>A mayúscula</b>: aplica la operación a la matriz completa. Las funciones mixtas pueden usar ambas.</p></div></details><details class="transform-card" open><summary>Control de datos de la pestaña <span>⌃</span></summary><div class="transform-card-body transform-function-controls">${metricControls}<p>Cada pestaña corresponde a una sola función. Dentro de ella se grafican sus propiedades históricas por semijugada.</p></div></details></aside>
   <main class="transform-plot-panel"><nav class="transform-function-tabs" aria-label="Gráficas por función">${this.transformFunctionTabsHtml()}</nav><div class="transform-active-graph"><div><small>FUNCIÓN ACTIVA</small><b>${esc(activeInfo.label)}</b><span>${activeInfo.target==='a'?'aplicada a valores':activeInfo.target==='A'?'aplicada a la matriz completa':'función mixta a + A'}</span></div><em id="transformFunctionCompletion">${data.completed}/${data.total} posiciones calculadas</em></div><div class="transform-plot-hint">ⓘ Esta pestaña contiene Stockfish y todas las propiedades algebraicas de la salida B de ${esc(activeInfo.label)}. Arrastra para mover y usa la rueda para acercar o alejar.</div><div class="transform-canvas-wrap"><canvas id="transformGraph" aria-label="Gráfica de ${esc(activeInfo.label)} por semijugada"></canvas><div class="transform-plot-controls"><button data-transform-pan title="Mover">✥</button><button data-transform-zoom-in>＋</button><button data-transform-zoom-out>−</button><button data-transform-fit>⛶</button><button data-transform-home>⌂</button></div><div class="transform-legend">${data.series.map(series=>`<span><i style="--legend-color:${series.color}"></i>${esc(series.label)}</span>`).join('')}</div></div><footer><span id="transformGraphRange"></span><span>${sheet.positions.length} puntos · ${esc(sheet.name)} · ${esc(activeInfo.label)}</span><span id="transformGraphStatus">${esc(lab.functionAnalysisProgress||lab.progress||'Preparando datos…')}</span></footer></main></section>`;
  $('[data-transform-summary]').onclick=()=>{this.screen='stockfishTransform';this.render()};
  $$('[data-transform-mode]').forEach(button=>button.onclick=()=>{lab.graphMode=button.dataset.transformMode;this.persistTransformConfig();this.resetTransformGraphView();this.renderStockfishGraph()});
  $('[data-transform-normalized]').onchange=event=>{lab.normalized=event.target.checked;this.persistTransformConfig();this.resetTransformGraphView();this.renderStockfishGraph()};
  $('[data-transform-batch-nodes]').onchange=event=>{lab.batchNodes=clamp(Number(event.target.value),1000,100000);this.persistTransformConfig()};
  $('[data-transform-analyse-sheet]').onclick=()=>this.analyseTransformSheet();$('[data-transform-stop]')?.addEventListener('click',()=>this.stopTransformAnalysis());
  $$('[data-transform-function-tab]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.transformFunctionTab);lab.activeGraphFunction=index;lab.activeExpression=index;const info=this.transformExpressionInfo(lab.expressions[index],index);if(info.target!=='a+A')lab.applicationTarget=info.target;lab.rawSeriesCache=null;lab.graphSeriesCache=null;this.persistTransformConfig();this.resetTransformGraphView();this.renderStockfishGraph()});
  $$('[data-transform-target]').forEach(button=>button.onclick=()=>{const target=button.dataset.transformTarget;lab.applicationTarget=target;this.persistTransformConfig();$$('[data-transform-target]').forEach(item=>item.classList.toggle('active',item.dataset.transformTarget===target));this.insertTransformKey(target)});
  $$('[data-transform-expression]').forEach(input=>{
   input.onfocus=()=>{const index=Number(input.dataset.transformExpression);lab.activeExpression=index;lab.activeGraphFunction=index;const info=this.transformExpressionInfo(lab.expressions[index],index);if(info.target!=='a+A')lab.applicationTarget=info.target};
   input.onchange=()=>{const index=Number(input.dataset.transformExpression);lab.expressions[index]=input.value;lab.activeExpression=index;lab.activeGraphFunction=index;lab.rawSeriesCache=null;lab.graphSeriesCache=null;lab.compiledDefinitionsCache=null;lab.functionAnalysisToken=null;this.persistTransformConfig();this.renderStockfishGraph()};
  });
  $$('[data-transform-expression-delete]').forEach(button=>button.onclick=()=>{if(lab.expressions.length===1)return;const index=Number(button.dataset.transformExpressionDelete);lab.expressions.splice(index,1);lab.activeExpression=clamp(lab.activeExpression>index?lab.activeExpression-1:lab.activeExpression,0,lab.expressions.length-1);lab.activeGraphFunction=clamp(lab.activeGraphFunction>index?lab.activeGraphFunction-1:lab.activeGraphFunction,0,lab.expressions.length-1);lab.rawSeriesCache=null;lab.graphSeriesCache=null;lab.compiledDefinitionsCache=null;lab.functionAnalysisToken=null;this.persistTransformConfig();this.renderStockfishGraph()});
  $('[data-transform-add-expression]').onclick=()=>{const number=lab.expressions.length+1,expression=lab.applicationTarget==='A'?`F${number}(A)=A`:`f${number}(a)=a`;lab.expressions.push(expression);lab.activeExpression=lab.expressions.length-1;lab.activeGraphFunction=lab.activeExpression;lab.rawSeriesCache=null;lab.graphSeriesCache=null;lab.compiledDefinitionsCache=null;this.persistTransformConfig();this.renderStockfishGraph()};
  $$('[data-transform-key]').forEach(button=>button.onclick=()=>this.insertTransformKey(button.dataset.transformKey));
  $$('[data-transform-visibility]').forEach(input=>input.onchange=()=>{lab.visibility[input.dataset.transformVisibility]=input.checked;lab.graphSeriesCache=null;this.persistTransformConfig();this.updateTransformLegend();this.scheduleTransformGraphDraw()});
  $('[data-transform-zoom-in]').onclick=()=>this.zoomTransformGraph(.8);$('[data-transform-zoom-out]').onclick=()=>this.zoomTransformGraph(1.25);$('[data-transform-fit]').onclick=()=>{this.fitTransformGraph();this.drawTransformGraph()};$('[data-transform-home]').onclick=()=>{this.resetTransformGraphView();this.drawTransformGraph()};
  this.bindTransformGraph();this.drawTransformGraph();this.analyseTransformFunctionTab(lab.activeGraphFunction);
  if(lab.graphMode==='semimove'&&lab.visibility.stockfish&&sheet.positions.some(item=>!Number.isFinite(item.stockfish))&&!lab.busy)setTimeout(()=>{if(this.screen==='stockfishGraph'&&!this.ensureTransformLab().busy)this.analyseTransformSheet()},40);
 },
 insertTransformKey(key){
  const lab=this.ensureTransformLab(),input=$(`[data-transform-expression="${lab.activeExpression}"]`);if(!input)return;
  if(key==='a'||key==='A')lab.applicationTarget=key;
  const map={'sen':'sin(','sen⁻¹':'asin(','cos⁻¹':'acos(','tg⁻¹':'atan(','e^x':'exp(','10^x':'10^(','←':''},text=map[key]??key;
  if(key==='←'){
   const start=input.selectionStart||0;
   if(start>0){input.value=input.value.slice(0,start-1)+input.value.slice(input.selectionEnd||start);input.setSelectionRange(start-1,start-1)}
  }else{
   const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
   input.value=input.value.slice(0,start)+text+input.value.slice(end);input.setSelectionRange(start+text.length,start+text.length);
  }
  input.focus();lab.expressions[lab.activeExpression]=input.value;lab.activeGraphFunction=lab.activeExpression;
  lab.rawSeriesCache=null;lab.graphSeriesCache=null;lab.compiledDefinitionsCache=null;lab.functionAnalysisToken=null;this.persistTransformConfig();
  clearTimeout(lab.expressionTimer);lab.expressionTimer=setTimeout(()=>{if(this.screen==='stockfishGraph')this.renderStockfishGraph()},350);
 },
 resetTransformGraphView(){const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet();if(lab.graphMode==='continuous')lab.graph={xMin:-20,xMax:20,yMin:-20,yMax:20};else lab.graph={xMin:0,xMax:Math.max(20,sheet.positions.length-1),yMin:lab.normalized?-20:-10,yMax:lab.normalized?20:10}},
 fitTransformGraph(){const lab=this.ensureTransformLab();if(lab.graphMode==='continuous'){lab.graph={xMin:-20,xMax:20,yMin:-20,yMax:20};return}const {series,points}=this.transformGraphSeries(),extent=finiteExtentOfSeries(series),min=extent?.min??-20,max=extent?.max??20,pad=Math.max(1,(max-min)*.12);lab.graph={xMin:0,xMax:Math.max(10,points.length-1),yMin:min-pad,yMax:max+pad}},
 zoomTransformGraph(factor,center=null){const lab=this.ensureTransformLab(),g=lab.graph,cx=center?.x??(g.xMin+g.xMax)/2,cy=center?.y??(g.yMin+g.yMax)/2;g.xMin=cx+(g.xMin-cx)*factor;g.xMax=cx+(g.xMax-cx)*factor;g.yMin=cy+(g.yMin-cy)*factor;g.yMax=cy+(g.yMax-cy)*factor;this.scheduleTransformGraphDraw()},
 bindTransformGraph(){
  const lab=this.ensureTransformLab(),canvas=$('#transformGraph');if(!canvas)return;
  canvas.onpointerdown=event=>{canvas.setPointerCapture?.(event.pointerId);lab.drag={id:event.pointerId,x:event.clientX,y:event.clientY,graph:{...lab.graph}}};
  canvas.onpointermove=event=>{if(!lab.drag||lab.drag.id!==event.pointerId)return;const rect=canvas.getBoundingClientRect(),dx=(event.clientX-lab.drag.x)/Math.max(1,rect.width)*(lab.drag.graph.xMax-lab.drag.graph.xMin),dy=(event.clientY-lab.drag.y)/Math.max(1,rect.height)*(lab.drag.graph.yMax-lab.drag.graph.yMin);lab.graph={xMin:lab.drag.graph.xMin-dx,xMax:lab.drag.graph.xMax-dx,yMin:lab.drag.graph.yMin+dy,yMax:lab.drag.graph.yMax+dy};this.scheduleTransformGraphDraw()};
  canvas.onpointerup=canvas.onpointercancel=event=>{if(lab.drag?.id===event.pointerId)lab.drag=null};
  canvas.onwheel=event=>{event.preventDefault();const rect=canvas.getBoundingClientRect(),g=lab.graph,cx=g.xMin+(event.clientX-rect.left)/Math.max(1,rect.width)*(g.xMax-g.xMin),cy=g.yMax-(event.clientY-rect.top)/Math.max(1,rect.height)*(g.yMax-g.yMin);this.zoomTransformGraph(event.deltaY>0?1.12:.89,{x:cx,y:cy})};
  const onResize=()=>{if(this.screen==='stockfishGraph')this.scheduleTransformGraphDraw()};
  if(typeof ResizeObserver==='function'){lab.graphResizeObserver=new ResizeObserver(onResize);lab.graphResizeObserver.observe(canvas);if(canvas.parentElement)lab.graphResizeObserver.observe(canvas.parentElement)}
  else{lab.graphResizeFallback=onResize;window.addEventListener('resize',onResize)}
  $$('details',canvas.closest('.transform-graph-layout')||document).forEach(details=>details.addEventListener('toggle',()=>{if(details.open)setTimeout(()=>this.scheduleTransformGraphDraw(),0)}));
 },
 drawTransformGraph(){
  const canvas=$('#transformGraph');if(!canvas)return;const lab=this.ensureTransformLab(),rect=canvas.getBoundingClientRect();if(rect.width<10||rect.height<10){if(!lab.drawRetry)lab.drawRetry=setTimeout(()=>{lab.drawRetry=null;if(this.screen==='stockfishGraph')this.scheduleTransformGraphDraw()},120);return}if(lab.drawRetry){clearTimeout(lab.drawRetry);lab.drawRetry=null}const pixels=rect.width*rect.height,dpr=Math.min(pixels>1_400_000?1:1.5,window.devicePixelRatio||1);const targetW=Math.max(1,Math.round(rect.width*dpr)),targetH=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==targetW||canvas.height!==targetH){canvas.width=targetW;canvas.height=targetH}const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);const width=rect.width,height=rect.height,pad={left:58,right:28,top:24,bottom:48},plotW=Math.max(1,width-pad.left-pad.right),plotH=Math.max(1,height-pad.top-pad.bottom),g=lab.graph,xRange=Math.max(1e-9,g.xMax-g.xMin),yRange=Math.max(1e-9,g.yMax-g.yMin),xToPx=x=>pad.left+(x-g.xMin)/xRange*plotW,yToPx=y=>pad.top+(g.yMax-y)/yRange*plotH;ctx.clearRect(0,0,width,height);ctx.fillStyle='#081522';ctx.fillRect(0,0,width,height);
  const niceStep=range=>{const rough=range/10,power=10**Math.floor(Math.log10(Math.max(rough,1e-9))),fraction=rough/power;return (fraction<1.5?1:fraction<3?2:fraction<7?5:10)*power},xStep=niceStep(xRange),yStep=niceStep(yRange);ctx.font='12px Inter,Segoe UI,sans-serif';ctx.lineWidth=1;
  const graphData=lab.graphMode==='semimove'?this.transformGraphSeries():null,pointLabels=graphData?.points?.map(point=>point.label)||[];
  for(let x=Math.ceil(g.xMin/xStep)*xStep;x<=g.xMax+1e-10;x+=xStep){const px=xToPx(x);ctx.strokeStyle=Math.abs(x)<xStep/100?'#7fa7bd66':'#ffffff12';ctx.beginPath();ctx.moveTo(px,pad.top);ctx.lineTo(px,height-pad.bottom);ctx.stroke();ctx.fillStyle='#8ea7b7';ctx.textAlign='center';const rounded=Math.round(x),label=lab.graphMode==='semimove'&&Math.abs(x-rounded)<1e-6&&pointLabels[rounded]?pointLabels[rounded]:formatNumber(x,2);ctx.fillText(label,px,height-pad.bottom+20)}
  for(let y=Math.ceil(g.yMin/yStep)*yStep;y<=g.yMax+1e-10;y+=yStep){const py=yToPx(y);ctx.strokeStyle=Math.abs(y)<yStep/100?'#7fa7bd66':'#ffffff12';ctx.beginPath();ctx.moveTo(pad.left,py);ctx.lineTo(width-pad.right,py);ctx.stroke();ctx.fillStyle='#8ea7b7';ctx.textAlign='right';ctx.fillText(formatNumber(y,2),pad.left-8,py+4)}
  if(lab.graphMode==='continuous'){
   const scalarLine=lab.expressions[clamp(lab.activeGraphFunction,0,Math.max(0,lab.expressions.length-1))];if(scalarLine){let compiled=null;try{if(lab.continuousCache?.line===scalarLine)compiled=lab.continuousCache.fn;else{compiled=compileScalarFunctionLine(scalarLine);lab.continuousCache={line:scalarLine,fn:compiled}}}catch{compiled=null}if(compiled){ctx.strokeStyle='#4ea9e8';ctx.lineWidth=2.3;ctx.beginPath();let started=false;const samples=Math.min(700,Math.max(240,Math.round(plotW)));for(let index=0;index<samples;index++){const x=g.xMin+(index/(samples-1))*xRange;let y;try{y=compiled(x)}catch{y=NaN}if(!Number.isFinite(y)||y<g.yMin*20||y>g.yMax*20){started=false;continue}const px=xToPx(x),py=yToPx(y);if(!started){ctx.moveTo(px,py);started=true}else ctx.lineTo(px,py)}ctx.stroke()}}}
  else{const {series}=graphData||this.transformGraphSeries(),start=Math.max(0,Math.floor(g.xMin)-1),maxLength=series.reduce((max,item)=>Math.max(max,item.values.length),0),end=Math.min(maxLength-1,Math.ceil(g.xMax)+1),visibleCount=Math.max(0,end-start+1),baseStride=Math.max(1,Math.floor(visibleCount/Math.max(240,Math.floor(plotW/2))));for(const item of series){const exactStockfish=item.id==='stockfish',stride=exactStockfish?1:baseStride;ctx.strokeStyle=item.color;ctx.fillStyle=item.color;ctx.lineWidth=exactStockfish?3:1.8;ctx.setLineDash(item.dash?[6,4]:[]);ctx.beginPath();let started=false;for(let index=start;index<=end;index+=stride){const value=item.values[index];if(!Number.isFinite(value)){if(!exactStockfish)started=false;continue}const px=xToPx(index),py=yToPx(value);if(!started){ctx.moveTo(px,py);started=true}else ctx.lineTo(px,py)}if(!exactStockfish&&end>=start&&((end-start)%stride)!==0){const value=item.values[end];if(Number.isFinite(value))ctx.lineTo(xToPx(end),yToPx(value))}ctx.stroke();ctx.setLineDash([]);const pointStride=exactStockfish?1:Math.max(stride,Math.ceil(visibleCount/160));for(let index=start;index<=end;index+=pointStride){const value=item.values[index];if(!Number.isFinite(value))continue;ctx.beginPath();ctx.arc(xToPx(index),yToPx(value),exactStockfish?3.1:2,0,Math.PI*2);ctx.fill();if(exactStockfish){ctx.strokeStyle='#081522';ctx.lineWidth=1;ctx.stroke()}}}}
  ctx.fillStyle='#aec2ce';ctx.textAlign='center';ctx.font='13px Inter,Segoe UI,sans-serif';ctx.fillText(lab.graphMode==='continuous'?'Variable x':'Semijugadas',pad.left+plotW/2,height-10);ctx.save();ctx.translate(16,pad.top+plotH/2);ctx.rotate(-Math.PI/2);ctx.fillText(lab.normalized&&lab.graphMode==='semimove'?'Valor normalizado [-20, 20]':'Valor',0,0);ctx.restore();const range=$('#transformGraphRange');if(range)range.textContent=`x ∈ [${formatNumber(g.xMin,2)}, ${formatNumber(g.xMax,2)}] · y ∈ [${formatNumber(g.yMin,2)}, ${formatNumber(g.yMax,2)}]`;
 },
 updateTransformGraphStatus(){const lab=this.ensureTransformLab(),status=$('#transformGraphStatus');if(status)status.textContent=lab.functionAnalysisProgress||lab.progress||'Listo.';const completion=$('#transformFunctionCompletion');if(completion){const data=this.transformFunctionSeriesData(lab.activeGraphFunction);completion.textContent=`${data.completed}/${data.total} posiciones calculadas`}}
};

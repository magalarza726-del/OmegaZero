import {
  Chess, StockfishEngine, saveDb, $, $$, clamp, uciToMove,
  buildTimelineFromPgn, formatNumber,
} from '../app/deps.js';

const MATH_WORKER_TIMEOUT = 4500;
const MATH_BATCH = 5;
const TCOM_QUEUE_LIMIT = 256;

function preflightExpressions(expressions = []) {
  const rows = expressions.map((line, index) => {
    const match = String(line || '').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*=\s*(.+)$/);
    if (!match) throw new Error(`Función ${index + 1}: definición no válida.`);
    return { index, name: match[1], body: match[3] };
  });
  const byName = new Map();
  for (const row of rows) {
    if (byName.has(row.name)) throw new Error(`Nombre de función duplicado: ${row.name}.`);
    byName.set(row.name, row);
  }
  for (const row of rows) {
    row.deps = [];
    for (const other of rows) {
      const count = [...row.body.matchAll(new RegExp(`\\b${other.name}\\s*\\(`, 'g'))].length;
      if (count) row.deps.push([other.name, count]);
    }
  }
  const visiting = new Set(), costs = new Map();
  const costOf = (name) => {
    if (costs.has(name)) return costs.get(name);
    if (visiting.has(name)) throw new Error(`Referencia circular detectada en ${name}.`);
    visiting.add(name);
    const row = byName.get(name); let cost = 1;
    for (const [dep, count] of row.deps) {
      if (dep === name) throw new Error(`Referencia circular detectada en ${name}.`);
      cost += count * costOf(dep);
      if (cost > 5000) throw new Error(`La dependencia de ${name} puede expandirse de forma explosiva. Simplifica la fórmula.`);
    }
    visiting.delete(name); costs.set(name, cost); return cost;
  };
  rows.forEach(row => costOf(row.name));
  return { ok: true, rows, maxCost: Math.max(0, ...costs.values()) };
}

function makeWorkerUrl() { return new URL('../workers/transformWorker.js', import.meta.url); }

export function installStabilityPatch(App) {
  const p = App.prototype;
  const baseRenderStockfishGraph = p.renderStockfishGraph;
  const baseRenderTComLab = p.renderTComLab;
  const baseEnsureTComLab = p.ensureTComLab;
  const baseChooseTComSideMove = p.chooseTComSideMove;
  const baseTcomDecisionRecord = p.tcomDecisionRecord;
  const baseStartTComTournament = p.startTComTournament;
  const baseStopTComTournament = p.stopTComTournament;

  p.ensureTransformLab = function ensureTransformLabStable() {
    if (this.transformLab) return this.transformLab;
    const saved = this.db.settings.transformLabConfig || {}, savedVisibility = saved.visibility || saved.metricVisibility || {};
    const expressions = Array.isArray(saved.expressions) && saved.expressions.length ? saved.expressions : [
      'f(a)=sin(a)+ln(1+abs(a))', 'F(A)=A^2+exp(A)', 'K(A,a)=F(A)+f(a)',
    ];
    const initial = buildTimelineFromPgn('', 'Hoja 001 · Posición inicial'); initial.source = 'nuevo';
    const stubs = (this.db.games || []).filter(game => game.pgn).slice(0, 500).map((game, index) => ({
      id: `lazy-${game.id || index}`, name: `${game.white || 'Blancas'} vs ${game.black || 'Negras'}`,
      pgn: game.pgn, positions: [], source: 'biblioteca', lazy: true, materialized: false,
    }));
    this.transformLab = {
      sheets: [initial, ...stubs], selectedId: initial.id, ply: 0, busy: false, progress: '', analysisToken: null,
      expressions, visibility: {stockfish:true,output:true,determinant:true,rank:true,trace:true,frobenius:true,condition:true,pseudoDeterminant:true,lambdaMax:true,sigmaMinPositive:true,...savedVisibility},
      graphMode:saved.graphMode||'semimove',normalized:saved.normalized!==false,depth:Number(saved.depth||8),batchNodes:clamp(Number(saved.batchNodes||12000),1000,100000),
      graph:{xMin:0,xMax:40,yMin:-20,yMax:20},activeExpression:clamp(Number(saved.activeExpression||0),0,Math.max(0,expressions.length-1)),activeGraphFunction:clamp(Number(saved.activeGraphFunction||0),0,Math.max(0,expressions.length-1)),applicationTarget:saved.applicationTarget==='A'?'A':'a',
      drag:null,cacheRevision:0,stockfishRevision:0,rawSeriesCache:null,graphSeriesCache:null,drawFrame:null,drawRetry:null,continuousCache:null,functionAnalysisToken:null,functionAnalysisProgress:'',compiledDefinitionsCache:null,
      boardSelected:null,boardLegal:[],boardLastMove:null,liveAuto:saved.liveAuto!==false,liveMultiPv:clamp(Number(saved.liveMultiPv||3),1,5),liveCandidates:[],liveAnalysisFen:'',liveBusy:false,liveError:'',liveToken:null,liveTimer:null,
      mathWorker:null,mathPending:new Map(),mathSeq:0,explicitStockfish:false,
    };
    return this.transformLab;
  };

  p.materializeTransformSheet = function materializeTransformSheet(sheet) {
    if (!sheet?.lazy || sheet.materialized) return sheet;
    try {
      const built = buildTimelineFromPgn(sheet.pgn || '', sheet.name); built.id = sheet.id; built.source = sheet.source; built.lazy = false; built.materialized = true;
      Object.assign(sheet, built);
    } catch (error) { sheet.positions = sheet.positions?.length ? sheet.positions : buildTimelineFromPgn('', sheet.name).positions; sheet.materialized = true; sheet.lazy = false; sheet.loadError = error.message; }
    return sheet;
  };

  p.activeTransformSheet = function activeTransformSheetStable() {
    const lab = this.ensureTransformLab(); const sheet = lab.sheets.find(item => item.id === lab.selectedId) || lab.sheets[0]; return this.materializeTransformSheet(sheet);
  };
  p.activeTransformPosition = function activeTransformPositionStable() {
    const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet(); lab.ply=clamp(lab.ply,0,Math.max(0,(sheet.positions?.length||1)-1)); return sheet.positions[lab.ply] || sheet.positions[0];
  };

  p.resetMathWorker = function resetMathWorker(reason='') {
    const lab=this.ensureTransformLab(); lab.mathWorker?.terminate?.(); lab.mathWorker=null;
    for (const pending of lab.mathPending.values()) { clearTimeout(pending.timer); pending.reject(new Error(reason || 'Worker matemático reiniciado.')); }
    lab.mathPending.clear();
  };
  p.ensureMathWorker = function ensureMathWorker() {
    const lab=this.ensureTransformLab(); if (lab.mathWorker) return lab.mathWorker;
    const worker = new Worker(makeWorkerUrl(), {type:'module'}); lab.mathWorker=worker;
    worker.onmessage = event => { const msg=event.data||{}, pending=lab.mathPending.get(msg.id); if(!pending)return; lab.mathPending.delete(msg.id); clearTimeout(pending.timer); msg.ok?pending.resolve(msg):pending.reject(new Error(msg.error||'Error matemático.')); };
    worker.onerror = event => this.resetMathWorker(event?.message || 'Error del worker matemático.');
    return worker;
  };
  p.requestMathWorker = function requestMathWorker(payload, timeoutMs=MATH_WORKER_TIMEOUT) {
    const lab=this.ensureTransformLab(),worker=this.ensureMathWorker(),id=++lab.mathSeq;
    return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>{lab.mathPending.delete(id);this.resetMathWorker('La fórmula excedió el tiempo de seguridad.');reject(new Error('La fórmula excedió el tiempo de seguridad y el worker fue reiniciado.'));},timeoutMs); lab.mathPending.set(id,{resolve,reject,timer}); worker.postMessage({...payload,id}); });
  };

  p.analyseTransformFunctionTab = async function analyseTransformFunctionTabStable(functionIndex=this.ensureTransformLab().activeGraphFunction) {
    const lab=this.ensureTransformLab(),sheet=this.activeTransformSheet(),index=clamp(Number(functionIndex),0,Math.max(0,lab.expressions.length-1)),signature=lab.expressions.join('\n');
    const token=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`; lab.functionAnalysisToken=token;
    try { preflightExpressions(lab.expressions); } catch(error) { lab.functionAnalysisProgress=`Error de fórmula: ${error.message}`;lab.functionAnalysisToken=null;this.updateTransformGraphStatus();return; }
    const pending=[]; sheet.positions.forEach((position,positionIndex)=>{const cache=this.transformFunctionCache(position,signature);if(!cache.allComputed)pending.push({position,positionIndex,cache})});
    if(!pending.length){lab.functionAnalysisToken=null;lab.functionAnalysisProgress=`Datos listos desde caché conjunta: ${lab.expressions.length} funciones × ${sheet.positions.length} posiciones.`;this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();return;}
    let completed=sheet.positions.length-pending.length,errors=0;
    for(let offset=0;offset<pending.length;offset+=MATH_BATCH){
      if(lab.functionAnalysisToken!==token||this.screen!=='stockfishGraph')return;
      const batch=pending.slice(offset,offset+MATH_BATCH);
      try{
        const response=await this.requestMathWorker({type:'evaluate-batch',expressions:lab.expressions,positions:batch.map(item=>({id:item.positionIndex,fen:item.position.fen}))});
        const byId=new Map((response.results||[]).map(item=>[item.id,item]));
        for(const item of batch){const result=byId.get(item.positionIndex);item.cache.byIndex=(result?.analyses||[]).map(a=>a);item.cache.allComputed=true;errors+=(result?.analyses||[]).filter(a=>a.error).length;completed++;}
      }catch(error){for(const item of batch){item.cache.byIndex[index]={name:`f${index+1}`,kind:'error',scalar:null,properties:null,error:error.message};item.cache.allComputed=false;completed++;errors++;}}
      lab.rawSeriesCache=null;lab.graphSeriesCache=null;lab.functionAnalysisProgress=`${completed}/${sheet.positions.length} posiciones · ${lab.expressions.length} funciones${errors?` · ${errors} errores aislados`:''}`;this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(lab.functionAnalysisToken===token){lab.functionAnalysisToken=null;lab.functionAnalysisProgress=`${sheet.positions.length} posiciones listas · caché conjunta de ${lab.expressions.length} funciones${errors?` · ${errors} errores aislados`:''}.`;this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();}
  };

  p.analyseTransformSheet = async function analyseTransformSheetStable() {
    const lab=this.ensureTransformLab(); if(!lab.explicitStockfish)return;
    const sheet=this.activeTransformSheet(); if(lab.busy)return; const pending=sheet.positions.filter(position=>!Number.isFinite(position.stockfish));
    if(!pending.length){lab.progress='La hoja ya tiene valoración Stockfish completa.';this.updateTransformGraphStatus();return;}
    const token=crypto.randomUUID?.()||String(Date.now());lab.analysisToken=token;lab.busy=true;let completed=0,failed=0;
    try{await this.engine.init();for(const position of pending){if(lab.analysisToken!==token)break;lab.progress=`Stockfish ${completed+failed+1}/${pending.length} · ${position.label}`;this.updateTransformGraphStatus();try{const result=await this.engine.analyse(position.fen,{nodes:lab.batchNodes,multiPv:1,skill:20,timeoutMs:15000});const score=result?.[0]?.score;if(Number.isFinite(score)){position.stockfish=score;completed++;}else{position.stockfish=null;failed++;}}catch(error){position.stockfish=null;failed++;lab.progress=`${position.label}: ${error.message}`;}this.invalidateTransformStockfishSeries();this.scheduleTransformGraphDraw();await new Promise(resolve=>setTimeout(resolve,0));}}
    finally{if(lab.analysisToken===token){lab.busy=false;lab.analysisToken=null;lab.progress=`Stockfish: ${completed} nuevas${failed?` · ${failed} sin resultado`:''}.`;this.updateTransformGraphStatus();this.scheduleTransformGraphDraw();}}
  };

  p.renderStockfishGraph = function renderStockfishGraphStable() {
    baseRenderStockfishGraph.call(this); const lab=this.ensureTransformLab();
    const button=$('[data-transform-analyse-sheet]'); if(button)button.onclick=()=>{lab.explicitStockfish=true;Promise.resolve(this.analyseTransformSheet()).finally(()=>{lab.explicitStockfish=false;});};
    const hint=$('.transform-plot-hint'); if(hint&&lab.normalized&&!hint.textContent.includes('forma, no magnitud'))hint.append(' · Normalizado: compara forma, no magnitud absoluta.');
  };

  p.ensureTComLab = function ensureTComLabStable() { const lab=baseEnsureTComLab.call(this); if(!lab._stability401){lab._stability401=true;lab.mathWorker=null;lab.mathPending=new Map();lab.mathSeq=0;lab.annotationQueue=[];lab.annotationRunning=false;lab.annotationEngine=null;if(this.db.settings.tcomLabConfig?.annotateStockfish==null)lab.annotateStockfish=false;}return lab; };
  p.persistTComConfig = function persistTComConfigStable(){const lab=this.ensureTComLab();this.db.settings.tcomLabConfig={white:{...lab.white,expressions:[...lab.white.expressions]},black:{...lab.black,expressions:[...lab.black.expressions]},gamesTarget:lab.gamesTarget,maxPlies:lab.maxPlies,diversity:lab.diversity,openingPlies:lab.openingPlies,delay:lab.delay,speed:lab.speed,stockfishDepth:lab.stockfishDepth,annotateStockfish:lab.annotateStockfish,stockfishEvalNodes:lab.stockfishEvalNodes,alternateColors:lab.alternateColors,saveGames:lab.saveGames,boardControl:lab.boardControl,autoReply:lab.autoReply};clearTimeout(lab.persistTimer);lab.persistTimer=setTimeout(()=>saveDb(this.db),700);};

  p.ensureTComMathWorker = function(){const lab=this.ensureTComLab();if(lab.mathWorker)return lab.mathWorker;const worker=new Worker(makeWorkerUrl(),{type:'module'});lab.mathWorker=worker;worker.onmessage=event=>{const msg=event.data||{},pending=lab.mathPending.get(msg.id);if(!pending)return;lab.mathPending.delete(msg.id);clearTimeout(pending.timer);msg.ok?pending.resolve(msg):pending.reject(new Error(msg.error||'Error T-COM.'));};worker.onerror=()=>{worker.terminate();lab.mathWorker=null;};return worker;};
  p.requestTComMathWorker = function(payload,timeoutMs=MATH_WORKER_TIMEOUT){const lab=this.ensureTComLab(),worker=this.ensureTComMathWorker(),id=++lab.mathSeq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{lab.mathPending.delete(id);worker.terminate();lab.mathWorker=null;reject(new Error('T-COM agotó el tiempo de seguridad; worker reiniciado.'));},timeoutMs);lab.mathPending.set(id,{resolve,reject,timer});worker.postMessage({...payload,id});});};

  p.chooseTComSideMove = async function chooseTComSideMoveStable(current,token){const lab=this.ensureTComLab(),color=current.chess.turn(),module=color==='w'?current.white:current.black;if(module.type==='stockfish')return baseChooseTComSideMove.call(this,current,token);preflightExpressions(module.expressions||[]);const response=await this.requestTComMathWorker({type:'choose-move',fen:current.chess.fen(),module,diversity:lab.diversity});return response.decision;};
  p.tcomStockfishEvaluation = async function(){return null;};
  p.ensureTComAnnotationEngine = function(){const lab=this.ensureTComLab();if(!lab.annotationEngine)lab.annotationEngine=new StockfishEngine(()=>{});return lab.annotationEngine;};
  p.queueTComAnnotation = function(fen,record){const lab=this.ensureTComLab();if(!lab.annotateStockfish||!record)return;if(lab.annotationQueue.length>=TCOM_QUEUE_LIMIT){record.stockfishError='Anotación omitida: cola Stockfish saturada.';return;}lab.annotationQueue.push({fen,record});if(!lab.annotationRunning)this.drainTComAnnotationQueue();};
  p.drainTComAnnotationQueue = async function(){const lab=this.ensureTComLab();if(lab.annotationRunning)return;lab.annotationRunning=true;const engine=this.ensureTComAnnotationEngine();try{await engine.init();while(lab.annotationQueue.length){const job=lab.annotationQueue.shift();try{const result=await engine.analyse(job.fen,{nodes:lab.stockfishEvalNodes,multiPv:1,skill:20,timeoutMs:15000}),best=result?.[0];if(Number.isFinite(best?.score)){job.record.stockfishCp=best.score;job.record.stockfishMate=Number.isFinite(best.mate)?best.mate:null;job.record.stockfishError='';}else job.record.stockfishError='Stockfish no devolvió puntuación.';}catch(error){job.record.stockfishError=error.message||'Error de Stockfish';}await new Promise(resolve=>setTimeout(resolve,0));}}finally{lab.annotationRunning=false;}};
  p.tcomDecisionRecord = function tcomDecisionRecordStable(current,move,decision,stockfish){const record=baseTcomDecisionRecord.call(this,current,move,decision,stockfish);record.invalidCount=decision?.invalidCount??decision?.invalidCandidates?.length??0;record.legalCount=decision?.legalCount??decision?.candidates?.length??0;record.saturationCount=decision?.saturationCount??0;queueMicrotask(()=>this.queueTComAnnotation(current.chess.fen(),record));return record;};

  p.startTComTournament = function startTComTournamentStable(){const lab=this.ensureTComLab();try{if(lab.white.type!=='stockfish')preflightExpressions(lab.white.expressions);if(lab.black.type!=='stockfish')preflightExpressions(lab.black.expressions);}catch(error){alert(`T-COM no puede iniciar: ${error.message}`);lab.progress=`Preflight falló: ${error.message}`;this.renderTComLab();return;}return baseStartTComTournament.call(this);};
  p.stopTComTournament = function stopTComTournamentStable(...args){const lab=this.ensureTComLab();lab.mathWorker?.terminate?.();lab.mathWorker=null;for(const pending of lab.mathPending.values()){clearTimeout(pending.timer);pending.reject(new Error('Cálculo cancelado.'));}lab.mathPending.clear();return baseStopTComTournament.apply(this,args);};
  p.renderTComLab = function renderTComLabStable(){baseRenderTComLab.call(this);const current=this.ensureTComLab().current,decision=current?.lastDecision;if(decision?.invalidCandidates?.length){const wrap=$('.tcom-candidate-wrap');if(wrap&&!wrap.querySelector('.tcom-invalid-candidates')){const details=document.createElement('details');details.className='tcom-invalid-candidates';details.innerHTML=`<summary>${decision.invalidCandidates.length} candidatas inválidas de ${decision.legalCount||decision.candidates.length+decision.invalidCandidates.length} legales</summary><div>${decision.invalidCandidates.slice(0,12).map(item=>`<span><b>${item.san||item.uci}</b><small>${item.error||'Salida no finita'}</small></span>`).join('')}</div>`;wrap.append(details);}}};
}

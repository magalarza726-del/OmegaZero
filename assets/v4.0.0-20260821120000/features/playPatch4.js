import { Chess, chooseBotCandidate, resolveBotScheme, chooseTransformMoveOnePly, chooseEnergyMoveOnePly, OPENINGS, getOpening, identifyOpening, openingTreeHtml, openingPreview, nextOpeningSan, MASTER_GAMES, saveDb, addGame, addProblemsFromGame, $, $$, clamp, esc, uciToMove, downloadText, fideGameState, timeoutResult, buildGameStats, announce, playTone } from '../app/deps.js';
import { THEMES } from '../app/config.js';
export const playPatch4={
 enqueueSimReply(index){const s=this.simultaneous?.games[index];if(!s||s.thinking||s.result||fideGameState(s.chess,s.positions).terminal)return;s.thinking=true;if(index===this.simultaneous.active){this.thinking=true;this.renderGame()}this.simEngineQueue=this.simEngineQueue.catch(()=>{}).then(()=>this.runSimReply(index))},
 async chooseComBrainDecision(chess,{brain='s',color=chess.turn(),style='zero',skill=this.cfg.skill,depth=this.cfg.depth,multiPv=this.cfg.multiPv,openingId='auto',diversity=this.cfg.diversity}={}){
  brain=this.normalizeBrain(brain);
  if(brain==='e'){
   const cfg=this.energyConfig(),priority=color==='w'?cfg.priorityW:cfg.priorityB,decision=chooseEnergyMoveOnePly(chess,{g:cfg.g,massMode:cfg.massMode,kingWeight:cfg.kingWeight},priority),best=decision.best;
   if(!best)return {chosen:null,candidates:[],quality:null};
   return {chosen:{uci:`${best.from}${best.to}${best.promotion||''}`,score:best.objective,san:best.san},candidates:decision.candidates.map(item=>({uci:`${item.from}${item.to}${item.promotion||''}`,score:item.objective,san:item.san})),quality:{key:'experimental',label:`E-COM · ${priority}`,detail:`${best.san} maximiza ${priority}=${Number(best.objective).toFixed(3)} mirando una sola semijugada.`}};
  }
  if(brain==='t'){
   const lab=this.ensureTComLab(),module=color==='w'?lab.white:lab.black;
   if(module?.type==='stockfish'){
    const cand=await this.engine.analyse(chess.fen(),{depth:lab.stockfishDepth||depth,multiPv:Math.max(3,multiPv),skill:20});
    return {chosen:cand[0]||null,candidates:cand,quality:{key:'experimental',label:'T-COM · referencia Stockfish',detail:`El módulo ${module?.name||''} está configurado como referencia Stockfish.`}};
   }
   const decision=await chooseTransformMoveOnePly(chess,module,{cache:lab.evalCache,diversity:lab.diversity||diversity});
   const chosen=decision?.chosen||null;
   return {chosen,candidates:decision?.candidates||[],quality:chosen?{key:'experimental',label:'T-COM · un ply',detail:`${chosen.san||chosen.uci} maximiza el módulo ${module?.name||'activo'} sin calcular respuesta rival.`}:null};
  }
  let chosen=null;const bookSan=nextOpeningSan(openingId,chess.history(),chess.fen());
  if(getOpening(openingId)&&bookSan){const legal=chess.moves({verbose:true}).find(move=>move.san.replace(/[+#]/g,'')===bookSan.replace(/[+#]/g,''));if(legal)chosen={uci:legal.from+legal.to+(legal.promotion||''),book:true}}
  const before=chess.fen();let candidates=[];
  if(!chosen||multiPv>1)candidates=await this.engine.analyse(before,{depth,multiPv:Math.max(3,multiPv),skill});
  if(!chosen){chosen=chooseBotCandidate(chess,candidates,style,resolveBotScheme(style,color),color,{},style)||candidates[0];chosen=this.applyDiversity(chosen,candidates,color)}
  return {chosen,candidates,quality:null};
 },
 async runSimReply(index){
  const s=this.simultaneous?.games[index];if(!s)return;const color=s.chess.turn(),brain=this.normalizeBrain(s.config.brain),before=s.chess.fen();
  try{
   const decision=await this.chooseComBrainDecision(s.chess,{brain,color,style:s.config.style,skill:s.config.skill,depth:s.config.depth,multiPv:s.config.multiPv,openingId:s.config.opening,diversity:this.cfg.diversity});
   if(s.chess.fen()!==before||!decision?.chosen?.uci)return;
   const m=s.chess.move(uciToMove(decision.chosen.uci));
   if(m){s.lastMove=[m.from,m.to];s.positions.push({fen:s.chess.fen(),ply:s.chess.history().length});if(this.cfg.clock){s.clock[m.color]+=this.cfg.increment;s.clock.last=performance.now()}s.lastMoveQuality=decision.quality||this.classifyEngineChoice(decision.chosen,decision.candidates,m);const fide=fideGameState(s.chess,s.positions);if(fide.terminal){s.result=fide.reason;this.finishSimSession(s,fide.reason)}}
  }catch(error){console.warn('COM simultáneo no pudo responder',error)}finally{s.thinking=false;if(this.simultaneous&&index===this.simultaneous.active)this.activateSimBoard(index,true,true)}
 },
 finishSimSession(s,reason){if(!s||s.gameSaved||s.chess.history().length<2)return;const state=fideGameState(s.chess,s.positions),result=reason.includes('tablas')||state.result==='1/2-1/2'?'1/2-1/2':(reason==='tiempo'?timeoutResult(s.chess,s.chess.turn()):(state.terminal?state.result:'*')),engineName=this.comBrainName(s.config.brain,s.config.humanColor==='w'?'b':'w',s.config),opening=identifyOpening(s.chess.history(),s.chess.fen());const game={id:crypto.randomUUID?.()||String(Date.now()),date:new Date().toISOString(),mode:'pvc-simultaneous',white:s.config.humanColor==='w'?'J1':engineName,black:s.config.humanColor==='b'?'J1':engineName,humanColor:s.config.humanColor,engineBrain:this.normalizeBrain(s.config.brain),engineStyle:s.config.style,engineSkill:Number(s.config.skill),engineElo:this.normalizeBrain(s.config.brain)==='s'?this.eloForSkill(s.config.skill):null,engineDepth:Number(s.config.depth),engineMultiPv:Number(s.config.multiPv),independentSimClocks:Boolean(this.cfg.independentSimClocks),result,pgn:s.chess.pgn(),fen:s.chess.fen(),reason,boardId:s.id,openingId:opening?.id||s.config.opening||null,openingName:opening?.name||getOpening(s.config.opening)?.name||'Fuera de libro',positions:s.positions};addGame(this.db,game);addProblemsFromGame(this.db,game);s.gameSaved=true},
};

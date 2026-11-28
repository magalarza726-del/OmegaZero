import { StockfishEngine } from '../engine.js?v=20261128-live960';
import { researchEngineFen, researchEngineMove, researchMoves } from '../core/chess960Research.js?v=20261128-live960';

const boards=['classic','random'];
const ANALYSIS_NODES=20000;
export function create960Observers(onUpdate,makeEngine=()=>new StockfishEngine(()=>{},{hashMb:16})){
 const sessions=Object.fromEntries(boards.map(b=>[b,{engine:null,fen:null,status:'idle',value:null,promise:null,closed:false}]));
 let disposed=false;
 function request(l,b){
  const s=sessions[b],fen=researchEngineFen(l,b);
  if(disposed)return Promise.resolve();
  if(s.fen===fen)return s.promise||Promise.resolve();
  s.fen=fen;s.value=null;s.status='loading';s.error='';onUpdate();
  // Serialize each worker; newer positions supersede queued and running results.
  const previous=s.promise||Promise.resolve();
  const current=()=>!disposed&&s.fen===fen&&researchEngineFen(l,b)===fen;
  const update=(line)=>{
   if(!current()||!line||!Number.isFinite(line.score)||!line.depth)return;
   const move=researchEngineMove(l,b,line.uci);
   if(!move)return;
   s.value={score:line.score,mate:line.mate,depth:line.depth,san:move.san,from:move.from,to:move.to,uci:line.uci};
   s.status='analysing';onUpdate();
  };
  const run=previous.catch(()=>{}).then(async()=>{
   if(!current())return;
   const g=l[b];
   if(!researchMoves(l,b).length){
    s.status='done';s.value={score:g.isCheck()?(g.turn()==='w'?-100000:100000):0,mate:g.isCheck()?0:null,terminal:g.isCheck()?'Jaque mate':'Ahogado',depth:0};onUpdate();return;
   }
   try{
    const engine=s.engine||(s.engine=makeEngine(b));
    await engine.init();
    if(disposed){engine.destroy();return}
    if(!current())return;
    const lines=await engine.analyse(fen,{chess960:b==='random',nodes:ANALYSIS_NODES,multiPv:1,skill:20,timeoutMs:20000,onProgress:update});
    if(!current())return;
    update(lines?.[0]);
    s.status=s.value?'done':'error';
    if(!s.value)s.error='Stockfish no devolvió una evaluación válida';
    onUpdate();
   }catch(error){
    if(current()){s.status='error';s.error=String(error?.message||error);onUpdate()}
   }
  });
  s.promise=run;
  return run;
 }
 return {sessions,refresh:l=>Promise.all(boards.map(b=>request(l,b))),dispose(){
  disposed=true;
  for(const s of Object.values(sessions)){
   if(s.engine?.initializing){s.promise?.finally(()=>s.engine?.destroy()).catch(()=>{});}
   else s.engine?.destroy();
  }
 }};
}
export function researchEvaluationText(s){
 const v=s?.value;if(!v)return '—';
 if(v.terminal)return v.terminal==='Jaque mate'?(v.score>0?'Mate blancas':'Mate negras'):'0.00';
 if(Number.isFinite(v.mate))return (v.mate>0?'+':'−')+'M'+Math.abs(v.mate);
 return (v.score>0?'+':'')+(v.score/100).toFixed(2);
}

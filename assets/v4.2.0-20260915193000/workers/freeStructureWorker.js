import { buildFreePieceFamilies } from '../core/freePieceStructures.js';
self.onmessage=event=>{
 try{
  const {types,rowStart,rowEnd,mirrorEquivalent}=event.data||{};
  const result=buildFreePieceFamilies(types,rowStart,rowEnd,{mirrorEquivalent,maxExamples:10});
  self.postMessage({ok:true,result});
 }catch(error){self.postMessage({ok:false,error:error?.message||String(error)})}
};

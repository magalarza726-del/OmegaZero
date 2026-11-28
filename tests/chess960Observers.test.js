import test from 'node:test';
import assert from 'node:assert/strict';
import { new960Research, researchMoves, play960Research } from '../assets/v4.3.0-20261104200000/core/chess960Research.js';
import { create960Observers, researchEvaluationText } from '../assets/v4.3.0-20261104200000/features/chess960Observers.js';

test('independent observer sessions do not share evaluations or repeat a search',async()=>{
 const l=new960Research(39),calls=[],closed=[];
 const o=create960Observers(()=>{},b=>({init:async()=>{},analyse:async(fen,opt)=>{
  calls.push({b,fen,chess960:opt.chess960});return [{uci:'d2d4',score:b==='classic'?20:-40,mate:null,depth:5}];
 },destroy:()=>closed.push(b)}));
 await o.refresh(l);await o.refresh(l);
 assert.equal(calls.length,2);
 assert.equal(calls.find(c=>c.b==='random').chess960,true);
 assert.equal(calls.find(c=>c.b==='classic').chess960,false);
 assert.equal(researchEvaluationText(o.sessions.classic),'+0.20');
 assert.equal(researchEvaluationText(o.sessions.random),'-0.40');
 o.dispose();assert.equal(closed.length,2);
});
test('stale analyses cannot overwrite the current position',async()=>{
 const l=new960Research(518),jobs=[];
 const o=create960Observers(()=>{},b=>({init:async()=>{},analyse:(fen,opt)=>new Promise(resolve=>jobs.push({b,fen,opt,resolve})),destroy:()=>{}}));
 const first=o.refresh(l);
 while(jobs.length<2)await new Promise(resolve=>setTimeout(resolve,0));
 const m=researchMoves(l,'classic').find(m=>m.from+m.to==='e2e4');
 assert.equal(play960Research(l,'classic',m),true);
 const next=o.refresh(l);
 for(const j of jobs.slice(0,2)){j.opt.onProgress({uci:'d2d4',score:99,depth:5});j.resolve([{uci:'d2d4',score:99,depth:5}]);}
 await first;
 while(jobs.length<4)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(o.sessions.classic.value,null);
 assert.equal(o.sessions.random.value,null);
 for(const j of jobs.slice(2)){j.opt.onProgress({uci:'e7e5',score:-22,depth:6});j.resolve([{uci:'e7e5',score:-22,depth:6}]);}
 await next;assert.equal(o.sessions.classic.value.score,-22);assert.equal(o.sessions.random.value.uci,'e7e5');o.dispose();
});

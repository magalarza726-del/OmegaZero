import test from 'node:test';
import assert from 'node:assert/strict';
import { boardMethods } from '../assets/v4.3.0-20261104200000/features/board.js';

test('shared renderer draws independent arrows and supports flipped orientation',()=>{
 const ctx={arrows:[],boardFlipped:false};
 const arrows=[{from:'a1',to:'a4',color:'green'}];
 assert.equal(boardMethods.arrowsSvg.call(ctx),'');
 const svg=boardMethods.arrowsSvg.call(ctx,{arrows,flipped:false});
 assert.match(svg,/stroke-green/);assert.match(svg,/x1="50"/);
 assert.match(boardMethods.arrowsSvg.call(ctx,{arrows,flipped:true}),/x1="750"/);
 assert.equal(ctx.arrows.length,0);
});
test('scoped right-click annotations never modify the other board or main game',()=>{
 const old=globalThis.document;let target;
 globalThis.document={elementFromPoint:()=>({closest:()=>target})};
 try{
  const app={...boardMethods,arrows:[],annotations:new Map(),annotation:{color:'yellow'},rerenderBoardScreen:()=>assert.fail('unexpected global render')};
  const state={arrows:[],annotations:new Map(),board:{contains:t=>t?.board==='classic'}};
  const event={button:2,pointerId:1,clientX:0,clientY:0,currentTarget:{setPointerCapture(){}},preventDefault(){},stopPropagation(){}};
  const draw=(from,to,board='classic',drag=true)=>{
   app.startRightAnnotation(event,from,'research960',state);
   if(drag)app.moveRightAnnotation({...event,clientX:20});
   target={dataset:{square:to},board};app.endRightAnnotation(event);
  };
  draw('a1','a4');assert.equal(state.arrows.length,1);assert.equal(app.arrows.length,0);
  draw('a1','a4');assert.equal(state.arrows.length,0);
  draw('a1','h8','random');assert.equal(state.arrows.length,0);
  draw('e4','e4','classic',false);assert.equal(state.annotations.get('e4'),'yellow');assert.equal(app.annotations.size,0);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old}
});

test('annotation palette binds when closed and when four colors are visible',()=>{
 let click,changes=0;
 const pencil={addEventListener:(type,fn)=>{assert.equal(type,'click');click=fn}};
 const colors=['red','yellow','green','blue'].map(annColor=>({dataset:{annColor}}));
 let visible=false;
 const root={querySelector:selector=>selector==='[data-pencil]'?pencil:null,querySelectorAll:selector=>selector==='[data-ann-color]'&&visible?colors:[]};
 const app={annotation:{open:false,color:'yellow'}};
 const update=()=>changes++;
 boardMethods.bindAnnotationPanel.call(app,root,update);
 click();assert.equal(app.annotation.open,true);assert.equal(changes,1);
 visible=true;boardMethods.bindAnnotationPanel.call(app,root,update);
 for(const color of colors){color.onclick();assert.equal(app.annotation.color,color.dataset.annColor)}
 assert.equal(changes,5);
});

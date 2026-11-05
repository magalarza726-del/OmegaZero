import {
  saveDb, APP_VERSION, $, $$, esc, publicAsset,
  FREE_PIECE_TYPES, normalizeFreePieces, normalizeRowWindow,
  analyzeFreePieceConfiguration, buildFreePieceFamilies,
} from '../app/deps.js';

const PIECE_NAME={N:'Caballo',B:'Alfil',R:'Torre',Q:'Dama',K:'Rey'};
const PIECE_GLYPH={N:'♞',B:'♝',R:'♜',Q:'♛',K:'♚'};
const DEFAULT_FREE=Object.freeze({pieces:['R','R','Q',''],rowStart:2,rowEnd:5,mirrorEquivalent:true,controlMode:'action'});
const labelConfig=config=>config.map(p=>`${p.type}${p.square}`).join(' · ');

export const freeStructureStudyMethods={
 freeStructureConfig(){return {...DEFAULT_FREE,...(this.db.settings.freeStructureConfig||{}),pieces:[...(this.db.settings.freeStructureConfig?.pieces||DEFAULT_FREE.pieces)]}},
 ensureFreeStructureLab(){
  if(!this.freeStructureLab)this.freeStructureLab={config:this.freeStructureConfig(),result:null,busy:false,error:'',filter:'',worker:null,timer:null};
  return this.freeStructureLab;
 },
 persistFreeStructureConfig(next){
  const lab=this.ensureFreeStructureLab();lab.config={...lab.config,...next,pieces:[...(next.pieces||lab.config.pieces)]};
  this.db.settings.freeStructureConfig={...lab.config,pieces:[...lab.config.pieces]};saveDb(this.db);
 },
 scheduleFreeStructureGeneration(delay=120){
  const lab=this.ensureFreeStructureLab();clearTimeout(lab.timer);lab.worker?.terminate?.();lab.worker=null;lab.result=null;lab.error='';lab.busy=true;
  lab.timer=setTimeout(()=>this.generateFreeStructureFamilies(),delay);this.renderFreeStructures();
 },
 generateFreeStructureFamilies(){
  const lab=this.ensureFreeStructureLab(),types=lab.config.pieces.filter(Boolean);if(!types.length){lab.error='Selecciona al menos una pieza.';lab.busy=false;this.renderFreeStructures();return}
  lab.busy=true;lab.error='';this.renderFreeStructures();
  lab.worker?.terminate?.();
  const payload={types,rowStart:lab.config.rowStart,rowEnd:lab.config.rowEnd,mirrorEquivalent:lab.config.mirrorEquivalent};
  if(typeof Worker==='function'){
   const worker=new Worker(new URL('../workers/freeStructureWorker.js',import.meta.url),{type:'module'});lab.worker=worker;
   worker.onmessage=event=>{if(lab.worker!==worker)return;worker.terminate();lab.worker=null;lab.busy=false;if(event.data?.ok)lab.result=event.data.result;else lab.error=event.data?.error||'No se pudieron generar las familias.';this.renderFreeStructures()};
   worker.onerror=()=>{worker.terminate();lab.worker=null;try{lab.result=buildFreePieceFamilies(types,payload.rowStart,payload.rowEnd,{mirrorEquivalent:payload.mirrorEquivalent,maxExamples:10})}catch(error){lab.error=error?.message||String(error)}lab.busy=false;this.renderFreeStructures()};
   worker.postMessage(payload);return;
  }
  setTimeout(()=>{try{lab.result=buildFreePieceFamilies(types,payload.rowStart,payload.rowEnd,{mirrorEquivalent:payload.mirrorEquivalent,maxExamples:10})}catch(error){lab.error=error?.message||String(error)}lab.busy=false;this.renderFreeStructures()},0);
 },
 freeStructureBoardHtml(config,compact=false){
  const lab=this.ensureFreeStructureLab(),mode=lab.config.controlMode==='subaction'?'subaction':'action',analysis=analyzeFreePieceConfiguration(config,{mirrorEquivalent:lab.config.mirrorEquivalent}),pieceBySquare=new Map(analysis.pieces.map(p=>[p.square,p])),window=normalizeRowWindow(lab.config.rowStart,lab.config.rowEnd),cells=[];
  for(let rank=8;rank>=1;rank-=1)for(let file=0;file<8;file+=1){
   const square=`${'abcdefgh'[file]}${rank}`,piece=pieceBySquare.get(square),count=(mode==='action'?analysis.actionControl:analysis.subactionControl).get(square)||0,classes=['free-structure-cell',((file+rank)%2?'light':'dark')];
   if(rank<window.start||rank>window.end)classes.push('outside-zone');else classes.push('placement-zone');
   if(mode==='action'){if(count===1)classes.push('action-one');else if(count===2)classes.push('action-two');else if(count>=3)classes.push('action-three')}
   else{if(count===1)classes.push('sub-one');else if(count===2)classes.push('sub-two');else if(count>=3)classes.push('sub-three')}
   const asset=piece?publicAsset(`pieces/alpha/w${piece.type}.png`,APP_VERSION):'';
   cells.push(`<span class="${classes.join(' ')}" title="${square}${count?` · ${mode==='action'?'acción':'subacción'} ${count}`:''}">${piece?`<img src="${asset}" alt="${PIECE_NAME[piece.type]} en ${square}" draggable="false">`:''}${count>1?`<b>${count>=3?'3+':'2×'}</b>`:''}</span>`);
  }
  return `<div class="free-structure-board ${compact?'compact':''}" role="img" aria-label="${esc(labelConfig(config))} · ${mode==='action'?'Acción':'Subacción'}">${cells.join('')}</div>`;
 },
 freeFamilyBodyHtml(family){
  const analysis=analyzeFreePieceConfiguration(family.representative,{mirrorEquivalent:this.ensureFreeStructureLab().config.mirrorEquivalent}),examples=family.examples.slice(0,10).map(example=>`<article class="free-family-example"><code>${esc(labelConfig(example))}</code>${this.freeStructureBoardHtml(example,true)}</article>`).join('');
  return `<div class="free-family-body"><section>${this.freeStructureBoardHtml(family.representative)}<div class="free-family-legend">${this.ensureFreeStructureLab().config.controlMode==='action'?'<span><i class="a1"></i>1 pieza</span><span><i class="a2"></i>2 piezas</span><span><i class="a3"></i>3+ piezas</span>':'<span><i class="s1"></i>1 soporte</span><span><i class="s2"></i>2 soportes</span><span><i class="s3"></i>3 soportes</span>'}</div></section><section class="free-family-metrics"><div class="family-code"><small>REPRESENTANTE</small><code>${esc(labelConfig(family.representative))}</code></div><article><span>Composición</span><b>${family.composition}</b></article><article><span>Gradiente direccional</span><b>${family.directions}</b></article><article><span>Topología</span><b>${family.topology}</b></article><article><span>Baterías</span><b>${family.battery}</b></article><article><span>Acción 1× / 2× / 3+×</span><b>${analysis.actionSingleCount} / ${analysis.actionDoubleCount} / ${analysis.actionTriplePlusCount}</b></article><article><span>Subacción 1 / 2 / 3</span><b>${analysis.subactionSingleCount} / ${analysis.subactionDoubleCount} / ${analysis.subactionTriplePlusCount}</b></article><p><b>Acción</b> mide multiplicidad de control directo. <b>Subacción</b> proyecta sobre el rayo de la pieza principal la cantidad de piezas de rayo compatibles situadas detrás; la pieza principal no se cuenta.</p></section></div>${examples?`<details class="structure-family-examples"><summary>Otros ejemplos de la familia (${Math.min(10,family.examples.length)})</summary><div class="free-family-example-grid">${examples}</div></details>`:''}`;
 },
 renderFreeStructures(){
  const lab=this.ensureFreeStructureLab(),v=$('#view'),config=lab.config,window=normalizeRowWindow(config.rowStart,config.rowEnd),viewMode=this.db.settings.structureViewMode==='gallery'?'gallery':'list',families=lab.result?.families||[],mode=config.controlMode==='subaction'?'subaction':'action';
  const pieceOptions=value=>`<option value="">— Sin pieza —</option>${FREE_PIECE_TYPES.map(type=>`<option value="${type}" ${value===type?'selected':''}>${PIECE_GLYPH[type]} ${PIECE_NAME[type]}</option>`).join('')}`;
  v.innerHTML=`<section class="page-head free-structure-head"><button data-free-back>←</button><div><small>ESTUDIAR ESTRUCTURAS · LABORATORIO LIBRE</small><h1>Piezas libres</h1><p>Escoge de 1 a 4 piezas, incluso repetidas. OmegaZero agrupa automáticamente configuraciones geométricas dentro de una ventana vertical de hasta cuatro filas.</p></div></section>
  <section class="free-structure-config panel"><div class="free-piece-selectors">${config.pieces.map((piece,index)=>`<label>Pieza ${index+1}<select data-free-piece="${index}">${pieceOptions(piece)}</select></label>`).join('')}</div><div class="free-row-controls"><label>Fila inicial <b data-free-start-value>${window.start}</b><input type="range" min="1" max="8" step="1" value="${window.start}" data-free-row-start></label><label>Fila final <b data-free-end-value>${window.end}</b><input type="range" min="1" max="8" step="1" value="${window.end}" data-free-row-end></label><span data-free-window>Ventana ${window.start}–${window.end} · amplitud ${window.height}</span></div><label class="toggle free-reflect"><input type="checkbox" data-free-reflect ${config.mirrorEquivalent?'checked':''}> Considerar reflejos izquierda↔derecha equivalentes</label><div class="free-mode-slider"><span class="${mode==='action'?'active':''}">Acción</span><input type="range" min="0" max="1" step="1" value="${mode==='subaction'?1:0}" data-free-control-mode aria-label="Acción o Subacción"><span class="${mode==='subaction'?'active':''}">Subacción</span></div><div class="free-color-key">${mode==='action'?'<span><i class="a1"></i>Verde · 1 pieza</span><span><i class="a2"></i>Azul · 2 piezas</span><span><i class="a3"></i>Morado · 3+ piezas</span>':'<span><i class="s1"></i>Amarillo · 1 pieza detrás</span><span><i class="s2"></i>Naranja · 2 piezas detrás</span><span><i class="s3"></i>Rojo · 3 piezas detrás</span>'}</div></section>
  <section class="structure-family-toolbar free-toolbar"><label>Buscar familia o pieza<input type="search" data-free-search placeholder="Ej. F-0001, RRQ, O3" value="${esc(lab.filter||'')}"></label><div class="structure-view-switch"><button data-structure-view="list" class="${viewMode==='list'?'active':''}">☷ Lista</button><button data-structure-view="gallery" class="${viewMode==='gallery'?'active':''}">▦ Galería</button></div><span data-free-count>${lab.busy?'Calculando…':lab.error?esc(lab.error):lab.result?`${families.length} familias · ${lab.result.configurations.toLocaleString('es-EC')} configuraciones normalizadas`:'Preparando…'}</span><button data-free-regenerate ${lab.busy?'disabled':''}>Recalcular</button></section>
  ${lab.busy?'<section class="free-loading panel"><b>Generando familias…</b><p>El cálculo se ejecuta fuera de la interfaz principal cuando el navegador admite Web Workers.</p><i></i></section>':lab.error?`<section class="free-loading panel error"><b>No se pudo generar</b><p>${esc(lab.error)}</p></section>`:lab.result?`<section class="structure-family-list free-family-list ${viewMode==='gallery'?'gallery-mode':'list-mode'}">${families.map(family=>`<details class="structure-family-row free-family-row" data-free-family="${family.id}" data-search="${esc(`${family.id} ${family.key} ${family.composition} ${family.directions} ${family.topology} ${family.battery} ${labelConfig(family.representative)}`.toLowerCase())}"><summary><div><small>${family.id}</small><b>${family.composition} · ${family.directions}</b><code>${family.battery}</code></div>${viewMode==='gallery'?`<figure class="structure-family-preview free-family-preview" data-free-preview></figure>`:''}<span>${esc(labelConfig(family.representative))}</span></summary><div class="structure-family-lazy" data-free-body></div></details>`).join('')}</section>`:'<section class="free-loading panel"><b>Preparando familias…</b></section>'}`;
  $('[data-free-back]')?.addEventListener('click',()=>{lab.worker?.terminate?.();lab.worker=null;this.screen='structureStudy';this.render()});
  $$('[data-free-piece]').forEach(select=>select.addEventListener('change',()=>{const pieces=[...lab.config.pieces];pieces[Number(select.dataset.freePiece)]=select.value;this.persistFreeStructureConfig({pieces});this.scheduleFreeStructureGeneration()}));
  const start=$('[data-free-row-start]'),end=$('[data-free-row-end]');
  const updateRows=source=>{let a=Number(start.value),b=Number(end.value);if(source==='start'){if(a>b)b=a;if(b-a+1>4)b=a+3;if(b>8){b=8;a=5}}else{if(b<a)a=b;if(b-a+1>4)a=b-3;if(a<1){a=1;b=4}}start.value=a;end.value=b;const w=normalizeRowWindow(a,b);this.persistFreeStructureConfig({rowStart:w.start,rowEnd:w.end});this.scheduleFreeStructureGeneration(180)};
  start?.addEventListener('input',()=>updateRows('start'));end?.addEventListener('input',()=>updateRows('end'));
  $('[data-free-reflect]')?.addEventListener('change',event=>{this.persistFreeStructureConfig({mirrorEquivalent:event.target.checked});this.scheduleFreeStructureGeneration()});
  $('[data-free-control-mode]')?.addEventListener('input',event=>{this.persistFreeStructureConfig({controlMode:Number(event.target.value)?'subaction':'action'});this.renderFreeStructures()});
  $$('[data-structure-view]').forEach(button=>button.addEventListener('click',()=>{this.db.settings.structureViewMode=button.dataset.structureView==='gallery'?'gallery':'list';saveDb(this.db);this.renderFreeStructures()}));
  $('[data-free-regenerate]')?.addEventListener('click',()=>this.generateFreeStructureFamilies());
  const search=$('[data-free-search]'),counter=$('[data-free-count]');
  const apply=()=>{const q=(search?.value||'').trim().toLowerCase();lab.filter=q;let visible=0;$$('.free-family-row').forEach(row=>{const show=!q||row.dataset.search.includes(q);row.hidden=!show;if(show)visible+=1});if(counter&&lab.result)counter.textContent=`${visible} / ${families.length} familias · ${lab.result.configurations.toLocaleString('es-EC')} configuraciones normalizadas`};search?.addEventListener('input',apply);apply();
  const byId=new Map(families.map(f=>[f.id,f]));
  const hydratePreview=row=>{const target=$('[data-free-preview]',row);if(!target||target.dataset.loaded==='1')return;const family=byId.get(row.dataset.freeFamily);if(!family)return;target.innerHTML=this.freeStructureBoardHtml(family.representative,true);target.dataset.loaded='1'};
  if(viewMode==='gallery'){const rows=$$('.free-family-row');if('IntersectionObserver' in globalThis){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){hydratePreview(entry.target);observer.unobserve(entry.target)}}),{rootMargin:'260px'});rows.forEach(row=>observer.observe(row))}else rows.forEach(hydratePreview)}
  $$('.free-family-row').forEach(row=>row.addEventListener('toggle',()=>{if(!row.open)return;hydratePreview(row);const body=$('[data-free-body]',row);if(!body||body.dataset.loaded==='1')return;const family=byId.get(row.dataset.freeFamily);if(!family)return;body.innerHTML=this.freeFamilyBodyHtml(family);body.dataset.loaded='1'}));
  if(!lab.result&&!lab.busy&&!lab.error)queueMicrotask(()=>this.generateFreeStructureFamilies());
 },
};

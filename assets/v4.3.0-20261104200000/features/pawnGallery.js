import { saveDb, APP_VERSION, $, $$, esc, publicAsset, analyzePawnStructure, buildPawnFamilies, pawnFamilySignature } from '../app/deps.js';
import { THEMES } from '../app/config.js';
export const pawnGalleryMethods = {
 pawnStructureAnnotationState(code){
  if(!this.pawnGalleryAnnotations)this.pawnGalleryAnnotations=new Map();
  if(!this.pawnGalleryAnnotations.has(code))this.pawnGalleryAnnotations.set(code,{circles:new Map(),arrows:[]});
  return this.pawnGalleryAnnotations.get(code);
 },
 pawnStructureAnnotationSvg(state){
  if(!state?.arrows?.length)return'';
  const xy=point=>{const [file,rank]=String(point).split(':').map(Number);return[file*100+50,(6-rank)*100+50]};
  return `<svg class="pawn-structure-arrows" viewBox="0 0 600 600" aria-hidden="true">${state.arrows.map(a=>{const [x1,y1]=xy(a.from),[x2,y2]=xy(a.to),c=a.color||'yellow',dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len,baseX=x2-34*ux,baseY=y2-34*uy,px=-uy,py=ux,leftX=baseX+20*px,leftY=baseY+20*py,rightX=baseX-20*px,rightY=baseY-20*py,shaftX=baseX-3*ux,shaftY=baseY-3*uy;return `<line class="stroke-${c}" x1="${x1}" y1="${y1}" x2="${shaftX}" y2="${shaftY}"/><polygon class="fill-${c}" points="${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}"/>`}).join('')}</svg>`
 },
 pawnStructureBoardHtml(analysis,large=false,annotationState=null){
  const byRank=[...analysis.cells].sort((a,b)=>b.rank-a.rank||a.file-b.file);
  const pawnAsset=publicAsset('pieces/alpha/wP.png',APP_VERSION);
  return `<div class="pawn-structure-board ${large?'large':''} ${annotationState?'annotatable':''}" role="img" aria-label="Estructura ${analysis.code}, estados ${analysis.heights.join(', ')}. Tablero de seis por seis con núcleo de cuatro por cuatro centrado.">${byRank.map(cell=>{
   const classes=['pawn-structure-cell',((cell.file+cell.rank)%2?'light':'dark')];
   if(cell.isCore)classes.push('core');
   else classes.push('outer');
   if(cell.isCore&&cell.file===1)classes.push('core-left');
   if(cell.isCore&&cell.file===4)classes.push('core-right');
   if(cell.isCore&&cell.rank===5)classes.push('core-top');
   if(cell.isCore&&cell.rank===2)classes.push('core-bottom');
   if(cell.controlCount===1)classes.push('control-single');
   else if(cell.controlCount===2)classes.push('control-double');
   else if(cell.controlCount>=3)classes.push('control-triple');
   if(cell.pawn)classes.push('occupied');
   const square=`${cell.file}:${cell.rank}`,circle=annotationState?.circles?.get(square);
   return `<span class="${classes.join(' ')}" data-rank="${cell.rank}" data-file="${cell.file}" data-pawn-square="${square}">${cell.pawn?`<img class="pawn-structure-piece" src="${pawnAsset}" alt="" draggable="false">`:''}${cell.controlCount>1?`<b aria-label="multiplicidad de control">${cell.controlCount>=3?'3+':'2×'}</b>`:''}${circle?`<i class="pawn-ann-circle ann-${circle}" aria-hidden="true"></i>`:''}</span>`;
  }).join('')}${annotationState?this.pawnStructureAnnotationSvg(annotationState):''}</div>`
 },
 pawnStructureAnnotationToolbar(){
  const color=this.pawnGalleryAnnotationColor||this.annotation?.color||'yellow';
  return `<div class="pawn-annotation-toolbar"><div><b>✎ Anotaciones</b><div class="color-row">${['red','yellow','green','blue'].map(c=>`<button type="button" data-pawn-ann-color="${c}" class="swatch ${c} ${color===c?'active':''}" aria-label="Color ${c}"></button>`).join('')}</div><button type="button" data-pawn-ann-clear>Limpiar</button></div><small><b>PC:</b> clic derecho = círculo · arrastre derecho = flecha. <b>Táctil:</b> toque = círculo · arrastre = flecha.</small></div>`
 },
 bindPawnStructureAnnotationBoard(modal,code,rerender){
  const board=$('.pawn-structure-board.large',modal);if(!board)return;
  const state=this.pawnStructureAnnotationState(code);
  board.oncontextmenu=e=>e.preventDefault();
  const begin=(e,square)=>{
   if(!(e.button===2||e.pointerType==='touch'))return;
   e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture?.(e.pointerId);
   this.pawnGalleryRightAnnotation={id:e.pointerId,from:square,x:e.clientX,y:e.clientY,moved:false,code};
  };
  const move=e=>{const d=this.pawnGalleryRightAnnotation;if(!d||e.pointerId!==d.id||d.code!==code)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>7)d.moved=true};
  const end=e=>{
   const d=this.pawnGalleryRightAnnotation;if(!d||e.pointerId!==d.id||d.code!==code)return;
   this.pawnGalleryRightAnnotation=null;e.preventDefault();e.stopPropagation();
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-pawn-square]');
   const to=target&&board.contains(target)?target.dataset.pawnSquare:d.from;
   const color=this.pawnGalleryAnnotationColor||this.annotation?.color||'yellow';
   if(d.moved&&to&&to!==d.from){
    const ix=state.arrows.findIndex(a=>a.from===d.from&&a.to===to);
    if(ix>=0&&state.arrows[ix].color===color)state.arrows.splice(ix,1);
    else{if(ix>=0)state.arrows.splice(ix,1);state.arrows.push({from:d.from,to,color})}
   }else{
    state.circles.get(d.from)===color?state.circles.delete(d.from):state.circles.set(d.from,color);
   }
   rerender(code);
  };
  $$('[data-pawn-square]',board).forEach(cell=>{
   cell.onpointerdown=e=>begin(e,cell.dataset.pawnSquare);
   cell.onpointermove=move;
   cell.onpointerup=end;
   cell.onpointercancel=e=>{if(this.pawnGalleryRightAnnotation?.id===e.pointerId)this.pawnGalleryRightAnnotation=null};
  });
  $$('[data-pawn-ann-color]',modal).forEach(button=>button.onclick=()=>{this.pawnGalleryAnnotationColor=button.dataset.pawnAnnColor;rerender(code)});
  $('[data-pawn-ann-clear]',modal)?.addEventListener('click',()=>{state.circles.clear();state.arrows.length=0;rerender(code)});
 },
 pawnStructureCardHtml(code){
  const analysis=analyzePawnStructure(code);
  return `<button type="button" class="pawn-structure-card" data-pawn-structure="${code}" data-code="${code}" aria-label="Abrir estructura ${code}"><header><strong>${code}</strong><small>[${analysis.heights.join(' · ')}]</small></header>${this.pawnStructureBoardHtml(analysis)}<footer><span title="Control 1×">1× ${analysis.singleControlledCount}</span><span title="Control 2×">2× ${analysis.doubleControlledCount}</span><span title="Control 3+×">3+ ${analysis.triplePlusControlledCount}</span></footer></button>`
 },
 pawnFamilyBodyHtml(family){
  const analysis=analyzePawnStructure(family.representative);
  const signed=value=>value==null?'—':value>0?`+${value}`:`${value}`;
  const examples=family.examples.slice(0,10).map(code=>{
   const a=analyzePawnStructure(code);
   return `<button type="button" class="pawn-family-example" data-open-pawn-code="${code}"><code>${code}</code>${this.pawnStructureBoardHtml(a)}<small>Gradiente: (${a.gradient.map(signed).join(', ')})</small></button>`;
  }).join('');
  return `<div class="pawn-family-body"><section class="pawn-family-representative">${this.pawnStructureBoardHtml(analysis)}<button type="button" data-open-pawn-code="${family.representative}" class="pawn-family-open">Abrir ${family.representative}</button></section><section class="pawn-structure-metrics"><article><span>Casillas con control 1×</span><b>${analysis.singleControlledCount}</b></article><article><span>Casillas con control 2×</span><b>${analysis.doubleControlledCount}</b></article><article><span>Casillas con control 3+×</span><b>${analysis.triplePlusControlledCount}</b></article><article><span>Gradiente exacto</span><b>(${analysis.gradient.map(signed).join(', ')})</b></article><p class="pawn-gradient-note"><b>Familia geométrica:</b> se conserva el patrón de presencia y únicamente el signo de cada componente del gradiente: sube, baja, plano o ausencia. La magnitud exacta permanece en cada ejemplo.</p></section></div>${family.examples.length?`<details class="structure-family-examples pawn-family-examples"><summary>Otros ejemplos de la misma familia (${Math.min(10,family.examples.length)})</summary><div class="pawn-family-example-grid">${examples}</div></details>`:''}`;
 },
 renderPawnGallery(){
  const v=$('#view'),families=buildPawnFamilies();
  const savedFilter=String(this.pawnGalleryFilter||'').trim().toLowerCase();
  const viewMode=this.db.settings.structureViewMode==='gallery'?'gallery':'list';
  v.innerHTML=`<section class="page-head pawn-gallery-head"><button data-pawn-gallery-back aria-label="Volver">←</button><div><small>ESTUDIAR ESTRUCTURAS · PEONES</small><h1>Familias de estructuras de peones</h1><p>El tablero 6×6 y la codificación <b>0, 1, 2, 3, 9</b> permanecen sin cambios. Las configuraciones se agrupan por patrón geométrico de presencia y por el signo del gradiente 1D.</p></div></section>
  <section class="pawn-gallery-method panel"><div class="pawn-color-legend"><span><i class="legend-green"></i><b>Verde</b> control por una pieza</span><span><i class="legend-blue"></i><b>Azul</b> control por dos piezas</span><span><i class="legend-purple"></i><b>Morado</b> control por tres o más piezas</span></div><p>Una familia no borra la precisión del código: dentro de ella puedes abrir hasta diez ejemplos y luego inspeccionar cualquier ejemplo en el tablero ampliado con las anotaciones de OmegaZero.</p></section>
  <section class="pawn-gallery-toolbar"><label class="pawn-gallery-search-label">Buscar familia o código<input data-pawn-gallery-search autocomplete="off" spellcheck="false" placeholder="Ej. P-014, 1239, sube" value="${esc(savedFilter)}"></label><div class="structure-view-switch" role="group" aria-label="Modo de visualización"><button type="button" data-structure-view="list" class="${viewMode==='list'?'active':''}" aria-pressed="${viewMode==='list'}">☷ Lista</button><button type="button" data-structure-view="gallery" class="${viewMode==='gallery'?'active':''}" aria-pressed="${viewMode==='gallery'}">▦ Galería</button></div><span data-pawn-gallery-count>${families.length} familias</span><button type="button" data-pawn-gallery-clear>Mostrar todas</button></section>
  <section class="structure-family-list pawn-family-list ${viewMode==='gallery'?'gallery-mode':'list-mode'}">${families.map(family=>`<details class="structure-family-row pawn-family-row" data-pawn-family="${family.id}" data-family-key="${family.key}" data-search="${esc(`${family.id} ${family.key} ${family.label} ${family.representative} ${family.examples.join(' ')}`.toLowerCase())}"><summary><div><small>${family.id}</small><b>${esc(family.label)}</b><code>${family.key}</code></div>${viewMode==='gallery'?`<figure class="structure-family-preview pawn-family-preview" data-pawn-family-preview aria-label="Vista previa de ${family.id}"></figure>`:''}<span>${family.representative}</span></summary><div class="structure-family-lazy" data-pawn-family-body></div></details>`).join('')}</section>`;
  $('[data-pawn-gallery-back]')?.addEventListener('click',()=>{this.screen='structureStudy';this.render()});
  $$('[data-structure-view]').forEach(button=>button.addEventListener('click',()=>{
   const mode=button.dataset.structureView==='gallery'?'gallery':'list';if(mode===viewMode)return;
   this.db.settings.structureViewMode=mode;saveDb(this.db);this.renderPawnGallery();
  }));
  const search=$('[data-pawn-gallery-search]'),count=$('[data-pawn-gallery-count]');
  const apply=()=>{
   const query=(search?.value||'').trim().toLowerCase();this.pawnGalleryFilter=query;let visible=0,targetKey=null;
   if(/^[01239]{4}$/.test(query)){try{targetKey=pawnFamilySignature(query)}catch{/* búsqueda textual */}}
   $$('.pawn-family-row').forEach(row=>{const show=!query||(targetKey?row.dataset.familyKey===targetKey:row.dataset.search.includes(query));row.hidden=!show;if(show)visible+=1});
   if(count)count.textContent=`${visible} / ${families.length} familias`;
  };
  search?.addEventListener('input',apply);apply();
  $('[data-pawn-gallery-clear]')?.addEventListener('click',event=>{event.preventDefault();this.pawnGalleryFilter='';if(search)search.value='';apply();search?.focus()});
  const byId=new Map(families.map(family=>[family.id,family]));
  const hydratePreview=row=>{
   const preview=$('[data-pawn-family-preview]',row);if(!preview||preview.dataset.loaded==='1')return;
   const family=byId.get(row.dataset.pawnFamily);if(!family)return;
   preview.innerHTML=this.pawnStructureBoardHtml(analyzePawnStructure(family.representative));preview.dataset.loaded='1';
  };
  if(viewMode==='gallery'){
   const rows=$$('.pawn-family-row');
   if('IntersectionObserver' in globalThis){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){hydratePreview(entry.target);observer.unobserve(entry.target)}}),{rootMargin:'260px'});rows.forEach(row=>observer.observe(row))}
   else rows.forEach(hydratePreview);
  }
  $$('.pawn-family-row').forEach(row=>row.addEventListener('toggle',()=>{
   if(!row.open)return;hydratePreview(row);const body=$('[data-pawn-family-body]',row);if(!body||body.dataset.loaded==='1')return;
   const family=byId.get(row.dataset.pawnFamily);if(!family)return;body.innerHTML=this.pawnFamilyBodyHtml(family);body.dataset.loaded='1';
   $$('[data-open-pawn-code]',body).forEach(button=>button.addEventListener('click',()=>this.openPawnStructureDetail(button.dataset.openPawnCode)));
  }));
 },
 openPawnStructureDetail(initialCode){
  const modal=document.createElement('div');modal.className='modal pawn-structure-modal';
  // Este modal vive fuera de .app; copia explícitamente el tema activo para no perder
  // las variables --light/--dark/--accent del tablero seleccionado en Configuración.
  const pawnTheme=THEMES[this.db.settings.boardColor]||THEMES.blue;
  modal.style.setProperty('--light',pawnTheme.light);
  modal.style.setProperty('--dark',pawnTheme.dark);
  modal.style.setProperty('--accent',pawnTheme.accent);
  const family=buildPawnFamilies().find(item=>item.key===pawnFamilySignature(initialCode));
  const familyCodes=family?[family.representative,...family.examples.filter(code=>code!==family.representative)]:[initialCode];
  if(!familyCodes.includes(initialCode))familyCodes.unshift(initialCode);
  let currentCode=initialCode;
  const signed=value=>value==null?'—':value>0?`+${value}`:`${value}`;
  const renderCode=code=>{
   currentCode=code;
   const analysis=analyzePawnStructure(code),index=familyCodes.indexOf(code),last=familyCodes.length-1;
   const annotationState=this.pawnStructureAnnotationState(code);
   modal.innerHTML=`<div class="dialog pawn-structure-dialog"><header><div><small>${family?`FAMILIA ${family.id} · `:''}VECTOR [${analysis.heights.join(', ')}]</small><h2>${analysis.code}</h2></div><nav class="pawn-structure-dialog-nav" aria-label="Navegación entre estructuras"><button type="button" data-pawn-prev aria-label="Estructura anterior" ${index<=0?'disabled':''}>←</button><span>${index+1} / ${familyCodes.length}</span><button type="button" data-pawn-next aria-label="Estructura siguiente" ${index>=last?'disabled':''}>→</button><button type="button" data-close aria-label="Cerrar">×</button></nav></header><div class="pawn-structure-detail-grid"><section>${this.pawnStructureBoardHtml(analysis,true,annotationState)}${this.pawnStructureAnnotationToolbar()}<div class="pawn-color-legend compact"><span><i class="legend-green"></i>1×</span><span><i class="legend-blue"></i>2×</span><span><i class="legend-purple"></i>3+×</span></div></section><section class="pawn-structure-metrics"><article><span>Casillas con control 1×</span><b>${analysis.singleControlledCount}</b></article><article><span>Casillas con control 2×</span><b>${analysis.doubleControlledCount}</b></article><article><span>Casillas con control 3+×</span><b>${analysis.triplePlusControlledCount}</b></article><article><span>Gradiente</span><b>(${analysis.gradient.map(signed).join(', ')})</b></article><p class="pawn-gradient-note"><b>¿Qué significa el gradiente?</b> Es el cambio de altura entre peones adyacentes: <code>(b−a, c−b, d−c)</code>. Un valor positivo indica que la estructura sube hacia la derecha; uno negativo, que baja; <b>0</b> significa misma altura y <b>—</b> aparece cuando ese tramo contiene un peón ausente (9).</p></section></div><footer class="pawn-structure-note">El código de colores es puramente multiplicidad de control: <b>verde</b> para una pieza, <b>azul</b> para dos y <b>morado</b> para tres o más. Los indicadores son descriptivos y no califican la estructura como buena o mala.</footer></div>`;
   this.bindPawnStructureAnnotationBoard(modal,code,renderCode);
   $('[data-pawn-prev]',modal)?.addEventListener('click',()=>{if(index>0)renderCode(familyCodes[index-1])});
   $('[data-pawn-next]',modal)?.addEventListener('click',()=>{if(index<last)renderCode(familyCodes[index+1])});
   $('[data-close]',modal)?.addEventListener('click',close);
  };
  const onKey=event=>{
   const index=familyCodes.indexOf(currentCode);
   if(event.key==='ArrowLeft'&&index>0){event.preventDefault();renderCode(familyCodes[index-1])}
   else if(event.key==='ArrowRight'&&index<familyCodes.length-1){event.preventDefault();renderCode(familyCodes[index+1])}
   else if(event.key==='Escape')close();
  };
  const close=()=>{document.removeEventListener('keydown',onKey);modal.remove()};
  document.body.appendChild(modal);renderCode(initialCode);document.addEventListener('keydown',onKey);modal.addEventListener('click',event=>{if(event.target===modal)close()});
 }
};

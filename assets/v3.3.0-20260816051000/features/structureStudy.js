import { saveDb, APP_VERSION, $, $$, esc, publicAsset, getStructureFamilies, analyzePieceConfiguration, formatGradient2D } from '../app/deps.js';

const KIND_COPY=Object.freeze({
  minor:{
    eyebrow:'PIEZAS MENORES · GRADIENTE 2D',
    title:'Familias de piezas menores',
    description:'Caballo de dama · alfil de dama · alfil de rey · caballo de rey. Las ubicaciones se restringen a las filas 2–5; la trayectoria previa se ignora.',
    roles:['CD','AD','AR','CR'],
  },
  major:{
    eyebrow:'PIEZAS MAYORES · RETAGUARDIA',
    title:'Familias de piezas mayores',
    description:'Torre de dama · dama · rey · torre de rey. Las ubicaciones se restringen a las filas 1–3; el rey se incluye por su relación geométrica con la retaguardia aunque no sea técnicamente una pieza mayor.',
    roles:['TD','D','R','TR'],
  },
});

export const structureStudyMethods={
 renderStructureStudy(){
  const v=$('#view');
  v.innerHTML=`<section class="page-head structure-study-head"><button data-structures-home aria-label="Volver">←</button><div><small>INVESTIGAR · TAXONOMÍA GEOMÉTRICA</small><h1>Estudiar estructuras</h1><p>OmegaZero separa la posición en alfabetos pequeños. Los módulos curados conservan familias estables y el laboratorio libre permite escoger hasta cuatro piezas y descubrir familias automáticamente.</p></div></section>
  <section class="structure-study-intro panel"><div><b>Código de color común</b><p><span class="structure-color-chip one"></span><strong>Verde</strong>: casilla controlada por una pieza. <span class="structure-color-chip two"></span><strong>Azul</strong>: casilla controlada por dos piezas. <span class="structure-color-chip three"></span><strong>Morado</strong>: casilla controlada por tres o más piezas. El tablero siempre utiliza el color seleccionado en Configuración.</p></div><small>La agrupación no califica una familia como buena o mala: solo describe relaciones geométricas reproducibles.</small></section>
  <section class="structure-study-grid">
   <button type="button" data-structure-kind="pawns" class="structure-study-card pawn"><div class="structure-card-icon">♟♟♟♟</div><small>TERRENO Y CONTROL</small><h2>Peones</h2><p>Tablero 6×6 y codificación 0, 1, 2, 3, 9. Conserva exactamente el mapa visual ya construido.</p><span>Gradiente 1D → familias</span></button>
   <button type="button" data-structure-kind="minor" class="structure-study-card minor"><div class="structure-card-icon">♞♝♝♞</div><small>DESARROLLO Y COORDINACIÓN</small><h2>Piezas menores</h2><p>CD · AD · AR · CR sobre tablero 8×8, con posiciones permitidas exclusivamente entre las filas 2 y 5.</p><span>Gradiente 2D → familias</span></button>
   <button type="button" data-structure-kind="major" class="structure-study-card major"><div class="structure-card-icon">♜♛♚♜</div><small>RETAGUARDIA Y ALCANCE</small><h2>Piezas mayores</h2><p>TD · D · R · TR sobre tablero 8×8, con posiciones permitidas exclusivamente entre las filas 1 y 3.</p><span>Gradiente 2D → familias</span></button>
   <button type="button" data-structure-kind="free" class="structure-study-card free"><div class="structure-card-icon">♞♝♜♛</div><small>LABORATORIO ABIERTO</small><h2>Piezas libres</h2><p>Escoge de 1 a 4 piezas, repetidas o distintas, cualquier ventana de filas con amplitud máxima 4 y alterna entre Acción y Subacción.</p><span>Composición · geometría · baterías</span></button>
  </section>`;
  $('[data-structures-home]')?.addEventListener('click',()=>{this.screen='home';this.render()});
  $$('[data-structure-kind]').forEach(button=>button.addEventListener('click',()=>{
    const kind=button.dataset.structureKind;
    if(kind==='pawns'){this.screen='pawnGallery';this.render();return}
    if(kind==='free'){this.screen='freeStructures';this.render();return}
    this.structureFamilyKind=kind;
    this.structureFamilyFilter='';
    this.screen='structureFamilies';
    this.render();
  }));
 },
 pieceStructureBoardHtml(kind,analysis,compact=false){
  const pieceBySquare=new Map(analysis.pieces.map(piece=>[piece.square,piece]));
  const allowed=new Set(kind==='minor'?[2,3,4,5]:[1,2,3]);
  const cells=[];
  for(let rank=8;rank>=1;rank-=1){
   for(let file=1;file<=8;file+=1){
    const square=`${'abcdefgh'[file-1]}${rank}`;
    const piece=pieceBySquare.get(square),count=analysis.totalControl.get(square)||0;
    const classes=['piece-structure-cell',((file+rank)%2?'light':'dark')];
    if(allowed.has(rank))classes.push('placement-zone');else classes.push('outside-zone');
    if(count===1)classes.push('control-single');
    else if(count===2)classes.push('control-double');
    else if(count>=3)classes.push('control-triple');
    if(piece)classes.push('occupied');
    const asset=piece?publicAsset(`pieces/alpha/w${piece.type}.png`,APP_VERSION):'';
    cells.push(`<span class="${classes.join(' ')}" data-piece-square="${square}" title="${square}${count?` · control ${count}`:''}">${piece?`<img src="${asset}" class="piece-structure-piece" alt="${esc(piece.role)} en ${square}" draggable="false">`:''}${count>1?`<b>${count>=3?'3+':'2×'}</b>`:''}</span>`);
   }
  }
  return `<div class="piece-structure-board ${compact?'compact':''}" role="img" aria-label="${kind==='minor'?'Piezas menores':'Piezas mayores'}: ${analysis.squares.join(', ')}">${cells.join('')}</div>`;
 },
 pieceFamilyBodyHtml(kind,family){
  const copy=KIND_COPY[kind],analysis=analyzePieceConfiguration(kind,family.representative);
  const exampleBoards=family.examples.slice(0,10).map(example=>{
   const a=analyzePieceConfiguration(kind,example);
   return `<article class="structure-example"><code>${example.join(' · ')}</code>${this.pieceStructureBoardHtml(kind,a,true)}<small>Gradiente exacto: ${formatGradient2D(a.gradients)}</small></article>`;
  }).join('');
  return `<div class="structure-family-body"><section class="structure-family-representative">${this.pieceStructureBoardHtml(kind,analysis)}<div class="structure-family-legend"><span><i class="one"></i>Control por una pieza</span><span><i class="two"></i>Control por dos piezas</span><span><i class="three"></i>Control por tres o más piezas</span></div></section><section class="structure-family-metrics"><div class="family-code"><small>REPRESENTANTE</small><code>${family.representative.join(' · ')}</code><div>${copy.roles.map((role,index)=>`<span><b>${role}</b>${family.representative[index]}</span>`).join('')}</div></div><article><span>Gradiente 2D exacto</span><b>${formatGradient2D(analysis.gradients)}</b></article><article><span>Casillas con control 1×</span><b>${analysis.singleControlledCount}</b></article><article><span>Casillas con control 2×</span><b>${analysis.doubleControlledCount}</b></article><article><span>Casillas con control 3+×</span><b>${analysis.triplePlusControlledCount}</b></article><p class="structure-gradient-note"><b>Familia geométrica:</b> para agrupar se conserva la <em>dirección</em> de cada vector del gradiente 2D y se ignora su magnitud. Así, (+1,+2) y (+3,+1) pertenecen a la misma dirección NE, pero el gradiente exacto sigue visible en cada ejemplo.</p></section></div>${family.examples.length?`<details class="structure-family-examples"><summary>Otros ejemplos de la misma familia (${Math.min(10,family.examples.length)})</summary><div class="structure-example-grid">${exampleBoards}</div></details>`:'<p class="structure-no-examples">No se necesitan ejemplos adicionales para esta familia.</p>'}`;
 },
 renderStructureFamilies(){
  const kind=this.structureFamilyKind==='major'?'major':'minor',copy=KIND_COPY[kind],families=getStructureFamilies(kind),v=$('#view');
  const query=String(this.structureFamilyFilter||'').trim().toLowerCase();
  const viewMode=this.db.settings.structureViewMode==='gallery'?'gallery':'list';
  v.innerHTML=`<section class="page-head structure-families-head"><button data-structure-back aria-label="Volver">←</button><div><small>${copy.eyebrow}</small><h1>${copy.title}</h1><p>${copy.description}</p></div></section><section class="structure-family-method panel"><p><b>Cómo se forma una familia.</b> Se toman las cuatro piezas en su orden fijo y se calcula el gradiente 2D entre cada pareja consecutiva. Para la familia se conserva su dirección (N, NE, E, SE, S, SW, W, NW); el desplazamiento exacto se mantiene dentro de cada ejemplo. El mapa de control es intrínseco a estas cuatro piezas: no presupone peones ni piezas enemigas.</p><div class="structure-family-key"><span><i class="one"></i>Verde = control por una pieza</span><span><i class="two"></i>Azul = control por dos piezas</span><span><i class="three"></i>Morado = control por tres o más piezas</span><span>Filas permitidas: <b>${kind==='minor'?'2–5':'1–3'}</b></span></div></section><section class="structure-family-toolbar"><label>Buscar familia, dirección o casilla<input type="search" data-structure-family-search autocomplete="off" placeholder="Ej. NE|S|E, M-001 o c3 f4 g2 f3" value="${esc(query)}"></label><div class="structure-view-switch" role="group" aria-label="Modo de visualización"><button type="button" data-structure-view="list" class="${viewMode==='list'?'active':''}" aria-pressed="${viewMode==='list'}">☷ Lista</button><button type="button" data-structure-view="gallery" class="${viewMode==='gallery'?'active':''}" aria-pressed="${viewMode==='gallery'}">▦ Galería</button></div><span data-structure-family-count>${families.length} familias</span><button type="button" data-structure-family-clear>Mostrar todas</button></section><section class="structure-family-list ${viewMode==='gallery'?'gallery-mode':'list-mode'}">${families.map(family=>`<details class="structure-family-row" data-family-id="${family.id}" data-family-key="${family.key}" data-search="${esc(`${family.id} ${family.key} ${family.label} ${family.representative.join(' ')} ${family.examples.flat().join(' ')}`.toLowerCase())}"><summary><div><small>${family.id}</small><b>${family.label}</b><code>${family.key}</code></div>${viewMode==='gallery'?`<figure class="structure-family-preview" data-family-preview aria-label="Vista previa de ${family.id}"></figure>`:''}<span>${family.representative.join(' · ')}</span></summary><div class="structure-family-lazy" data-family-body></div></details>`).join('')}</section>`;
  $('[data-structure-back]')?.addEventListener('click',()=>{this.screen='structureStudy';this.render()});
  $$('[data-structure-view]').forEach(button=>button.addEventListener('click',()=>{
   const mode=button.dataset.structureView==='gallery'?'gallery':'list';if(mode===viewMode)return;
   this.db.settings.structureViewMode=mode;saveDb(this.db);this.renderStructureFamilies();
  }));
  const input=$('[data-structure-family-search]'),counter=$('[data-structure-family-count]');
  const apply=()=>{
   const value=(input?.value||'').trim().toLowerCase();this.structureFamilyFilter=value;let visible=0,targetKey=null;
   const algebraic=value.match(/[a-h][1-8]/g)||[];
   if(algebraic.length===4){try{targetKey=analyzePieceConfiguration(kind,algebraic).directionSignature}catch{/* búsqueda textual */}}
   $$('.structure-family-row').forEach(row=>{const show=!value||(targetKey?row.dataset.familyKey===targetKey:row.dataset.search.includes(value));row.hidden=!show;if(show)visible+=1});
   if(counter)counter.textContent=`${visible} / ${families.length} familias`;
  };
  input?.addEventListener('input',apply);apply();
  $('[data-structure-family-clear]')?.addEventListener('click',()=>{this.structureFamilyFilter='';if(input)input.value='';apply();input?.focus()});
  const byId=new Map(families.map(family=>[family.id,family]));
  const hydratePreview=row=>{
   const preview=$('[data-family-preview]',row);if(!preview||preview.dataset.loaded==='1')return;
   const family=byId.get(row.dataset.familyId);if(!family)return;
   preview.innerHTML=this.pieceStructureBoardHtml(kind,analyzePieceConfiguration(kind,family.representative),true);preview.dataset.loaded='1';
  };
  if(viewMode==='gallery'){
   const rows=$$('.structure-family-row');
   if('IntersectionObserver' in globalThis){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){hydratePreview(entry.target);observer.unobserve(entry.target)}}),{rootMargin:'260px'});rows.forEach(row=>observer.observe(row))}
   else rows.forEach(hydratePreview);
  }
  $$('.structure-family-row').forEach(row=>row.addEventListener('toggle',()=>{
   if(!row.open)return;hydratePreview(row);const body=$('[data-family-body]',row);if(!body||body.dataset.loaded==='1')return;
   const family=byId.get(row.dataset.familyId);if(!family)return;
   body.innerHTML=this.pieceFamilyBodyHtml(kind,family);body.dataset.loaded='1';
  }));
 }
};

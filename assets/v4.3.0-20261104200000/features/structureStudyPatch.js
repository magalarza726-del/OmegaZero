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
export const structureStudyPatch={
 renderStructureStudy(){
  const v=$('#view');
  v.innerHTML=`<section class="page-head structure-study-head"><button data-structures-home aria-label="Volver">←</button><div><small>INVESTIGAR · TAXONOMÍA GEOMÉTRICA</small><h1>Estudiar estructuras</h1><p>Este laboratorio queda reservado a clasificar estructuras. El análisis de una posición concreta, la edición libre y las capas Acción/Subacción ahora viven juntas en Aprender → Tablero de análisis.</p></div></section>
  <section class="structure-study-intro panel"><div><b>Código de color común</b><p><span class="structure-color-chip one"></span><strong>Verde</strong>: casilla controlada por una pieza. <span class="structure-color-chip two"></span><strong>Azul</strong>: casilla controlada por dos piezas. <span class="structure-color-chip three"></span><strong>Morado</strong>: casilla controlada por tres o más piezas.</p></div><small>Taxonomía = familias reproducibles. Posición concreta = Tablero de análisis.</small></section>
  <section class="structure-study-grid compact-three">
   <button type="button" data-structure-kind="pawns" class="structure-study-card pawn"><div class="structure-card-icon">♟♟♟♟</div><small>ALFABETO ESTRUCTURAL</small><h2>Peones</h2><p>Codificación 0, 1, 2, 3, 9 y familias por gradiente 1D.</p><span>625 microestructuras</span></button>
   <button type="button" data-structure-kind="presets" class="structure-study-card minor"><div class="structure-card-icon">♞♝ · ♜♛</div><small>CATÁLOGOS CURADOS</small><h2>Familias de piezas</h2><p>Accede a los presets históricos de piezas menores y retaguardia/mayores sin mezclarlos con el laboratorio libre.</p><span>Menores · Mayores</span></button>
   <button type="button" data-structure-kind="free" class="structure-study-card free"><div class="structure-card-icon">♞♝♜♛</div><small>LABORATORIO ABIERTO</small><h2>Piezas libres</h2><p>Escoge 1–4 piezas, repetidas o distintas, ventana de hasta 4 filas y familias automáticas por composición, geometría y baterías.</p><span>Acción · Subacción · familias</span></button>
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
 renderStructureFamilies(){
  const v=$('#view');
  if(this.structureFamilyKind==='presets'){
   v.innerHTML=`<section class="page-head"><button data-structure-back>←</button><div><small>ESTUDIAR ESTRUCTURAS · PRESETS</small><h1>Familias de piezas</h1><p>Los catálogos históricos se conservan como referencias curadas. Para combinaciones arbitrarias utiliza Piezas libres.</p></div></section><section class="structure-study-grid preset-grid"><button data-preset-kind="minor" class="structure-study-card minor"><div class="structure-card-icon">♞♝♝♞</div><small>FILAS 2–5</small><h2>Piezas menores</h2><p>CD · AD · AR · CR</p><span>Gradiente 2D</span></button><button data-preset-kind="major" class="structure-study-card major"><div class="structure-card-icon">♜♛♚♜</div><small>FILAS 1–3</small><h2>Retaguardia / mayores</h2><p>TD · D · R · TR</p><span>Gradiente 2D</span></button></section>`;
   $('[data-structure-back]')?.addEventListener('click',()=>{this.screen='structureStudy';this.render()});$$('[data-preset-kind]').forEach(button=>button.onclick=()=>{this.structureFamilyKind=button.dataset.presetKind;this.renderStructureFamilies()});return;
  }
  const kind=this.structureFamilyKind==='major'?'major':'minor',copy=KIND_COPY[kind],families=getStructureFamilies(kind);
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
 },
};

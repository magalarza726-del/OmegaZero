import { $, $$ } from '../app/deps.js';

const MANUAL_CHAPTERS = [{"title": "Introducción", "short": "Inicio", "file": "00.html"}, {"title": "Parte I — Evaluar una posición", "short": "I · Evaluación", "file": "01.html"}, {"title": "Parte II — Calcular con precisión", "short": "II · Cálculo", "file": "02.html"}, {"title": "Parte III — Convertir evaluación en estrategia", "short": "III · Estrategia", "file": "03.html"}, {"title": "Parte IV — Técnica de élite", "short": "IV · Técnica", "file": "04.html"}, {"title": "Parte V — Rendimiento competitivo", "short": "V · Rendimiento", "file": "05.html"}, {"title": "Parte VI — Protocolo de partida clásica", "short": "VI · Protocolo", "file": "06.html"}, {"title": "Parte VII — Las 20 características del Gran Maestro", "short": "VII · Perfil", "file": "07.html"}, {"title": "Matriz final — 5 pasos por característica", "short": "Matriz · 5 niveles", "file": ["08a.html", "08b.html", "08c.html", "08d.html"]}, {"title": "Cierre", "short": "Cierre", "file": "09.html"}, {"title": "Apéndice", "short": "Apéndice", "file": "10.html"}];
function progressSet() {
  try { return new Set(JSON.parse(localStorage.getItem('omegazero:manual-gran-maestro:checks')||'[]')); }
  catch { return new Set(); }
}
function saveProgress(set) { localStorage.setItem('omegazero:manual-gran-maestro:checks',JSON.stringify([...set])); }

async function chapterHtml(index) {
  const source=MANUAL_CHAPTERS[index].file;
  const files=Array.isArray(source)?source:[source];
  const bodies=[];
  for(const file of files) {
    const url=new URL(`../manual-chapters/${file}`,import.meta.url);
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error(`Capítulo no disponible (${response.status})`);
    bodies.push(await response.text());
  }
  return bodies.join('');
}

async function downloadPdf(button) {
  const original=button.textContent;
  button.disabled=true;button.textContent='PREPARANDO PDF…';
  const frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  document.body.append(frame);
  try {
    const chapters=[];
    for(let index=0;index<MANUAL_CHAPTERS.length;index++)chapters.push(await chapterHtml(index));
    const doc=frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Manual del Gran Maestro</title><style>
      @page{size:letter;margin:17mm 16mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;font-size:10.5pt;line-height:1.42;margin:0}h1{font-size:26pt;margin:0 0 6pt;color:#10223e}h2{font-size:18pt;margin:0 0 12pt;color:#10223e}h3{font-size:13pt;margin:14pt 0 5pt;break-after:avoid}p{margin:0 0 7pt}.cover{min-height:210mm;display:flex;flex-direction:column;justify-content:center;text-align:center;page-break-after:always}.cover small{letter-spacing:.18em;color:#607084}.cover p{font-size:13pt;max-width:145mm;margin:8pt auto;color:#45556d}.chapter{page-break-before:always}.chapter:first-of-type{page-break-before:auto}.gm-callout{border:1px solid #c7b67a;border-left:4px solid #c2a34f;padding:9pt 11pt;margin:10pt 0;background:#faf7ed;break-inside:avoid}.gm-callout strong{display:block;margin-bottom:4pt}.gm-list{padding-left:18pt}.gm-table-wrap{overflow:visible}.gm-profile-table{width:100%;border-collapse:collapse;font-size:8.5pt}.gm-profile-table th,.gm-profile-table td{border:1px solid #6c7380;padding:5pt;vertical-align:top}.gm-profile-table th{background:#18304f;color:white}.gm-levels{display:grid;gap:3pt;margin:5pt 0 12pt;break-inside:avoid}.gm-level{display:grid;grid-template-columns:16pt 18pt 1fr;gap:6pt;align-items:center;border:1px solid #777;padding:4pt 6pt}.gm-level input{appearance:none;width:10pt;height:10pt;border:1px solid #555}.gm-level-number{font-weight:bold}.manual-footer{margin-top:14pt;padding-top:7pt;border-top:1px solid #ccc;color:#6a7481;font-size:8pt}.chapter-title{color:#0c7272;text-transform:uppercase;letter-spacing:.08em;font-size:8pt;margin-bottom:4pt}@media print{button{display:none!important}}
    </style></head><body><section class="cover"><small>OMEGAZERO · CHESS LABORATORY</small><h1>MANUAL DEL<br>GRAN MAESTRO</h1><p>Un sistema completo para evaluar, calcular y tomar decisiones como un jugador de élite</p><small>Manual práctico de entrenamiento</small></section>${chapters.map((html,i)=>`<section class="chapter"><div class="chapter-title">Capítulo ${String(i+1).padStart(2,'0')} / ${MANUAL_CHAPTERS.length}</div><h2>${MANUAL_CHAPTERS[i].title}</h2>${html}<div class="manual-footer">OmegaZero · Manual del Gran Maestro</div></section>`).join('')}</body></html>`);
    doc.close();
    await new Promise(resolve=>setTimeout(resolve,250));
    frame.contentWindow.focus();
    frame.contentWindow.print();
  } catch(error) {
    console.error('No se pudo preparar el Manual del Gran Maestro',error);
    alert('No se pudo preparar el PDF. Revisa tu conexión e inténtalo de nuevo.');
  } finally {
    button.disabled=false;button.textContent=original;
    setTimeout(()=>frame.remove(),1500);
  }
}

export const grandmasterManualMethods = {
  async renderGrandmasterManual() {
    const v=$('#view');
    const index=Math.max(0,Math.min(MANUAL_CHAPTERS.length-1,Number(this.grandmasterManualChapter)||0));
    this.grandmasterManualChapter=index;
    const chapter=MANUAL_CHAPTERS[index];
    v.innerHTML=`<section class="page-head gm-page-head"><button data-back aria-label="Volver">←</button><div><small>APRENDER · MANUAL DEL GRAN MAESTRO</small><h1>Manual del Gran Maestro</h1><p>Un sistema completo para evaluar, calcular y tomar decisiones como un jugador de élite.</p></div><button type="button" class="gm-download" data-gm-download>DESCARGAR PDF</button></section>
    <section class="gm-reader">
      <aside class="gm-toc panel"><div class="gm-toc-head"><small>CONTENIDO</small><b>${MANUAL_CHAPTERS.length} capítulos</b></div><nav>${MANUAL_CHAPTERS.map((c,i)=>`<button data-gm-chapter="${i}" class="${i===index?'active':''}"><span>${String(i+1).padStart(2,'0')}</span>${c.short}</button>`).join('')}</nav></aside>
      <article class="gm-content panel"><header class="gm-chapter-head"><small>CAPÍTULO ${String(index+1).padStart(2,'0')} / ${MANUAL_CHAPTERS.length}</small><h2>${chapter.title}</h2></header><div class="gm-chapter-body"><p class="gm-loading">Cargando capítulo…</p></div><footer class="gm-nav-row"><button data-gm-prev ${index===0?'disabled':''}>← Anterior</button><span>${index+1} de ${MANUAL_CHAPTERS.length}</span><button data-gm-next ${index===MANUAL_CHAPTERS.length-1?'disabled':''}>Siguiente →</button></footer></article>
    </section>`;
    $('[data-back]')?.addEventListener('click',()=>{this.screen='home';this.render()});
    $('[data-gm-download]')?.addEventListener('click',event=>downloadPdf(event.currentTarget));
    $$('[data-gm-chapter]').forEach(button=>button.onclick=()=>{this.grandmasterManualChapter=Number(button.dataset.gmChapter)||0;this.renderGrandmasterManual();window.scrollTo(0,0)});
    $('[data-gm-prev]')?.addEventListener('click',()=>{if(index>0){this.grandmasterManualChapter=index-1;this.renderGrandmasterManual();window.scrollTo(0,0)}});
    $('[data-gm-next]')?.addEventListener('click',()=>{if(index<MANUAL_CHAPTERS.length-1){this.grandmasterManualChapter=index+1;this.renderGrandmasterManual();window.scrollTo(0,0)}});
    try {
      const html=await chapterHtml(index);
      if(this.screen!=='grandmasterManual'||this.grandmasterManualChapter!==index)return;
      const body=$('.gm-chapter-body');
      if(body)body.innerHTML=html;
      const progress=progressSet();
      $$('[data-gm-check]').forEach(input=>{
        input.checked=progress.has(input.dataset.gmCheck);
        input.onchange=()=>{const next=progressSet();input.checked?next.add(input.dataset.gmCheck):next.delete(input.dataset.gmCheck);saveProgress(next)};
      });
    } catch(error) {
      console.error(error);
      const body=$('.gm-chapter-body');if(body)body.innerHTML='<p class="gm-error">No se pudo cargar este capítulo.</p>';
    }
  }
};

export function installGrandmasterManualHomePatch(App) {
  const base=App.prototype.renderHome;
  if(typeof base!=='function'||base.__grandmasterManualPatched)return;
  function patchedRenderHome(...args) {
    const result=base.apply(this,args);
    const grid=document.querySelector('.home-domain-learn .home-grid');
    if(grid&&!grid.querySelector('[data-go="grandmasterManual"]')) {
      const button=document.createElement('button');
      button.type='button';button.dataset.go='grandmasterManual';button.className='wide gm-home-card';
      button.innerHTML='<b>MANUAL DE ENTRENAMIENTO</b><span>Manual del Gran Maestro</span><em>Evaluación · cálculo · estrategia · técnica · rendimiento · matriz de progreso</em>';
      button.onclick=()=>{this.screen='grandmasterManual';this.grandmasterManualChapter=0;this.render()};
      grid.append(button);
    }
    return result;
  }
  patchedRenderHome.__grandmasterManualPatched=true;
  App.prototype.renderHome=patchedRenderHome;
}

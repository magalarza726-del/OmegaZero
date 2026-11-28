// A lazy-loaded, structured equation editor. The engine still receives plain LaTeX.
const VERSION='0.110.0';
const CDNS=[
 'https://cdn.jsdelivr.net/npm/mathlive@'+VERSION+'/mathlive.min.js',
 'https://unpkg.com/mathlive@'+VERSION+'/mathlive.min.js'
];
let loading=null;
export function loadMathEditor(){
 if(customElements.get('math-field'))return Promise.resolve();
 if(loading)return loading;
 loading=(async()=>{
  let last;
  for(const url of CDNS){
   if(customElements.get('math-field'))return;
   try{await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=url;script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(Error('Tiempo de carga agotado'))},9000);
    const done=(ok)=>{clearTimeout(timer);if(ok&&customElements.get('math-field'))resolve();else{script.remove();reject(Error('Editor matemático no disponible'))}};
    script.onload=()=>done(true);script.onerror=()=>done(false);document.head.append(script);
   });return}catch(e){last=e}
  }
  throw last||Error('No se pudo cargar MathLive');
 })().catch(e=>{loading=null;throw e});
 return loading;
}
export const MATH_SYMBOLS=Object.freeze({
 frac:'\\frac{#@}{#?}',power:'#@^{#?}',sqrt:'\\sqrt{#0}',
 abs:'\\left|#0\\right|',ln:'\\ln\\left(#0\\right)',log:'\\log\\left(#0\\right)',
 sin:'\\sin\\left(#0\\right)',cos:'\\cos\\left(#0\\right)',
 if:'\\left\\{#?:#?,#?\\right\\}',plus:'+',minus:'-',times:'\\cdot',equals:'=',paren:'\\left(#0\\right)'
});
export const splitExpressions=value=>String(value??'').split(/\r?\n|;/).filter(s=>s.trim()).slice(0,40);
export function mountExpressionEditor(host,initial,onChange){
 let active=null,rows=[],raw=null,source=String(initial??''),ready=false,disposed=false;
 const getValue=()=>raw?raw.value:ready?rows.map(r=>r.field.getValue('latex')).filter(s=>s.trim()).join('\n'):source;
 const changed=()=>{source=getValue();onChange(source)};
 const activate=row=>{active=row;rows.forEach(r=>r.el.classList.toggle('is-active',r===row))};
 function renumber(){rows.forEach((r,i)=>{r.num.textContent=String(i+1);r.field.setAttribute('aria-label','Expresión '+(i+1));r.del.setAttribute('aria-label','Eliminar expresión '+(i+1))})}
 function add(value='',focus=true,after=null){
  if(rows.length>=40)return null;
  const el=document.createElement('div');el.className='ecom-equation-row';
  const num=document.createElement('span');num.className='ecom-equation-number';
  const field=document.createElement('math-field');
  field.setAttribute('math-virtual-keyboard-policy','manual');
  field.setAttribute('smart-fence','true');
  field.setAttribute('default-mode','math');
  field.setAttribute('aria-label','Expresión matemática');
  const del=document.createElement('button');del.type='button';del.className='ecom-equation-delete';del.textContent='×';
  el.append(num,field,del);
  const row={el,num,field,del};
  const index=after?rows.indexOf(after)+1:rows.length;
  const list=host.querySelector('.ecom-equation-list');
  list.insertBefore(el,rows[index]?.el||null);rows.splice(index,0,row);
  field.setValue(value,{silenceNotifications:true});
  field.addEventListener('focusin',()=>activate(row));
  field.addEventListener('pointerdown',()=>activate(row));
  field.addEventListener('input',()=>{activate(row);changed()});
  field.addEventListener('keydown',e=>{
   if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.stopPropagation();const next=rows[rows.indexOf(row)+1];if(next){activate(next);next.field.focus()}else add('',true,row)}
  });
  del.onclick=()=>{if(rows.length===1){field.setValue('',{silenceNotifications:true});activate(row);field.focus();changed();return}
   const idx=rows.indexOf(row);rows.splice(idx,1);el.remove();renumber();const next=rows[Math.min(idx,rows.length-1)];activate(next);next.field.focus();changed()};
  renumber();if(focus){activate(row);field.focus();changed()}return row;
 }
 function setValue(value){
  source=String(value??'');
  if(raw){raw.value=source;changed();return}
  if(!ready){onChange(source);return}
  const list=host.querySelector('.ecom-equation-list');list.replaceChildren();rows=[];active=null;
  for(const line of splitExpressions(source))add(line,false);
  if(!rows.length)add('',false);
  activate(rows[0]);changed();
 }
 function draw(){
  if(disposed||!host.isConnected)return;
  ready=true;raw=null;
  host.innerHTML='<div class="ecom-equation-list"></div><button type="button" class="ecom-add-expression">＋ Añadir expresión</button><small class="ecom-editor-help">Enter: siguiente expresión · Tab/flechas: moverse por fracciones y exponentes.</small>';
  host.querySelector('.ecom-add-expression').onclick=()=>add('',true);
  setValue(source);
 }
 function fallback(){
  if(disposed||!host.isConnected)return;
  host.innerHTML='<div class="ecom-load-error">No se pudo cargar el editor visual. Comprueba la conexión.<button type="button" data-ecom-retry>Reintentar</button><button type="button" data-ecom-raw>Editar LaTeX de emergencia</button></div>';
  host.querySelector('[data-ecom-retry]').onclick=begin;
  host.querySelector('[data-ecom-raw]').onclick=()=>{host.innerHTML='<textarea aria-label="Editor LaTeX de emergencia" class="ecom-raw-fallback" rows="5"></textarea><button type="button" data-ecom-retry>Volver al editor visual</button>';raw=host.querySelector('textarea');raw.value=source;raw.oninput=changed;host.querySelector('[data-ecom-retry]').onclick=()=>{source=raw.value;raw=null;begin()};raw.focus()};
 }
 function begin(){host.innerHTML='<div class="ecom-editor-loading" role="status">Cargando editor matemático…</div>';loadMathEditor().then(()=>{try{draw()}catch(e){ready=false;fallback()}},fallback)}
 function insert(latex,placeholder=false){
  if(raw){const a=raw.selectionStart??raw.value.length,b=raw.selectionEnd??a;raw.setRangeText(latex.replace(/#[@0?]/g,''),a,b,'end');raw.focus();changed();return}
  if(!ready)return;
  const row=active||rows[0];if(!row)return;
  // Toolbar buttons preserve selection via pointerdown prevention.
  row.field.focus();row.field.insert(latex,{format:'latex',selectionMode:placeholder?'placeholder':'after'});changed();
 }
 function command(cmd){if(!ready||!active)return;active.field.focus();active.field.executeCommand(cmd);changed()}
 const api={get value(){return getValue()},set value(v){setValue(v)},insert,command,addLine(){if(raw){insert('\n');return}if(ready)add('',true,active)},destroy(){disposed=true}};
 begin();return api;
}

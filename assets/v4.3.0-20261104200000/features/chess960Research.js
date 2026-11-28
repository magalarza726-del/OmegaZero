import { esc } from '../app/deps.js';
import { new960Research, researchMoves, play960Research, linkedSquare } from '../core/chess960Research.js';
const modes={pvp:'J1 vs J2',pvc:'J1 vs COM',cvc:'COM vs COM'},files='abcdefgh';
const side=c=>c==='w'?'Blancas':'Negras';
export const chess960ResearchMethods={
 cancel960Research(){
  const l=this.research960;if(!l)return;clearTimeout(l.timer);l.timer=null;
  this.research960=null;if(l.busy)this.engine.stop();
 },
 render960Research(){
  const v=document.querySelector('#view'),l=this.research960;
  const head='<section class="page-head"><button data-960-back aria-label="Volver">←</button><div><small>INVESTIGAR · 960-COM</small><h1>960 Research</h1></div></section>';
  const back=()=>{this.cancel960Research();this.screen=this.research960Return||'home';this.research960Return=null;this.render()};
  if(!l){
   const config=this.research960Config||{mode:this.cfg.mode||'pvp',number:'random',humanColor:'w',depth:14};
   v.innerHTML=head+'<section class="panel"><h2>960-COM · Tableros vinculados</h2><p>La COM analiza únicamente el tablero clásico. La partida 960 es prioritaria. Se conserva la identidad de cada pieza y la casilla de destino; las capturas deben corresponder a la misma pieza. El enroque se vincula por flanco.</p><div class="row"><label>Modalidad<select data-960-mode>'+Object.entries(modes).map(([k,t])=>'<option value="'+k+'" '+(config.mode===k?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>Posición inicial<select data-960-random><option value="random" '+(config.number==='random'?'selected':'')+'>Aleatoria (960)</option><option value="fixed" '+(config.number!=='random'?'selected':'')+'>Seleccionar número</option></select></label><label data-960-fixed '+(config.number==='random'?'hidden':'')+'>Posición (0–959)<input data-960-number type="number" min="0" max="959" step="1" value="'+(config.number==='random'?518:config.number)+'"></label><label data-960-color-row '+(config.mode==='pvc'?'':'hidden')+'>Color de J1<select data-960-color><option value="w" '+(config.humanColor==='w'?'selected':'')+'>Blancas</option><option value="b" '+(config.humanColor==='b'?'selected':'')+'>Negras</option></select></label><label data-960-depth-row '+(config.mode==='pvp'?'hidden':'')+'>Profundidad Stockfish<input type="number" data-960-depth min="1" max="22" value="'+config.depth+'"></label></div><p class="hint">Caballos y torres: de izquierda a derecha. Alfiles: por color de casilla. Peones: por columna inicial. Si la réplica no es legal, se detiene el experimento.</p><button class="primary" data-960-start>Iniciar partida</button><p role="alert" data-960-error></p></section>';
   const q=s=>v.querySelector(s);
   q('[data-960-back]').onclick=back;
   q('[data-960-mode]').onchange=e=>{q('[data-960-color-row]').hidden=e.target.value!=='pvc';q('[data-960-depth-row]').hidden=e.target.value==='pvp'};
   q('[data-960-random]').onchange=e=>q('[data-960-fixed]').hidden=e.target.value==='random';
   q('[data-960-start]').onclick=()=>{
    const random=q('[data-960-random]').value==='random',num=Number(q('[data-960-number]').value),depth=Number(q('[data-960-depth]').value);
    if((!random&&(!Number.isInteger(num)||num<0||num>959))||!Number.isInteger(depth)||depth<1||depth>22){q('[data-960-error]').textContent='Comprueba la posición y profundidad.';return}
    const mode=q('[data-960-mode]').value,color=q('[data-960-color]').value;
    this.research960Config={mode,number:random?'random':num,humanColor:color,depth};
    this.research960=new960Research(random?Math.floor(Math.random()*960):num,mode,color);this.research960.depth=depth;
    this.render960Research();
   };
   return;
  }
  const turn=l.random.turn(),human=l.mode==='pvp'||(l.mode==='pvc'&&turn===l.humanColor),flip=l.mode==='pvc'&&l.humanColor==='b';
  const ranks=flip?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],fs=flip?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
  const targets=b=>{const from=linkedSquare(l,b,l.selected);return from&&!l.result?researchMoves(l,b,from):[]};
  const dest=(b,m)=>b==='random'&&m.castle?m.rookFrom:m.to;
  const board=b=>{
   const selected=linkedSquare(l,b,l.selected),moves=targets(b);let html='';
   for(const rank of ranks)for(const f of fs){
    const sq=files[f]+rank,p=l[b].get(sq),highlight=selected===sq,legal=moves.some(m=>dest(b,m)===sq);
    html+='<button type="button" class="sq '+((f+rank)%2?'light':'dark')+(highlight?' selected':'')+(legal?' legal':'')+(l.last?.[b]?.includes(sq)?' last':'')+'" data-960-board="'+b+'" data-960-square="'+sq+'" aria-label="'+sq+(p?' '+p.color+p.type:'')+'" aria-pressed="'+highlight+'" '+(highlight?'style="box-shadow:inset 0 0 0 4px #e6bd70,inset 0 0 0 100px #e6bd7045"':'')+'>'+(p?'<img draggable="false" src="'+this.pieceSrc(p.color,p.type)+'" alt="'+p.color+p.type+'">':'')+(rank===(flip?8:1)?'<i class="file">'+files[f]+'</i>':'')+(f===(flip?7:0)?'<i class="rank">'+rank+'</i>':'')+'</button>';
   }
   return '<section style="min-width:0"><h2 style="margin:0 0 8px;font-size:1.15rem">'+(b==='classic'?'Ajedrez estándar · visión COM':'Ajedrez 960 · posición '+l.number+' · prioritario')+'</h2><div class="board-wrap" style="'+this.customBoardStyle()+';width:100%;max-width:100%;min-width:0"><div class="board" style="width:100%;max-width:100%;min-width:0">'+html+'</div></div>'+(b==='classic'&&l.result==='Fin por movimiento ilegal'?'<p role="status"><b>Fin por movimiento ilegal</b></p>':'')+'</section>';
  };
  const status=l.result||('Turno de '+side(turn)+(l.busy?' · 960-COM calculando':l.paused?' · Pausado':''));
  v.innerHTML=head+'<section class="panel"><div class="row"><b role="status">'+esc(status)+'</b><span>'+modes[l.mode]+' · posición '+l.number+' · '+l.history.length+' semijugadas</span>'+(l.mode!=='pvp'&&!l.result?'<button data-960-pause>'+(l.paused?'Reanudar':'Pausar')+'</button>':'')+'<button data-960-restart>Nueva partida</button></div>'+(l.detail?'<p>'+esc(l.detail)+'</p>':'')+'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px;align-items:start;max-width:1200px;margin:auto">'+board('classic')+board('random')+'</div><p class="hint">Selecciona una pieza en cualquiera de los tableros. En 960, para enrocar, selecciona el rey y después su torre. Se conservan el destino, la pieza y la captura equivalentes.</p><div class="moves" style="max-height:180px;overflow:auto"><table style="width:100%;text-align:left"><thead><tr><th>Semijugada</th><th>Clásico</th><th>960</th></tr></thead><tbody>'+l.history.map((m,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(m.classic)+'</td><td>'+esc(m.random)+'</td></tr>').join('')+'</tbody></table></div></section>';
  v.querySelector('[data-960-back]').onclick=back;
  v.querySelector('[data-960-restart]').onclick=()=>{this.cancel960Research();this.render960Research()};
  const pause=v.querySelector('[data-960-pause]');if(pause)pause.onclick=()=>{l.paused=!l.paused;clearTimeout(l.timer);l.timer=null;this.render960Research()};
  v.querySelectorAll('[data-960-square]').forEach(btn=>btn.onclick=()=>{
   if(!human||l.result||l.paused||l.busy)return;
   const b=btn.getAttribute('data-960-board'),sq=btn.getAttribute('data-960-square'),options=targets(b).filter(m=>dest(b,m)===sq);
   if(options.length){
    let m=options[0];if(options.some(x=>x.promotion)){const p=prompt('Promoción: Q, R, B o N','Q');if(p===null)return;m=options.find(x=>x.promotion===p.toLowerCase());if(!m)return}
    play960Research(l,b,m);
   }else{const piece=l[b].get(sq),id=l.ids[b][sq];l.selected=piece?.color===turn&&l.selected!==id?id:null}
   this.render960Research();
  });
  if(!human&&!l.result&&!l.paused&&!l.busy&&!l.timer)l.timer=setTimeout(async()=>{
   l.timer=null;if(this.screen!=='research960'||this.research960!==l||l.paused||l.result)return;
   l.busy=true;this.render960Research();
   try{
    await this.engine.init();if(this.research960!==l||this.screen!=='research960'||l.paused)return;
    const lines=await this.engine.analyse(l.classic.fen(),{depth:l.depth,multiPv:1,skill:20,timeoutMs:90000});
    if(this.research960!==l||this.screen!=='research960'||l.paused)return;
    const uci=lines?.[0]?.uci,m=researchMoves(l,'classic').find(m=>m.from+m.to+(m.promotion||'')===uci);
    if(!m)throw Error('Stockfish no devolvió una jugada legal');
    l.selected=l.ids.classic[m.from];l.busy=true;this.render960Research();
    await new Promise(resolve=>setTimeout(resolve,280));
    if(this.research960!==l||this.screen!=='research960'||l.paused)return;
    play960Research(l,'classic',m);
   }catch(error){if(this.research960===l&&!l.paused){l.paused=true;l.detail='960-COM: '+error.message;}}
   finally{l.busy=false;if(this.screen==='research960'&&this.research960===l){l.selected=null;this.render960Research()}}
  },350);
 }
};

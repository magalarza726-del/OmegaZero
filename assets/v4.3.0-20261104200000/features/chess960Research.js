import { create960Observers, researchEvaluationText } from './chess960Observers.js?v=20261128-live960';
import { esc } from '../app/deps.js';
import { new960Research, researchMoves, play960Research, linkedSquare } from '../core/chess960Research.js?v=20261128-live960';
const modes={pvp:'J1 vs J2',pvc:'J1 vs COM',cvc:'COM vs COM'};
const side=c=>c==='w'?'Blancas':'Negras';
export const chess960ResearchMethods={
 cancel960Research(){
  const l=this.research960;if(!l)return;clearTimeout(l.timer);l.timer=null;if(this.drag?.context==='research960'){this.drag.ghost?.remove();this.drag.source?.classList.remove('drag-source');this.drag=null;}
  if(this.rightAnnotation?.context==='research960')this.cancelRightAnnotation();
  l.observers?.dispose();this.research960=null;if(l.busy)this.engine.stop();
 },
 render960Research(){
  const v=document.querySelector('#view'),l=this.research960;
  const head='<section class="page-head"><button data-960-back aria-label="Volver">←</button><div><small>INVESTIGAR · 960-COM</small><h1>960 Research</h1></div></section>';
  const back=()=>{this.cancel960Research();this.screen=this.research960Return||'home';this.research960Return=null;this.render()};
  if(!l){
   const config={mode:this.cfg.mode||'pvp',number:'random',humanColor:this.cfg.humanColor||'w',depth:this.cfg.depth||14,skill:this.cfg.skill||20,multiPv:this.cfg.multiPv||3,diversity:this.cfg.diversity??25,brain:this.cfg.brain||'s',whiteBrain:this.cfg.whiteBrain||'s',blackBrain:this.cfg.blackBrain||'s',style:this.cfg.style||'zero',white:this.cfg.white||'zero',black:this.cfg.black||'zero',...this.research960Config};
   const styles=s=>['zero','omega'].map(k=>'<option value="'+k+'" '+(s===k?'selected':'')+'>'+(k==='zero'?'Zero':'Omega')+'</option>').join('');
   const model=(id,label,brain,style)=>'<div class="row"><label>'+label+'<select data-960-'+id+'>'+this.comBrainOptions(this.normalizeBrain(brain))+'</select></label><label>Estilo S-COM<select data-960-'+id+'-style>'+styles(style)+'</select></label></div>';
   v.innerHTML=head+'<section class="panel"><h2>960-COM · Tableros vinculados</h2><p>La COM analiza únicamente el tablero clásico. La partida 960 es prioritaria. Se conserva la identidad de cada pieza y su desplazamiento relativo (dirección y distancia); las capturas deben corresponder a la misma pieza. El enroque se vincula por flanco.</p><div class="row"><label>Modalidad<select data-960-mode>'+Object.entries(modes).map(([k,t])=>'<option value="'+k+'" '+(config.mode===k?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>Posición inicial<select data-960-random><option value="random" '+(config.number==='random'?'selected':'')+'>Aleatoria (960)</option><option value="fixed" '+(config.number!=='random'?'selected':'')+'>Seleccionar número</option></select></label><label data-960-fixed '+(config.number==='random'?'hidden':'')+'>Posición (0–959)<input data-960-number type="number" min="0" max="959" step="1" value="'+(config.number==='random'?518:config.number)+'"></label><label data-960-color-row '+(config.mode==='pvc'?'':'hidden')+'>Color de J1<select data-960-color><option value="w" '+(config.humanColor==='w'?'selected':'')+'>Blancas</option><option value="b" '+(config.humanColor==='b'?'selected':'')+'>Negras</option></select></label><label data-960-depth-row '+(config.mode==='pvp'?'hidden':'')+'>Profundidad Stockfish<input type="number" data-960-depth min="1" max="64" value="'+config.depth+'"></label></div><div data-960-models '+(config.mode==='pvp'?'hidden':'')+'><h3>Motor de Jugar</h3><div data-960-single '+(config.mode==='pvc'?'':'hidden')+'>'+model('brain','Cerebro COM',config.brain,config.style)+'</div><div data-960-dual '+(config.mode==='cvc'?'':'hidden')+'>'+model('whitebrain','COM blancas',config.whiteBrain,config.white)+model('blackbrain','COM negras',config.blackBrain,config.black)+'</div><div class="row"><label>Nivel Stockfish<input data-960-skill type="number" min="1" max="20" value="'+config.skill+'"></label><label>Variantes<input data-960-multipv type="number" min="1" max="8" value="'+config.multiPv+'"></label><label>Diversidad (%)<input data-960-diversity type="number" min="0" max="60" value="'+config.diversity+'"></label></div><small>Se reutilizan S-COM, T-COM y E-COM y sus modelos de Investigar → Modelos COM. La COM solo observa la posición clásica.</small></div><p class="hint">Caballos y torres: de izquierda a derecha. Alfiles: por color de casilla. Peones: por la pieza que tienen detrás al inicio (peón de rey, dama, torre, caballo o alfil). Si la réplica no es legal, se detiene el experimento.</p><button class="primary" data-960-start>Iniciar partida</button><p role="alert" data-960-error></p></section>';
   const q=s=>v.querySelector(s);
   q('[data-960-back]').onclick=back;
   q('[data-960-mode]').onchange=e=>{q('[data-960-color-row]').hidden=e.target.value!=='pvc';q('[data-960-depth-row]').hidden=e.target.value==='pvp';q('[data-960-models]').hidden=e.target.value==='pvp';q('[data-960-single]').hidden=e.target.value!=='pvc';q('[data-960-dual]').hidden=e.target.value!=='cvc'};
   q('[data-960-random]').onchange=e=>q('[data-960-fixed]').hidden=e.target.value==='random';
   q('[data-960-start]').onclick=()=>{
    const random=q('[data-960-random]').value==='random',num=Number(q('[data-960-number]').value),depth=Number(q('[data-960-depth]').value);
    if((!random&&(!Number.isInteger(num)||num<0||num>959))||!Number.isInteger(depth)||depth<1||depth>64){q('[data-960-error]').textContent='Comprueba la posición y profundidad.';return}
    const mode=q('[data-960-mode]').value,color=q('[data-960-color]').value;
    const skill=Number(q('[data-960-skill]').value),multiPv=Number(q('[data-960-multipv]').value),diversity=Number(q('[data-960-diversity]').value);
    if(![[skill,1,20],[multiPv,1,8],[diversity,0,60]].every(([v,min,max])=>Number.isInteger(v)&&v>=min&&v<=max)){q('[data-960-error]').textContent='Comprueba el nivel, variantes y diversidad.';return}
    this.research960Config={mode,number:random?'random':num,humanColor:color,depth,skill,multiPv,diversity,brain:q('[data-960-brain]').value,whiteBrain:q('[data-960-whitebrain]').value,blackBrain:q('[data-960-blackbrain]').value,style:q('[data-960-brain-style]').value,white:q('[data-960-whitebrain-style]').value,black:q('[data-960-blackbrain-style]').value};
    this.research960=new960Research(random?Math.floor(Math.random()*960):num,mode,color);this.research960.engineConfig={...this.research960Config,opening:this.cfg.opening,whiteOpening:this.cfg.whiteOpening,blackOpening:this.cfg.blackOpening,independentOpenings:this.cfg.independentOpenings};
    this.render960Research();
   };
   return;
  }
  if(this.rightAnnotation?.context==='research960')this.cancelRightAnnotation();
  l.marks??={classic:{annotations:new Map(),arrows:[]},random:{annotations:new Map(),arrows:[]}};
  const paintEvaluations=()=>{
   if(this.research960!==l||this.screen!=='research960')return;
   for(const b of ['classic','random']){
    const el=document.querySelector('#view [data-960-evaluation="'+b+'"]'),s=l.observers?.sessions[b];
    if(!el||!s)continue;
    const value=s.value,score=researchEvaluationText(s),white=value?Math.max(3,Math.min(97,50+value.score/20)):50;
    const state=s.status==='error'?'Análisis no disponible: '+s.error:s.status==='done'?'Stockfish · '+(value?.depth?'prof. '+value.depth:'posición final'):s.status==='analysing'?'Calculando · prof. '+value.depth:'Calculando…';
    el.querySelector('[data-eval-score]').textContent=score;
    el.querySelector('[data-eval-move]').textContent=value?.san?value.san+' ('+value.from+' → '+value.to+')':value?.terminal||'—';
    el.querySelector('[data-eval-state]').textContent=state;
    el.querySelector('[data-eval-bar]').style.width=white+'%';
   }
  };
  if(!l.observers)l.observers=create960Observers(paintEvaluations);
  const evaluation=b=>'<div class="research960-eval" data-960-evaluation="'+b+'"><div><small>Evaluación Stockfish</small><b data-eval-score>—</b></div><div><small>Mejor jugada independiente</small><b data-eval-move>—</b></div><div class="research960-evalbar" aria-hidden="true"><i data-eval-bar style="width:50%"></i></div><small data-eval-state>Calculando…</small></div>';
  const turn=l.random.turn(),human=l.mode==='pvp'||(l.mode==='pvc'&&turn===l.humanColor),flip=l.mode==='pvc'&&l.humanColor==='b';
  const targets=b=>{const from=linkedSquare(l,b,l.selected);return from&&!l.result?researchMoves(l,b,from):[]};
  const dest=(b,m)=>b==='random'&&m.castle?m.rookFrom:m.to;
  const canMove=()=>human&&!l.result&&!l.paused&&!l.busy&&!l.promoting;
  const board=b=>{
   const html=this.boardHtml(l[b],true,{flipped:flip,selected:linkedSquare(l,b,l.selected)||null,legalSquares:targets(b).map(m=>dest(b,m)),lastMove:l.last?.[b]||null,annotations:l.marks[b].annotations});
   return '<section><h2>'+(b==='classic'?'Ajedrez estándar · visión COM':'Ajedrez 960 · posición '+l.number+' · prioritario')+'</h2>'+evaluation(b)+'<div class="board-stage"><div class="board-wrap" style="'+this.customBoardStyle()+'"><div class="board" data-960-board="'+b+'" aria-label="'+(b==='classic'?'Ajedrez estándar':'Ajedrez 960')+'">'+html+'</div><div data-960-arrows="'+b+'">'+this.arrowsSvg({arrows:l.marks[b].arrows,flipped:flip})+'</div></div><div class="research960-mark-tools"><button type="button" data-960-clear="'+b+'">Borrar marcas</button></div></div>'+(b==='classic'&&l.result==='Fin por movimiento ilegal'?'<p role="status"><b>Fin por movimiento ilegal</b></p>':'')+'</section>';
  };
  const status=l.result||('Turno de '+side(turn)+(l.busy?' · 960-COM calculando':l.paused?' · Pausado':''));
  v.innerHTML='<section class="panel research960-game"><div class="row research960-toolbar"><button data-960-back aria-label="Volver">←</button><b>960 Research</b><b role="status">'+esc(status)+'</b><span>'+modes[l.mode]+' · posición '+l.number+' · '+l.history.length+' semijugadas</span>'+(l.mode!=='pvp'&&!l.result?'<button data-960-pause>'+(l.paused?'Reanudar':'Pausar')+'</button>':'')+'<button data-960-restart>Nueva partida</button><div class="research960-annotation" data-960-annotation>'+this.annotationPanel()+'</div></div>'+(l.detail?'<p>'+esc(l.detail)+'</p>':'')+'<div class="research960-boards">'+board('classic')+board('random')+'</div><p class="hint">Clic derecho: marcar casilla. Arrastra con clic derecho: dibujar flecha. Repite para borrar. Clic izquierdo: seleccionar o mover piezas. En 960, para enrocar, selecciona el rey y después su torre. Se conservan la dirección y distancia de cada pieza vinculada; los peones se vinculan por su pieza inicial, no por columna.</p><div class="moves" style="max-height:180px;overflow:auto"><table style="width:100%;text-align:left"><thead><tr><th>Semijugada</th><th>Clásico</th><th>960</th></tr></thead><tbody>'+l.history.map((m,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(m.classic)+'</td><td>'+esc(m.random)+'</td></tr>').join('')+'</tbody></table></div></section>';
  paintEvaluations();const observation=l.observers.refresh(l);
  v.querySelector('[data-960-back]').onclick=back;
  v.querySelector('[data-960-restart]').onclick=()=>{this.cancel960Research();this.render960Research()};
  const pause=v.querySelector('[data-960-pause]');if(pause)pause.onclick=()=>{l.paused=!l.paused;if(!l.paused)l.detail='';clearTimeout(l.timer);l.timer=null;this.render960Research()};
  const palette=v.querySelector('[data-960-annotation]');
  const bindPalette=()=>this.bindAnnotationPanel(palette,()=>{palette.innerHTML=this.annotationPanel();bindPalette()});
  bindPalette();
  const paintMarks=b=>{
   const el=v.querySelector('[data-960-board="'+b+'"]'),state=l.marks[b];
   if(!el)return;
   el.querySelectorAll('[data-square]').forEach(s=>{
    const mark=state.annotations.get(s.dataset.square);
    s.classList.toggle('marked',!!mark);
    for(const color of ['red','yellow','green','blue'])s.classList.toggle('mark-'+color,mark===color);
   });
   const overlay=v.querySelector('[data-960-arrows="'+b+'"]');
   if(overlay)overlay.innerHTML=this.arrowsSvg({arrows:state.arrows,flipped:flip});
  };
  v.querySelectorAll('[data-960-clear]').forEach(btn=>btn.onclick=()=>{
   const b=btn.getAttribute('data-960-clear');l.marks[b].annotations.clear();l.marks[b].arrows.length=0;paintMarks(b);
  });
  const moveFrom=async(b,from,to)=>{
   if(!canMove()||this.research960!==l)return;
   const options=researchMoves(l,b,from).filter(m=>dest(b,m)===to);
   if(!options.length)return;
   let m=options[0];
   if(options.some(x=>x.promotion)){
    l.promoting=true;try{const p=await this.choosePromotion();m=options.find(x=>x.promotion===p)}finally{l.promoting=false}
    if(this.research960!==l||this.screen!=='research960'||!canMove()||!m)return;
   }
   play960Research(l,b,m);this.render960Research();
  };
  const paintSelection=()=>{
   v.querySelectorAll('[data-960-board]').forEach(el=>{
    const b=el.getAttribute('data-960-board'),selected=linkedSquare(l,b,l.selected),legal=new Set(targets(b).map(m=>dest(b,m)));
    el.querySelectorAll('[data-square]').forEach(s=>{
     const sq=s.dataset.square,active=sq===selected,allowed=legal.has(sq);
     s.classList.toggle('selected',active);s.classList.toggle('legal',allowed);
     s.classList.toggle('capture',allowed&&!!l[b].get(sq));s.classList.toggle('quiet',allowed&&!l[b].get(sq));
    });
   });
  };
  v.querySelectorAll('[data-960-board]').forEach(el=>{
   const b=el.getAttribute('data-960-board');this.bindKeyboardBoard(el);el.oncontextmenu=e=>e.preventDefault();
   el.querySelectorAll('[data-square]').forEach(btn=>{
    const sq=btn.dataset.square;
    btn.onclick=()=>{
     if(!canMove()||Date.now()<(this.suppress||0))return;
     const from=linkedSquare(l,b,l.selected);
     if(from&&targets(b).some(m=>dest(b,m)===sq)){void moveFrom(b,from,sq);return}
     const piece=l[b].get(sq),id=l.ids[b][sq];l.selected=piece?.color===turn&&l.selected!==id?id:null;
     this.render960Research();
    };
    btn.onpointerdown=e=>{
     if(e.button===2){this.startRightAnnotation(e,sq,'research960',{board:el,...l.marks[b],onChange:()=>paintMarks(b)});return}
     if(!canMove()||e.button!==0||l[b].get(sq)?.color!==turn)return;
     // An already-selected king may castle by clicking its rook: leave this to click.
     if(targets(b).some(m=>dest(b,m)===sq))return;
     this.startVisualDrag(e,sq,'research960',l[b],{preserveAnnotations:true});
     if(this.drag?.context==='research960'){
      this.drag.previous960Selection=l.selected;l.selected=l.ids[b][sq];paintSelection();
     }
    };
    btn.onpointermove=e=>{this.moveRightAnnotation(e);this.dragMove(e)};
    btn.onpointerup=e=>{
     if(this.rightAnnotation?.context==='research960'&&this.rightAnnotation.id===e.pointerId){this.endRightAnnotation(e);return}
     const d=this.drag;if(!d||d.context!=='research960'||d.id!==e.pointerId)return;
     const moved=d.moved,previous=d.previous960Selection;
     this.endVisualDrag(e,(from,to)=>{void moveFrom(b,from,to)},{board:el,isLegal:(from,to)=>researchMoves(l,b,from).some(m=>dest(b,m)===to)});
     if(!moved){l.selected=previous;paintSelection()}else this.suppress=Date.now()+250;
    };
    btn.onpointercancel=e=>{this.cancelRightAnnotation(e);if(this.drag?.context==='research960')this.endVisualDrag(e,()=>{},{cancel:true})};
   });
  });
  if(!human&&!l.result&&!l.paused&&!l.busy&&!l.timer)l.timer=setTimeout(async()=>{
   l.timer=null;if(this.screen!=='research960'||this.research960!==l||l.paused||l.result)return;
   l.busy=true;this.render960Research();
   try{
    const cfg=l.engineConfig,color=l.classic.turn(),brain=this.normalizeBrain(l.mode==='cvc'?(color==='w'?cfg.whiteBrain:cfg.blackBrain):cfg.brain),style=l.mode==='cvc'?(color==='w'?cfg.white:cfg.black):cfg.style;
    if(brain==='s'||(brain==='t'&&(color==='w'?this.ensureTComLab().white:this.ensureTComLab().black)?.type==='stockfish'))await this.engine.init();
    if(this.research960!==l||this.screen!=='research960'||l.paused)return;
    const openingId=l.mode==='cvc'&&cfg.independentOpenings?(color==='w'?cfg.whiteOpening:cfg.blackOpening):cfg.opening;
    const decision=await this.chooseComBrainDecision(l.classic,{brain,color,style,skill:cfg.skill,depth:cfg.depth,multiPv:cfg.multiPv,openingId,diversity:cfg.diversity});
    if(this.research960!==l||this.screen!=='research960'||l.paused)return;
    const uci=decision?.chosen?.uci,m=researchMoves(l,'classic').find(m=>m.from+m.to+(m.promotion||'')===uci);
    if(!m)throw Error(decision?.quality?.detail||'El motor de Jugar no devolvió una jugada legal');
    // Observers never supply the COM decision. Keep the current position visible
    // until both independent analyses finish (or report an error).
    await observation;
    if(this.research960!==l||this.screen!=='research960'||l.paused)return;
    l.selected=l.ids.classic[m.from];l.busy=true;this.render960Research();
    await new Promise(resolve=>setTimeout(resolve,280));
    if(this.research960!==l||this.screen!=='research960'||l.paused)return;
    play960Research(l,'classic',m);
   }catch(error){if(this.research960===l&&!l.paused){l.paused=true;l.detail='960-COM: '+error.message;}}
   finally{l.busy=false;if(this.screen==='research960'&&this.research960===l){l.selected=null;this.render960Research()}}
  },350);
 }
};

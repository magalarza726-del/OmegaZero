import { Chess } from '../vendor/chess.js';
import { fishSwaps, fishSwapFen } from '../core/fishChess.js?v=20261128-fish';
import { initialCaveState, cloneCaveState, caveLegalMoves } from '../core/caveChess.js';

export const VARIANTS = Object.freeze([
  {id:'standard',name:'Ajedrez clásico',description:'Reglas FIDE · Stockfish, S-COM, T-COM y E-COM.'},
  {id:'hill',name:'King of the Hill',description:'Jaque mate o lleva tu rey a d4, e4, d5 o e5.'},
  {id:'threecheck',name:'Three-Check',description:'Jaque mate o da tres jaques en total.'},
  {id:'racing',name:'Racing Kings',description:'Lleva tu rey a la octava fila sin dar ni recibir jaque.'},
  {id:'antichess',name:'Antichess',description:'Las capturas son obligatorias. Gana quien se queda sin piezas o sin movimientos legales.'},
  {id:'fish',name:'Fish Chess',description:'Mueve una pieza o intercambia dos columnas completas. El rey debe quedar a salvo y no cruzar casillas amenazadas.'},
  {id:'research960',name:'960 Research · 960-COM',description:'Ajedrez estándar y 960 vinculados; el tablero 960 tiene prioridad.'},
  {id:'night',name:'In the night',description:'Visión parcial, rey capturable y modificador Niebla.'}
]);
const modes={pvp:'J1 vs J2',pvc:'J1 vs COM',cvc:'COM vs COM'};
const files='abcdefgh',opposite=c=>c==='w'?'b':'w',side=c=>c==='w'?'Blancas':'Negras';
const center=new Set(['d4','e4','d5','e5']);
const values={p:1,n:3,b:3.2,r:5,q:9,k:0};
const racingFen='8/8/8/8/8/8/krbnNBRK/qrbnNBRQ w - - 0 1';
// Antichess has no royal king and no castling. Reuse only geometric move generation.
export class AntiBoard{
  constructor(state=initialCaveState(),halfmoves=0){this.state=state;this.halfmoves=halfmoves}
  clone(){return new AntiBoard(cloneCaveState(this.state),this.halfmoves)}
  turn(){return this.state.turn}
  get(sq){return this.state.board[sq]}
  board(){return Array.from({length:8},(_,r)=>[...files].map(f=>{const square=f+(8-r),p=this.get(square);return p?{...p,square}:null}))}
  fen(){return this.board().map(row=>row.map(p=>p?(p.color==='w'?p.type.toUpperCase():p.type):'1').join('')).join('/')+' '+this.turn()+' - '+(this.state.enPassant?.square||'-')+' '+this.halfmoves+' 1'}
  isDrawByFiftyMoves(){return this.halfmoves>=100}
  moves(){
    const out=[],color=this.turn();
    for(const [from,p] of Object.entries(this.state.board)){
      if(p.color!==color)continue;
      for(const to of caveLegalMoves(this.state,from)){
        if(p.type==='k'&&Math.abs(files.indexOf(from[0])-files.indexOf(to[0]))>1)continue;
        const captured=this.get(to)||(p.type==='p'&&this.state.enPassant?.square===to?this.get(this.state.enPassant.pawnSquare):null);
        const promotions=p.type==='p'&&/[18]$/.test(to)?['q','r','b','n','k']:[undefined];
        for(const promotion of promotions)out.push({from,to,piece:p.type,color,captured:captured?.type,promotion,san:from+(captured?'x':'-')+to+(promotion?'='+promotion.toUpperCase():'')});
      }
    }
    return out.some(m=>m.captured)?out.filter(m=>m.captured):out;
  }
  move(m){
    const st=this.state,p=st.board[m.from],ep=st.enPassant;
    if(p.type==='p'&&ep?.square===m.to&&!st.board[m.to])delete st.board[ep.pawnSquare];
    delete st.board[m.from];st.board[m.to]={...p,type:m.promotion||p.type,moved:true};
    st.enPassant=p.type==='p'&&Math.abs(Number(m.to[1])-Number(m.from[1]))===2?{square:m.from[0]+((Number(m.to[1])+Number(m.from[1]))/2),pawnSquare:m.to,capturableBy:opposite(p.color)}:null;
    st.turn=opposite(p.color);this.halfmoves=p.type==='p'||m.captured?0:this.halfmoves+1;return m;
  }
}
function clonePosition(chess){return chess instanceof AntiBoard?chess.clone():new Chess(chess.fen())}
function kingSquare(chess,color){return chess.board().flat().find(p=>p?.type==='k'&&p.color===color)?.square||''}
export function variantMoves(chess,id){
  const moves=chess.moves({verbose:true});
  if(id==='fish')return moves.concat(fishSwaps(chess));
  if(id!=='racing')return moves;
  return moves.filter(m=>!/[+#]/.test(m.san));
}
function key(lab){return lab.chess.fen().split(' ').slice(0,4).join(' ')+(lab.id==='threecheck'?' '+lab.checks.w+':'+lab.checks.b:'')}
export function newVariant(id,mode,humanColor='w'){
  const lab={id,mode,humanColor,chess:id==='antichess'?new AntiBoard():id==='racing'?new Chess(racingFen):new Chess(),checks:{w:0,b:0},history:[],counts:new Map(),result:null,selected:null,last:null,paused:false,timer:null};
  lab.counts.set(key(lab),1);return lab;
}
function won(color,reason){return {winner:color,reason}}
function draw(reason){return {winner:'draw',reason}}
export function variantResult(lab){
  const {chess,id,checks}=lab,turn=chess.turn();
  if(id==='antichess'&&!variantMoves(chess,id).length)return won(turn,'Sin piezas o sin movimientos legales');
  if(id==='hill'){for(const c of ['w','b'])if(center.has(kingSquare(chess,c)))return won(c,'Rey en el centro')}
  if(id==='threecheck'){for(const c of ['w','b'])if(checks[c]>=3)return won(c,'Tres jaques')}
  if(id==='racing'){
    const w=kingSquare(chess,'w').endsWith('8'),b=kingSquare(chess,'b').endsWith('8');
    if(w&&b)return draw('Ambos reyes alcanzaron la meta');
    if(b)return won('b','Rey en la octava fila');
    if(w&&(turn==='w'||!variantMoves(chess,id).some(m=>m.piece==='k'&&m.to.endsWith('8'))))return won('w','Rey en la octava fila');
    if(!variantMoves(chess,id).length)return draw('Sin jugadas legales');
  }else if(id==='fish'){
    if(!chess.moves().length&&!fishSwaps(chess).length)return chess.isCheck()?won(opposite(turn),'Jaque mate'):draw('Ahogado');
  }else if(id!=='antichess'){
    if(chess.isCheckmate())return won(opposite(turn),'Jaque mate');
    if(chess.isStalemate())return draw('Ahogado');
    if(id==='threecheck'&&chess.board().flat().filter(Boolean).every(p=>p.type==='k'))return draw('Solo quedan los reyes');
  }
  if((lab.counts.get(key(lab))||0)>=3)return draw('Triple repetición');
  if(chess.isDrawByFiftyMoves())return draw('Regla de 50 movimientos');
  return null;
}
export function playVariantMove(lab,move){
  if(lab.result)return false;
  if(lab.id==='fish'&&move.kind==='swap'){
    const fen=fishSwapFen(lab.chess,move.a,move.b);if(!fen)return false;
    lab.chess.load(fen);lab.history.push(move.a.toUpperCase()+'↔'+move.b.toUpperCase()+(lab.chess.isCheck()?'+':''));
    lab.last=[...Array.from({length:8},(_,i)=>move.a+(i+1)),...Array.from({length:8},(_,i)=>move.b+(i+1))];lab.selected=null;
    const k=key(lab);lab.counts.set(k,(lab.counts.get(k)||0)+1);lab.result=variantResult(lab);return true;
  }
  const legal=(lab.id==='fish'?lab.chess.moves({verbose:true}):variantMoves(lab.chess,lab.id)).find(m=>m.from===move.from&&m.to===move.to&&(m.promotion||'')===(move.promotion||''));
  if(!legal)return false;
  const played=lab.id==='antichess'?lab.chess.move(legal):lab.chess.move({from:legal.from,to:legal.to,...(legal.promotion?{promotion:legal.promotion}:{})});
  if(lab.id==='threecheck'&&lab.chess.isCheck())lab.checks[played.color]++;
  lab.history.push(played.san);lab.last=[played.from,played.to];lab.selected=null;
  const k=key(lab);lab.counts.set(k,(lab.counts.get(k)||0)+1);
  lab.result=variantResult(lab);return true;
}
function score(lab,c){
  const r=lab.result;if(r)return r.winner==='draw'?0:r.winner===c?100000:-100000;
  let val=0;for(const p of lab.chess.board().flat().filter(Boolean))val+=(p.color===c?1:-1)*values[p.type]*10;
  if(lab.id==='antichess')return -val;
  if(lab.id==='fish')for(const p of lab.chess.board().flat().filter(Boolean)){if(p.type==='k')continue;const f=files.indexOf(p.square[0]),r=Number(p.square[1]);val+=(p.color===c?1:-1)*(.3*(7-Math.abs(f-3.5)-Math.abs(r-4.5))+(p.type==='p'?.15*(p.color==='w'?r-2:7-r):0));}
  for(const sideColor of ['w','b']){
    const sign=sideColor===c?1:-1,k=kingSquare(lab.chess,sideColor);
    if(lab.id==='hill')val-=sign*5*(Math.abs(files.indexOf(k[0])-3.5)+Math.abs(Number(k[1])-4.5));
    if(lab.id==='racing')val+=sign*12*Number(k[1]);
    if(lab.id==='threecheck')val+=sign*35*lab.checks[sideColor];
  }
  return val;
}
export function chooseVariantMove(lab){
  const c=lab.chess.turn(),moves=variantMoves(lab.chess,lab.id);let best=null,bestScore=-Infinity;
  for(const m of moves){
    const sim={...lab,chess:clonePosition(lab.chess),checks:{...lab.checks},history:[],counts:new Map(lab.counts),last:null};
    if(!playVariantMove(sim,m))continue;
    let s=score(sim,c);
    if(!sim.result){
      let worst=Infinity;
      for(const reply of variantMoves(sim.chess,sim.id)){
        const next={...sim,chess:clonePosition(sim.chess),checks:{...sim.checks},history:[],counts:new Map(sim.counts)};
        if(playVariantMove(next,reply))worst=Math.min(worst,score(next,c));
      }
      if(Number.isFinite(worst))s=.25*s+.75*worst;
    }
    s+=Math.random()*.15;
    if(s>bestScore){bestScore=s;best=m}
  }
  return best;
}
export const variantPlayMethods={
  renderVariantPicker(){
    const v=document.querySelector('#view'),mode=this.cfg.mode;
    v.innerHTML='<section class="page-head"><button data-variant-back>←</button><div><small>JUGAR · VARIANTES</small><h1>'+modes[mode]+'</h1></div></section><div class="home-grid">'+VARIANTS.map(a=>'<button type="button" data-variant="'+a.id+'"><b>VARIANTE</b><span>'+a.name+'</span><p class="hint">'+a.description+'</p></button>').join('')+'</div>';
    v.querySelector('[data-variant-back]').onclick=()=>{this.screen='home';this.render()};
    v.querySelectorAll('[data-variant]').forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.variant;
      if(id==='standard'){this.screen='setup';this.render();return}
      if(id==='research960'){this.research960Return='variantPicker';this.research960Config={mode,number:'random',humanColor:'w',depth:14};this.screen='research960';this.render();return}
      if(id==='night'){this.cancelCaveCom?.();this.caveLab=null;this.db.settings.caveMode=mode;this.screen='chessInCave';this.render();return}
      this.variantId=id;this.variantLab=null;this.screen='variantGame';this.render();
    });
  },

  renderFishGame(){
    const lab=this.variantLab,chess=lab.chess,v=document.querySelector('#view'),turn=chess.turn(),flip=lab.mode==='pvc'&&lab.humanColor==='b';
    if(this.rightAnnotation?.context==='fish')this.cancelRightAnnotation();
    lab.marks??={annotations:new Map(),arrows:[]};lab.swapMode??=false;
    const human=()=>!lab.result&&!lab.paused&&!lab.promoting&&(lab.mode==='pvp'||(lab.mode==='pvc'&&chess.turn()===lab.humanColor));
    const normal=chess.moves({verbose:true}),moves=lab.selected?normal.filter(m=>m.from===lab.selected):[];
    const status=lab.result?(lab.result.winner==='draw'?'Tablas':side(lab.result.winner)+' ganan')+' · '+lab.result.reason:'Turno de '+side(turn)+(chess.isCheck()?' · Jaque':'');
    const board=this.boardHtml(chess,true,{flipped:flip,selected:lab.swapMode?null:lab.selected,legalSquares:lab.swapMode?[]:moves.map(m=>m.to),lastMove:lab.last,annotations:lab.marks.annotations});
    v.innerHTML='<section class="page-head"><button data-fish-back>←</button><div><small>'+modes[lab.mode]+'</small><h1>Fish Chess</h1></div></section><section class="game-layout fish-game"><div><div class="board-stage"><div class="board-wrap" style="'+this.customBoardStyle()+'"><div class="board" id="fish-board">'+board+'</div><div data-fish-arrows>'+this.arrowsSvg({arrows:lab.marks.arrows,flipped:flip})+'</div></div></div></div><aside><h2>'+status+'</h2><p>Mueve una pieza o intercambia dos columnas completas durante tu turno.</p><div class="actions"><button data-fish-mode '+(human()?'':'disabled')+'>'+ (lab.swapMode?'Cancelar intercambio':'Intercambiar columnas')+'</button><button data-fish-clear>Borrar marcas</button><div class="fish-annotation" data-fish-palette>'+this.annotationPanel()+'</div></div><p class="hint" role="status">'+(lab.message|| (lab.swapMode?(lab.column?'Selecciona la segunda columna':'Selecciona la primera columna'):'Clic derecho para marcar; arrastra con clic derecho para dibujar.'))+'</p><div class="moves">'+lab.history.map((m,i)=>'<span style="display:inline-block;padding:5px">'+(i%2===0?Math.floor(i/2)+1+'. ':'')+m+'</span>').join('')+'</div><div class="row">'+(lab.mode==='cvc'&&!lab.result?'<button data-fish-pause>'+(lab.paused?'Reanudar':'Pausar')+'</button>':'')+'<button data-fish-restart>Nueva partida</button></div></aside></section>';
    const el=v.querySelector('#fish-board'),palette=v.querySelector('[data-fish-palette]');
    const repaint=()=>{if(this.variantLab===lab&&this.screen==='variantGame')this.renderFishGame()};
    const paintMarks=()=>{el.querySelectorAll('[data-square]').forEach(s=>{const mark=lab.marks.annotations.get(s.dataset.square);s.classList.toggle('marked',!!mark);for(const color of ['red','yellow','green','blue'])s.classList.toggle('mark-'+color,mark===color)});v.querySelector('[data-fish-arrows]').innerHTML=this.arrowsSvg({arrows:lab.marks.arrows,flipped:flip})};
    const bindPalette=()=>this.bindAnnotationPanel(palette,()=>{palette.innerHTML=this.annotationPanel();bindPalette()});
    const cleanup=()=>{clearTimeout(lab.timer);lab.timer=null;this.cancelRightAnnotation();if(this.drag?.context==='fish'){this.drag.ghost?.remove();this.drag.source?.classList.remove('drag-source');this.drag=null}};
    v.querySelector('[data-fish-back]').onclick=()=>{cleanup();this.variantLab=null;this.screen='variantPicker';this.render()};
    v.querySelector('[data-fish-restart]').onclick=()=>{cleanup();this.variantLab=null;this.renderVariantGame()};
    v.querySelector('[data-fish-mode]').onclick=()=>{if(!human())return;lab.swapMode=!lab.swapMode;lab.column=null;lab.selected=null;lab.message='';repaint()};
    v.querySelector('[data-fish-clear]').onclick=()=>{lab.marks.annotations.clear();lab.marks.arrows.length=0;paintMarks()};
    const pause=v.querySelector('[data-fish-pause]');if(pause)pause.onclick=()=>{lab.paused=!lab.paused;clearTimeout(lab.timer);lab.timer=null;repaint()};
    const moveFrom=async(from,to)=>{
      if(!human()||lab.swapMode)return;
      const options=chess.moves({verbose:true}).filter(m=>m.from===from&&m.to===to);if(!options.length)return;
      let m=options[0];if(options.some(x=>x.promotion)){lab.promoting=true;try{const p=await this.choosePromotion();m=options.find(x=>x.promotion===p)}finally{lab.promoting=false}}
      if(this.variantLab!==lab||this.screen!=='variantGame'||!human()||!m)return;
      playVariantMove(lab,m);lab.message='';repaint();
    };
    this.bindKeyboardBoard(el);el.closest('.board-wrap').oncontextmenu=e=>e.preventDefault();
    el.querySelectorAll('[data-square]').forEach(btn=>{
      const sq=btn.dataset.square;
      btn.classList.toggle('fish-file-selected',lab.swapMode&&lab.column===sq[0]);
      btn.onclick=()=>{
        if(!human()||Date.now()<(this.suppress||0))return;
        lab.message='';
        if(lab.swapMode){
          const f=sq[0];if(!lab.column||lab.column===f){lab.column=lab.column===f?null:f;repaint();return}
          if(playVariantMove(lab,{kind:'swap',a:lab.column,b:f})){lab.swapMode=false;lab.column=null}
          else lab.message='Intercambio ilegal: el rey queda o atraviesa una casilla amenazada.';
          repaint();return;
        }
        if(lab.selected&&moves.some(m=>m.to===sq)){void moveFrom(lab.selected,sq);return}
        lab.selected=chess.get(sq)?.color===turn&&lab.selected!==sq?sq:null;repaint();
      };
      btn.onpointerdown=e=>{
        if(e.button===2){this.startRightAnnotation(e,sq,'fish',{board:el,...lab.marks,onChange:paintMarks});return}
        if(human()&&!lab.swapMode)this.startVisualDrag(e,sq,'fish',chess,{preserveAnnotations:true});
      };
      btn.onpointermove=e=>{this.moveRightAnnotation(e);this.dragMove(e)};
      btn.onpointerup=e=>{if(this.rightAnnotation?.context==='fish'&&this.rightAnnotation.id===e.pointerId){this.endRightAnnotation(e);return}if(this.drag?.context==='fish')this.endVisualDrag(e,(from,to)=>{void moveFrom(from,to)},{board:el})};
      btn.onpointercancel=e=>{this.cancelRightAnnotation(e);if(this.drag?.context==='fish')this.endVisualDrag(e,()=>{},{cancel:true})};
    });
    bindPalette();
    if(!human()&&!lab.result&&!lab.paused&&!lab.promoting&&!lab.timer)lab.timer=setTimeout(()=>{
      lab.timer=null;if(this.variantLab!==lab||this.screen!=='variantGame'||lab.paused)return;
      const m=chooseVariantMove(lab);if(m)playVariantMove(lab,m);else lab.result=variantResult(lab)||draw('Sin jugadas legales');lab.swapMode=false;lab.column=null;repaint();
    },350);
  },
  renderVariantGame(){
    const v=document.querySelector('#view'),id=this.variantId,variant=VARIANTS.find(a=>a.id===id),mode=this.cfg.mode;
    if(!variant){this.screen='variantPicker';this.render();return}
    if(!this.variantLab){
      v.innerHTML='<section class="page-head"><button data-variant-back>←</button><div><small>'+modes[mode]+'</small><h1>'+variant.name+'</h1></div></section><section class="panel"><p>'+variant.description+'</p>'+(mode==='pvc'?'<label>Color de J1<select id="variant-color"><option value="w">Blancas</option><option value="b">Negras</option></select></label>':'')+'<p class="hint">Motor local adaptado a las reglas de esta variante. No utiliza el Elo de Stockfish.</p><button class="primary" id="variant-start">Iniciar partida</button></section>';
      v.querySelector('[data-variant-back]').onclick=()=>{this.screen='variantPicker';this.render()};
      v.querySelector('#variant-start').onclick=()=>{this.variantLab=newVariant(id,mode,v.querySelector('#variant-color')?.value||'w');this.renderVariantGame()};
      return;
    }
    if(id==='fish'){this.renderFishGame();return}
    const lab=this.variantLab,chess=lab.chess,turn=chess.turn(),human=lab.mode==='pvp'||(lab.mode==='pvc'&&turn===lab.humanColor);
    const flip=lab.mode==='pvc'&&lab.humanColor==='b',ranks=flip?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],fs=flip?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
    const moves=lab.selected?variantMoves(chess,id).filter(m=>m.from===lab.selected):[];
    let board='';
    for(const r of ranks)for(const f of fs){const sq=files[f]+r,p=chess.get(sq);board+='<button type="button" class="sq '+((f+r)%2?'light':'dark')+(lab.selected===sq?' selected':'')+(moves.some(m=>m.to===sq)?' legal':'')+(lab.last?.includes(sq)?' last':'')+'" data-vsquare="'+sq+'" aria-label="'+sq+'">'+(p?'<img draggable="false" src="'+this.pieceSrc(p.color,p.type)+'" alt="'+p.color+p.type+'">':'')+(r===(flip?8:1)?'<i class="file">'+files[f]+'</i>':'')+(f===(flip?7:0)?'<i class="rank">'+r+'</i>':'')+'</button>'}
    const status=lab.result?(lab.result.winner==='draw'?'Tablas':side(lab.result.winner)+' ganan')+' · '+lab.result.reason:'Turno de '+side(turn);
    v.innerHTML='<section class="page-head"><button data-variant-back>←</button><div><small>'+modes[mode]+'</small><h1>'+variant.name+'</h1></div></section><section class="game-layout"><div class="board-wrap" style="'+this.customBoardStyle()+'"><div class="board">'+board+'</div></div><aside><h2>'+status+'</h2><p>'+variant.description+'</p>'+(id==='threecheck'?'<p>Jaques: Blancas '+lab.checks.w+'/3 · Negras '+lab.checks.b+'/3</p>':'')+'<div class="moves">'+lab.history.map((m,i)=>'<span style="display:inline-block;padding:5px">'+(i%2===0?Math.floor(i/2)+1+'. ':'')+m+'</span>').join('')+'</div><div class="row">'+(lab.mode==='cvc'&&!lab.result?'<button id="variant-pause">'+(lab.paused?'Reanudar':'Pausar')+'</button>':'')+'<button id="variant-restart">Nueva partida</button></div></aside></section>';
    v.querySelector('[data-variant-back]').onclick=()=>{clearTimeout(lab.timer);this.variantLab=null;this.screen='variantPicker';this.render()};
    v.querySelector('#variant-restart').onclick=()=>{clearTimeout(lab.timer);this.variantLab=null;this.renderVariantGame()};
    const pause=v.querySelector('#variant-pause');if(pause)pause.onclick=()=>{lab.paused=!lab.paused;clearTimeout(lab.timer);lab.timer=null;this.renderVariantGame()};
    v.querySelectorAll('[data-vsquare]').forEach(btn=>btn.onclick=()=>{
      if(!human||lab.result)return;
      const sq=btn.dataset.vsquare,options=moves.filter(m=>m.to===sq);
      if(options.length){let m=options[0];if(options.some(a=>a.promotion)){const p=(prompt(id==='antichess'?'Promoción: Q, R, B, N o K':'Promoción: Q, R, B o N','Q')||'Q').toLowerCase();m=options.find(a=>a.promotion===p)||options.find(a=>a.promotion==='q')||m}playVariantMove(lab,m)}
      else lab.selected=chess.get(sq)?.color===turn?sq:null;
      this.renderVariantGame();
    });
    if(!human&&!lab.result&&!lab.paused&&!lab.timer)lab.timer=setTimeout(()=>{
      lab.timer=null;if(this.screen!=='variantGame'||this.variantLab!==lab||lab.paused)return;
      const move=chooseVariantMove(lab);if(move)playVariantMove(lab,move);else lab.result=variantResult(lab)||draw('Sin jugadas legales');
      this.renderVariantGame();
    },350);
  }
};

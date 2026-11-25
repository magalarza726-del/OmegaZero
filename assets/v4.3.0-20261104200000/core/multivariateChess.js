import { Chess } from '../vendor/chess.js';
import { fideGameState } from './fideRules.js';
export const MULTIVARIATE_PARAMETERS=Object.freeze([
 ['Movilidad','Número de destinos geométricos disponibles por pieza propia; peones avanzan y capturan según ocupación. No incluye enroque.'],
 ['Dominio territorial','Casillas distintas atacadas en la mitad rival, excluyendo d4,d5,e4,e5.'],
 ['Control del centro','Casillas centrales distintas atacadas: d4,d5,e4,e5.'],
 ['Distancia al rey rival','Distancia Chebyshev media de caballos, alfiles, torres y damas propios al rey rival.'],
 ['Distancia al rey propio','Distancia Chebyshev media de caballos, alfiles, torres y damas propios al rey propio.'],
 ['Amenazas de captura','Valor material de piezas rivales atacadas, una vez por pieza; excluye rey.'],
 ['Jaque','1 si la jugada da jaque, 0 si no.'],
 ['Presión sobre el rey','Casillas distintas atacadas en el anillo vecino al rey rival.'],
 ['Piezas indefensas','Valor de piezas propias atacadas por el rival y sin defensor geométrico; excluye rey.'],
 ['Clavadas','Piezas enemigas absolutamente clavadas por alfil, torre o dama propia.'],
 ['Ataques múltiples','Piezas propias que atacan al menos dos objetivos rivales de mayor valor (incluye rey como objetivo).'],
 ['Escudo del rey','Peones propios en la fila inmediatamente delante del rey, en su columna o adyacentes.'],
 ['Balance material','Material propio menos rival, en unidades de peón: 1,3,3.25,5,9.'],
 ['Peones aislados','Peones propios sin compañero en ninguna columna adyacente.'],
 ['Peones doblados','Peones propios adicionales al primero de cada columna.'],
 ['Peones pasados','Suma del avance de peones pasados propios: rango relativo menos uno.'],
 ['Torres en columnas abiertas','Torres propias en columnas sin peones de ningún bando.'],
 ['Puestos avanzados','Caballos propios en filas relativas 4–7, protegidos por peón, sin peones rivales en columnas adyacentes capaces de atacarlos por avance geométrico.'],
 ['Pareja de alfiles','1 si hay alfiles propios en ambos colores de casilla, 0 si no.'],
 ['Fase de partida','Material no peón de ambos bandos: C/A=1, T=2, D=4; dividido por 24 y limitado a [0,1].']
].map(([name,description],i)=>Object.freeze({id:'x'+(i+1),name,description})));
const FILES='abcdefgh', V={p:1,n:3,b:3.25,r:5,q:9,k:0}, PH={p:0,n:1,b:1,r:2,q:4,k:0};
const D=[[1,0],[-1,0],[0,1],[0,-1]], B=[[1,1],[1,-1],[-1,1],[-1,-1]], K=[...D,...B], N=[[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]];
const sq=(f,r)=>f>=0&&f<8&&r>=0&&r<8?FILES[f]+(r+1):null;
const coord=s=>[FILES.indexOf(s[0]),Number(s[1])-1];
const opposite=c=>c==='w'?'b':'w', direction=c=>c==='w'?1:-1, relative=p=>p.color==='w'?p.r+1:8-p.r;
const center=new Set(['d4','d5','e4','e5']);
const dist=(p,q)=>Math.max(Math.abs(p.f-q.f),Math.abs(p.r-q.r));
const sum=(a,fn)=>a.reduce((n,p)=>n+fn(p),0);
function attacks(p,board){
 const out=[];const step=p.type==='p'?[[1,direction(p.color)],[-1,direction(p.color)]]:p.type==='n'?N:p.type==='k'?K:p.type==='b'?B:p.type==='r'?D:K;
 const sliding=['b','r','q'].includes(p.type);
 for(const [df,dr] of step)for(let n=1;n<=(sliding?7:1);n++){const target=sq(p.f+df*n,p.r+dr*n);if(!target)break;out.push(target);if(board.has(target))break}
 return out;
}
function mobility(p,board,map,ep){
 if(p.type!=='p')return map.filter(s=>board.get(s)?.color!==p.color).length;
 const d=direction(p.color),one=sq(p.f,p.r+d),two=sq(p.f,p.r+2*d);
 return map.filter(s=>(board.has(s)&&board.get(s).color!==p.color)||s===ep).length+Number(!!one&&!board.has(one)) + Number(relative(p)===2&&!!one&&!!two&&!board.has(one)&&!board.has(two));
}
function pins(king,board,color){
 if(!king)return 0;let count=0;
 for(const [df,dr] of K){let victim=null;
  for(let n=1;n<8;n++){const s=sq(king.f+df*n,king.r+dr*n);if(!s)break;const p=board.get(s);if(!p)continue;
   if(!victim){if(p.color===king.color&&p.type!=='k'){victim=p;continue}break}
   if(p.color===color&&(p.type==='q'||(df&&dr?p.type==='b':p.type==='r')))count++;break
  }
 }return count;
}
export function evaluateParameters(position,color){
 const chess=typeof position==='string'?new Chess(position):position;
 const pieces=chess.board().flat().filter(Boolean).map(p=>{const [f,r]=coord(p.square);return {...p,f,r}});
 const board=new Map(pieces.map(p=>[p.square,p])),own=pieces.filter(p=>p.color===color),opp=pieces.filter(p=>p.color!==color),king=own.find(p=>p.type==='k'),enemy=opp.find(p=>p.type==='k');
 if(!king||!enemy)throw Error('Se necesitan ambos reyes');
 const map=new Map(pieces.map(p=>[p.square,attacks(p,board)])),ownA=new Set(own.flatMap(p=>map.get(p.square))),oppA=new Set(opp.flatMap(p=>map.get(p.square)));
 const pawns=own.filter(p=>p.type==='p'),enemyPawns=opp.filter(p=>p.type==='p'),non=own.filter(p=>['n','b','r','q'].includes(p.type));
 const ep=chess.turn()===color?chess.fen().split(' ')[3]:null;
 const files=Array.from({length:8},(_,f)=>pawns.filter(p=>p.f===f).length);
 const pawnA=new Set(pawns.flatMap(p=>map.get(p.square)));
 const ring=new Set(K.map(([df,dr])=>sq(enemy.f+df,enemy.r+dr)).filter(Boolean));
 const values=[
 sum(own,p=>mobility(p,board,map.get(p.square),ep)),
 [...ownA].filter(s=>!center.has(s)&&(color==='w'?Number(s[1])>=5:Number(s[1])<=4)).length,
 [...ownA].filter(s=>center.has(s)).length,
 non.length?sum(non,p=>dist(p,enemy))/non.length:0,
 non.length?sum(non,p=>dist(p,king))/non.length:0,
 sum(opp.filter(p=>ownA.has(p.square)),p=>V[p.type]),
 Number(ownA.has(enemy.square)),
 [...ownA].filter(s=>ring.has(s)).length,
 sum(own.filter(p=>oppA.has(p.square)&&!ownA.has(p.square)),p=>V[p.type]),
 pins(enemy,board,color),
 own.filter(p=>map.get(p.square).filter(s=>{const q=board.get(s);return q&&q.color!==color&&(q.type==='k'||V[q.type]>V[p.type])}).length>=2).length,
 pawns.filter(p=>p.r===king.r+direction(color)&&Math.abs(p.f-king.f)<=1).length,
 sum(own,p=>V[p.type])-sum(opp,p=>V[p.type]),
 pawns.filter(p=>!files[p.f-1]&&!files[p.f+1]).length,
 sum(files,n=>Math.max(0,n-1)),
 sum(pawns.filter(p=>!enemyPawns.some(q=>Math.abs(q.f-p.f)<=1&&(q.r-p.r)*direction(color)>0)),p=>relative(p)-1),
 own.filter(p=>p.type==='r'&&!pawns.some(q=>q.f===p.f)&&!enemyPawns.some(q=>q.f===p.f)).length,
 own.filter(p=>p.type==='n'&&relative(p)>=4&&relative(p)<=7&&pawnA.has(p.square)&&!enemyPawns.some(q=>Math.abs(q.f-p.f)===1&&(p.r-q.r)*direction(q.color)>=1)).length,
 Number(new Set(own.filter(p=>p.type==='b').map(p=>(p.f+p.r)%2)).size===2),
 Math.min(1,sum(pieces,p=>PH[p.type])/24)
 ];
 return Object.fromEntries(values.map((v,i)=>['x'+(i+1),v]));
}
export function chooseMultivariateMoveOnePly(position,evaluate){
 const chess=typeof position==='string'?new Chess(position):position;
 const color=chess.turn(),fen=chess.fen(),candidates=[];
 const history=chess.history({verbose:true}).map(m=>({fen:m.before})).filter(m=>m.fen);
 for(const move of chess.moves({verbose:true})){
  const next=new Chess(fen),played=next.move({from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})});
  const variables=evaluateParameters(next,color),terminal=fideGameState(next,[...history,{fen},{fen:next.fen()}]);
  let objective=null,error=null;try{objective=Number(evaluate(variables));if(!Number.isFinite(objective))throw Error('Resultado no finito')}catch(e){objective=null;error=String(e.message||e)}
  const mate=terminal.terminal&&terminal.result!=='1/2-1/2',draw=terminal.terminal&&!mate;
  if(draw)objective=0;
  candidates.push({from:played.from,to:played.to,promotion:played.promotion||'',san:played.san,color,fen:next.fen(),variables,objective,mate,draw,error:mate||draw?null:error});
 }
 candidates.sort((a,b)=>Number(b.mate)-Number(a.mate)||Number(b.objective!==null)-Number(a.objective!==null)||((b.objective??0)-(a.objective??0))||a.san.localeCompare(b.san));
 // All invalid: never silently choose a random move or fall back to Stockfish.
 return {color,candidates,best:candidates.find(c=>c.mate||c.objective!==null)||null};
}

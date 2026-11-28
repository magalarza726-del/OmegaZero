import { Chess } from '../vendor/chess.js';
const files='abcdefgh',other=c=>c==='w'?'b':'w',rank=c=>c==='w'?'1':'8';
export function backRank960(n){
 if(!Number.isInteger(n)||n<0||n>959)throw Error('Posición fuera de rango');
 const a=Array(8).fill(''),empty=()=>a.map((p,i)=>p?null:i).filter(i=>i!==null);
 a[(n%4)*2+1]='b';n=Math.floor(n/4);a[(n%4)*2]='b';n=Math.floor(n/4);
 a[empty()[n%6]]='q';n=Math.floor(n/6);
 const e=empty(),pairs=[];for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)pairs.push([i,j]);
 const [i,j]=pairs[n];a[e[i]]=a[e[j]]='n';empty().forEach((f,k)=>a[f]='rkr'[k]);return a.join('');
}
function identities(g){
 const map={};for(const c of ['w','b']){
 const rr=rank(c),pr=c==='w'?'2':'7',counts={};
 for(const f of files){map[f+pr]=c+'p'+f;const p=g.get(f+rr).type,tag=p==='b'?String((files.indexOf(f)+Number(rr))%2):String(counts[p]||0);counts[p]=(counts[p]||0)+1;map[f+rr]=c+p+tag;}
 }return map;
}
export function linkedSquare(l,board,id){return id?Object.keys(l.ids[board]).find(s=>l.ids[board][s]===id):undefined}
function path(a,b){const x=files.indexOf(a[0]),y=files.indexOf(b[0]);return Array.from({length:Math.abs(y-x)+1},(_,i)=>files[x+i*Math.sign(y-x)]+a[1])}
const castleSide=m=>m.flags?.includes('k')?'k':m.flags?.includes('q')?'q':null;
function castleDetails(l,board,c,side){const rr=rank(c);return {from:linkedSquare(l,board,c+'k0'),rookFrom:linkedSquare(l,board,c+'r'+(side==='k'?'1':'0')),to:(side==='k'?'g':'c')+rr,rookTo:(side==='k'?'f':'d')+rr}}
function castle960(l,side){
 const g=l.random,c=g.turn();if(!l.rights[c+side])return null;
 const d=castleDetails(l,'random',c,side);
 if(!d.from||!d.rookFrom||g.get(d.from)?.type!=='k'||g.get(d.rookFrom)?.type!=='r')return null;
 const occupied=new Set([...path(d.from,d.to),...path(d.rookFrom,d.rookTo)]);occupied.delete(d.from);occupied.delete(d.rookFrom);
 if([...occupied].some(s=>g.get(s))||g.isCheck())return null;
 const transit=new Chess(g.fen());transit.remove(d.from);
 if(path(d.from,d.to).slice(0,-1).some(s=>transit.isAttacked(s,other(c))))return null;
 const end=new Chess(g.fen());end.remove(d.from);end.remove(d.rookFrom);end.put({type:'k',color:c},d.to);end.put({type:'r',color:c},d.rookTo);
 if(end.isAttacked(d.to,other(c)))return null;
 return {...d,color:c,piece:'k',flags:side,castle:side,san:side==='k'?'O-O':'O-O-O'};
}
export function researchMoves(l,board,from){
 const g=l[board],moves=g.moves({verbose:true}).map(m=>({...m,castle:castleSide(m)}));
 if(board==='random')moves.push(...['k','q'].map(s=>castle960(l,s)).filter(Boolean));
 return moves.filter(m=>!from||m.from===from);
}
const capSquare=m=>m.captured?(m.flags?.includes('e')?m.to[0]+m.from[1]:m.to):null;
const capId=(l,b,m)=>l.ids[b][capSquare(m)]||null;
function applyTo(l,b,m){
 const g=l[b],map=l.ids[b],id=map[m.from],victim=capId(l,b,m);
 if(b==='random'){
 if(id===m.color+'k0'){l.rights[m.color+'k']=false;l.rights[m.color+'q']=false}
 for(const c of ['w','b'])for(const s of ['k','q']){const rook=c+'r'+(s==='k'?'1':'0');if(id===rook||victim===rook)l.rights[c+s]=false}
 }
 if(m.castle){
 const d=castleDetails(l,b,m.color,m.castle),rookId=map[d.rookFrom];
 if(b==='random'){
 const fen=g.fen().split(' '),copy=new Chess(g.fen());copy.remove(d.from);copy.remove(d.rookFrom);copy.put({type:'k',color:m.color},d.to);copy.put({type:'r',color:m.color},d.rookTo);
 const next=copy.fen().split(' ');next[1]=other(m.color);next[2]='-';next[3]='-';next[4]=String(Number(fen[4])+1);next[5]=String(Number(fen[5])+(m.color==='b'?1:0));g.load(next.join(' '));
 }else g.move({from:m.from,to:m.to});
 delete map[d.from];delete map[d.rookFrom];map[d.to]=id;map[d.rookTo]=rookId;
 }else{g.move({from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{})});delete map[m.from];const cap=capSquare(m);if(cap)delete map[cap];map[m.to]=id;}
}
const key=l=>l.random.fen().split(' ').slice(0,4).join(' ')+Object.keys(l.rights).filter(k=>l.rights[k]).join('');
export function new960Research(number,mode='pvp',humanColor='w'){
 const row=backRank960(number),classic=new Chess(),random=new Chess(row+'/pppppppp/8/8/8/8/PPPPPPPP/'+row.toUpperCase()+' w - - 0 1');
 const l={number,mode,humanColor,classic,random,ids:{classic:identities(classic),random:identities(random)},rights:{wk:true,wq:true,bk:true,bq:true},history:[],counts:new Map(),selected:null,last:null,result:null,paused:false,timer:null,busy:false};l.counts.set(key(l),1);return l;
}
function match(l,b,m){
 const t=b==='classic'?'random':'classic',from=linkedSquare(l,t,l.ids[b][m.from]);
 if(!from)return null;
 return researchMoves(l,t,from).find(n=>(m.castle?n.castle===m.castle:!n.castle&&n.to===m.to)&&(n.promotion||'')===(m.promotion||'')&&capId(l,b,m)===capId(l,t,n))||null;
}
function terminal(l){
 if(!researchMoves(l,'random').length)return l.random.isCheck()?'960: jaque mate':'960: tablas por ahogado';
 if(l.random.isInsufficientMaterial())return '960: tablas por material insuficiente';
 if(l.random.isDrawByFiftyMoves())return '960: tablas por 50 movimientos';
 if((l.counts.get(key(l))||0)>=3)return '960: tablas por triple repetición';
 if(l.classic.isGameOver())return 'Fin de la partida clásica';return null;
}
export function play960Research(l,b,request){
 if(l.result)return false;
 const m=researchMoves(l,b,request.from).find(n=>n.to===request.to&&(n.castle||'')===(request.castle||castleSide(request)||'')&&(n.promotion||'')===(request.promotion||''));
 if(!m)return false;
 const n=match(l,b,m);l.selected=null;
 if(!n){if(b==='random'){applyTo(l,'random',m);l.last={random:[m.from,m.to]};l.history.push({classic:'—',random:m.san});}
 l.result='Fin por movimiento ilegal';l.detail=b==='classic'?'La jugada '+m.san+' del clásico no tiene equivalente legal en 960.':'La jugada '+m.san+' de 960 no tiene equivalente legal en el clásico.';return false;}
 const cm=b==='classic'?m:n,rm=b==='random'?m:n;applyTo(l,'random',rm);applyTo(l,'classic',cm);
 l.last={classic:[cm.from,cm.to],random:[rm.from,rm.to]};l.history.push({classic:cm.san,random:rm.san});
 const k=key(l);l.counts.set(k,(l.counts.get(k)||0)+1);l.result=terminal(l);return true;
}

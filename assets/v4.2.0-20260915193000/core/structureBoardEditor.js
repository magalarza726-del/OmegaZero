const FILES='abcdefgh';
const KNIGHT=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const KING=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const ORTHO=[[1,0],[-1,0],[0,1],[0,-1]];
const DIAG=[[1,1],[1,-1],[-1,1],[-1,-1]];
const ALL_RAYS=[...ORTHO,...DIAG];

const inBoard=(x,y)=>x>=0&&x<8&&y>=1&&y<=8;
const squareName=(x,y)=>`${FILES[x]}${y}`;
export function parseEditorSquare(square){
 const text=String(square||'');
 if(!/^[a-h][1-8]$/.test(text))throw new Error(`Casilla inválida: ${text}`);
 return {square:text,x:FILES.indexOf(text[0]),y:Number(text[1])};
}
function supportsRay(type,dx,dy){
 const orth=dx===0||dy===0;
 return type==='q'||(type==='r'&&orth)||(type==='b'&&!orth);
}
function rayTargets(piece,dx,dy,occupied){
 const out=[];let x=piece.x+dx,y=piece.y+dy;
 while(inBoard(x,y)){
  const target=squareName(x,y);out.push(target);
  if(occupied.has(target))break;
  x+=dx;y+=dy;
 }
 return out;
}
function actionTargets(piece,occupied){
 if(piece.type==='p'){
  const dy=piece.color==='w'?1:-1;
  return [-1,1].flatMap(dx=>inBoard(piece.x+dx,piece.y+dy)?[squareName(piece.x+dx,piece.y+dy)]:[]);
 }
 if(piece.type==='n')return KNIGHT.flatMap(([dx,dy])=>inBoard(piece.x+dx,piece.y+dy)?[squareName(piece.x+dx,piece.y+dy)]:[]);
 if(piece.type==='k')return KING.flatMap(([dx,dy])=>inBoard(piece.x+dx,piece.y+dy)?[squareName(piece.x+dx,piece.y+dy)]:[]);
 const dirs=piece.type==='b'?DIAG:piece.type==='r'?ORTHO:ALL_RAYS;
 return dirs.flatMap(([dx,dy])=>rayTargets(piece,dx,dy,occupied));
}
function supportDepth(piece,dx,dy,pieceBySquare){
 if(!supportsRay(piece.type,dx,dy))return 0;
 let x=piece.x-dx,y=piece.y-dy,depth=0;
 while(inBoard(x,y)){
  const behind=pieceBySquare.get(squareName(x,y));
  if(!behind){x-=dx;y-=dy;continue}
  if(behind.color!==piece.color||!supportsRay(behind.type,dx,dy))break;
  depth+=1;x-=dx;y-=dy;
 }
 return depth;
}
function bump(map,key){map.set(key,(map.get(key)||0)+1)}
function normalizePieces(pieces){
 if(!Array.isArray(pieces))throw new Error('Posición de editor inválida');
 const seen=new Set();
 return pieces.map(item=>{
  const color=item.color==='b'?'b':'w',type=String(item.type||'').toLowerCase();
  if(!['p','n','b','r','q','k'].includes(type))throw new Error(`Pieza inválida: ${type}`);
  const point=parseEditorSquare(item.square);
  if(seen.has(point.square))throw new Error(`Dos piezas ocupan ${point.square}`);seen.add(point.square);
  return {color,type,...point};
 });
}
export function analyzeStructureBoard(pieces,color='w'){
 const normalized=normalizePieces(pieces),side=color==='b'?'b':'w';
 const occupied=new Set(normalized.map(piece=>piece.square)),pieceBySquare=new Map(normalized.map(piece=>[piece.square,piece]));
 const action=new Map(),subaction=new Map();
 for(const piece of normalized){
  if(piece.color!==side)continue;
  for(const target of actionTargets(piece,occupied))bump(action,target);
  if(!['b','r','q'].includes(piece.type))continue;
  const dirs=piece.type==='b'?DIAG:piece.type==='r'?ORTHO:ALL_RAYS;
  for(const [dx,dy] of dirs){
   const depth=supportDepth(piece,dx,dy,pieceBySquare);if(!depth)continue;
   for(const target of rayTargets(piece,dx,dy,occupied))subaction.set(target,Math.max(subaction.get(target)||0,depth));
  }
 }
 const count=(map,predicate)=>[...map.values()].filter(predicate).length;
 return Object.freeze({
  color:side,pieces:Object.freeze(normalized),actionControl:Object.freeze(action),subactionControl:Object.freeze(subaction),
  actionSingleCount:count(action,v=>v===1),actionDoubleCount:count(action,v=>v===2),actionTriplePlusCount:count(action,v=>v>=3),
  subactionSingleCount:count(subaction,v=>v===1),subactionDoubleCount:count(subaction,v=>v===2),subactionTriplePlusCount:count(subaction,v=>v>=3),
  maxAction:Math.max(0,...action.values()),maxSubaction:Math.max(0,...subaction.values()),
  analyzedPieces:normalized.filter(piece=>piece.color===side).length,totalPieces:normalized.length,
 });
}
export function standardEditorPosition(){
 const back=['r','n','b','q','k','b','n','r'],pieces=[];
 for(let file=0;file<8;file+=1){
  pieces.push({color:'w',type:back[file],square:`${FILES[file]}1`},{color:'w',type:'p',square:`${FILES[file]}2`});
  pieces.push({color:'b',type:'p',square:`${FILES[file]}7`},{color:'b',type:back[file],square:`${FILES[file]}8`});
 }
 return pieces;
}

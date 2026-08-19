const FILES='abcdefgh';
const PIECE_ORDER={N:0,B:1,R:2,Q:3,K:4};
const KNIGHT=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const KING=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const ORTHO=[[1,0],[-1,0],[0,1],[0,-1]];
const DIAG=[[1,1],[1,-1],[-1,1],[-1,-1]];
const ALL_RAYS=[...ORTHO,...DIAG];
const POSITIVE_RAYS=[[1,0],[0,1],[1,1],[1,-1]];

export const FREE_PIECE_TYPES=Object.freeze(['N','B','R','Q','K']);
export const FREE_CONTROL_MODES=Object.freeze(['action','subaction']);

const inBoard=(x,y)=>x>=0&&x<8&&y>=1&&y<=8;
const sq=(x,y)=>`${FILES[x]}${y}`;
export function parseFreeSquare(square){
 const text=String(square||'');
 if(!/^[a-h][1-8]$/.test(text))throw new Error(`Casilla inválida: ${text}`);
 return {square:text,x:FILES.indexOf(text[0]),y:Number(text[1])};
}
export function normalizeFreePieces(types){
 if(!Array.isArray(types))throw new Error('Se requiere una lista de piezas');
 const clean=types.filter(Boolean).map(type=>String(type).toUpperCase());
 if(clean.length<1||clean.length>4)throw new Error('Se requieren entre 1 y 4 piezas');
 for(const type of clean)if(!FREE_PIECE_TYPES.includes(type))throw new Error(`Tipo inválido: ${type}`);
 return clean.sort((a,b)=>PIECE_ORDER[a]-PIECE_ORDER[b]);
}
export function normalizeRowWindow(start,end){
 let a=Math.max(1,Math.min(8,Number(start)||1)),b=Math.max(1,Math.min(8,Number(end)||a));
 if(a>b)[a,b]=[b,a];
 if(b-a+1>4)b=a+3;
 if(b>8){b=8;a=Math.max(1,b-3)}
 return {start:a,end:b,height:b-a+1};
}
function typeSupports(type,dx,dy){
 const orth=dx===0||dy===0;
 return type==='Q'||(type==='R'&&orth)||(type==='B'&&!orth);
}
function rayTargets(piece,dx,dy,occupied){
 const out=[];let x=piece.x+dx,y=piece.y+dy;
 while(inBoard(x,y)){
  const target=sq(x,y);out.push(target);
  if(occupied.has(target))break;
  x+=dx;y+=dy;
 }
 return out;
}
function attacks(piece,occupied){
 if(piece.type==='N')return KNIGHT.flatMap(([dx,dy])=>inBoard(piece.x+dx,piece.y+dy)?[sq(piece.x+dx,piece.y+dy)]:[]);
 if(piece.type==='K')return KING.flatMap(([dx,dy])=>inBoard(piece.x+dx,piece.y+dy)?[sq(piece.x+dx,piece.y+dy)]:[]);
 const dirs=piece.type==='B'?DIAG:piece.type==='R'?ORTHO:ALL_RAYS;
 return dirs.flatMap(([dx,dy])=>rayTargets(piece,dx,dy,occupied));
}
function bump(map,key,value=1){map.set(key,(map.get(key)||0)+value)}
function supportDepth(piece,dx,dy,pieceBySquare){
 if(!typeSupports(piece.type,dx,dy))return 0;
 let x=piece.x-dx,y=piece.y-dy,depth=0;
 while(inBoard(x,y)){
  const behind=pieceBySquare.get(sq(x,y));
  if(!behind){x-=dx;y-=dy;continue}
  if(!typeSupports(behind.type,dx,dy))break;
  depth+=1;x-=dx;y-=dy;
 }
 return depth;
}
function direction(dx,dy){
 const sx=Math.sign(dx),sy=Math.sign(dy);
 if(sx===0&&sy>0)return'N';if(sx>0&&sy>0)return'NE';if(sx>0&&sy===0)return'E';if(sx>0&&sy<0)return'SE';
 if(sx===0&&sy<0)return'S';if(sx<0&&sy<0)return'SW';if(sx<0&&sy===0)return'W';if(sx<0&&sy>0)return'NW';return'·';
}
function spatialOrder(pieces){return [...pieces].sort((a,b)=>a.x-b.x||a.y-b.y||PIECE_ORDER[a.type]-PIECE_ORDER[b.type])}
function relativeToken(pieces,mirror=false){
 const pts=pieces.map(p=>({type:p.type,x:mirror?7-p.x:p.x,y:p.y}));
 const minX=Math.min(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y));
 return spatialOrder(pts.map(p=>({...p,x:p.x-minX,y:p.y-minY}))).map(p=>`${p.type}${p.x}${p.y}`).join('.');
}
function topologySignature(pieces){
 let rank=0,file=0,diag=0;
 for(let i=0;i<pieces.length;i+=1)for(let j=i+1;j<pieces.length;j+=1){
  const a=pieces[i],b=pieces[j],dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
  if(dy===0)rank+=1;if(dx===0)file+=1;if(dx===dy)diag+=1;
 }
 return `R${rank}F${file}D${diag}`;
}
function batterySignature(pieces){
 const occupied=new Map(pieces.map(p=>[p.square,p])),tokens=[];
 for(const [dx,dy] of POSITIVE_RAYS){
  const seen=new Set();
  for(const piece of pieces){
   if(!typeSupports(piece.type,dx,dy))continue;
   // Only begin at a piece with no compatible predecessor on the same ray.
   let x=piece.x-dx,y=piece.y-dy,hasCompatibleBehind=false,blocked=false;
   while(inBoard(x,y)){
    const q=occupied.get(sq(x,y));
    if(q){if(typeSupports(q.type,dx,dy))hasCompatibleBehind=true;else blocked=true;break}x-=dx;y-=dy;
   }
   if(hasCompatibleBehind||blocked)continue;
   const chain=[];x=piece.x;y=piece.y;
   while(inBoard(x,y)){
    const q=occupied.get(sq(x,y));
    if(q){if(!typeSupports(q.type,dx,dy))break;chain.push(q)}x+=dx;y+=dy;
   }
   if(chain.length>=2){const ids=chain.map(q=>q.square).join('-');if(!seen.has(ids)){seen.add(ids);tokens.push(`${dx===0||dy===0?'O':'D'}${chain.length}`)}}
  }
 }
 if(!tokens.length)return'B0';
 const counts=new Map();for(const token of tokens)counts.set(token,(counts.get(token)||0)+1);
 return [...counts].sort().map(([token,count])=>`${token}${count>1?`x${count}`:''}`).join('+');
}
export function freeFamilySignature(pieces,{mirrorEquivalent=true}={}){
 const normalized=pieces.map(item=>({type:String(item.type).toUpperCase(),...parseFreeSquare(item.square)}));
 if(normalized.length<1||normalized.length>4||new Set(normalized.map(p=>p.square)).size!==normalized.length)throw new Error('Configuración libre inválida');
 const composition=normalizeFreePieces(normalized.map(p=>p.type)).join('');
 const core=items=>{const ordered=spatialOrder(items),dirs=ordered.slice(1).map((p,i)=>direction(p.x-ordered[i].x,p.y-ordered[i].y)).join('|')||'SOLO',topology=topologySignature(items),battery=batterySignature(items);return {key:`${composition}:${dirs}:${topology}:${battery}`,directions:dirs,topology,battery}};
 const original=core(normalized),mirroredPieces=normalized.map(p=>({...p,x:7-p.x,square:sq(7-p.x,p.y)})),mirrored=core(mirroredPieces);
 const chosen=mirrorEquivalent&&mirrored.key<original.key?mirrored:original;
 const shapeA=relativeToken(normalized,false),shapeB=relativeToken(normalized,true),shape=mirrorEquivalent?[shapeA,shapeB].sort()[0]:shapeA;
 return {key:chosen.key,composition,directions:chosen.directions,topology:chosen.topology,battery:chosen.battery,shape};
}
export function analyzeFreePieceConfiguration(pieces,options={}){
 const normalized=pieces.map(item=>({type:String(item.type).toUpperCase(),...parseFreeSquare(item.square)}));
 if(normalized.length<1||normalized.length>4)throw new Error('Se requieren entre 1 y 4 piezas');
 if(new Set(normalized.map(p=>p.square)).size!==normalized.length)throw new Error('Dos piezas no pueden ocupar la misma casilla');
 const occupied=new Set(normalized.map(p=>p.square)),pieceBySquare=new Map(normalized.map(p=>[p.square,p]));
 const action=new Map(),subaction=new Map();
 for(const piece of normalized){
  for(const target of attacks(piece,occupied))bump(action,target);
  if(['R','B','Q'].includes(piece.type)){
   const dirs=piece.type==='B'?DIAG:piece.type==='R'?ORTHO:ALL_RAYS;
   for(const [dx,dy] of dirs){
    const depth=supportDepth(piece,dx,dy,pieceBySquare);if(!depth)continue;
    for(const target of rayTargets(piece,dx,dy,occupied))subaction.set(target,Math.max(subaction.get(target)||0,depth));
   }
  }
 }
 const family=freeFamilySignature(normalized,options);
 const count=(map,predicate)=>[...map.values()].filter(predicate).length;
 return Object.freeze({
  pieces:Object.freeze(normalized),actionControl:Object.freeze(action),subactionControl:Object.freeze(subaction),family,
  actionSingleCount:count(action,v=>v===1),actionDoubleCount:count(action,v=>v===2),actionTriplePlusCount:count(action,v=>v>=3),
  subactionSingleCount:count(subaction,v=>v===1),subactionDoubleCount:count(subaction,v=>v===2),subactionTriplePlusCount:count(subaction,v=>v>=3),
  maxAction:Math.max(0,...action.values()),maxSubaction:Math.max(0,...subaction.values()),
 });
}
function configLabel(config){return config.map(p=>`${p.type}${p.square}`).join(' · ')}

function centerFreeConfig(config,window){
 const pts=config.map(p=>({type:p.type,...parseFreeSquare(p.square)})),minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y)),width=maxX-minX+1,height=maxY-minY+1;
 const targetMinX=Math.floor((8-width)/2),targetMinY=window.start+Math.floor((window.height-height)/2),dx=targetMinX-minX,dy=targetMinY-minY;
 return pts.map(p=>({type:p.type,square:sq(p.x+dx,p.y+dy)}));
}
export function buildFreePieceFamilies(types,rowStart,rowEnd,{mirrorEquivalent=true,maxExamples=10}={}){
 const normalizedTypes=normalizeFreePieces(types),window=normalizeRowWindow(rowStart,rowEnd),cells=[];
 for(let y=window.start;y<=window.end;y+=1)for(let x=0;x<8;x+=1)cells.push({x,y,square:sq(x,y)});
 const cellIndex=new Map(cells.map((cell,index)=>[cell.square,index]));
 const groups=new Map(),chosen=[];
 let configurations=0;
 const recurse=index=>{
  if(index===normalizedTypes.length){
   const minX=Math.min(...chosen.map(c=>c.x)),minY=Math.min(...chosen.map(c=>c.y));
   // Enumerate only translation-normalized placements; each geometric placement is represented once.
   if(minX!==0||minY!==window.start)return;
   configurations+=1;
   const config=chosen.map((cell,i)=>({type:normalizedTypes[i],square:cell.square}));
   const sig=freeFamilySignature(config,{mirrorEquivalent});let group=groups.get(sig.key);
   if(!group){group={key:sig.key,composition:sig.composition,directions:sig.directions,topology:sig.topology,battery:sig.battery,shape:sig.shape,representative:config.map(p=>({...p})),examples:[],count:0};groups.set(sig.key,group)}
   group.count+=1;
   const label=configLabel(config);
   if(configLabel(group.representative)>label)group.representative=config.map(p=>({...p}));
   if(group.examples.length<maxExamples&&label!==configLabel(group.representative))group.examples.push(config.map(p=>({...p})));
   return;
  }
  const type=normalizedTypes[index],previousSame=index>0&&normalizedTypes[index-1]===type?chosen[index-1]:null;
  for(const cell of cells){
   if(chosen.some(c=>c.square===cell.square))continue;
   if(previousSame&&cellIndex.get(cell.square)<=cellIndex.get(previousSame.square))continue;
   chosen.push(cell);recurse(index+1);chosen.pop();
  }
 };
 recurse(0);
 const families=[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key)).map((family,index)=>Object.freeze({...family,id:`F-${String(index+1).padStart(4,'0')}`,representative:Object.freeze(centerFreeConfig(family.representative,window)),examples:Object.freeze(family.examples.slice(0,maxExamples).map(example=>Object.freeze(centerFreeConfig(example,window))))}));
 return Object.freeze({types:Object.freeze(normalizedTypes),window:Object.freeze(window),families:Object.freeze(families),configurations});
}

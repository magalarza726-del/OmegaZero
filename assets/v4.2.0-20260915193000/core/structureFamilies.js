import { PAWN_STRUCTURE_CODES, analyzePawnStructure } from './pawnStructures.js';

export const STRUCTURE_KINDS = Object.freeze({
  pawns: Object.freeze({ id:'pawns', label:'Peones', boardSize:6, placementRanks:[2,3,4,5] }),
  minor: Object.freeze({ id:'minor', label:'Piezas menores', boardSize:8, placementRanks:[2,3,4,5], roles:['CD','AD','AR','CR'], pieceTypes:['N','B','B','N'] }),
  major: Object.freeze({ id:'major', label:'Piezas mayores', boardSize:8, placementRanks:[1,2,3], roles:['TD','D','R','TR'], pieceTypes:['R','Q','K','R'] }),
});

const FILES = 'abcdefgh';
const DIRECTION_LABEL = Object.freeze({
  N:'Adelante', NE:'Adelante-derecha', E:'Derecha', SE:'Atrás-derecha',
  S:'Atrás', SW:'Atrás-izquierda', W:'Izquierda', NW:'Adelante-izquierda',
});
const PAWN_GRADIENT_LABEL = Object.freeze({ U:'sube', D:'baja', F:'plano', X:'ausencia' });

const familyCaches = new Map();

export function squareName(x,y){
  if(x<1||x>8||y<1||y>8)throw new Error(`Casilla fuera del tablero: ${x},${y}`);
  return `${FILES[x-1]}${y}`;
}

export function parseSquare(square){
  const match=/^([a-h])([1-8])$/.exec(String(square||''));
  if(!match)throw new Error(`Casilla algebraica inválida: ${square}`);
  return {x:FILES.indexOf(match[1])+1,y:Number(match[2]),square:match[0]};
}

export function gradient2D(squares){
  const points=squares.map(parseSquare);
  return points.slice(1).map((point,index)=>({dx:point.x-points[index].x,dy:point.y-points[index].y}));
}

export function gradientDirection({dx,dy}){
  if(dx===0&&dy===0)return 'O';
  const vertical=dy>0?'N':dy<0?'S':'';
  const horizontal=dx>0?'E':dx<0?'W':'';
  return `${vertical}${horizontal}`;
}

export function pieceFamilySignature(squares){
  return gradient2D(squares).map(gradientDirection).join('|');
}

export function pawnFamilySignature(code){
  const analysis=analyzePawnStructure(code);
  const presence=analysis.heights.map(value=>value===9?'0':'1').join('');
  const gradient=analysis.gradient.map(value=>value==null?'X':value>0?'U':value<0?'D':'F').join('');
  return `${presence}:${gradient}`;
}

function pawnFamilyLabel(signature){
  const [presence,gradient]=signature.split(':');
  const shape=[...gradient].map(token=>PAWN_GRADIENT_LABEL[token]).join(' · ');
  const presenceLabel=presence==='1111'?'bloque completo':`presencia ${presence}`;
  return `${shape || 'sin gradiente'} · ${presenceLabel}`;
}

function configScore(squares,kind){
  const points=squares.map(parseSquare);
  const centerY=kind==='minor'?3.5:2;
  const centerDistance=points.reduce((sum,p)=>sum+Math.abs(p.x-4.5)+Math.abs(p.y-centerY),0);
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  const span=(Math.max(...xs)-Math.min(...xs))+(Math.max(...ys)-Math.min(...ys));
  return centerDistance+span*0.08;
}

function pawnRepresentativeScore(code){
  const analysis=analyzePawnStructure(code);
  const present=analysis.heights.filter(value=>value!==9);
  if(!present.length)return 100;
  const mean=present.reduce((a,b)=>a+b,0)/present.length;
  return Math.abs(mean-1.5)+(analysis.depth??0)*0.04;
}

function pushSample(family,value,limit=16){
  if(family.samples.length>=limit)return;
  const key=Array.isArray(value)?value.join('|'):value;
  if(family.sampleKeys.has(key))return;
  family.sampleKeys.add(key);
  family.samples.push(value);
}

export function buildPawnFamilies(){
  if(familyCaches.has('pawns'))return familyCaches.get('pawns');
  const map=new Map();
  for(const code of PAWN_STRUCTURE_CODES){
    const key=pawnFamilySignature(code);
    let family=map.get(key);
    if(!family){family={key,label:pawnFamilyLabel(key),representative:code,representativeScore:Infinity,samples:[],sampleKeys:new Set()};map.set(key,family)}
    const score=pawnRepresentativeScore(code);
    if(score<family.representativeScore){family.representative=code;family.representativeScore=score}
    pushSample(family,code);
  }
  const families=[...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map((family,index)=>{
    const others=family.samples.filter(code=>code!==family.representative).slice(0,10);
    return Object.freeze({id:`P-${String(index+1).padStart(3,'0')}`,key:family.key,label:family.label,representative:family.representative,examples:Object.freeze(others)});
  });
  familyCaches.set('pawns',Object.freeze(families));
  return familyCaches.get('pawns');
}

function allSquares(ranks){
  const out=[];
  for(const y of ranks)for(let x=1;x<=8;x+=1)out.push(squareName(x,y));
  return out;
}

function squareParity(square){const {x,y}=parseSquare(square);return (x+y)&1}

function considerPieceFamily(map,kind,squares){
  const key=pieceFamilySignature(squares);
  let family=map.get(key);
  if(!family){
    const directions=key.split('|');
    family={key,directions,label:directions.map(d=>DIRECTION_LABEL[d]||d).join(' → '),representative:[...squares],representativeScore:Infinity,samples:[],sampleKeys:new Set()};
    map.set(key,family);
  }
  const score=configScore(squares,kind);
  if(score<family.representativeScore){family.representative=[...squares];family.representativeScore=score}
  pushSample(family,[...squares]);
}

function finalizePieceFamilies(map,prefix){
  return Object.freeze([...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map((family,index)=>{
    const repKey=family.representative.join('|');
    const others=family.samples.filter(sample=>sample.join('|')!==repKey).slice(0,10).map(sample=>Object.freeze(sample));
    return Object.freeze({
      id:`${prefix}-${String(index+1).padStart(3,'0')}`,
      key:family.key,
      directions:Object.freeze([...family.directions]),
      label:family.label,
      representative:Object.freeze([...family.representative]),
      examples:Object.freeze(others),
    });
  }));
}

export function buildMinorFamilies(){
  if(familyCaches.has('minor'))return familyCaches.get('minor');
  const ranks=STRUCTURE_KINDS.minor.placementRanks;
  const squares=allSquares(ranks);
  const queenBishopSquares=squares.filter(square=>squareParity(square)===0);
  const kingBishopSquares=squares.filter(square=>squareParity(square)===1);
  const map=new Map();
  for(const cd of squares){
    for(const ad of queenBishopSquares){
      if(ad===cd)continue;
      for(const ar of kingBishopSquares){
        if(ar===cd||ar===ad)continue;
        for(const cr of squares){
          if(cr===cd||cr===ad||cr===ar)continue;
          considerPieceFamily(map,'minor',[cd,ad,ar,cr]);
        }
      }
    }
  }
  const families=finalizePieceFamilies(map,'M');
  familyCaches.set('minor',families);
  return families;
}

export function buildMajorFamilies(){
  if(familyCaches.has('major'))return familyCaches.get('major');
  const squares=allSquares(STRUCTURE_KINDS.major.placementRanks);
  const map=new Map();
  for(const td of squares){
    for(const d of squares){
      if(d===td)continue;
      for(const r of squares){
        if(r===td||r===d)continue;
        for(const tr of squares){
          if(tr===td||tr===d||tr===r)continue;
          considerPieceFamily(map,'major',[td,d,r,tr]);
        }
      }
    }
  }
  const families=finalizePieceFamilies(map,'Y');
  familyCaches.set('major',families);
  return families;
}

export function getStructureFamilies(kind){
  if(kind==='pawns')return buildPawnFamilies();
  if(kind==='minor')return buildMinorFamilies();
  if(kind==='major')return buildMajorFamilies();
  throw new Error(`Tipo de estructura desconocido: ${kind}`);
}

const KNIGHT_DELTAS=Object.freeze([[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]);
const KING_DELTAS=Object.freeze([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
const BISHOP_DIRS=Object.freeze([[1,1],[1,-1],[-1,1],[-1,-1]]);
const ROOK_DIRS=Object.freeze([[1,0],[-1,0],[0,1],[0,-1]]);

function inBoard(x,y){return x>=1&&x<=8&&y>=1&&y<=8}

function attacksForPiece(type,from,occupied){
  const {x,y}=parseSquare(from),targets=[];
  const pushLeaper=deltas=>{for(const [dx,dy] of deltas){const tx=x+dx,ty=y+dy;if(inBoard(tx,ty))targets.push(squareName(tx,ty))}};
  const pushSlider=dirs=>{for(const [dx,dy] of dirs){let tx=x+dx,ty=y+dy;while(inBoard(tx,ty)){const target=squareName(tx,ty);targets.push(target);if(occupied.has(target))break;tx+=dx;ty+=dy}}};
  if(type==='N')pushLeaper(KNIGHT_DELTAS);
  else if(type==='K')pushLeaper(KING_DELTAS);
  else if(type==='B')pushSlider(BISHOP_DIRS);
  else if(type==='R')pushSlider(ROOK_DIRS);
  else if(type==='Q')pushSlider([...BISHOP_DIRS,...ROOK_DIRS]);
  return targets;
}

export function analyzePieceConfiguration(kind,squares){
  const model=STRUCTURE_KINDS[kind];
  if(!model||kind==='pawns')throw new Error(`Configuración de piezas inválida: ${kind}`);
  if(!Array.isArray(squares)||squares.length!==4)throw new Error('Se requieren cuatro ubicaciones algebraicas');
  const points=squares.map(parseSquare);
  if(new Set(squares).size!==4)throw new Error('Dos piezas no pueden ocupar la misma casilla');
  const allowedRanks=new Set(model.placementRanks);
  for(const point of points)if(!allowedRanks.has(point.y))throw new Error(`${point.square} está fuera de las filas permitidas para ${model.label}`);
  if(kind==='minor'){
    if(squareParity(squares[1])!==0)throw new Error('El alfil de dama debe conservar el color de c1');
    if(squareParity(squares[2])!==1)throw new Error('El alfil de rey debe conservar el color de f1');
  }
  const occupied=new Set(squares);
  const front=new Map(),back=new Map(),lateral=new Map(),total=new Map();
  const bump=(map,square)=>map.set(square,(map.get(square)||0)+1);
  const pieces=squares.map((square,index)=>({role:model.roles[index],type:model.pieceTypes[index],square,...parseSquare(square)}));
  for(const piece of pieces){
    for(const target of attacksForPiece(piece.type,piece.square,occupied)){
      const ty=parseSquare(target).y;
      bump(total,target);
      if(ty>piece.y)bump(front,target);
      else if(ty<piece.y)bump(back,target);
      else bump(lateral,target);
    }
  }
  const gradients=gradient2D(squares);
  return Object.freeze({
    kind,
    squares:Object.freeze([...squares]),
    pieces:Object.freeze(pieces),
    gradients:Object.freeze(gradients),
    directionSignature:gradients.map(gradientDirection).join('|'),
    totalControl:Object.freeze(total),
    frontControl:Object.freeze(front),
    backControl:Object.freeze(back),
    lateralControl:Object.freeze(lateral),
    controlledCount:total.size,
    singleControlledCount:[...total.values()].filter(count=>count===1).length,
    doubleControlledCount:[...total.values()].filter(count=>count===2).length,
    triplePlusControlledCount:[...total.values()].filter(count=>count>=3).length,
    frontControlledCount:front.size,
    backControlledCount:back.size,
    lateralControlledCount:lateral.size,
  });
}

export function formatGradient2D(gradients){
  const signed=n=>n>0?`+${n}`:`${n}`;
  return gradients.map(({dx,dy})=>`(${signed(dx)}, ${signed(dy)})`).join(' · ');
}

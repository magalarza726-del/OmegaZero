import { Chess } from '../vendor/chess.js';

export const ENERGY_PIECE_WEIGHTS = Object.freeze({ p:1, n:3, b:3.25, r:5, q:9 });
export const ENERGY_PRIORITIES = Object.freeze(['E','U','K']);
export const ENERGY_MASS_MODES = Object.freeze(['uniform','weighted']);

const FILES='abcdefgh';
const clampFinite=(value,fallback,min=-Infinity,max=Infinity)=>{
  const number=Number(value);
  return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback;
};

export function normalizeEnergyOptions(options={}){
  return Object.freeze({
    g:clampFinite(options.g,1,-1000,1000),
    massMode:ENERGY_MASS_MODES.includes(options.massMode)?options.massMode:'uniform',
    kingWeight:clampFinite(options.kingWeight,4,0,100),
  });
}

export function energyHeight(color,rank){
  return color==='w'?rank-1:8-rank;
}

function pieceWeight(type,kingWeight){
  return type==='k'?kingWeight:(ENERGY_PIECE_WEIGHTS[type]??0);
}

function fenForColor(fen,color){
  const parts=String(fen).trim().split(/\s+/);
  if(parts.length<4)throw new Error('FEN inválido para análisis energético');
  const original=parts[1];
  parts[1]=color;
  // La captura al paso solo pertenece al bando que realmente debe mover.
  if(original!==color)parts[3]='-';
  return parts.join(' ');
}

function boardPieces(chess){
  const out=[];
  for(let rank=1;rank<=8;rank+=1)for(const file of FILES){
    const square=`${file}${rank}`,piece=chess.get(square);
    if(piece)out.push({square,color:piece.color,type:piece.type,rank,file});
  }
  return out;
}

function colorView(fen,color){
  try{return new Chess(fenForColor(fen,color))}catch{return null}
}

export function legalReachableSquares(fen,square,color,view=null){
  const chess=view||colorView(fen,color);
  if(!chess)return [];
  try{return [...new Set(chess.moves({square,verbose:true}).map(move=>move.to))]}catch{return []}
}

export function analyzeEnergyPosition(position,options={}){
  const opts=normalizeEnergyOptions(options);
  const chess=typeof position==='string'?new Chess(position):new Chess(position.fen());
  const fen=chess.fen(),pieces=boardPieces(chess),n=pieces.length;
  const totalWeight=pieces.reduce((sum,piece)=>sum+pieceWeight(piece.type,opts.kingWeight),0);
  const views={w:colorView(fen,'w'),b:colorView(fen,'b')};
  const rows=pieces.map(piece=>{
    const w=pieceWeight(piece.type,opts.kingWeight);
    const mass=opts.massMode==='weighted'
      ?(n>0&&totalWeight>0?(w/totalWeight)*(1/n):0)
      :(n>0?1/n:0);
    const h=energyHeight(piece.color,piece.rank);
    const destinations=legalReachableSquares(fen,piece.square,piece.color,views[piece.color]);
    const v=destinations.length;
    const U=mass*opts.g*h;
    const K=0.5*mass*v*v;
    const E=U+K;
    return Object.freeze({...piece,weight:w,mass,h,v,U,K,E,destinations:Object.freeze(destinations)});
  });
  const totals={w:{U:0,K:0,E:0},b:{U:0,K:0,E:0}};
  for(const row of rows){totals[row.color].U+=row.U;totals[row.color].K+=row.K;totals[row.color].E+=row.E}
  const delta=Object.freeze({U:totals.w.U-totals.b.U,K:totals.w.K-totals.b.K,E:totals.w.E-totals.b.E});
  return Object.freeze({fen,options:opts,n,totalWeight,rows:Object.freeze(rows),totals:Object.freeze({w:Object.freeze(totals.w),b:Object.freeze(totals.b)}),delta});
}

export function chooseEnergyMoveOnePly(position,options={},priority='E'){
  const chess=typeof position==='string'?new Chess(position):new Chess(position.fen());
  const color=chess.turn(),metric=ENERGY_PRIORITIES.includes(priority)?priority:'E';
  const candidates=[];
  for(const legal of chess.moves({verbose:true})){
    const next=new Chess(chess.fen());
    let played;
    try{played=next.move({from:legal.from,to:legal.to,promotion:legal.promotion||'q'})}catch{continue}
    if(!played)continue;
    const analysis=analyzeEnergyPosition(next,options),own=analysis.totals[color];
    candidates.push(Object.freeze({
      from:played.from,to:played.to,promotion:played.promotion||'',san:played.san,color,
      priority:metric,objective:own[metric],U:own.U,K:own.K,E:own.E,deltaE:analysis.delta.E,fen:next.fen(),analysis,
    }));
  }
  candidates.sort((a,b)=>
    (b.objective-a.objective)||
    (b.E-a.E)||
    ((color==='w'?b.deltaE:-b.deltaE)-(color==='w'?a.deltaE:-a.deltaE))||
    a.san.localeCompare(b.san)
  );
  return Object.freeze({color,priority:metric,best:candidates[0]||null,candidates:Object.freeze(candidates)});
}

export function energyFormulaText(options={}){
  const opts=normalizeEnergyOptions(options);
  const mass=opts.massMode==='uniform'?'m = 1/n':'mᵢ = (wᵢ / Σw) · (1/n)';
  return `${mass}; U = mgh; K = ½mv²; E = U + K`;
}

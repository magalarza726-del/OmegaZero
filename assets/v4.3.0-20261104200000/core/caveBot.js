import { caveAllMoves, cavePieceAt } from './caveChess.js';

const VALUE=Object.freeze({p:100,n:320,b:335,r:500,q:900,k:100000});
const FILES='abcdefgh';

function centerBonus(square){
  const file=FILES.indexOf(square?.[0]),rank=Number(square?.[1]);
  if(file<0||!Number.isFinite(rank))return 0;
  const distance=Math.abs(file-3.5)+Math.abs((rank-1)-3.5);
  return Math.max(0,7-distance)*4;
}

export function scoreCaveComMove(state,move,{random=Math.random}={}){
  if(!move)return-Infinity;
  const target=cavePieceAt(state,move.to);
  let score=target?(VALUE[target.type]||0)*10:0;
  if(target?.type==='k')return 1_000_000;

  const piece=move.piece||cavePieceAt(state,move.from);
  if(piece?.type==='p'&&(move.to.endsWith('8')||move.to.endsWith('1')))score+=8200;
  if(piece&&!piece.moved)score+=35;
  score+=centerBonus(move.to);

  if(piece?.type==='p'&&state.enPassant?.square===move.to&&!target)score+=VALUE.p*10;
  score+=(Number(random?.())||0)*18;
  return score;
}

export function chooseCaveComMove(state,color=state?.turn,{random=Math.random}={}){
  if(!state||state.winner||color!==state.turn)return null;
  const moves=caveAllMoves(state,color);
  if(!moves.length)return null;

  const scored=moves.map(move=>({
    ...move,
    promotion:move.piece?.type==='p'&&(move.to.endsWith('8')||move.to.endsWith('1'))?'q':null,
    score:scoreCaveComMove(state,move,{random})
  })).sort((a,b)=>b.score-a.score);

  if(scored[0]?.score>=1_000_000)return scored[0];

  const best=scored[0].score;
  const shortlist=scored.filter(item=>item.score>=best-55).slice(0,4);
  const pick=Math.min(shortlist.length-1,Math.floor((Number(random?.())||0)*shortlist.length));
  return shortlist[Math.max(0,pick)]||scored[0];
}

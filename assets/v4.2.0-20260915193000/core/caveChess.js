const FILES='abcdefgh';
const PROMOTIONS=new Set(['q','r','b','n']);

function inside(file,rank){return file>=0&&file<8&&rank>=1&&rank<=8}
function sq(file,rank){return inside(file,rank)?FILES[file]+rank:null}
function parse(square){return {file:FILES.indexOf(square?.[0]),rank:Number(square?.[1])}}
function copyPiece(piece){return piece?{...piece}:null}

export function initialCaveState(){
  const board={};let id=0;
  const back=['r','n','b','q','k','b','n','r'];
  for(let file=0;file<8;file++){
    board[sq(file,1)]={id:`w${id++}`,color:'w',type:back[file],moved:false};
    board[sq(file,2)]={id:`w${id++}`,color:'w',type:'p',moved:false};
    board[sq(file,7)]={id:`b${id++}`,color:'b',type:'p',moved:false};
    board[sq(file,8)]={id:`b${id++}`,color:'b',type:back[file],moved:false};
  }
  return {board,turn:'w',winner:null,result:null,history:[],enPassant:null,ply:0};
}

export function cloneCaveState(state){
  return {...state,board:Object.fromEntries(Object.entries(state.board||{}).map(([k,v])=>[k,copyPiece(v)])),history:(state.history||[]).map(h=>({...h,captured:copyPiece(h.captured)})),enPassant:state.enPassant?{...state.enPassant}:null};
}

export function cavePieceAt(state,square){return state?.board?.[square]||null}

function raySquares(state,from,directions,{moves=false,color=null}={}){
  const origin=parse(from),out=[];
  for(const [df,dr] of directions){
    let f=origin.file+df,r=origin.rank+dr;
    while(inside(f,r)){
      const target=sq(f,r),piece=cavePieceAt(state,target);
      if(!piece){out.push(target)}
      else{
        if(!moves||piece.color!==color)out.push(target);
        break;
      }
      f+=df;r+=dr;
    }
  }
  return out;
}

function jumpSquares(state,from,steps,{moves=false,color=null}={}){
  const origin=parse(from),out=[];
  for(const [df,dr] of steps){
    const target=sq(origin.file+df,origin.rank+dr);if(!target)continue;
    const piece=cavePieceAt(state,target);
    if(!moves||!piece||piece.color!==color)out.push(target);
  }
  return out;
}

function pawnVision(state,from,piece){
  const {file,rank}=parse(from),dir=piece.color==='w'?1:-1,out=[];
  const one=sq(file,rank+dir);
  if(one&&!cavePieceAt(state,one))out.push(one);
  for(const df of [-1,1]){const target=sq(file+df,rank+dir);if(target)out.push(target)}
  return out;
}

function pawnMoves(state,from,piece){
  const {file,rank}=parse(from),dir=piece.color==='w'?1:-1,start=piece.color==='w'?2:7,out=[];
  const one=sq(file,rank+dir);
  if(one&&!cavePieceAt(state,one)){
    out.push(one);
    const two=sq(file,rank+2*dir);
    if(rank===start&&two&&!cavePieceAt(state,two))out.push(two);
  }
  for(const df of [-1,1]){
    const target=sq(file+df,rank+dir);if(!target)continue;
    const occupant=cavePieceAt(state,target);
    if(occupant&&occupant.color!==piece.color)out.push(target);
    else if(state.enPassant?.square===target&&state.enPassant?.capturableBy===piece.color)out.push(target);
  }
  return out;
}

const KNIGHT=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const KING=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const BISHOP=[[1,1],[1,-1],[-1,1],[-1,-1]];
const ROOK=[[1,0],[-1,0],[0,1],[0,-1]];

export function cavePieceVision(state,from){
  const piece=cavePieceAt(state,from);if(!piece)return[];
  if(piece.type==='p')return pawnVision(state,from,piece);
  if(piece.type==='n')return jumpSquares(state,from,KNIGHT);
  if(piece.type==='k')return jumpSquares(state,from,KING);
  if(piece.type==='b')return raySquares(state,from,BISHOP);
  if(piece.type==='r')return raySquares(state,from,ROOK);
  if(piece.type==='q')return raySquares(state,from,[...BISHOP,...ROOK]);
  return[];
}

function castleMoves(state,from,piece){
  if(piece.type!=='k'||piece.moved)return[];
  const rank=piece.color==='w'?1:8;if(from!==`e${rank}`)return[];
  const out=[];
  const rookH=cavePieceAt(state,`h${rank}`);
  if(rookH?.type==='r'&&rookH.color===piece.color&&!rookH.moved&&!cavePieceAt(state,`f${rank}`)&&!cavePieceAt(state,`g${rank}`))out.push(`g${rank}`);
  const rookA=cavePieceAt(state,`a${rank}`);
  if(rookA?.type==='r'&&rookA.color===piece.color&&!rookA.moved&&!cavePieceAt(state,`b${rank}`)&&!cavePieceAt(state,`c${rank}`)&&!cavePieceAt(state,`d${rank}`))out.push(`c${rank}`);
  return out;
}

export function caveLegalMoves(state,from){
  const piece=cavePieceAt(state,from);if(!piece||piece.color!==state.turn||state.winner)return[];
  let out=[];
  if(piece.type==='p')out=pawnMoves(state,from,piece);
  else if(piece.type==='n')out=jumpSquares(state,from,KNIGHT,{moves:true,color:piece.color});
  else if(piece.type==='k')out=[...jumpSquares(state,from,KING,{moves:true,color:piece.color}),...castleMoves(state,from,piece)];
  else if(piece.type==='b')out=raySquares(state,from,BISHOP,{moves:true,color:piece.color});
  else if(piece.type==='r')out=raySquares(state,from,ROOK,{moves:true,color:piece.color});
  else if(piece.type==='q')out=raySquares(state,from,[...BISHOP,...ROOK],{moves:true,color:piece.color});
  return [...new Set(out)];
}

export function caveAllMoves(state,color=state.turn){
  if(state.winner)return[];const shadow={...state,turn:color},out=[];
  for(const [from,piece] of Object.entries(state.board||{}))if(piece.color===color)for(const to of caveLegalMoves(shadow,from))out.push({from,to,piece:{...piece}});
  return out;
}

export function caveVisibility(state,color){
  const visible=new Set();
  for(const [square,piece] of Object.entries(state.board||{})){
    if(piece.color!==color)continue;
    visible.add(square);
    for(const target of cavePieceVision(state,square))visible.add(target);
  }
  return visible;
}

export function caveIlluminatedByOtherAlly(state,target,color,excludeId){
  for(const [square,piece] of Object.entries(state.board||{})){
    if(piece.color!==color||piece.id===excludeId)continue;
    if(cavePieceVision(state,square).includes(target))return true;
  }
  return false;
}

export function caveDisplayType(state,square,perspective,{fog=false}={}){
  const piece=cavePieceAt(state,square);if(!piece)return null;
  if(piece.color!==perspective||!fog||piece.type==='p'||piece.moved)return piece.type;
  return caveIlluminatedByOtherAlly(state,square,perspective,piece.id)?piece.type:'p';
}

function moveNotation(piece,from,to,captured,promotion,castle,enPassant){
  if(castle)return to[0]==='g'?'O-O':'O-O-O';
  const names={p:'',n:'N',b:'B',r:'R',q:'Q',k:'K'};
  return `${names[piece.type]||''}${from}${captured||enPassant?'x':'-'}${to}${promotion?`=${promotion.toUpperCase()}`:''}`;
}

export function applyCaveMove(state,from,to,{promotion='q'}={}){
  if(state.winner)return {ok:false,reason:'game-over'};
  const piece=cavePieceAt(state,from);if(!piece||piece.color!==state.turn)return {ok:false,reason:'turn'};
  if(!caveLegalMoves(state,from).includes(to))return {ok:false,reason:'illegal'};
  const before=cloneCaveState(state),moving=before.board[from],target=before.board[to]||null;
  const fromPos=parse(from),toPos=parse(to);let captured=target,castle=false,enPassant=false;
  delete before.board[from];
  if(moving.type==='p'&&state.enPassant?.square===to&&!target){
    captured=before.board[state.enPassant.pawnSquare]||null;
    delete before.board[state.enPassant.pawnSquare];enPassant=true;
  }
  if(moving.type==='k'&&Math.abs(toPos.file-fromPos.file)===2){
    const rank=moving.color==='w'?1:8;
    if(toPos.file===6){before.board[`f${rank}`]={...before.board[`h${rank}`],moved:true};delete before.board[`h${rank}`]}
    else if(toPos.file===2){before.board[`d${rank}`]={...before.board[`a${rank}`],moved:true};delete before.board[`a${rank}`]}
    castle=true;
  }
  const promoted=moving.type==='p'&&(toPos.rank===8||toPos.rank===1);
  const nextType=promoted?(PROMOTIONS.has(promotion)?promotion:'q'):moving.type;
  before.board[to]={...moving,type:nextType,moved:true};
  before.enPassant=null;
  if(moving.type==='p'&&Math.abs(toPos.rank-fromPos.rank)===2){
    before.enPassant={square:sq(fromPos.file,(fromPos.rank+toPos.rank)/2),pawnSquare:to,capturableBy:moving.color==='w'?'b':'w'};
  }
  const winner=captured?.type==='k'?moving.color:null;
  const notation=moveNotation(moving,from,to,captured,promoted?nextType:null,castle,enPassant);
  before.history.push({ply:before.ply+1,color:moving.color,from,to,piece:moving.type,captured:captured?{...captured}:null,promotion:promoted?nextType:null,castle,enPassant,notation});
  before.ply+=1;
  before.turn=moving.color==='w'?'b':'w';
  if(winner){before.winner=winner;before.result=winner==='w'?'1-0':'0-1'}
  else if(!caveAllMoves(before,before.turn).length){before.winner='draw';before.result='1/2-1/2'}
  Object.assign(state,before);
  return {ok:true,move:state.history.at(-1),winner:state.winner};
}

export function caveVisibleSnapshot(state,perspective,{fog=false}={}){
  const visible=caveVisibility(state,perspective),board={};
  for(const square of visible){
    const piece=cavePieceAt(state,square);
    if(!piece){board[square]=null;continue}
    if(piece.color===perspective||visible.has(square))board[square]={...piece,displayType:caveDisplayType(state,square,perspective,{fog})};
  }
  return {visible,board};
}

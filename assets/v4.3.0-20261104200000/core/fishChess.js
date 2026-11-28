import { Chess } from '../vendor/chess.js';
const files='abcdefgh',other=c=>c==='w'?'b':'w';
const king=(g,c)=>g.board().flat().find(p=>p?.type==='k'&&p.color===c)?.square;
function encode(rows){return rows.map(row=>row.map(p=>p?(p.color==='w'?p.type.toUpperCase():p.type):'1').join('').replace(/1+/g,s=>String(s.length))).join('/')}
export function fishSwapFen(chess,a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==1||b.length!==1||!files.includes(a)||!files.includes(b)||a===b)return null;
 const x=files.indexOf(a),y=files.indexOf(b),rows=chess.board();
 for(const row of rows)[row[x],row[y]]=[row[y],row[x]];
 const f=chess.fen().split(' '),color=chess.turn(),changed=new Set([a,b]);
 let rights=f[2];
 for(const [k,q] of [['K','Q'],['k','q']]){
  if(changed.has('e'))rights=rights.replace(k,'').replace(q,'');
  if(changed.has('h'))rights=rights.replace(k,'');
  if(changed.has('a'))rights=rights.replace(q,'');
 }
 const next=[encode(rows),other(color),rights.replace(/-/g,'')||'-','-',String(Number(f[4])+1),String(Number(f[5])+(color==='b'?1:0))].join(' ');
 const after=new Chess(next),from=king(chess,color),to=king(after,color),enemy=other(color);
 if(!from||!to||after.isAttacked(to,enemy))return null;
 if(from!==to){
  const start=files.indexOf(from[0]),end=files.indexOf(to[0]),step=Math.sign(end-start);
  const pre=new Chess(chess.fen()),post=new Chess(next);pre.remove(from);post.remove(to);
  for(let i=start+step;i!==end;i+=step){const sq=files[i]+from[1];if(pre.isAttacked(sq,enemy)||post.isAttacked(sq,enemy))return null}
 }
 return next;
}
export function fishSwaps(chess){
 const out=[];
 for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){
  const a=files[i],b=files[j],fen=fishSwapFen(chess,a,b);
  if(fen)out.push({kind:'swap',a,b,color:chess.turn(),san:a.toUpperCase()+'↔'+b.toUpperCase(),fen});
 }
 return out;
}

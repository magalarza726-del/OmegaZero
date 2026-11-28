// Bounded mathematical parser. No eval, Function, or executable user code.
export const DEFAULT_ECOM_FORMULA='f=0.2x_{1}+0.3x_{2}+x_{3}+0.4x_{6}+0.8x_{7}+0.3x_{8}-1.5x_{9}+5x_{13}+0.5x_{16}';
const builtins={abs:Math.abs,sqrt:Math.sqrt,sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,ln:Math.log,log:Math.log10,exp:Math.exp,min:Math.min,max:Math.max,floor:Math.floor,ceil:Math.ceil,round:Math.round,sign:Math.sign,pow:Math.pow};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function latexToText(source){
 let s=String(source).replace(/\\(?:mleft|mright|left|right)/g,'').replace(/\\lbrace\b/g,'{').replace(/\\rbrace\b/g,'}').replace(/\\(?:lvert|rvert|vert)\b/g,'|').replace(/\\colon\b/g,':').replace(/\\ /g,' ').replace(/\\([{}])/g,'$1').replace(/\\(?:cdot|times)/g,'*').replace(/\\div/g,'/').replace(/\\(?:leq|le)/g,'<=').replace(/\\(?:geq|ge)/g,'>=').replace(/\\neq/g,'!=').replace(/\\pi/g,'pi').replace(/\\(?:quad|qquad|,|;|!)/g,' ').replace(/\\(sin|cos|tan|arcsin|arccos|arctan|ln|log|exp|min|max|abs|floor|ceil)\b/g,(_,n)=>n.replace('arc','a')).replace(/\\(?:operatorname|mathrm|mathit)\{([A-Za-z]+)\}/g,'$1').replace(/([A-Za-z])_\{([A-Za-z0-9]+)\}/g,'$1$2').replace(/([A-Za-z])_([0-9]+)/g,'$1$2').replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/≠/g,'!=').replace(/π/g,'pi');
 function group(i){while(/\s/.test(s[i]||'')&&i<s.length)i++;if(s[i]!=='{')throw Error('Se esperaba un grupo entre llaves');let depth=1,j=i+1;while(j<s.length&&depth){if(s[j]==='{')depth++;else if(s[j]==='}')depth--;j++}if(depth)throw Error('Falta cerrar una llave');return [s.slice(i+1,j-1),j]}
 for(let limit=0;limit<100;limit++){
  const m=/\\(?:frac|dfrac|tfrac|sqrt)\b/.exec(s);if(!m)break;
  const [a,j]=group(m.index+m[0].length);
  if(m[0]==='\\sqrt'){s=s.slice(0,m.index)+'sqrt('+a+')'+s.slice(j)}
  else{const [b,k]=group(j);s=s.slice(0,m.index)+'(('+a+')/('+b+'))'+s.slice(k)}
 }
 // Desmos-style conditions: {condition:value, condition:value, fallback}.
 // Distinguish grouping braces used by exponents from piecewise braces.
 for(let i=0;i<s.length;i++)if(s[i]==='{'){
  let depth=1,j=i+1;while(j<s.length&&depth){if(s[j]==='{')depth++;else if(s[j]==='}')depth--;j++}
  if(depth)throw Error('Falta cerrar una llave');
  const raw=s.slice(i+1,j-1);
  if(!raw.includes(':')){s=s.slice(0,i)+'('+raw+')'+s.slice(j);continue}
  let d=0,start=0,parts=[];for(let k=0;k<raw.length;k++){if('({'.includes(raw[k]))d++;else if(')}'.includes(raw[k]))d--;else if(raw[k]===','&&!d){parts.push(raw.slice(start,k));start=k+1}}parts.push(raw.slice(start));
  let out='nan';for(let k=parts.length-1;k>=0;k--){const part=parts[k];let depth=0,colon=-1;for(let j=0;j<part.length;j++){if('({'.includes(part[j]))depth++;else if(')}'.includes(part[j]))depth--;else if(part[j]===':'&&!depth){colon=j;break}}if(colon<0)out=part;else out='if('+part.slice(0,colon)+','+part.slice(colon+1)+','+out+')'}
  s=s.slice(0,i)+'('+out+')'+s.slice(j);
 }
 // Absolute value delimiters, non-nested.
 s=s.replace(/\|([^|]+)\|/g,'abs($1)');
 return s;
}
function tokenize(s){
 const tokens=[];let i=0;if(s.length>4000)throw Error('Línea demasiado larga');
 while(i<s.length){if(/\s/.test(s[i])){i++;continue}
  const m=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
  if(m){tokens.push({type:'num',value:Number(m[0])});i+=m[0].length;continue}
  const id=/^[A-Za-z][A-Za-z0-9_]*/.exec(s.slice(i));
  if(id){ // permit Desmos-style ax1 and x1x2, but preserve named helper functions.
   const name=id[0];
   const split=/^(?:[a-z]?x\d+)+(?:[a-z])?$/.test(name)?name.match(/x\d+|[a-z]/g):null;
   for(const v of split||[name])tokens.push({type:'id',value:v});i+=name.length;continue;
  }
  const op=/^(?:<=|>=|!=|==|[+\-*/^(),<>=])/.exec(s.slice(i));if(!op)throw Error('Símbolo no compatible: '+s[i]);tokens.push({type:op[0],value:op[0]});i+=op[0].length;
  if(tokens.length>1000)throw Error('Expresión demasiado larga');
 }return tokens;
}
function parse(s,callables){
 const ts=tokenize(s);let i=0,depth=0;const peek=()=>ts[i]?.type,take=()=>ts[i++],expect=t=>{if(peek()!==t)throw Error('Se esperaba '+t);return take()};
 const node=(type,...args)=>({type,args});
 function primary(){if(++depth>80)throw Error('Expresión demasiado anidada');let n;
  if(peek()==='num')n=node('num',take().value);
  else if(peek()==='id'){const name=take().value;if(peek()==='('&&callables.has(name)){take();const args=[];if(peek()!==')'){do{args.push(compare());if(peek()!==',')break;take()}while(true)}expect(')');n=node('call',name,args)}else n=node('id',name)}
  else if(peek()==='('){take();n=compare();expect(')')}
  else throw Error('Se esperaba número, variable o paréntesis');
  depth--;return n;
 }
 function power(){let n=primary();if(peek()==='^'){take();n=node('^',n,unary())}return n}
 function unary(){if(peek()==='+'||peek()==='-'){const op=take().type;return node(op==='-'?'neg':'pos',unary())}return power()}
 function product(){let n=unary();while(['*','/','num','id','('].includes(peek())){const op=['*','/'].includes(peek())?take().type:'*';n=node(op,n,unary())}return n}
 function add(){let n=product();while(['+','-'].includes(peek())){const op=take().type;n=node(op,n,product())}return n}
 function compare(){let n=add();if(['<','>','<=','>=','=','==','!='].includes(peek())){const op=take().type;n=node(op,n,add())}return n}
 const n=compare();if(i!==ts.length)throw Error('Expresión incompleta o comparación encadenada no compatible');return n;
}
const xnames=Array.from({length:20},(_,i)=>'x'+(i+1));
function walk(n,fn){fn(n);if(n.type==='call')n.args[1].forEach(a=>walk(a,fn));else n.args.filter(a=>a&&typeof a==='object').forEach(a=>walk(a,fn))}
export function compileEcomFormula(source){
 if(String(source).length>12000)throw Error('Máximo 12000 caracteres');
 if(/\\(?:placeholder|prompt)\b/.test(source))throw Error('Completa los espacios pendientes de la expresión');
 const lines=String(source).split(/\r?\n|(?<!\\);/).map(l=>l.trim()).filter(Boolean);
 if(!lines.length||lines.length>40)throw Error('Usa entre 1 y 40 expresiones');
 const defs=new Map(),raws=[];
 for(let i=0;i<lines.length;i++){
  const s=latexToText(lines[i]),m=/^([A-Za-z][A-Za-z0-9_]*)(?:\(([^()]*)\))?\s*=(?!=)\s*(.+)$/.exec(s);
  let name,args,expr;if(m){name=m[1];args=m[2]===undefined?null:m[2].split(',').map(x=>x.trim()).filter(Boolean);expr=m[3]}else{if(i!==lines.length-1)throw Error('Solo la última línea puede ser una expresión sin nombre');name='f';args=null;expr=s}
  if(own(builtins,name)||['if','pi','e','nan',...xnames].includes(name)||defs.has(name))throw Error('Nombre reservado o repetido: '+name);
  if(args&&(args.some(a=>!/^[A-Za-z][A-Za-z0-9_]*$/.test(a))||new Set(args).size!==args.length))throw Error('Argumentos inválidos');
  const def={name,args,expr};defs.set(name,def);raws.push(def);
 }
 const callables=new Set([...Object.keys(builtins),'if',...raws.filter(d=>d.args!==null).map(d=>d.name)]);
 for(const def of raws){def.ast=parse(def.expr,callables);walk(def.ast,n=>{if(n.type==='id'){const name=n.args[0];if(![...xnames,'pi','e','nan',...(def.args||[])].includes(name)&&!(defs.has(name)&&defs.get(name).args===null))throw Error('Variable desconocida: '+name)}if(n.type==='call'){const [name,args]=n.args;if(name==='if'&&args.length!==3)throw Error('if necesita tres argumentos');if(defs.has(name)&&args.length!==defs.get(name).args.length)throw Error('Número de argumentos incorrecto: '+name);if(own(builtins,name)){const ok=['min','max'].includes(name)?args.length>=1:name==='pow'?args.length===2:args.length===1;if(!ok)throw Error('Número de argumentos incorrecto: '+name)}}})}
 const target=defs.get('f')||raws.at(-1);
 if(target.args?.some(a=>!xnames.includes(a)))throw Error('La función objetivo debe usar argumentos x1…x20');
 const dependencies=new Map(raws.map(d=>{const names=new Set();walk(d.ast,n=>{if(n.type==='call'&&defs.has(n.args[0]))names.add(n.args[0]);if(n.type==='id'&&defs.has(n.args[0])&&!d.args?.includes(n.args[0]))names.add(n.args[0])});return[d.name,names]}));
 function visit(name,stack){if(stack.has(name))throw Error('Dependencia circular: '+name);const next=new Set([...stack,name]);for(const d of dependencies.get(name)||[])visit(d,next)}
 raws.forEach(d=>visit(d.name,new Set()));
 function evaluate(variables){
  const base=Object.assign(Object.create(null),variables,{pi:Math.PI,e:Math.E,nan:NaN});let steps=0;
  function run(n,scope){if(++steps>20000)throw Error('Límite de cálculo');const [a,b]=n.args;
   if(n.type==='num')return a;if(n.type==='id'){if(own(scope,a))return scope[a];if(own(base,a))return base[a];return run(defs.get(a).ast,Object.create(null))}
   if(n.type==='call'){if(a==='if')return run(b[0],scope)?run(b[1],scope):run(b[2],scope);const vals=b.map(x=>run(x,scope));if(own(builtins,a))return builtins[a](...vals);const d=defs.get(a),local=Object.create(null);d.args.forEach((k,i)=>local[k]=vals[i]);return run(d.ast,local)}
   const u=run(a,scope);if(n.type==='neg')return -u;if(n.type==='pos')return +u;const v=run(b,scope);
   switch(n.type){case '+':return u+v;case '-':return u-v;case '*':return u*v;case '/':return u/v;case '^':return u**v;case '<':return +(u<v);case '>':return +(u>v);case '<=':return +(u<=v);case '>=':return +(u>=v);case '=':case '==':return +(u===v);case '!=':return +(u!==v)}
  }
  const result=run(target.ast,base);if(!Number.isFinite(result))throw Error('Resultado no finito');return result;
 }
 return {evaluate,definitions:raws,target:target.name};
}
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function mathNode(n){const [a,b]=n.args;const row=(...s)=>'<mrow>'+s.join('')+'</mrow>',op=s=>'<mo>'+escape(s)+'</mo>';
 if(n.type==='num')return '<mn>'+a+'</mn>';
 if(n.type==='id')return /^x\d+$/.test(a)?'<msub><mi>x</mi><mn>'+a.slice(1)+'</mn></msub>':'<mi>'+escape(a)+'</mi>';
 if(n.type==='call'){if(a==='sqrt')return '<msqrt>'+mathNode(b[0])+'</msqrt>';if(a==='abs')return row(op('|'),mathNode(b[0]),op('|'));return row('<mi>'+escape(a)+'</mi>',op('('),b.map(mathNode).join(op(',')),op(')'))}
 if(n.type==='/')return '<mfrac>'+mathNode(a)+mathNode(b)+'</mfrac>';
 if(n.type==='^')return '<msup>'+row(op('('),mathNode(a),op(')'))+mathNode(b)+'</msup>';
 if(n.type==='neg'||n.type==='pos')return row(op(n.type==='neg'?'−':'+'),mathNode(a));
 return row(op('('),mathNode(a),op(n.type==='*'?'·':n.type),mathNode(b),op(')'));
}
export function formulaMathML(compiled){return compiled.definitions.map(d=>'<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow><mi>'+escape(d.name)+'</mi>'+(d.args?'<mo>(</mo>'+d.args.map(a=>mathNode({type:'id',args:[a]})).join('<mo>,</mo>')+'<mo>)</mo>':'')+'<mo>=</mo>'+mathNode(d.ast)+'</mrow></math>').join('')}

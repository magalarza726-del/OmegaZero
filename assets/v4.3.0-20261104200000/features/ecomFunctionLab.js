import { Chess } from '../vendor/chess.js';
import { MULTIVARIATE_PARAMETERS, chooseMultivariateMoveOnePly } from '../core/multivariateChess.js';
import { compileEcomFormula, formulaMathML, DEFAULT_ECOM_FORMULA } from '../core/ecomExpressions.js';
import { esc, $ } from '../app/deps.js';

export const ECOM_PRESETS=Object.freeze({
 balanced:DEFAULT_ECOM_FORMULA,
 omega:'f=3x_{6}+8x_{7}+5x_{8}+4x_{11}-2x_{4}-2x_{9}+5x_{13}',
 zero:'f=5x_{13}+4x_{12}-6x_{9}-2x_{14}-2x_{15}',
 positional:'f=2x_{1}+3x_{2}+5x_{3}+4x_{18}+2x_{19}-2x_{9}+5x_{13}',
 endgame:'f=5x_{13}+8x_{16}-2x_{14}-2x_{15}-2x_{9}',
 adaptive:'g=2x_{1}+3x_{3}+5x_{13}-3x_{9}\nh=5x_{13}+8x_{16}-3x_{9}\nf=x_{20}g+(1-x_{20})h'
});
export function ecomSideConfig(config,color){
 const side=color==='b'?'B':'W';
 return {mode:config['functionMode'+side]==='energy'?'energy':'function',formula:typeof config['formula'+side]==='string'?config['formula'+side]:DEFAULT_ECOM_FORMULA,name:typeof config['formulaName'+side]==='string'?config['formulaName'+side]:'Personalizada'};
}
const fmt=n=>n==null?'—':Number(n).toLocaleString('es-EC',{maximumFractionDigits:4});
const xhtml=id=>'<span class="ecom-x">x<sub>'+id.slice(1)+'</sub></span>';
export function ecomFunctionPanel(app){
 const color=app.ecomEditColor||'w',cfg=ecomSideConfig(app.energyConfig(),color);
 return '<section class="panel ecom-function-lab"><header><div><small>E-COM · PROFUNDIDAD 1</small><h2>Constructor de funciones</h2><p>Evalúa cada posición tras una jugada propia. No simula una respuesta rival.</p></div><span>20 variables</span></header>'+
 '<div class="ecom-tabs" role="group" aria-label="Bando de E-COM"><button type="button" data-ecom-color="w" aria-pressed="'+(color==='w')+'">♔ Blancas</button><button type="button" data-ecom-color="b" aria-pressed="'+(color==='b')+'">♚ Negras</button></div>'+
 '<div class="ecom-builder"><section class="ecom-editor"><label>Modelo del bando<select id="ecom-mode"><option value="function" '+(cfg.mode==='function'?'selected':'')+'>Función multivariable</option><option value="energy" '+(cfg.mode==='energy'?'selected':'')+'>Energía original U / K / E</option></select></label><label>Nombre de la función<input id="ecom-name" maxlength="60" value="'+esc(cfg.name)+'"></label><label>Plantilla<select id="ecom-preset"><option value="">Elegir una plantilla</option><option value="balanced">Equilibrada</option><option value="omega">Omega · agresiva</option><option value="zero">Zero · defensiva</option><option value="positional">Posicional</option><option value="endgame">Finalista</option><option value="adaptive">Adaptativa por fase</option></select></label>'+
 '<div class="ecom-expression-head"><b>Expresiones</b><span>LaTeX / notación matemática</span></div><div class="ecom-math-toolbar" aria-label="Insertar símbolos">'+[['frac','Fracción'],['power','Potencia'],['sqrt','Raíz'],['abs','Valor absoluto'],['ln','ln'],['log','log'],['sin','sin'],['cos','cos'],['if','Por tramos'],['line','Nueva línea']].map(([id,label])=>'<button type="button" data-ecom-symbol="'+id+'">'+label+'</button>').join('')+'</div><textarea id="ecom-formula" rows="7" spellcheck="false" autocapitalize="off" aria-label="Expresiones de E-COM">'+esc(cfg.formula)+'</textarea><div id="ecom-preview" class="ecom-math-preview" aria-label="Vista matemática"></div><div id="ecom-validation" role="status" class="ecom-validation"></div><small>Una definición por línea. Ejemplo: a=2, en otra línea g(t)=t^2, después f=g(x_1)+a x_3. Puedes usar x1 o x_{1}, fracciones, potencias, logaritmos, min/max y funciones por tramos.</small><div class="row"><button type="button" class="primary" id="ecom-save">Guardar función del bando</button><button type="button" id="ecom-copy">Copiar al otro bando</button></div></section>'+
 '<aside class="ecom-catalog"><h3>Variables disponibles</h3><p>Toca una variable para insertarla en la expresión. La perspectiva es siempre la del bando que evalúa.</p><div class="ecom-variable-list">'+MULTIVARIATE_PARAMETERS.map(p=>'<button type="button" data-ecom-var="'+p.id+'" title="'+esc(p.description)+'"><span>'+xhtml(p.id)+'</span><span><b>'+esc(p.name)+'</b><small>'+esc(p.description)+'</small></span></button>').join('')+'</div></aside></div>'+
 '<section class="ecom-test"><h3>Laboratorio de candidatas</h3><label>Posición FEN<input id="ecom-fen" value="'+esc(app.chess?.fen()||new Chess().fen())+'"></label><div class="row"><button type="button" id="ecom-initial">Posición inicial</button><button type="button" id="ecom-test" class="primary">Evaluar todas las jugadas legales</button></div><p class="hint">Se prueba la fórmula del editor desde el color al turno del FEN; no necesita Stockfish. Una función no guardada se puede probar.</p><div id="ecom-results" aria-live="polite"></div></section></section>';
}
export function bindEcomFunctionPanel(app){
 const field=$('#ecom-formula');if(!field)return;
 const color=app.ecomEditColor||'w',suffix=color==='w'?'W':'B',other=color==='w'?'B':'W';
 const status=$('#ecom-validation'),preview=$('#ecom-preview'),name=$('#ecom-name'),mode=$('#ecom-mode');
 function validate(){try{const compiled=compileEcomFormula(field.value);preview.innerHTML=formulaMathML(compiled);status.textContent='Sintaxis válida · comprueba el dominio con una posición real.';status.dataset.ok='1';return compiled}catch(error){preview.textContent='';status.textContent=error.message;status.dataset.ok='0';return null}}
 function insert(value){field.focus();const start=field.selectionStart??field.value.length,end=field.selectionEnd??start;field.setRangeText(value,start,end,'end');validate()}
 field.addEventListener('input',validate);validate();
 document.querySelectorAll('[data-ecom-var]').forEach(b=>b.onclick=()=>insert('x_{'+b.dataset.ecomVar.slice(1)+'}'));
 const symbols={frac:'\\frac{x_{1}}{x_{2}}',power:'^{2}',sqrt:'\\sqrt{x_{1}}',abs:'\\left|x_{1}\\right|',ln:'\\ln(x_{1})',log:'\\log(x_{1})',sin:'\\sin(x_{1})',cos:'\\cos(x_{1})',if:'\\left\\{x_{20}>0.5:x_{3},x_{13}\\right\\}',line:'\n'};
 document.querySelectorAll('[data-ecom-symbol]').forEach(b=>b.onclick=()=>insert(symbols[b.dataset.ecomSymbol]));
 $('#ecom-preset').onchange=e=>{if(!e.target.value)return;field.value=ECOM_PRESETS[e.target.value];name.value=e.target.options[e.target.selectedIndex].textContent;validate()};
 function save(copy=false){if(!validate())return;const dest=copy?other:suffix;app.persistEnergyConfig({['formula'+dest]:field.value,['formulaName'+dest]:name.value.trim()||'Personalizada',['functionMode'+dest]:mode.value});status.textContent=copy?'Función y modo copiados al otro bando.':'Función y modo guardados.'}
 $('#ecom-save').onclick=()=>save();$('#ecom-copy').onclick=()=>save(true);
 document.querySelectorAll('[data-ecom-color]').forEach(b=>b.onclick=()=>{const old=ecomSideConfig(app.energyConfig(),color);if((field.value!==old.formula||name.value!==old.name||mode.value!==old.mode)&&!confirm('Hay cambios sin guardar. ¿Cambiar de bando?'))return;app.ecomEditColor=b.dataset.ecomColor;app.renderModelLab()});
 $('#ecom-initial').onclick=()=>{$('#ecom-fen').value=new Chess().fen();$('#ecom-results').textContent=''};
 $('#ecom-test').onclick=()=>{
  const result=$('#ecom-results'),compiled=validate();if(!compiled)return;
  try{const chess=new Chess($('#ecom-fen').value.trim()),d=chooseMultivariateMoveOnePly(chess,compiled.evaluate);
   if(!d.candidates.length){result.textContent='No hay jugadas legales en esta posición.';return}
   const best=d.best;
   result.innerHTML='<div class="ecom-result-summary"><b>'+ (d.color==='w'?'Blancas':'Negras')+'</b> · '+d.candidates.length+' candidatas · '+(best?'Mejor: '+esc(best.san)+' · '+(best.mate?'Mate':best.draw?'Tablas':fmt(best.objective)):'Ninguna candidata tiene resultado válido')+'</div><div class="ecom-result-scroll"><table><thead><tr><th>Jugada</th><th>f</th>'+MULTIVARIATE_PARAMETERS.map(p=>'<th title="'+esc(p.name)+'">'+xhtml(p.id)+'</th>').join('')+'</tr></thead><tbody>'+d.candidates.map(c=>'<tr class="'+(c===best?'ecom-best':'')+'"><td>'+esc(c.san)+'</td><td title="'+esc(c.error||'')+'">'+(c.mate?'Mate':c.draw?'Tablas':c.error?'Indefinido':fmt(c.objective))+'</td>'+MULTIVARIATE_PARAMETERS.map(p=>'<td>'+fmt(c.variables[p.id])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }catch(error){result.textContent='No se pudo evaluar: '+error.message}
 };
}

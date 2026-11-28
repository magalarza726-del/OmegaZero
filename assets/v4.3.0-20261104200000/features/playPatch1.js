import { Chess, chooseBotCandidate, resolveBotScheme, chooseTransformMoveOnePly, chooseEnergyMoveOnePly, OPENINGS, getOpening, identifyOpening, openingTreeHtml, openingPreview, nextOpeningSan, MASTER_GAMES, saveDb, addGame, addProblemsFromGame, $, $$, clamp, esc, uciToMove, downloadText, fideGameState, timeoutResult, buildGameStats, announce, playTone } from '../app/deps.js';
import { ecomSideConfig } from './ecomFunctionLab.js?v=20261128-math-editor';
import { THEMES } from '../app/config.js';
export const playPatch1={
 comBrainOptions(selected='s'){return [['s','S-COM · Stockfish'],['t','T-COM · Transformación'],['e','E-COM · Energía']].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')},
 normalizeBrain(value){return ['s','t','e'].includes(value)?value:'s'},
 comBrainName(brain,color='w',config={}){
  brain=this.normalizeBrain(brain);
  if(brain==='t'){const lab=this.ensureTComLab(),module=color==='w'?lab.white:lab.black;return `T-COM · ${module?.name||'módulo'}`}
  if(brain==='e'){const e=this.energyConfig(),side=ecomSideConfig(e,color),priority=color==='w'?e.priorityW:e.priorityB;return `E-COM · ${side.mode==='function'?side.name:priority}`}
  const style=config.style||(color==='w'?this.cfg.white:this.cfg.black)||this.cfg.style;return `S-COM · ${style==='omega'?'Omega':'Zero'}`;
 },
 brainInfoHtml(brain,color='w'){
  brain=this.normalizeBrain(brain);
  if(brain==='t'){const lab=this.ensureTComLab(),m=color==='w'?lab.white:lab.black;return `<small class="com-brain-note"><b>T-COM</b> · ${esc(m?.name||'módulo')} · una semijugada · configuración en Investigar → Modelos COM.</small>`}
  if(brain==='e'){const e=this.energyConfig(),side=ecomSideConfig(e,color),p=color==='w'?e.priorityW:e.priorityB;if(side.mode==='function')return '<small class="com-brain-note"><b>E-COM</b> · función multivariable · 1 semijugada.</small>';return `<small class="com-brain-note"><b>E-COM</b> · prioridad ${p} · g=${e.g} · ${e.massMode==='weighted'?'masa ponderada':'masa 1/n'}.</small>`}
  return `<small class="com-brain-note"><b>S-COM</b> usa Stockfish con el estilo, nivel, profundidad y apertura definidos aquí.</small>`;
 },
};

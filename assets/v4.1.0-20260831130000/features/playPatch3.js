import { Chess, chooseBotCandidate, resolveBotScheme, chooseTransformMoveOnePly, chooseEnergyMoveOnePly, OPENINGS, getOpening, identifyOpening, openingTreeHtml, openingPreview, nextOpeningSan, MASTER_GAMES, saveDb, addGame, addProblemsFromGame, $, $$, clamp, esc, uciToMove, downloadText, fideGameState, timeoutResult, buildGameStats, announce, playTone } from '../app/deps.js';
import { THEMES } from '../app/config.js';
export const playPatch3={
 persistSetupConfig(){
  this.db.settings.setupMode=this.cfg.setupMode;
  this.db.settings.gameConfig={
   white:this.cfg.white,black:this.cfg.black,humanColor:this.cfg.humanColor,style:this.cfg.style,brain:this.cfg.brain,whiteBrain:this.cfg.whiteBrain,blackBrain:this.cfg.blackBrain,
   depth:this.cfg.depth,multiPv:this.cfg.multiPv,skill:this.cfg.skill,opening:this.cfg.opening,
   whiteOpening:this.cfg.whiteOpening,blackOpening:this.cfg.blackOpening,independentOpenings:this.cfg.independentOpenings,
   autoPlay:this.cfg.autoPlay,clock:this.cfg.clock,minutes:this.cfg.minutes,increment:this.cfg.increment,
   repeat:this.cfg.repeat,simultaneous:this.cfg.simultaneous,separateBoardColors:this.cfg.separateBoardColors,independentSimClocks:this.cfg.independentSimClocks,
   alternateColors:this.cfg.alternateColors,diversity:this.cfg.diversity,
   opponents:this.cfg.opponents.map(opponent=>({...opponent}))
  };
  saveDb(this.db);
 },
 captureSetupForm(){
  if(!$('#clock'))return;
  const preset=$('#timePreset')?.value;
  if(preset&&preset!=='off'&&this.cfg.setupMode==='quick'){const [minutes,increment]=preset.split('+').map(Number);if(Number.isFinite(minutes))this.cfg.minutes=clamp(minutes,1,180);if(Number.isFinite(increment))this.cfg.increment=clamp(increment,0,60)}
  for(const id of ['white','black','opening','whiteOpening','blackOpening'])if($('#'+id))this.cfg[id]=$('#'+id).value;
  if($('#whiteBrain'))this.cfg.whiteBrain=this.normalizeBrain($('#whiteBrain').value);if($('#blackBrain'))this.cfg.blackBrain=this.normalizeBrain($('#blackBrain').value);
  for(const id of ['depth','multiPv','skill','minutes','increment','repeat','diversity'])if($('#'+id))this.cfg[id]=clamp($('#'+id).value,id==='increment'?0:1,id==='depth'?64:id==='repeat'?100:id==='minutes'?180:id==='multiPv'?8:id==='diversity'?60:20);
  this.cfg.independentOpenings=$('#independentOpenings')?.checked||false;this.cfg.autoPlay=$('#autoPlay')?.checked??this.cfg.autoPlay;this.cfg.alternateColors=$('#alternateColors')?.checked??this.cfg.alternateColors;this.cfg.clock=$('#clock').checked;
  if(this.cfg.mode==='pvc'){
   this.cfg.simultaneous=clamp($('#simultaneous')?.value||1,1,5);this.cfg.separateBoardColors=$('#separateBoardColors')?.checked||false;this.cfg.independentSimClocks=$('#independentSimClocks')?.checked??this.cfg.independentSimClocks;
   this.cfg.opponents=this.cfg.opponents.map((old,i)=>({...old,humanColor:$(`#oppHumanColor${i}`)?.value||old.humanColor,brain:this.normalizeBrain($(`#oppBrain${i}`)?.value||old.brain),style:$(`#oppStyle${i}`)?.value||old.style,skill:clamp($(`#oppSkill${i}`)?.value||old.skill,1,20),depth:clamp($(`#oppDepth${i}`)?.value||old.depth,1,64),multiPv:clamp($(`#oppMultiPv${i}`)?.value||old.multiPv,1,8),opening:$(`#oppOpening${i}`)?.value||old.opening,boardColor:$(`#oppBoardColor${i}`)?.value||old.boardColor}));
   const first=this.cfg.opponents[0];Object.assign(this.cfg,{humanColor:first.humanColor,brain:first.brain,style:first.style,skill:first.skill,depth:first.depth,multiPv:first.multiPv,opening:first.opening});
  }
 },
 opponentDefaults(index=0){return {id:`Tablero ${index+1}`,humanColor:'w',brain:'s',style:index%2?'omega':'zero',skill:20,depth:14,multiPv:3,opening:'auto',boardColor:['blue','red','green','yellow','purple'][index%5]}},
 activateSimBoard(index,paint=true,skipSync=false){if(!this.simultaneous)return;if(!skipSync)this.syncActiveSimSession();const total=this.simultaneous.games.length;this.simultaneous.active=(index+total)%total;const now=performance.now();if(!this.cfg.independentSimClocks)this.simultaneous.games.forEach(game=>{game.clock.last=now});const s=this.simultaneous.games[this.simultaneous.active];this.chess=s.chess;this.selected=s.selected;this.legal=s.legal;this.lastMove=s.lastMove;this.positions=s.positions;this.gameSaved=s.gameSaved;this.clock=s.clock;this.lastMoveQuality=s.lastMoveQuality;this.annotations=s.annotations;this.arrows=s.arrows;this.boardFlipped=s.boardFlipped;this.thinking=s.thinking;Object.assign(this.cfg,{humanColor:s.config.humanColor,brain:this.normalizeBrain(s.config.brain),style:s.config.style,skill:s.config.skill,depth:s.config.depth,multiPv:s.config.multiPv,opening:s.config.opening});if(paint)this.renderGame()},
};

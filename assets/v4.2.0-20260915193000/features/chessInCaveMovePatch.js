import { playTone } from '../app/deps.js';
import { cavePieceAt, caveLegalMoves, caveVisibility, applyCaveMove } from '../core/caveChess.js';

export const chessInCaveMovePatch={
  caveClickSquare(square){
    const lab=this.caveLab,state=lab?.state;
    if(!lab||!state||state.winner||lab.handoff||lab.comThinking)return;
    if(lab.mode==='pvc'&&state.turn!==lab.humanColor)return;

    const perspective=this.cavePerspective(),visible=caveVisibility(state,perspective);
    const selectedTarget=Boolean(lab.selected&&lab.legal.includes(square));
    if(!visible.has(square)&&!selectedTarget)return;

    const piece=cavePieceAt(state,square),own=piece?.color===state.turn;
    if(selectedTarget){
      const moving=cavePieceAt(state,lab.selected);let promotion='q';
      if(moving?.type==='p'&&(square.endsWith('8')||square.endsWith('1'))){
        const answer=(prompt('Promoción: Q, R, B o N','Q')||'Q').toLowerCase();
        promotion=['q','r','b','n'].includes(answer)?answer:'q';
      }
      const result=applyCaveMove(state,lab.selected,square,{promotion});
      if(result.ok){
        playTone?.(result.move?.captured?'capture':'move',{enabled:this.db.settings.sound!==false,pack:this.db.settings.soundPack||'minimal',volume:(this.db.settings.soundVolume??70)/100});
        lab.selected=null;lab.legal=[];
        if(!state.winner&&lab.mode==='pvp')lab.handoff=true;
        this.renderCaveGame();
        if(!state.winner&&lab.mode==='pvc')this.scheduleCaveComMove();
        return;
      }
    }

    if(own){
      lab.selected=square;
      lab.legal=caveLegalMoves(state,square);
      this.renderCaveGame();
      return;
    }
    lab.selected=null;lab.legal=[];this.renderCaveGame();
  }
};

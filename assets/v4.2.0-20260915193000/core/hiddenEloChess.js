const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export const HIDDEN_ELO_MIN=500;
export const HIDDEN_ELO_MAX=2500;
export const HIDDEN_ELO_STYLES=Object.freeze(['sun','earth','moon']);
export const HIDDEN_ELO_STYLE_LABELS=Object.freeze({sun:'Sol',earth:'Tierra',moon:'Luna'});

export function hiddenEloGuessOutcome(realElo,guessElo){
  const real=clamp(realElo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX);
  const guess=clamp(guessElo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX);
  const error=Math.abs(real-guess);
  if(error<=100)return Object.freeze({key:'win',label:'Victoria',error});
  if(error<=200)return Object.freeze({key:'draw',label:'Tablas',error});
  return Object.freeze({key:'loss',label:'Derrota',error});
}

export function hiddenEloGuessWindow(historyLength){
  const fullMoves=Math.floor(Math.max(0,Number(historyLength)||0)/2);
  return Object.freeze({fullMoves,enabled:fullMoves>=10&&fullMoves%5===0,next:fullMoves<10?10:(fullMoves%5===0?fullMoves:fullMoves+(5-fullMoves%5))});
}

export function eloToSkill(elo){
  return Math.max(1,Math.min(20,Math.round(1+(clamp(elo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX)-HIDDEN_ELO_MIN)/2000*19)));
}

export function eloToDepth(elo){
  return Math.max(7,Math.min(18,Math.round(7+(clamp(elo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX)-HIDDEN_ELO_MIN)/2000*11)));
}

export function randomHiddenElo(rng=Math.random){
  return Math.round(HIDDEN_ELO_MIN+clamp(rng(),0,0.999999)*(HIDDEN_ELO_MAX-HIDDEN_ELO_MIN));
}

export function randomHiddenStyle(rng=Math.random){
  return HIDDEN_ELO_STYLES[Math.floor(clamp(rng(),0,0.999999)*HIDDEN_ELO_STYLES.length)];
}

export function nextEffectiveElo(profile,rng=Math.random){
  const base=clamp(profile?.elo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX);
  const style=HIDDEN_ELO_STYLES.includes(profile?.style)?profile.style:'earth';
  const state={burstLeft:Math.max(0,Number(profile?.styleState?.burstLeft)||0),burstBoost:Number(profile?.styleState?.burstBoost)||0};
  let effective=base,tag='nivel real';
  if(style==='sun'){
    if(state.burstLeft<=0&&rng()<0.16){state.burstLeft=1+Math.floor(rng()*3);state.burstBoost=500+Math.round(rng()*500)}
    if(state.burstLeft>0){effective=base+state.burstBoost;state.burstLeft-=1;tag='erupción solar'}
  }else if(style==='moon'){
    if(rng()<0.78){effective=base-(300+Math.round(rng()*400));tag='camuflaje lunar'}
    else tag='recuperación lunar';
  }
  effective=Math.round(clamp(effective,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX));
  return Object.freeze({effectiveElo:effective,tag,styleState:Object.freeze(state)});
}

export function hiddenEloRandomMoveChance(effectiveElo){
  const elo=clamp(effectiveElo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX);
  if(elo<700)return .18;
  if(elo<900)return .12;
  if(elo<1100)return .08;
  if(elo<1300)return .04;
  if(elo<1500)return .02;
  return 0;
}

export function hiddenEloThinkSeconds(effectiveElo,rng=Math.random){
  const elo=clamp(effectiveElo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX);
  const weakness=(HIDDEN_ELO_MAX-elo)/(HIDDEN_ELO_MAX-HIDDEN_ELO_MIN);
  return .35+weakness*1.45+clamp(rng(),0,1)*1.55;
}

export function chooseHiddenEloCandidate(candidates,color,effectiveElo,rng=Math.random){
  if(!Array.isArray(candidates)||!candidates.length)return null;
  const best=candidates[0],sign=color==='b'?-1:1;
  const elo=clamp(effectiveElo,HIDDEN_ELO_MIN,HIDDEN_ELO_MAX);
  const temperature=18+(HIDDEN_ELO_MAX-elo)/(HIDDEN_ELO_MAX-HIDDEN_ELO_MIN)*205;
  const weighted=candidates.slice(0,12).map((candidate,index)=>{
    const bestScore=Number(best.score||0),score=Number(candidate.score||0);
    const loss=Math.max(0,(bestScore-score)*sign);
    const rankPenalty=index*temperature*.12;
    const matePenalty=candidate.mate&&best.mate&&!((candidate.mate>0)===(best.mate>0))?1000:0;
    const weight=Math.exp(-(loss+rankPenalty+matePenalty)/Math.max(1,temperature));
    return {candidate,loss,weight};
  });
  const total=weighted.reduce((sum,item)=>sum+item.weight,0);
  let needle=clamp(rng(),0,0.999999)*total;
  for(const item of weighted){needle-=item.weight;if(needle<=0)return {...item.candidate,estimatedLossCp:item.loss}}
  const fallback=weighted.at(-1);return fallback?{...fallback.candidate,estimatedLossCp:fallback.loss}:best;
}

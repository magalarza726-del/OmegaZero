export function installChessCaveHomePatch(AppClass){
  const previous=AppClass.prototype.renderHome;
  if(previous?.__chessCaveWrapped)return;
  function wrappedRenderHome(...args){
    const result=previous.apply(this,args);
    const grid=document.querySelector('.home-domain-play .home-grid');
    if(grid&&!grid.querySelector('[data-go="chessInCave"]')){
      const button=document.createElement('button');
      button.type='button';
      button.dataset.go='chessInCave';
      button.className='cave-home-card';
      button.innerHTML='<b>VARIANTE · NIEBLA DE GUERRA</b><span>Chess in the Cave</span><em>visión por alcance · rey capturable · historial oculto</em>';
      button.onclick=()=>{this.screen='chessInCave';this.caveLab=null;this.render()};
      grid.append(button);
    }
    return result;
  }
  wrappedRenderHome.__chessCaveWrapped=true;
  AppClass.prototype.renderHome=wrappedRenderHome;
}

import { APP_VERSION, $, $$, esc, publicAsset, analyzeStructureBoard, standardEditorPosition } from '../app/deps.js';

const GLYPH={wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'};
const PIECE_NAME={p:'Peón',n:'Caballo',b:'Alfil',r:'Torre',q:'Dama',k:'Rey'};
const paletteTypes=['p','n','b','r','q','k'];

export const structureBoardEditorMethods={
 ensureStructureBoardLab(){
  if(!this.structureBoardLab)this.structureBoardLab={pieces:standardEditorPosition(),mode:'action',color:'w',tool:{color:'w',type:'q'},drag:null};
  return this.structureBoardLab;
 },
 structureBoardPieceSrc(piece){return publicAsset(`pieces/alpha/${piece.color}${piece.type.toUpperCase()}.png`,APP_VERSION)},
 structureBoardHtml(analysis){
  const lab=this.ensureStructureBoardLab(),pieceBySquare=new Map(lab.pieces.map(piece=>[piece.square,piece])),map=lab.mode==='subaction'?analysis.subactionControl:analysis.actionControl,cells=[];
  for(let rank=8;rank>=1;rank-=1)for(let file=0;file<8;file+=1){
   const square=`${'abcdefgh'[file]}${rank}`,piece=pieceBySquare.get(square),value=map.get(square)||0,classes=['structure-editor-cell',((file+rank)%2?'light':'dark')];
   if(lab.mode==='action'){if(value===1)classes.push('action-one');else if(value===2)classes.push('action-two');else if(value>=3)classes.push('action-three')}
   else{if(value===1)classes.push('sub-one');else if(value===2)classes.push('sub-two');else if(value>=3)classes.push('sub-three')}
   if(piece)classes.push('occupied');
   cells.push(`<button type="button" class="${classes.join(' ')}" data-editor-square="${square}" aria-label="${square}${piece?` · ${piece.color==='w'?'blancas':'negras'} ${PIECE_NAME[piece.type]}`:''}${value?` · ${lab.mode==='action'?'acción':'subacción'} ${value}`:''}">${piece?`<img src="${this.structureBoardPieceSrc(piece)}" alt="" draggable="false">`:''}${value>1?`<b>${lab.mode==='action'?(value>=3?'3+':'2×'):(value>=3?'3+':`${value}×`)}</b>`:''}</button>`);
  }
  return `<div class="structure-editor-board" style="${this.customBoardStyle()}" role="grid">${cells.join('')}</div>`;
 },
 structureBoardPaletteHtml(){
  const lab=this.ensureStructureBoardLab();
  return `<section class="structure-editor-palette panel"><header><div><small>EDITOR</small><h3>Piezas</h3></div><span>Clic = colocar/reemplazar · arrastra = mover · clic derecho = eliminar</span></header><div class="structure-editor-palette-grid">${['w','b'].map(color=>`<div><b>${color==='w'?'Blancas':'Negras'}</b><div>${paletteTypes.map(type=>`<button type="button" data-editor-tool="${color}${type}" class="${lab.tool?.color===color&&lab.tool?.type===type?'active':''}" title="${color==='w'?'Blancas':'Negras'} · ${PIECE_NAME[type]}">${GLYPH[color+type]}</button>`).join('')}</div></div>`).join('')}<button type="button" data-editor-eraser class="eraser ${lab.tool==='eraser'?'active':''}">⌫ Borrador</button></div><footer><button type="button" data-editor-initial>Posición inicial</button><button type="button" data-editor-clear>Vaciar tablero</button></footer></section>`;
 },
 renderStructureBoardEditor(){
  const lab=this.ensureStructureBoardLab(),analysis=analyzeStructureBoard(lab.pieces,lab.color),v=$('#view'),isSub=lab.mode==='subaction',isBlack=lab.color==='b';
  v.innerHTML=`<section class="page-head structure-editor-head"><button data-editor-back aria-label="Volver">←</button><div><small>ESTUDIAR ESTRUCTURAS · POSICIÓN ACTUAL</small><h1>Editor de tablero</h1><p>Construye cualquier posición. OmegaZero muestra todas las piezas, pero calcula Acción o Subacción únicamente para el bando seleccionado. Esta vista no genera familias.</p></div></section>
  <section class="structure-editor-switches panel"><div class="structure-editor-slider"><span class="${!isSub?'active':''}">Acción</span><input type="range" min="0" max="1" step="1" value="${isSub?1:0}" data-editor-mode aria-label="Acción o Subacción"><span class="${isSub?'active':''}">Subacción</span></div><div class="structure-editor-slider"><span class="${!isBlack?'active':''}">Blancas</span><input type="range" min="0" max="1" step="1" value="${isBlack?1:0}" data-editor-color aria-label="Blancas o Negras"><span class="${isBlack?'active':''}">Negras</span></div></section>
  <section class="structure-editor-layout"><div class="structure-editor-board-column">${this.structureBoardHtml(analysis)}<div class="structure-editor-legend">${!isSub?'<span><i class="a1"></i>Verde · 1 pieza</span><span><i class="a2"></i>Azul · 2 piezas</span><span><i class="a3"></i>Morado · 3+ piezas</span>':'<span><i class="s1"></i>Amarillo · 1 pieza detrás</span><span><i class="s2"></i>Naranja · 2 piezas detrás</span><span><i class="s3"></i>Rojo · 3+ piezas detrás</span>'}</div></div><aside>${this.structureBoardPaletteHtml()}<section class="structure-editor-metrics panel"><header><small>${lab.color==='w'?'BLANCAS':'NEGRAS'} · ${isSub?'SUBACCIÓN':'ACCIÓN'}</small><h3>Lectura actual</h3></header>${!isSub?`<article><span>Control 1×</span><b>${analysis.actionSingleCount}</b></article><article><span>Control 2×</span><b>${analysis.actionDoubleCount}</b></article><article><span>Control 3+×</span><b>${analysis.actionTriplePlusCount}</b></article><article><span>Máxima multiplicidad</span><b>${analysis.maxAction}</b></article>`:`<article><span>Subacción 1</span><b>${analysis.subactionSingleCount}</b></article><article><span>Subacción 2</span><b>${analysis.subactionDoubleCount}</b></article><article><span>Subacción 3+</span><b>${analysis.subactionTriplePlusCount}</b></article><article><span>Máxima profundidad</span><b>${analysis.maxSubaction}</b></article>`}<p>Se analizan <b>${analysis.analyzedPieces}</b> piezas ${lab.color==='w'?'blancas':'negras'} dentro de una posición de <b>${analysis.totalPieces}</b> piezas. Las piezas del otro bando siguen actuando como bloqueadores geométricos.</p></section></aside></section>`;
  $('[data-editor-back]')?.addEventListener('click',()=>{this.screen='structureStudy';this.render()});
  $('[data-editor-mode]')?.addEventListener('input',event=>{lab.mode=Number(event.target.value)?'subaction':'action';this.renderStructureBoardEditor()});
  $('[data-editor-color]')?.addEventListener('input',event=>{lab.color=Number(event.target.value)?'b':'w';this.renderStructureBoardEditor()});
  $$('[data-editor-tool]').forEach(button=>button.addEventListener('click',()=>{const token=button.dataset.editorTool;lab.tool={color:token[0],type:token[1]};this.renderStructureBoardEditor()}));
  $('[data-editor-eraser]')?.addEventListener('click',()=>{lab.tool='eraser';this.renderStructureBoardEditor()});
  $('[data-editor-initial]')?.addEventListener('click',()=>{lab.pieces=standardEditorPosition();this.renderStructureBoardEditor()});
  $('[data-editor-clear]')?.addEventListener('click',()=>{lab.pieces=[];this.renderStructureBoardEditor()});
  this.bindStructureBoardEditor();
 },
 bindStructureBoardEditor(){
  const lab=this.ensureStructureBoardLab(),board=$('.structure-editor-board');if(!board)return;board.oncontextmenu=event=>event.preventDefault();
  const remove=square=>{lab.pieces=lab.pieces.filter(piece=>piece.square!==square)};
  const place=square=>{remove(square);if(lab.tool!=='eraser')lab.pieces.push({color:lab.tool.color,type:lab.tool.type,square})};
  const cleanupDrag=drag=>{drag?.ghost?.remove();drag?.source?.classList.remove('drag-source')};
  $$('[data-editor-square]',board).forEach(cell=>{
   cell.onpointerdown=event=>{
    const square=cell.dataset.editorSquare;if(event.button===2){event.preventDefault();remove(square);this.renderStructureBoardEditor();return}
    if(event.button!==0)return;const existing=lab.pieces.find(piece=>piece.square===square),rect=cell.getBoundingClientRect(),img=cell.querySelector('img'),ghost=existing&&img?img.cloneNode():null;
    if(ghost){ghost.className='drag-ghost structure-editor-drag-ghost';ghost.style.width=`${rect.width*.88}px`;ghost.style.height=`${rect.height*.88}px`;ghost.style.left=`${event.clientX}px`;ghost.style.top=`${event.clientY}px`;document.body.appendChild(ghost);cell.classList.add('drag-source')}
    lab.drag={id:event.pointerId,from:square,x:event.clientX,y:event.clientY,moved:false,existing:existing?{...existing}:null,ghost,source:cell};cell.setPointerCapture?.(event.pointerId);
   };
   cell.onpointermove=event=>{const drag=lab.drag;if(!drag||drag.id!==event.pointerId)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5)drag.moved=true;if(drag.ghost){drag.ghost.style.left=`${event.clientX}px`;drag.ghost.style.top=`${event.clientY}px`}};
   cell.onpointerup=event=>{
    const drag=lab.drag;if(!drag||drag.id!==event.pointerId)return;lab.drag=null;cleanupDrag(drag);
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('[data-editor-square]');
    if(drag.moved&&drag.existing&&target&&board.contains(target)){remove(drag.from);remove(target.dataset.editorSquare);lab.pieces.push({...drag.existing,square:target.dataset.editorSquare})}
    else if(!drag.moved)place(drag.from);
    this.renderStructureBoardEditor();
   };
   cell.onpointercancel=()=>{const drag=lab.drag;lab.drag=null;cleanupDrag(drag)};
  });
 }
};

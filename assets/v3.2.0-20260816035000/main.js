import { Chess, StockfishEngine, loadDb, hydrateDb, getMigrationInfo, applyAccessibility } from './app/deps.js';
import { appChromeMethods } from './features/appChrome.js';
import { pawnGalleryMethods } from './features/pawnGallery.js';
import { structureStudyMethods } from './features/structureStudy.js';
import { energyAnalysisMethods } from './features/energyAnalysis.js';
import { boardMethods } from './features/board.js';
import { playMethods } from './features/play.js';
import { learnMethods } from './features/learn.js';
import { libraryMethods } from './features/library.js';
import { tcomMethods } from './features/tcom.js';
import { transformMethods } from './features/transform.js';

class App{
 constructor(root){
  this.root=root;this.db=loadDb();this.dbReady=false;this.migrationInfo=getMigrationInfo();this.migrationOpen=this.migrationInfo.available&&!this.migrationInfo.decided;this.screen='home';this.chess=new Chess();this.engine=new StockfishEngine(s=>{this.engineStatus=s;this.paintStatus()});this.engineStatus='Iniciando motor';
  const savedGameConfig=this.db.settings.gameConfig||{};
  this.cfg={mode:'pvc',white:'human',black:'zero',humanColor:'w',style:'zero',depth:14,multiPv:3,skill:20,opening:'auto',whiteOpening:'auto',blackOpening:'auto',independentOpenings:false,autoPlay:true,clock:false,minutes:10,increment:0,repeat:1,simultaneous:1,separateBoardColors:false,independentSimClocks:true,opponents:[],setupMode:this.db.settings.setupMode||'quick',alternateColors:true,diversity:25,...savedGameConfig,opponents:Array.isArray(savedGameConfig.opponents)?savedGameConfig.opponents:[]};
  this.selected=null;this.legal=[];this.lastMove=null;this.positions=[];this.gameSaved=false;this.thinking=false;this.clock={w:600,b:600,last:0,timer:null};this.analysis=null;this.analysisBusy=false;this.analysisTimer=null;this.lastMoveQuality=null;this.strategySource=null;this.strategy={length:this.db.settings.strategyLength||1,index:0,step:0,score:0,problem:null,candidates:[],sessionSize:this.db.settings.strategySessionSize||10,sessionIndex:0,difficulty:this.db.settings.strategyDifficulty||'medium',phase:this.db.settings.strategyPhase||'all',opening:this.db.settings.strategyOpening||'all',sessionResults:[],review:null};this.annotations=new Map();this.arrows=[];this.drag=null;this.settingsOpen=false;this.paused=false;this.boardFlipped=false;this.annotation={open:false,color:'yellow'};this.rightAnnotation=null;this.gameAsideScroll=0;this.analysisReturn=null;this.analysisMoveQuality=null;this.series={current:1,total:1};this.lastStrategyProblemId=null;this.simultaneous=null;this.simEngineQueue=Promise.resolve();this.analysisTimeline=[];this.analysisIndex=0;this.analysisComments={};this.analysisEdit={enabled:false,piece:'wP'};this.libraryFilter={query:'',result:'all',mode:'all',opening:'all'};this.structureFamilyKind='minor';this.structureFamilyFilter='';this.pawnGalleryFilter='';this.pawnGalleryShowOpenFiles=this.db.settings.pawnGalleryShowOpenFiles!==false;this.selectedLibraryGames=new Set();this.transformLab=null;this.tcomLab=null;this.energyLab=null;this.ensureOpponentConfigs();
  applyAccessibility(this.db.settings);this.render();hydrateDb().then(db=>{this.db=db;this.dbReady=true;applyAccessibility(this.db.settings);if(this.screen==='home')this.render()});this.engine.init().catch((error)=>{this.engineStatus=`Motor no disponible · ${error?.message || 'error desconocido'}`;this.paintStatus()});
 }
 render(){
  applyAccessibility(this.db.settings);
  this.disposeTransformGraphBinding();
  if(this.screen!=='stockfishTransform')this.disposeTransformLiveAnalysis();
  this.root.innerHTML=this.shell();
  this.bindGlobal();
  try{
   const renderer={home:'renderHome',setup:'renderSetup',game:'renderGame',analysis:'renderAnalysis',strategy:'renderStrategy',customize:'renderCustomize',library:'renderLibrary',stockfishTransform:'renderStockfishTransform',stockfishGraph:'renderStockfishGraph',tcomLab:'renderTComLab',energyAnalysis:'renderEnergyAnalysis',structureStudy:'renderStructureStudy',structureFamilies:'renderStructureFamilies',pawnGallery:'renderPawnGallery'}[this.screen];
   if(!renderer||typeof this[renderer]!=='function')throw new Error(`Vista desconocida: ${this.screen}`);
   this[renderer]();
  }catch(error){
   console.error(`OmegaZero no pudo abrir la vista ${this.screen}`,error);
   this.renderViewError(error);
  }
 }
}

Object.assign(
  App.prototype,
  appChromeMethods,
  boardMethods,
  playMethods,
  learnMethods,
  libraryMethods,
  pawnGalleryMethods,
  structureStudyMethods,
  energyAnalysisMethods,
  tcomMethods,
  transformMethods,
);

async function prepareBuild(){try{const response=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)return;const meta=await response.json();const key='omegazero:runtime:build';const previous=localStorage.getItem(key);if(previous&&previous!==meta.buildId){if('caches' in window){for(const name of await caches.keys())await caches.delete(name)}if('serviceWorker' in navigator){for(const registration of await navigator.serviceWorker.getRegistrations())await registration.unregister()}}localStorage.setItem(key,meta.buildId)}catch{/* La ruta versionada de assets sigue evitando mezclar compilaciones. */}}
await prepareBuild();
new App(document.getElementById('app'));

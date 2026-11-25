import { Chess, OPENINGS, MASTER_PROBLEMS, loadDb, saveDb, getMigrationInfo, migrateLegacyData, declineLegacyMigration, clearGamesAndTraining, resetAllAppData, APP_VERSION, $, $$, clamp, esc, downloadText, FIDE_RULES_VERSION, buildGameStats, buildTrainingStats, applyAccessibility, playTone, publicAsset } from '../app/deps.js';
import { THEMES } from '../app/config.js';
export const appChromePatch={
 bindGlobal(){
  $$('[data-home]').forEach(button=>button.onclick=()=>{this.stopClock();this.analysisReturn=null;this.screen='home';this.render()});
  $('[data-transform-lab]')?.addEventListener('click',()=>{this.stopClock();this.screen='stockfishTransform';this.render()});
  $('[data-settings]')?.addEventListener('click',()=>{this.settingsOpen=true;this.render()});
  $('[data-customize-from-settings]')?.addEventListener('click',()=>{this.settingsOpen=false;this.screen='customize';this.render()});
  $('[data-close-settings]')?.addEventListener('click',()=>{this.settingsOpen=false;this.render()});
  $$('[data-theme]').forEach(button=>button.onclick=()=>{this.db.settings.boardColor=button.dataset.theme;saveDb(this.db);this.render()});
  $('[data-clear-training]')?.addEventListener('click',()=>this.clearTrainingData());
  $('[data-reset-app]')?.addEventListener('click',()=>this.resetApplication());
  $('[data-migrate-legacy]')?.addEventListener('click',()=>this.acceptMigration());
  $('[data-clean-start]')?.addEventListener('click',()=>this.rejectMigration());
  $('[data-open-migration]')?.addEventListener('click',()=>{this.settingsOpen=false;this.migrationOpen=true;this.render()});
  $('[data-sound]')?.addEventListener('change',event=>this.updateSetting('sound',event.target.checked));
  $('[data-sound-pack]')?.addEventListener('change',event=>this.updateSetting('soundPack',event.target.value));
  $('[data-sound-volume]')?.addEventListener('input',event=>{const value=clamp(event.target.value,0,100);$('[data-sound-volume-output]').textContent=`${value}%`;this.updateSetting('soundVolume',value,false)});
  $$('[data-preview-sound]').forEach(button=>button.addEventListener('click',()=>playTone(button.dataset.previewSound,{enabled:true,pack:this.db.settings.soundPack||'classic',volume:(this.db.settings.soundVolume??70)/100})));
  $('[data-high-contrast]')?.addEventListener('change',event=>this.updateSetting('highContrast',event.target.checked));
  $('[data-reduce-motion]')?.addEventListener('change',event=>this.updateSetting('reduceMotion',event.target.checked));
  $('[data-color-vision]')?.addEventListener('change',event=>this.updateSetting('colorVision',event.target.value));
  $('[data-font-scale]')?.addEventListener('input',event=>{const value=clamp(event.target.value,85,140);$('[data-font-output]').textContent=`${value}%`;this.updateSetting('fontScale',value,false)});
  $('[data-export-backup]')?.addEventListener('click',()=>this.exportBackup());
  $('[data-import-backup]')?.addEventListener('change',event=>this.importBackup(event.target.files?.[0]));
 },
 settingsHtml(){
  const training=buildTrainingStats(this.db.problems),games=buildGameStats(this.db.games),soundPack=this.db.settings.soundPack||'classic',soundVolume=this.db.settings.soundVolume??70;
  const packs=[['chesscom','Chess.com · inspirado','Golpe definido y brillante'],['lichess','Lichess · inspirado','Respuesta suave y digital'],['wood','Madera','Piezas sobre tablero de madera'],['minimal','Minimalista','Tonos breves y discretos'],['arcade','Arcade','Sonido electrónico más expresivo']];
  return `<div class="modal"><div class="dialog settings-dialog"><header><div><small>CONFIGURACIÓN · v${APP_VERSION}</small><h2>Preferencias, accesibilidad y datos</h2></div><button data-close-settings aria-label="Cerrar configuración">×</button></header>
  <label>Color del tablero<div class="theme-grid">${Object.entries(THEMES).map(([id,theme])=>`<button data-theme="${id}" class="${this.db.settings.boardColor===id?'active':''}"><i style="--a:${theme.light};--b:${theme.dark}"></i>${theme.name}</button>`).join('')}</div></label>
  <section class="settings-section"><h3>Tablero y piezas</h3><p>La personalización avanzada ya no ocupa un modo dentro de Jugar.</p><button type="button" data-customize-from-settings>ABRIR PERSONALIZACIÓN AVANZADA</button></section>
  <section class="settings-section sound-gallery"><header><div><h3>Galería de sonidos</h3><small>Presets originales sintetizados localmente; no contienen archivos oficiales de otras plataformas.</small></div><label class="toggle"><input data-sound type="checkbox" ${this.db.settings.sound?'checked':''}><span>Activar sonidos</span></label></header><div class="sound-pack-grid">${packs.map(([id,name,description])=>`<label class="sound-pack ${soundPack===id?'active':''}"><input data-sound-pack type="radio" name="soundPack" value="${id}" ${soundPack===id?'checked':''}><b>${name}</b><span>${description}</span></label>`).join('')}</div><label>Volumen <output data-sound-volume-output>${soundVolume}%</output><input data-sound-volume type="range" min="0" max="100" value="${soundVolume}"></label><div class="sound-preview-row"><button type="button" data-preview-sound="move">Probar movimiento</button><button type="button" data-preview-sound="capture">Probar captura</button><button type="button" data-preview-sound="check">Probar jaque</button><button type="button" data-preview-sound="end">Probar final</button></div></section>
  <section class="settings-section"><h3>Accesibilidad</h3><div class="settings-grid"><label class="toggle"><input data-high-contrast type="checkbox" ${this.db.settings.highContrast?'checked':''}><span>Contraste alto</span></label><label class="toggle"><input data-reduce-motion type="checkbox" ${this.db.settings.reduceMotion?'checked':''}><span>Reducir movimiento</span></label><label>Visión del color<select data-color-vision>${['default','deuteranopia','protanopia','tritanopia'].map(value=>`<option value="${value}" ${this.db.settings.colorVision===value?'selected':''}>${({default:'Normal',deuteranopia:'Deuteranopia',protanopia:'Protanopia',tritanopia:'Tritanopia'})[value]}</option>`).join('')}</select></label><label class="span2">Tamaño de texto <output data-font-output>${this.db.settings.fontScale||100}%</output><input data-font-scale type="range" min="85" max="140" value="${this.db.settings.fontScale||100}"></label></div></section>
  <section class="storage-summary"><h3>Base local en IndexedDB</h3><div><span><b>${games.total}</b> partidas</span><span><b>${training.total}</b> posiciones</span><span><b>${training.mastered}</b> dominadas</span></div><small>Partidas, entrenamiento e imágenes ya no dependen del pequeño límite de localStorage.</small></section>
  <section class="storage-summary fide-summary"><h3>Reglamento FIDE</h3><p>${FIDE_RULES_VERSION}. OmegaZero aplica mate, ahogado, posición muerta, cinco repeticiones, reglas de 50/75 movimientos y resultado por tiempo según posibilidad real de mate.</p><small>Las reglas procedimentales de torneos presenciales se documentan en <code>FIDE_RULES.md</code>.</small></section>
  ${this.migrationInfo.available&&this.migrationInfo.decision!=='migrated'?`<section class="storage-summary legacy-review"><h3>Datos anteriores disponibles</h3><p>Puedes importarlos de forma explícita; nunca se mezclan silenciosamente.</p><button data-open-migration>Revisar migración</button></section>`:''}
  <section class="settings-section"><h3>Respaldo</h3><div class="row"><button data-export-backup>Exportar respaldo JSON</button><label class="file-button">Importar respaldo<input data-import-backup type="file" accept="application/json"></label></div></section>
  <section class="danger-zone"><h3>Administrar datos</h3><button data-clear-training>Borrar partidas y entrenamiento</button><small>Conserva preferencias, favoritas, piezas y tableros.</small><button data-reset-app class="danger">Restablecer toda la aplicación</button><small>Elimina localStorage e IndexedDB de OmegaZero.</small></section></div></div>`
 },
 renderHome(){
  const v=$('#view');
  const card=(go,icon,title,description,mode='')=>`<button type="button" class="oz-dashboard-card" data-go="${go}" ${mode?`data-mode="${mode}"`:''}><span class="oz-dashboard-icon" aria-hidden="true">${icon}</span><span><strong>${title}</strong><small>${description}</small></span><span class="oz-arrow" aria-hidden="true">›</span></button>`;
  v.innerHTML=`<main class="oz-dashboard" aria-label="Inicio de OmegaZero">
    <header class="oz-dashboard-head"><div><h1>Inicio</h1><p>Elige una actividad para comenzar.</p></div></header>
    <section class="oz-dashboard-section" aria-labelledby="domain-play"><header><h2 id="domain-play">Jugar</h2><p>Selecciona los jugadores y la variante.</p></header><div class="oz-dashboard-grid">
      ${card('setup','♟','J1 vs J2','Dos jugadores en el mismo dispositivo','pvp')}
      ${card('setup','♞','J1 vs COM','Juega contra la computadora','pvc')}
      ${card('setup','⇄','COM vs COM','Simula partidas entre motores','cvc')}
    </div></section>
    <section class="oz-dashboard-section" aria-labelledby="domain-learn"><header><h2 id="domain-learn">Aprender</h2><p>Estudia posiciones y practica tus decisiones.</p></header><div class="oz-dashboard-grid two">
      ${card('analysis','▦','Tablero de análisis','Explora posiciones y continuaciones')}
      ${card('strategy','◎','Entrenamiento estratégico','Resuelve posiciones y toma decisiones')}
    </div></section>
    <section class="oz-dashboard-section" aria-labelledby="domain-research"><header><h2 id="domain-research">Investigar</h2><p>Herramientas y modelos experimentales.</p></header><div class="oz-dashboard-grid">
      ${card('structureStudy','▤','Estudiar estructuras','Peones, familias y piezas libres')}
      ${card('modelLab','⚙','Modelos COM','Configura S-COM, T-COM y E-COM')}
      ${card('stockfishTransform','ƒ','Transformada de Stockfish','Matrices, funciones y gráficas')}
    </div></section>
  </main>`;
  $$('[data-go]').forEach(button=>button.onclick=()=>{this.screen=button.dataset.go==='setup'?'variantPicker':button.dataset.go;if(this.screen==='analysis')this.analysisReturn=null;if(this.screen==='strategy')this.strategySource=null;if(button.dataset.mode)this.cfg.mode=button.dataset.mode;this.render()});
 },
};

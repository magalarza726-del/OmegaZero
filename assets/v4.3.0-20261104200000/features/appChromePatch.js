import { Chess, OPENINGS, MASTER_PROBLEMS, loadDb, saveDb, getMigrationInfo, migrateLegacyData, declineLegacyMigration, clearGamesAndTraining, resetAllAppData, APP_VERSION, $, $$, clamp, esc, downloadText, FIDE_RULES_VERSION, buildGameStats, buildTrainingStats, applyAccessibility, playTone, publicAsset } from '../app/deps.js';
import { THEMES } from '../app/config.js';
const OZ_ICON_PATHS={
 home:'<path d="m3 10 9-7 9 7v10H5V10"/><path d="M9 20v-7h6v7"/>',
 play:'<path d="M7 7h10a4 4 0 0 1 4 3l1 5a3 3 0 0 1-5 3l-3-3h-4l-3 3a3 3 0 0 1-5-3l1-5a4 4 0 0 1 4-3Z"/><path d="M6 12h4m-2-2v4m7-2h.01m3 2h.01"/>',
 learn:'<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v6c3 3 9 3 12 0v-6m4-2v8"/>',
 layers:'<path d="m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/>',
 lab:'<path d="M9 3h6m-5 0v7L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2l-6-9V3M8 15h8"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="m10 3-.6 2.5-2 .9-2.3-1.2-2 2 1.2 2.3-.9 2-2.4.5v3l2.4.5.9 2-1.2 2.3 2 2 2.3-1.2 2 .9.6 2.5h3l.6-2.5 2-.9 2.3 1.2 2-2-1.2-2.3.9-2 2.4-.5v-3l-2.4-.5-.9-2 1.2-2.3-2-2-2.3 1.2-2-.9L13 3Z" transform="translate(.6 .5) scale(.93)"/>',
 users:'<circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 20v-2a6 6 0 0 1 12 0v2m1-6a5 5 0 0 1 7 4v2"/>',
 personCom:'<circle cx="6" cy="6" r="3"/><path d="M1 19v-3a5 5 0 0 1 9-3"/><rect x="11" y="8" width="12" height="10" rx="1.5"/><path d="M17 18v3m-4 0h8"/>',
 coms:'<rect x="1" y="5" width="10" height="10" rx="1.4"/><rect x="13" y="5" width="10" height="10" rx="1.4"/><path d="M6 15v4m-3 0h6m9-4v4m-3 0h6"/>',
 board:'<rect x="3" y="3" width="18" height="18" rx="1"/><path fill="currentColor" stroke="none" d="M3 3h4.5v4.5H3zm9 0h4.5v4.5H12zM7.5 7.5H12V12H7.5zm9 0H21V12h-4.5zM3 12h4.5v4.5H3zm9 0h4.5v4.5H12zm-4.5 4.5H12V21H7.5zm9 0H21V21h-4.5z"/>',
 target:'<circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><circle cx="11" cy="13" r="1.5"/><path d="m11 13 9-9m-4 0h4V0"/>',
 structure:'<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m10.5 8-4 8m7-8 4 8M8 19h8"/>',
 transform:'<path d="M9 4C4 2 6 9 5 14L3 21m0-12h7m3-5 5 16m-6-7h8"/><path d="M12 2c-2 4-2 15 0 20m9-20c2 4 2 15 0 20"/>',
 check:'<path d="m5 12 4 4L19 6"/>'
};
function ozIcon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(OZ_ICON_PATHS[name]||'')+'</svg>'}

export const appChromePatch={
 shell(){
  const t=THEMES[this.db.settings.boardColor]||THEMES.blue,home=this.screen==='home';
  const nav=(id,icon,label)=>`<button type="button" data-home-section="${id}" ${id==='home'?'aria-current="page"':''}>${ozIcon(icon)}<span>${label}</span></button>`;
  return `<main class="app oz-vibrant ${home?'oz-home-shell':''}" style="--light:${t.light};--dark:${t.dark};--accent:#e6bd70">
    <header class="top oz-top" role="banner"><button type="button" class="logo" data-home aria-label="Inicio"><img src="${publicAsset('omegazero-mark.png', APP_VERSION)}" alt=""></button><div class="brand-copy"><div><b>OMEGAZERO</b><span class="version-badge">v${APP_VERSION}</span></div></div>
    <nav class="oz-top-nav" aria-label="Accesos principales"><button type="button" data-home class="${home?'is-current':''}">${ozIcon('home')}<span>Inicio</span></button><button type="button" data-transform-lab>${ozIcon('lab')}<span>Laboratorio ƒ(A)</span></button><button type="button" data-settings>${ozIcon('gear')}<span>Configuración</span></button></nav>
    <div class="status" id="engine-status" role="status">${esc(this.engineStatus)}</div></header>
    <div class="oz-workspace">${home?`<aside class="oz-sidebar"><nav aria-label="Secciones de inicio">${nav('home','home','Inicio')}${nav('domain-play','play','Jugar')}${nav('domain-learn','learn','Aprender')}${nav('domain-research','layers','Investigar')}<hr><button type="button" data-home-shortcut="lab">${ozIcon('lab')}<span>Laboratorio ƒ(A)</span></button><button type="button" data-home-shortcut="settings">${ozIcon('gear')}<span>Configuración</span></button></nav><div class="oz-side-art" aria-hidden="true"><span>♞</span></div></aside>`:''}<section id="view" tabindex="-1"></section></div>
    ${home?`<footer class="oz-home-footer"><span>${ozIcon('layers')} OMEGAZERO</span><span>Laboratorio de ajedrez</span><span>Motor local · Stockfish</span></footer>`:''}
    ${this.settingsOpen?this.settingsHtml():''}${this.migrationOpen?this.migrationHtml():''}</main>`;
 },

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
  const card=(go,icon,title,description,color,mode='')=>`<button type="button" class="oz-dashboard-card oz-tone-${color}" data-go="${go}" ${mode?`data-mode="${mode}"`:''}><span class="oz-dashboard-icon" aria-hidden="true">${ozIcon(icon)}</span><span class="oz-card-copy"><strong>${title}</strong><small>${description}</small></span><span class="oz-arrow" aria-hidden="true">›</span></button>`;
  v.innerHTML=`<main class="oz-dashboard" aria-label="Inicio de OmegaZero">
    <header class="oz-dashboard-head"><div><h1>Inicio</h1><p>Elige una actividad para comenzar.</p></div><div class="oz-matrix-note">${ozIcon('layers')}<span>Matrices disponibles durante la partida</span></div></header>
    <section class="oz-dashboard-section oz-section-play" aria-labelledby="domain-play"><header><h2 id="domain-play" tabindex="-1">${ozIcon('play')} Jugar</h2><p>Disputa partidas en distintos modos.</p></header><div class="oz-dashboard-grid">
      ${card('setup','users','J1 vs J2','Juega una partida entre dos jugadores.','amber','pvp')}
      ${card('setup','personCom','J1 vs COM','Enfréntate al motor de OmegaZero.','emerald','pvc')}
      ${card('setup','coms','COM vs COM','Simula una partida entre dos motores.','coral','cvc')}
    </div></section>
    <section class="oz-dashboard-section oz-section-learn" aria-labelledby="domain-learn"><header><h2 id="domain-learn" tabindex="-1">${ozIcon('learn')} Aprender</h2><p>Desarrolla tu comprensión y toma mejores decisiones.</p></header><div class="oz-dashboard-grid two">
      ${card('analysis','board','Tablero de análisis','Analiza posiciones, explora variantes y evalúa ideas con el motor.','lime')}
      ${card('strategy','target','Entrenamiento estratégico','Practica conceptos clave con ejercicios y posiciones temáticas.','emerald')}
    </div></section>
    <section class="oz-dashboard-section oz-section-research" aria-labelledby="domain-research"><header><h2 id="domain-research" tabindex="-1">${ozIcon('layers')} Investigar</h2><p>Explora representaciones y modelos matemáticos del ajedrez.</p></header><div class="oz-dashboard-grid">
      ${card('structureStudy','structure','Estudiar estructuras','Analiza patrones de peones y estructuras recurrentes.','amber')}
      ${card('modelLab','gear','Modelos COM','Explora y ajusta S-COM, T-COM y E-COM.','orange')}
      ${card('stockfishTransform','transform','Transformada de Stockfish','Experimenta con representaciones matemáticas del ajedrez.','plum')}
    </div></section>
  </main>`;
  $$('[data-go]').forEach(button=>button.onclick=()=>{this.screen=button.dataset.go==='setup'?'variantPicker':button.dataset.go;if(this.screen==='analysis')this.analysisReturn=null;if(this.screen==='strategy')this.strategySource=null;if(button.dataset.mode)this.cfg.mode=button.dataset.mode;this.render()});
  $$('[data-home-section]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.homeSection;
    $$('[data-home-section]').forEach(b=>{if(b===button)b.setAttribute('aria-current',id==='home'?'page':'location');else b.removeAttribute('aria-current')});
    const target=id==='home'?v.querySelector('.oz-dashboard-head'):document.getElementById(id);
    target?.scrollIntoView({block:'start',behavior:'auto'});if(id!=='home')target?.focus({preventScroll:true});
  });
  $$('[data-home-shortcut]').forEach(button=>button.onclick=()=>{const selector=button.dataset.homeShortcut==='lab'?'[data-transform-lab]':'[data-settings]';$(selector)?.click()});
 },
};

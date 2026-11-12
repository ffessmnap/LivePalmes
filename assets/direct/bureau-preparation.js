(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation;
  function mount({workspace,data}){
    if(data.config?.state!=='active')return null;
    const settings=workspace.querySelector('.bureau-meet-settings'),roles=settings?.querySelector('.direct-roles'),importButton=workspace.querySelector('#openSeriesImport'),pdf=workspace.querySelector('#directPdfImports');
    if(!roles||!importButton||!pdf)return null;
    const root=document.createElement('details');root.className='direct-preparation';root.open=true;
    root.innerHTML=`<summary><strong>Préparer le Direct</strong><span data-preparation-summary></span></summary><div class="direct-preparation-steps">
      <section class="direct-card direct-preparation-step"><header><span class="direct-preparation-number">1</span><h2>Choisir le fonctionnement du bureau</h2><button type="button" class="secondary direct-preparation-info" aria-label="À quoi servent les consoles ?" aria-expanded="false" aria-controls="directConsoleHelp">i</button><span class="direct-preparation-state" data-preparation-mode-state></span></header><div class="direct-preparation-body"><div class="direct-preparation-modes" role="group" aria-label="Fonctionnement du bureau"><button type="button" class="secondary" data-preparation-mode="solo">Bureau seul<span>Résultats et suivi des courses</span></button><button type="button" class="secondary" data-preparation-mode="consoles">Avec consoles<span>JA et postes terrain</span></button></div><p id="directConsoleHelp" class="direct-preparation-help" hidden>Avec consoles, les officiels utilisent des <strong>tablettes ou ordinateurs connectés à Internet</strong> pour transmettre et consulter les décisions pendant la compétition. Sans consoles, le bureau suffit pour diffuser les résultats WinPalme.</p><div data-preparation-roles></div><div class="direct-actions"><button type="button" data-preparation-save hidden>Enregistrer le fonctionnement</button></div></div></section>
      <section class="direct-card direct-preparation-step"><header><span class="direct-preparation-number">2</span><h2>Charger les séries</h2><span class="direct-preparation-state" data-preparation-series-state></span></header><div class="direct-preparation-body"><p class="direct-note" data-preparation-series-count></p><div class="direct-actions" data-preparation-import></div><p class="direct-note">Lire le PDF ne publie rien : contrôler l’aperçu, vérifier puis publier les séries sélectionnées.</p><div data-preparation-pdf></div></div></section>
      <section class="direct-card direct-preparation-step"><header><span class="direct-preparation-number">3</span><h2>Préparer la lecture automatique des résultats</h2></header><div class="direct-preparation-body" data-preparation-results></div></section>
    </div>`;
    workspace.insertBefore(root,workspace.children[1]||null);
    root.querySelector('[data-preparation-roles]').append(roles);root.querySelector('[data-preparation-import]').append(importButton);root.querySelector('[data-preparation-pdf]').append(pdf);
    importButton.textContent='Charger les séries (PDF)';
    const boxes=[...roles.querySelectorAll('input[name=console]')],initial=data.config.consoles.slice().sort().join('|');let locked=false,lastActive=false;
    function mode(){return boxes.some(input=>input.value!=='computer'&&input.checked)?'consoles':'solo';}
    function updateMode(){
      const selected=mode(),changed=boxes.filter(input=>input.checked).map(input=>input.value).sort().join('|')!==initial;
      root.querySelectorAll('[data-preparation-mode]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.preparationMode===selected));button.disabled=locked;});
      roles.hidden=selected==='solo';
      boxes.forEach(input=>{input.disabled=locked||input.value==='computer'||input.value==='video'&&data.competition.level!=='national'||input.value==='referee'&&selected==='consoles';input.closest('label').hidden=input.value==='computer';});
      root.querySelector('[data-preparation-save]').hidden=!changed;root.querySelector('[data-preparation-save]').disabled=locked;
      root.querySelector('[data-preparation-mode-state]').textContent=changed?'À enregistrer':selected==='solo'?'Prêt · bureau seul':'Prêt · avec consoles';
      root.querySelector('[data-preparation-summary]').textContent=locked?'Résultats en direct actifs · réglages verrouillés':selected==='solo'?'Bureau seul':'Avec consoles';
    }
    root.querySelectorAll('[data-preparation-mode]').forEach(button=>button.onclick=()=>{if(locked)return;const solo=button.dataset.preparationMode==='solo';boxes.forEach(input=>{if(solo)input.checked=input.value==='computer';else if(input.value==='referee')input.checked=true;});boxes[0]?.dispatchEvent(new Event('change'));updateMode();});
    boxes.forEach(input=>input.addEventListener('change',updateMode));
    root.querySelector('[data-preparation-save]').onclick=()=>{if(!locked)workspace.querySelector('#saveSettings')?.click();};
    const info=root.querySelector('.direct-preparation-info');info.onclick=()=>{const help=root.querySelector('#directConsoleHelp');help.hidden=!help.hidden;info.setAttribute('aria-expanded',String(!help.hidden));};
    root.addEventListener('toggle',()=>global.LivePalmesDirectBureauLayout?.tab(global.LivePalmesDirectBureau.instance?.tab||'follow'));
    function updateImports(next=data){
      const events=(next.events||[]).filter(event=>ui.stats(event,event.id===next.selectedEventId?next.entries:undefined).seriesEntries>0);
      root.querySelector('[data-preparation-series-state]').textContent=events.length?'Prêt':'À faire';
      root.querySelector('[data-preparation-series-count]').textContent=events.length?events.length+' épreuve(s) avec séries importées.':'Le PDF WinPalme fournit les courses, les nageurs et les lignes.';
    }
    function watchState(state){
      if(!root.isConnected)return;locked=Boolean(state.active||state.busy);
      updateMode();importButton.disabled=locked;
      for(const selector of ['#saveSettings','#directState','#publicVisible']){const control=workspace.querySelector(selector);if(control)control.disabled=locked;}
      if(state.active&&!lastActive){root.open=false;global.LivePalmesDirectBureau.instance?.showTab(data.config.consoles.length===1?'follow':'queue');}
      lastActive=Boolean(state.active);
    }
    updateMode();updateImports();
    return {root,resultsHost:root.querySelector('[data-preparation-results]'),watchState,updateImports};
  }
  global.LivePalmesDirectPreparation={mount};
})(window);

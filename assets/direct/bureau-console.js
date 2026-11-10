(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation,view=global.LivePalmesConsoleView,esc=ui.esc;
  let instance=null;
  function stop(){if(instance){instance.dispose?.();instance.client.stop();instance.client.state.data=null;instance.dialog.close();instance.dialog.remove();instance.host.remove();instance=null;global.LivePalmesDirectBureau.instance=null;}}
  function mount({host:workspace,data,id,call,current}){
    stop();if(!workspace||!data.config||data.config.state!=='active'||!data.permissions.manage&&!data.permissions.roles.includes('computer'))return;
    const identity=current(),host=document.createElement('section');host.className='direct-bureau-operations';
    host.innerHTML='<details id="bureauOperations" open><summary>Arbitrage et finales <span id="bureauOperationsCount" class="direct-count"></span></summary><p id="bureauConsoleStatus" class="direct-status" role="status" hidden></p><div id="bureauConsoleWorkspace"></div></details>';
    workspace.insertBefore(host,workspace.children[1]||null);const details=host.querySelector('details'),body=host.querySelector('#bureauConsoleWorkspace'),statusNode=host.querySelector('#bureauConsoleStatus');
    const dialog=document.createElement('dialog');dialog.className='direct-dialog bureau-console-dialog';dialog.innerHTML='<form id="bureauConsoleForm"><div id="bureauConsoleContent"></div><p id="bureauConsoleError" class="direct-status error" role="alert"></p><div class="direct-actions"><button id="bureauConsoleSubmit" type="submit">Confirmer</button><button data-bureau-close type="button" class="secondary">Annuler</button></div></form>';document.body.append(dialog);
    const valid=()=>host.isConnected&&current().uid===identity.uid&&String(current().id)===String(id);
    const api=(action,input={})=>{if(!valid())throw Error('La compétition ou le compte a changé.');return call(action,{...input,role:'computer'});};
    const status=(message,error)=>{if(!valid())return;statusNode.hidden=!error;statusNode.textContent=error?message:'';statusNode.classList.toggle('error',Boolean(error));};
    const client=global.LivePalmesDirectConsoleClient.create({role:'computer',competitionId:id,getUser:()=>valid()?{uid:identity.uid}:null,call:api,onRender:render,onStatus:status,onAccessError:()=>{body.replaceChildren();dialog.close();},canPoll:()=>details.open&&!current().busy,onRetry:retry,onActivity:activity});
    let modal=null,reserveOffset=0,settingsContext=null,tab=data.config.consoles.length===1?'follow':'queue',hasFinals=false,historyFilter='decisions';
    const positionKey=`direct-bureau-view:${id}:${identity.uid}`;
    try{const saved=JSON.parse(localStorage.getItem(positionKey)||'null');if(saved){tab=saved.tab||tab;details.open=true;}}catch{}
    client.restore(data.events);
    function remember(){try{localStorage.setItem(positionKey,JSON.stringify({tab,open:details.open}));}catch{}client.remember();}
    function activity(){const busy=client.state.loading||client.state.busy||current().busy;body.inert=busy;body.setAttribute('aria-busy',String(busy));body.classList.toggle('console-loading',busy);dialog.querySelector('#bureauConsoleSubmit').disabled=busy;}
    function showTab(next=tab){const solo=data.config.consoles.length===1;tab=['queue','follow','finals','imports','history','settings','access'].includes(next)?next:solo?'follow':'queue';if(solo&&tab==='queue')tab='follow';if(!solo&&tab==='follow')tab='queue';if(tab==='finals'&&!hasFinals)tab='settings';host.querySelectorAll('[data-bureau-panel]').forEach(panel=>panel.hidden=panel.dataset.bureauPanel!==tab);host.querySelectorAll('[data-bureau-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bureauTab===tab)));workspace.querySelectorAll('#directImportSummary,#directPdfImports,.direct-documents').forEach(panel=>panel.hidden=tab!=='imports');workspace.querySelectorAll('[data-bureau-access]').forEach(panel=>panel.hidden=tab!=='settings');workspace.querySelectorAll('[data-bureau-publications]').forEach(panel=>panel.hidden=tab!=='history'||historyFilter!=='publications');global.LivePalmesDirectBureauLayout?.tab(tab);if(tab==='finals'&&client.state.data){const s=client.state.data,options=(s.finalOptions||[]).filter(e=>['a','ab'].includes(s.workflow.races[e.id]?.format));if(options.length&&!options.some(e=>e.id===(s.finalsEvent?.id||s.selectedEventId))&&client.state.eventId!==options[0].id){client.state.eventId=options[0].id;reserveOffset=0;Promise.resolve().then(()=>client.load(true));}}remember();}

    function dialogUpdates(){if(!dialog.open||!client.state.data)return;let box=dialog.querySelector('[data-bureau-updates]');if(!box){box=document.createElement('aside');box.dataset.bureauUpdates='';box.className='console-dialog-updates';box.setAttribute('role','status');dialog.prepend(box);}const alerts=client.state.data.workflow.alerts.filter(a=>!a.cancelledAt&&a.computerStatus==='pending');box.hidden=!alerts.length;box.textContent=alerts.length?'À traiter au bureau : '+alerts.length+' · '+alerts.at(-1).displayName:'';}
    function retry(needed){host.querySelector('[data-bureau-retry]')?.remove();dialog.querySelector('[data-bureau-retry]')?.remove();if(!needed)return;const button=document.createElement('button');button.type='button';button.dataset.bureauRetry='';button.className='secondary';button.textContent='Vérifier / réessayer le dernier envoi';button.onclick=async()=>{try{if(!await client.deliver())return;dialog.close();await client.load(true);}catch(error){status(error.message,true);}};if(dialog.open)dialog.querySelector('#bureauConsoleError').after(button);else details.querySelector('summary').after(button);}
    function render(){
      if(!valid()||!client.state.data)return;const snapshot=client.state.data,pending=snapshot.workflow.alerts.filter(a=>!a.cancelledAt&&a.computerStatus==='pending').length;
      host.querySelector('#bureauOperationsCount').textContent=pending?pending+' à traiter':'';
      hasFinals=Object.values(snapshot.workflow.races).some(r=>['a','ab'].includes(r.format));const solo=snapshot.config.consoles.length===1;global.LivePalmesDirectBureauLayout?.progress(snapshot);const options=(snapshot.finalOptions||[]).filter(e=>['a','ab'].includes(snapshot.workflow.races[e.id]?.format)),oldSettings=client.state.dirty?body.querySelector('#consoleFinalSettings')?.closest('section'):null;
      body.innerHTML=`<nav class="bureau-tabs" aria-label="Activité du bureau">${solo?'<button data-bureau-tab="follow" type="button">Suivi</button>':`<button data-bureau-tab="queue" type="button">Arbitrage ${pending?'· '+pending:''}</button>`}${hasFinals?`<button data-bureau-tab="finals" type="button">Finales · ${(snapshot.finalTasks||[]).length}</button>`:''}<button data-bureau-tab="imports" type="button">Imports · ${snapshot.events.length}</button><button data-bureau-tab="history" type="button">Historique · ${snapshot.workflow.historyCount||0}</button><button data-bureau-tab="settings" type="button">Réglages</button><button data-bureau-refresh type="button" class="secondary">Actualiser</button></nav><div data-bureau-panel="queue">${pending?view.queue(snapshot,'computer'):'<p class="bureau-empty">Aucune décision à traiter.</p>'}${view.finalTasks(snapshot,'computer')}</div><div data-bureau-panel="finals"><div class="direct-toolbar bureau-course-toolbar"><label>Course<select id="bureauConsoleCourse">${options.map(event=>`<option value="${event.id}" ${event.id===(snapshot.finalsEvent?.id||snapshot.selectedEventId)?'selected':''}>${esc(event.eventLabel)} · ${event.sex==='F'?'Femmes':event.sex==='M'?'Hommes':'Mixte'}</option>`).join('')}</select></label></div>${view.finals(snapshot,'computer',reserveOffset)||'<p class="bureau-empty">Aucune finale paramétrée pour cette course.</p>'}</div><div data-bureau-panel="settings">${view.rankingSettings(snapshot,'computer',client.state.dirty)}${view.settings(snapshot,'computer')}</div><div data-bureau-panel="imports"><p class="bureau-empty">Séries PDF et bilan des publications ci-dessous.</p></div><div data-bureau-panel="history"><nav class="bureau-history-filters" aria-label="Filtrer l’historique"><button data-bureau-history="decisions" type="button" aria-pressed="${historyFilter==='decisions'}">Décisions et annonces</button><button data-bureau-history="publications" type="button" aria-pressed="${historyFilter==='publications'}">Publications des résultats</button></nav><div data-bureau-decisions ${historyFilter==='publications'?'hidden':''}><div class="direct-actions"><button data-bureau-print type="button" class="secondary">Export journal</button><button data-bureau-reset type="button" class="danger">Réinitialiser les consoles</button></div>${view.history(snapshot,'computer')}</div></div>`;
      body.querySelectorAll('.console-hint,.direct-note,.console-txt-note').forEach(node=>node.remove());
      const settings=body.querySelector('#consoleFinalSettings');if(oldSettings)settings?.closest('section').replaceWith(oldSettings);else if(settings)settings.open=true;
      const history=body.querySelector('#consoleHistoryDetails');if(history)history.open=true;
      const actions=body.querySelector('.console-final-actions'),panel=body.querySelector('.console-finals-panel');if(actions&&panel)panel.querySelector('.console-final-meta').after(actions);
      body.querySelector('#bureauConsoleCourse')?.addEventListener('change',async e=>{if(client.state.loading||client.state.busy)return;const chosen=e.target.value;if(client.state.dirty&&!await global.LivePalmesDirectConfirm.ask('Abandonner les réglages non enregistrés ?')){e.target.value=client.state.data.finalsEvent?.id||client.state.data.selectedEventId;return;}client.state.dirty=false;settingsContext=null;client.state.eventId=chosen;reserveOffset=0;await client.load(true);});
      showTab(tab);activity();dialogUpdates();
    }

    function open(title,html,callback,pinned=client.context()){
      modal={callback,pinned};dialog.querySelector('#bureauConsoleContent').innerHTML='<h2>'+esc(title)+'</h2>'+html;dialog.querySelector('#bureauConsoleError').textContent='';dialog.querySelector('#bureauConsoleSubmit').textContent='Confirmer';dialog.showModal();dialogUpdates();
    }
    async function send(command,input={},pinned=client.context()){
      const ok=await client.send(command,input,pinned);if(ok){dialog.close();client.state.dirty=false;await client.load(true);}return ok;
    }
    async function act(button){
      if(current().busy||client.state.busy||client.state.loading)return;const name=button.dataset.consoleAction,attrs=button.dataset,s=client.state.data;if(!s)return;
      if(name==='event'){showTab('finals');client.state.eventId=attrs.event;await client.load(true);return;}
      if(name==='reservePage'){reserveOffset=Math.max(0,Number(attrs.offset)||0);render();return;}
      if(name==='selectFormats'){const inputs=[...body.querySelectorAll('[data-format-check]')],checked=!inputs.every(input=>input.checked);inputs.forEach(input=>input.checked=checked);return;}
      if(name==='bulkFormat'){for(const row of body.querySelectorAll('[data-format-event]'))if(row.querySelector('[data-format-check]').checked&&!row.querySelector('[data-format]').disabled){row.querySelector('[data-format]').value=body.querySelector('#consoleBulkFormat').value;row.querySelector('[data-lanes]').value=body.querySelector('#consoleDefaultLanes').value;view.syncInvitedLimit(row);}if(!client.state.dirty)settingsContext=client.context();client.state.dirty=true;body.querySelector('#consoleRankingMode').disabled=true;return;}
      if(name==='configure'){await send('configure',{lanes:Number(body.querySelector('#consoleDefaultLanes').value),events:[...body.querySelectorAll('[data-format-event]')].map(row=>({id:row.dataset.formatEvent,format:row.querySelector('[data-format]').value,lanes:Number(row.querySelector('[data-lanes]').value),invitedLimit:row.querySelector('[data-invited-limit]').value===''?null:Number(row.querySelector('[data-invited-limit]').value)}))},settingsContext||client.context());settingsContext=null;return;}
      const alert=s.workflow.alerts.find(a=>a.id===attrs.alert),key=attrs.key,eventId=attrs.event||s.finalsEvent?.id||s.selectedEventId,pinned={...client.context(),eventId};
      if(name==='computerDone'){await send(name,{alertId:attrs.alert},{...pinned,eventId:alert?.eventId||eventId});return;}
      if(name==='resolveTie'){
        const tie=s.finals.ties.find(t=>t.id===attrs.tie);open('Enregistrer le départage',tie.keys.map((key,index)=>`<label>${index+1}${index?'e':'er'} après départage<select data-bureau-tie-order><option value="">Choisir…</option>${tie.keys.map((value,n)=>`<option value="${value}">${esc(tie.names[n])}</option>`).join('')}</select></label>`).join(''),()=>send(name,{tieId:tie.id,order:[...dialog.querySelectorAll('[data-bureau-tie-order]')].map(input=>input.value)},pinned),pinned);return;
      }
      const names={cancel:'Confirmer la réqualification du délégué',announceFinalists:s.finals?.ties.length?'Confirmer l’annonce des qualifiés certains':'Confirmer l’annonce des finalistes',announceReplacement:'Confirmer l’annonce du changement',withdraw:'Enregistrer le forfait en finale',reinstate:'Réintégrer le finaliste',preWithdraw:'Modifier le pré-forfait du réserviste',markSwimoff:'Confirmer le swim-off prévu',confirmSwimoffCancelled:'Confirmer l’annulation du swim-off',refreshFinalists:'Vérifier la composition corrigée',compositionDone:'Composition saisie dans WinPalme'};
      if(!names[name])return;const late=name==='withdraw'?view.withdrawalConfirmation(s,key):null;const row=s.qualifyingEntries?.find(r=>r.key===key);open(late?.title||names[name],'<p>'+esc(alert?.displayName||row&&ui.name(row)||s.finalsEvent?.eventLabel||'')+'</p>'+(late?.html||''),()=>send(name,{alertId:attrs.alert,participantKey:key,...(late?.late?{confirmLateWithdrawal:true}:{})},alert?{...pinned,eventId:alert.eventId}:pinned),pinned);if(late?.late)dialog.querySelector('#bureauConsoleSubmit').textContent='Confirmer le forfait hors délai';
    }
    details.addEventListener('toggle',()=>{remember();if(details.open)client.load(false);});
    body.addEventListener('change',e=>{if(e.target.id==='consoleRankingMode'&&!client.state.dirty&&!client.state.loading&&!client.state.busy)send('rankingMode',{rankingMode:e.target.value}).catch(error=>status(error.message,true));});
    body.addEventListener('input',e=>{if(e.target.matches('[data-lanes]'))view.syncInvitedLimit(e.target.closest('[data-format-event]'));if(e.target.closest('#consoleFinalSettings')){if(!client.state.dirty)settingsContext=client.context();client.state.dirty=true;body.querySelector('#consoleRankingMode').disabled=true;}});
    body.addEventListener('toggle',e=>{if(e.target.id==='consoleFinalSettings')client.state.settingsOpen=e.target.open;},true);
    body.addEventListener('click',async e=>{
      const button=e.target.closest('[data-console-action]');
      try{
        if(client.state.loading||client.state.busy)return;
        if(button){await act(button);return;}
        if(e.target.closest('[data-bureau-tab]')){showTab(e.target.closest('[data-bureau-tab]').dataset.bureauTab);return;}
        if(e.target.closest('[data-bureau-history]')){historyFilter=e.target.closest('[data-bureau-history]').dataset.bureauHistory;if(historyFilter==='publications')await global.LivePalmesDirectAdmin.history();render();return;}
        if(e.target.closest('[data-bureau-refresh]')){if(!client.state.dirty||await global.LivePalmesDirectConfirm.ask('Abandonner les réglages non enregistrés ?')){client.state.dirty=false;settingsContext=null;client.load(true);}return;}
        if(e.target.closest('[data-bureau-reset]')){
          const pinned=client.context();
          if(await global.LivePalmesDirectConfirm.ask('Effacer les décisions, le journal privé, le repère JA et les réglages de finales de cette compétition ? Les séries, résultats publics, activation et accès seront conservés.',{title:'Réinitialiser les consoles',label:'Effacer les consoles',danger:true}))await send('resetConsoles',{confirmation:'reset-consoles-'+id},pinned);
          return;
        }
        if(e.target.closest('[data-bureau-print]'))print();
      }catch(error){status(error.message,true);if(/aborted/.test(error.code||''))review(settingsContext||client.context(),statusNode);}
    });
    function review(pinned,target){
      const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Vérifier les changements · conserver la saisie';button.dataset.bureauReview='';
      button.onclick=async()=>{try{await client.revalidate(pinned);target.textContent='Données actualisées. Vérifiez puis confirmez à nouveau.';}catch(error){target.textContent=error.message;review(pinned,target);}};target.append(button);
    }
    dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(client.state.busy)return;const button=dialog.querySelector('#bureauConsoleSubmit');button.disabled=true;try{await modal.callback();}catch(error){dialog.querySelector('#bureauConsoleError').textContent=error.message;retry(Boolean(client.state.pending));if(/aborted/.test(error.code||''))review(modal.pinned,dialog.querySelector('#bureauConsoleError'));}finally{button.disabled=false;}};
    dialog.querySelector('[data-bureau-close]').onclick=()=>{if(!client.state.busy)dialog.close();};
    async function print(){const previousTab=tab;try{showTab('history');const result=await api('consoleHistory',{all:true});client.state.data.workflow.history=result.items.reverse();render();const section=body.querySelector('#consoleHistoryDetails');if(section)section.open=true;document.body.classList.add('bureau-history-print');window.print();document.body.classList.remove('bureau-history-print');}catch(error){status(error.message,true);}finally{showTab(previousTab);}}
    dialog.addEventListener('close',()=>{if(!client.state.loading&&!client.state.busy)client.load(false);});
    const visibility=()=>{if(!document.hidden&&details.open)client.load(false);};document.addEventListener('visibilitychange',visibility);
    instance={client,state:client.state,host,dialog,details,render,showTab,get tab(){return tab;},remember,stop,print,dispose:()=>{remember();document.removeEventListener('visibilitychange',visibility);}};
    global.LivePalmesDirectBureau.instance=instance;
    return instance;
  }
  global.LivePalmesDirectBureau={mount,stop,instance:null};
})(window);

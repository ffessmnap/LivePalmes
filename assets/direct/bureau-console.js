(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation,view=global.LivePalmesConsoleView,esc=ui.esc;
  let instance=null;
  function stop(){if(instance){instance.client.stop();instance.client.state.data=null;instance.dialog.close();instance.dialog.remove();instance.host.remove();instance=null;global.LivePalmesDirectBureau.instance=null;}}
  function mount({host:workspace,data,id,call,current}){
    stop();if(!workspace||!data.config||data.config.state!=='active'||!data.permissions.manage&&!data.permissions.roles.includes('computer'))return;
    const identity=current(),host=document.createElement('section');host.className='direct-card direct-bureau-operations';
    host.innerHTML='<details id="bureauOperations"><summary>Arbitrage et finales <span id="bureauOperationsCount" class="direct-count"></span></summary><p id="bureauConsoleStatus" class="direct-status" role="status" hidden></p><div id="bureauConsoleWorkspace"></div></details>';
    workspace.insertBefore(host,workspace.children[1]||null);const details=host.querySelector('details'),body=host.querySelector('#bureauConsoleWorkspace'),statusNode=host.querySelector('#bureauConsoleStatus');
    const dialog=document.createElement('dialog');dialog.className='direct-dialog bureau-console-dialog';dialog.innerHTML='<form id="bureauConsoleForm"><div id="bureauConsoleContent"></div><p id="bureauConsoleError" class="direct-status error" role="alert"></p><div class="direct-actions"><button id="bureauConsoleSubmit" type="submit">Confirmer</button><button data-bureau-close type="button" class="secondary">Annuler</button></div></form>';document.body.append(dialog);
    const valid=()=>host.isConnected&&current().uid===identity.uid&&String(current().id)===String(id);
    const api=(action,input={})=>{if(!valid())throw Error('La compétition ou le compte a changé.');return call(action,{...input,role:'computer'});};
    const status=(message,error)=>{if(!valid())return;statusNode.hidden=!error;statusNode.textContent=error?message:'';statusNode.classList.toggle('error',Boolean(error));};
    const client=global.LivePalmesDirectConsoleClient.create({role:'computer',competitionId:id,getUser:()=>valid()?{uid:identity.uid}:null,call:api,onRender:render,onStatus:status,onAccessError:()=>{body.replaceChildren();dialog.close();},canPoll:()=>details.open&&!dialog.open&&!current().busy,onRetry:retry});
    let modal=null,reserveOffset=0;
    function retry(needed){host.querySelector('[data-bureau-retry]')?.remove();dialog.querySelector('[data-bureau-retry]')?.remove();if(!needed)return;const button=document.createElement('button');button.type='button';button.dataset.bureauRetry='';button.className='secondary';button.textContent='Vérifier / réessayer le dernier envoi';button.onclick=async()=>{try{await client.deliver();dialog.close();await client.load(true);}catch(error){status(error.message,true);}};if(dialog.open)dialog.querySelector('#bureauConsoleError').after(button);else details.querySelector('summary').after(button);}
    function render(){
      if(!valid()||!client.state.data)return;const snapshot=client.state.data,pending=snapshot.workflow.alerts.filter(a=>!a.cancelledAt&&a.computerStatus==='pending').length;
      host.querySelector('#bureauOperationsCount').textContent=pending?pending+' à traiter':'';
      const options=snapshot.finalOptions||[];
      body.innerHTML=`<div class="direct-toolbar bureau-course-toolbar"><label>Course<select id="bureauConsoleCourse">${options.map(event=>`<option value="${event.id}" ${event.id===(snapshot.finalsEvent?.id||snapshot.selectedEventId)?'selected':''}>${esc(event.eventLabel)} · ${event.sex==='F'?'Femmes':event.sex==='M'?'Hommes':'Mixte'}</option>`).join('')}</select></label><button data-bureau-refresh type="button" class="secondary">Actualiser</button><button data-bureau-print type="button" class="secondary">Export journal</button></div>${pending?view.queue(snapshot,'computer'):''}${view.settings(snapshot,'computer')}${view.finals(snapshot,'computer',reserveOffset)}${snapshot.workflow.historyCount?view.history(snapshot,'computer'):''}`;
      body.querySelectorAll('.console-hint,.direct-note,.console-txt-note').forEach(node=>node.remove());
      const settings=body.querySelector('#consoleFinalSettings');if(settings)settings.open=client.state.settingsOpen;
      body.querySelector('#bureauConsoleCourse')?.addEventListener('change',async e=>{if(client.state.dirty&&!confirm('Abandonner les réglages non enregistrés ?'))return;client.state.dirty=false;client.state.eventId=e.target.value;reserveOffset=0;await client.load(true);});
    }
    function open(title,html,callback,pinned=client.context()){
      modal={callback,pinned};dialog.querySelector('#bureauConsoleContent').innerHTML='<h2>'+esc(title)+'</h2>'+html;dialog.querySelector('#bureauConsoleError').textContent='';dialog.querySelector('#bureauConsoleSubmit').textContent='Confirmer';dialog.showModal();
    }
    async function send(command,input={},pinned=client.context()){
      const ok=await client.send(command,input,pinned);if(ok){dialog.close();client.state.dirty=false;await client.load(true);}return ok;
    }
    async function act(button){
      if(current().busy||client.state.busy)return;const name=button.dataset.consoleAction,attrs=button.dataset,s=client.state.data;if(!s)return;
      if(name==='event'){client.state.eventId=attrs.event;await client.load(true);return;}
      if(name==='reservePage'){reserveOffset=Math.max(0,Number(attrs.offset)||0);render();return;}
      if(name==='selectFormats'){const inputs=[...body.querySelectorAll('[data-format-check]')],checked=!inputs.every(input=>input.checked);inputs.forEach(input=>input.checked=checked);return;}
      if(name==='bulkFormat'){for(const row of body.querySelectorAll('[data-format-event]'))if(row.querySelector('[data-format-check]').checked&&!row.querySelector('[data-format]').disabled){row.querySelector('[data-format]').value=body.querySelector('#consoleBulkFormat').value;row.querySelector('[data-lanes]').value=body.querySelector('#consoleDefaultLanes').value;}client.state.dirty=true;return;}
      if(name==='configure'){await send('configure',{lanes:Number(body.querySelector('#consoleDefaultLanes').value),events:[...body.querySelectorAll('[data-format-event]')].map(row=>({id:row.dataset.formatEvent,format:row.querySelector('[data-format]').value,lanes:Number(row.querySelector('[data-lanes]').value)}))});return;}
      const alert=s.workflow.alerts.find(a=>a.id===attrs.alert),key=attrs.key,eventId=attrs.event||s.finalsEvent?.id||s.selectedEventId,pinned={...client.context(),eventId};
      if(name==='computerDone'){await send(name,{alertId:attrs.alert},{...pinned,eventId:alert?.eventId||eventId});return;}
      if(name==='resolveTie'){
        const tie=s.finals.ties.find(t=>t.id===attrs.tie);open('Enregistrer le départage',tie.keys.map((key,index)=>`<label>${index+1}${index?'e':'er'} après départage<select data-bureau-tie-order><option value="">Choisir…</option>${tie.keys.map((value,n)=>`<option value="${value}">${esc(tie.names[n])}</option>`).join('')}</select></label>`).join(''),()=>send(name,{tieId:tie.id,order:[...dialog.querySelectorAll('[data-bureau-tie-order]')].map(input=>input.value)},pinned),pinned);return;
      }
      const names={cancel:'Confirmer la réqualification du délégué',announceFinalists:s.finals?.ties.length?'Confirmer l’annonce des qualifiés certains':'Confirmer l’annonce des finalistes',announceReplacement:'Confirmer l’annonce du changement',withdraw:'Enregistrer le forfait en finale',reinstate:'Réintégrer le finaliste',preWithdraw:'Modifier le pré-forfait du réserviste',markSwimoff:'Confirmer le swim-off prévu',confirmSwimoffCancelled:'Confirmer l’annulation du swim-off',refreshFinalists:'Vérifier la composition corrigée',compositionDone:'Composition saisie dans WinPalme'};
      if(!names[name])return;const row=s.qualifyingEntries?.find(r=>r.key===key);open(names[name],'<p>'+esc(alert?.displayName||row&&ui.name(row)||s.finalsEvent?.eventLabel||'')+'</p>',()=>send(name,{alertId:attrs.alert,participantKey:key},alert?{...pinned,eventId:alert.eventId}:pinned),pinned);
    }
    details.addEventListener('toggle',()=>{if(details.open&&!client.state.data)client.load(true);if(details.open)render();});
    body.addEventListener('input',e=>{if(e.target.closest('#consoleFinalSettings'))client.state.dirty=true;});
    body.addEventListener('toggle',e=>{if(e.target.id==='consoleFinalSettings')client.state.settingsOpen=e.target.open;},true);
    body.addEventListener('click',e=>{const button=e.target.closest('[data-console-action]');if(button)act(button).catch(error=>{status(error.message,true);if(!client.state.pending)client.load(true);});else if(e.target.closest('[data-bureau-refresh]')){if(!client.state.dirty||confirm('Abandonner les réglages non enregistrés ?')){client.state.dirty=false;client.load(true);}}else if(e.target.closest('[data-bureau-print]'))print();});
    dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(client.state.busy)return;const button=dialog.querySelector('#bureauConsoleSubmit');button.disabled=true;try{await modal.callback();}catch(error){dialog.querySelector('#bureauConsoleError').textContent=error.message;retry(Boolean(client.state.pending));}finally{button.disabled=false;}};
    dialog.querySelector('[data-bureau-close]').onclick=()=>{if(!client.state.busy)dialog.close();};
    async function print(){try{const result=await api('consoleHistory',{all:true});client.state.data.workflow.history=result.items.reverse();render();const section=body.querySelector('#consoleHistoryDetails');if(section)section.open=true;document.body.classList.add('bureau-history-print');window.print();document.body.classList.remove('bureau-history-print');}catch(error){status(error.message,true);}}
    instance={client,state:client.state,host,dialog,details,render,stop,print};
    global.LivePalmesDirectBureau.instance=instance;
    return instance;
  }
  global.LivePalmesDirectBureau={mount,stop,instance:null};
})(window);

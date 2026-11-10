(function(global){
  'use strict';
  const esc=global.LivePalmesDirectPresentation.esc;
  const roles={computer:'Bureau des performances',referee:'Juge arbitre',video:'Juge vidéo',speaker:'Speaker',secretary:'Secrétariat',live:'Live'};
  function competitions(host,items,select){
    host.replaceChildren();
    for(const item of items){const button=document.createElement('button');button.type='button';button.className='direct-competition-choice secondary';button.dataset.competitionId=item.id;const name=document.createElement('strong'),date=document.createElement('span');name.textContent=item.name;date.textContent=global.LivePalmesDirectPresentation.dateRange(item.date,item.endDate);button.append(name,date);button.onclick=()=>select(item.id);host.append(button);}
    if(!items.length)host.textContent='Aucune compétition accessible pour cette saison.';
  }
  function consoles({host,data,id,current,change}){
    const identity={id,uid:current().uid},sharing=global.LivePalmesDirectConsoleShare.create({current,identity});
    const allowed=data.config?.state==='active'?data.config.consoles.filter(role=>data.permissions.roles.includes(role)):[];
    host.innerHTML=`<section class="direct-card direct-console-home"><div class="direct-console-home-head"><div><h2>${esc(data.competition.name)}</h2><p>${esc(global.LivePalmesDirectPresentation.dateRange(data.competition.date,data.competition.endDate))}</p></div><button type="button" class="secondary" data-my-competitions>Mes compétitions</button></div><h3>Mes consoles</h3><nav class="direct-my-consoles" aria-label="Mes consoles"></nav>${allowed.length?'':'<p>Aucune console accessible actuellement pour cette compétition.</p>'}</section>`;
    const nav=host.querySelector('nav');for(const role of allowed){const card=document.createElement('div');card.className='direct-console-choice';const link=document.createElement('a');link.textContent=roles[role];link.href=role==='computer'?'direct-admin.html?id='+encodeURIComponent(id):'direct-consoles.html?id='+encodeURIComponent(id)+'&role='+role;card.append(link,sharing.controls({label:roles[role],url:link.href}));nav.append(card);}
    host.querySelector('[data-my-competitions]').onclick=change;
    return {stop:()=>sharing.stop()};
  }
  function grants({host,data,id,call,current,onVersion}){
    const identity={id,uid:current().uid};let disposed=false,busy=false,items=[],editing=null,loaded=false;
    const valid=()=>!disposed&&current().uid===identity.uid&&String(current().id)===String(id);
    const trigger=document.createElement('button');trigger.type='button';trigger.className='secondary';trigger.textContent='Accès et délégations';trigger.dataset.manageAccess='';host.append(trigger);
    const dialog=document.createElement('dialog');dialog.className='direct-dialog direct-access-dialog';dialog.setAttribute('aria-labelledby','directAccessTitle');
    dialog.innerHTML='<div class="direct-dialog-head"><h2 id="directAccessTitle">Accès et délégations</h2><button type="button" class="secondary" data-access-close>Fermer</button></div><p class="direct-note"></p><p role="status" data-access-status></p><section data-access-list><div class="direct-actions"><button type="button" data-access-add>Ajouter un accès</button><button type="button" class="secondary" data-access-refresh>Actualiser</button></div><div data-access-items></div></section><form data-access-form hidden><h3 data-access-form-title>Ajouter un accès</h3><div class="direct-access-fields"><label>Adresse du compte<input type="email" name="email" required autocomplete="off" maxlength="180"></label><label>Responsabilité<select name="manage"><option value="false">Consoles sélectionnées</option><option value="true">Gestion du Direct</option></select></label><label>Expiration<input type="datetime-local" name="expiry" required></label></div><fieldset class="direct-roles"><legend>Consoles autorisées</legend></fieldset><p class="direct-note" data-access-manage-note hidden>Gestion de LivePalmes Direct pour cette compétition, y compris les accès.</p><div class="direct-actions"><button type="submit" data-access-save>Accorder l’accès</button><button type="button" class="secondary" data-access-cancel>Annuler</button></div></form>';
    dialog.querySelector('.direct-note').textContent=data.competition.name;document.body.append(dialog);
    const $=selector=>dialog.querySelector(selector),form=$('form'),message=$('[data-access-status]');
    function status(text,error=false){message.textContent=text;message.classList.toggle('error',error);}
    async function run(task){if(busy||!valid())return;busy=true;const controls=[...dialog.querySelectorAll('button,input,select')].map(node=>({node,disabled:node.disabled}));controls.forEach(({node})=>node.disabled=true);try{await task();}catch(error){if(valid())status(error.message||'Accès indisponibles. Actualiser avant de réessayer.',true);}finally{busy=false;controls.forEach(({node,disabled})=>{if(node.isConnected)node.disabled=disabled;});}}
    function state(item){return !item.active?'Retiré':item.expiresAt&&new Date(item.expiresAt).getTime()<=Date.now()?'Expiré':!item.account?.active?'Compte indisponible':'Actif';}
    function list(){
      $('[data-access-list]').hidden=false;form.hidden=true;
      $('[data-access-items]').innerHTML=items.map((item,index)=>`<article class="direct-access-row"><div><strong>${esc(item.account?.label||'Compte indisponible')}</strong><span>${esc(item.account?.email||'Adresse indisponible')}</span><span>${item.manage?'Gestion du Direct':item.consoles.map(role=>esc(roles[role]||role)).join(' · ')||'Aucune console'}</span><small>${esc(state(item))} · ${item.expiresAt?'Jusqu’au '+esc(new Date(item.expiresAt).toLocaleString('fr-FR')):'Sans expiration'}</small></div><div class="direct-actions"><button type="button" class="secondary" data-access-edit="${index}">${item.active?'Modifier':'Rétablir l’accès'}</button>${item.active?`<button type="button" class="secondary" data-access-remove="${index}">Retirer l’accès</button>`:''}</div></article>`).join('')||'<p>Aucun accès délégué pour cette compétition.</p>';
    }
    async function load(){const response=await call('grants');if(!valid())return;if(Number.isFinite(response.version))data.config.version=response.version;items=response.items;loaded=true;list();status('');}
    function localDate(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')+'T'+String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');}
    function edit(item=null){
      editing=item;status('');$('[data-access-list]').hidden=true;form.hidden=false;form.reset();form.elements.email.value=item?.account?.email||'';form.elements.email.readOnly=Boolean(item);form.elements.email.required=!item;form.elements.manage.value=String(item?.manage||false);
      const expiry=new Date((data.competition.endDate||data.competition.date)+'T12:00:00');expiry.setDate(expiry.getDate()+1);expiry.setHours(23,59,0,0);form.elements.expiry.value=localDate(item?.expiresAt||expiry);
      form.querySelector('fieldset').innerHTML='<legend>Consoles autorisées</legend>'+data.config.consoles.map(role=>`<label><input type="checkbox" name="console" value="${role}" ${item?.consoles.includes(role)?'checked':''}>${esc(roles[role])}</label>`).join('');
      $('[data-access-form-title]').textContent=item?'Modifier l’accès':'Ajouter un accès';$('[data-access-save]').textContent=item?(item.active?'Enregistrer':'Rétablir l’accès'):'Accorder l’accès';responsibility();form.elements.email.focus();
    }
    function responsibility(){const manage=form.elements.manage.value==='true';form.querySelector('fieldset').hidden=manage;$('[data-access-manage-note]').hidden=!manage;}
    async function save(input){
      const result=await call('grant',{...input,version:data.config.version,operationKey:crypto.randomUUID()});if(!valid())return;
      onVersion(result.version);await load();if(valid())status(input.active===false?'Accès retiré.':'Accès enregistré.');
    }
    trigger.onclick=()=>{if(!valid())return;dialog.showModal();if(!loaded)void run(load);};
    $('[data-access-close]').onclick=()=>{if(!busy)dialog.close();};dialog.oncancel=event=>{if(busy)event.preventDefault();};
    $('[data-access-add]').onclick=()=>edit();$('[data-access-refresh]').onclick=()=>run(load);$('[data-access-cancel]').onclick=()=>{list();status('');};form.elements.manage.onchange=responsibility;
    $('[data-access-items]').onclick=event=>{const button=event.target.closest('button');if(!button||busy)return;if(button.dataset.accessEdit!==undefined)edit(items[Number(button.dataset.accessEdit)]);else if(button.dataset.accessRemove!==undefined){const item=items[Number(button.dataset.accessRemove)];void run(async()=>{if(!await global.LivePalmesDirectConfirm.ask('Retirer l’accès de '+(item.account?.label||'ce compte')+' à cette compétition ?',{title:'Retirer un accès',label:'Retirer l’accès',danger:true})||!valid())return;await save({uid:item.uid,manage:item.manage,consoles:item.consoles,active:false,expiresAt:item.expiresAt?new Date(item.expiresAt).toISOString():null});});}};
    form.onsubmit=event=>{event.preventDefault();const consoles=[...form.querySelectorAll('input[name=console]:checked')].map(input=>input.value),manage=form.elements.manage.value==='true';if(!manage&&!consoles.length){status('Choisir au moins une console.',true);return;}const expiresAt=new Date(form.elements.expiry.value);if(!Number.isFinite(expiresAt.getTime())||expiresAt<=new Date()){status('Choisir une expiration à venir.',true);return;}const input={...(editing?{uid:editing.uid}:{email:form.elements.email.value.trim()}),manage,consoles:manage?[]:consoles,expiresAt:expiresAt.toISOString(),active:true};void run(()=>save(input));};
    return {stop(){disposed=true;if(dialog.open)dialog.close();dialog.remove();trigger.remove();}};
  }
  global.LivePalmesDirectAccess={competitions,consoles,grants};
})(window);

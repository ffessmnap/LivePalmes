(function attachImportSwimmerCreation(global){
  "use strict";
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let operations=new Map();
  function mount({host,group,clubs,selectedClubId,onPreview,onCreate,onPick}){
    const saved=operations.get(group.id),source=group.source,values=saved?.payload.swimmer||source;
    if(saved?.busy){host.textContent='Une création est en cours pour ce nageur. Attendez sa fin avant de reprendre cette action.';return;}
    host.innerHTML=`<section class="import-swimmer-creation"><h4>Créer une fiche NAP</h4><p>Après recherche, confirmez qu’aucune fiche existante ne correspond. La création enregistre une fiche dans la base NAP réelle, y compris depuis TEST. Les résultats restent en aperçu.</p><div class="import-profile-comparison">
      ${[['lastName','Nom','text'],['firstName','Prénom','text'],['birthDate','Date de naissance','date']].map(([key,label,type])=>`<label>${label}<input required type="${type}" data-create-field="${key}" value="${escape(values[key])}" ${type==='text'?'maxlength="64"':''}></label>`).join('')}
      <label>Sexe<select required data-create-field="sex"><option value="">Choisir</option><option value="F" ${values.sex==='F'?'selected':''}>F</option><option value="M" ${values.sex==='M'?'selected':''}>M</option></select></label>
      <label>Club de la nouvelle fiche<select required data-create-club><option value="">Choisir un club</option>${[...clubs].sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr')).map(c=>`<option value="${escape(c.id)}" ${String(saved?.payload.clubId||selectedClubId)===String(c.id)?'selected':''}>${escape(c.name)} — ${escape(c.code)}</option>`).join('')}</select></label>
      <label>Numéro de licence<input required maxlength="100" pattern="[A-Z]-[0-9]{2}-[0-9]+" placeholder="A-12-34567" data-create-field="licenseNumber" value="${escape(values.licenseNumber||'')}"></label></div>
      <button type="button" class="ghost-button" data-create-check>Vérifier les doublons avant création</button><div data-create-alerts></div>
      <label class="import-club-alert"><input type="checkbox" data-create-confirm> J’ai recherché et vérifié les profils proposés ; aucun ne correspond à ce nageur. Je confirme son identité, sa licence et son club.</label>
      <button type="button" class="primary-button" data-create-save disabled>Confirmer la création dans NAP</button><p role="status" data-create-status></p></section>`;
    const fields=[...host.querySelectorAll('[data-create-field]')],club=host.querySelector('[data-create-club]'),confirm=host.querySelector('[data-create-confirm]'),check=host.querySelector('[data-create-check]'),save=host.querySelector('[data-create-save]'),status=host.querySelector('[data-create-status]'),alerts=host.querySelector('[data-create-alerts]');
    let preview=null,busy=false,version=0;
    const input=()=>({importReview:true,clubId:club.value,swimmer:Object.fromEntries(fields.map(el=>[el.dataset.createField,el.value.trim()]))});
    const valid=()=>[...fields,club].every(el=>el.reportValidity());
    const update=()=>{const operation=operations.get(group.id);save.disabled=busy||!confirm.checked||(!operation&&!preview)||preview?.blocksCreation===true;check.disabled=busy||!!operation;[...fields,club].forEach(el=>el.disabled=busy||!!operation);confirm.disabled=busy;save.textContent=operation?'Reprendre la même création':'Confirmer la création dans NAP';};
    const changed=()=>{version++;preview=null;confirm.checked=false;alerts.replaceChildren();status.textContent='Informations modifiées : vérifier à nouveau les doublons.';update();};
    [...fields,club].forEach(el=>el.addEventListener('input',changed));confirm.onchange=update;
    check.onclick=async()=>{
      if(!valid())return;const current=++version;busy=true;confirm.checked=false;preview=null;status.textContent='Recherche des doublons dans NAP…';update();
      try{const response=await onPreview(input());if(!host.isConnected||current!==version)return;preview=response;
        alerts.innerHTML=(response.alerts||[]).map(a=>`<article class="import-profile-option"><strong>${escape(a.name)}</strong><p>${escape(a.birthDate)} — ${escape(a.clubName||a.clubId)} — NAP ${escape(a.swimmerId||a.swimmerIndexId)}</p><p>${escape(a.message)}</p></article>`).join('');
        status.textContent=response.blocksCreation?'Une fiche existe : reprendre la recherche et sélectionner le profil NAP. La création est bloquée.':response.alerts?.length?'Des profils ressemblants existent : les vérifier avant de confirmer une nouvelle fiche.':'Aucun doublon détecté par ces contrôles. Confirmez les informations avant de créer la fiche.';
      }catch(error){status.textContent=error.message||String(error);}finally{busy=false;update();}
    };
    save.onclick=async()=>{
      if(save.disabled||!valid())return;
      let operation=operations.get(group.id);
      if(!operation){operation={payload:{...input(),creationId:global.crypto.randomUUID(),confirmNewSwimmer:true,confirmAlerts:!!preview.alerts?.length}};operations.set(group.id,operation);}
      busy=true;operation.busy=true;status.textContent='Création de la fiche NAP…';update();
      try{
        if(!operation.result)operation.result=await onCreate(operation.payload);
        if(!host.isConnected)return;
        const p=operation.result.swimmer,c=clubs.find(c=>String(c.id)===String(p.clubId));
        await onPick({...p,id:Number(p.id),clubCode:c?.code||p.club,clubName:c?.name||p.clubName,performanceCount:0});
        // Retain the receipt until the import is closed, including a failed refresh.
      }catch(error){status.textContent=(error.message||String(error))+' La même opération est conservée pour reprise ; ne créez pas une deuxième fiche.';}
      finally{operation.busy=false;busy=false;if(host.isConnected)update();}
    };
    if(saved){confirm.checked=false;status.textContent=saved.result?'La fiche a déjà été créée. Confirmez pour la sélectionner et actualiser l’aperçu.':'Une création a déjà été lancée. Les valeurs et son identifiant sont conservés pour une reprise sans nouvelle fiche.';}
    update();
  }
  global.LivePalmesImportSwimmerCreation={mount,reset:()=>{operations=new Map();}};
})(window);

(function attachImportSwimmerCreation(global){
  "use strict";
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let drafts=new Map();
  function mount({host,group,clubs,selectedClubId,onPreview,onCreate,onPick}){
    if(!drafts.has(group.id))drafts.set(group.id,{payload:{importReview:true,clubId:String(selectedClubId||''),swimmer:{...group.source,licenseNumber:''}},preview:null,confirmed:false,busy:false,version:0,message:''});
    const draft=drafts.get(group.id),values=draft.payload.swimmer;
    if(!draft.payload.clubId&&selectedClubId&&!draft.operation)draft.payload.clubId=String(selectedClubId);
    draft.onPick=onPick;
    host.innerHTML=`<section class="import-swimmer-creation"><h4>Créer une fiche NAP</h4><p>Vérifiez les profils proposés avant de confirmer. La création enregistre une fiche dans la base NAP réelle, y compris depuis TEST. Les résultats restent en aperçu. La licence est facultative pour cet import ; aucune licence n’est validée par cette action.</p><div class="import-profile-comparison">
      ${[['lastName','Nom','text'],['firstName','Prénom','text'],['birthDate','Date de naissance','date']].map(([key,label,type])=>`<label>${label}<input required type="${type}" data-create-field="${key}" value="${escape(values[key])}" ${type==='text'?'maxlength="64"':''}></label>`).join('')}
      <label>Sexe<select required data-create-field="sex"><option value="">Choisir</option><option value="F" ${values.sex==='F'?'selected':''}>F</option><option value="M" ${values.sex==='M'?'selected':''}>M</option></select></label>
      <label>Club de la nouvelle fiche<select required data-create-club><option value="">Choisir un club</option>${[...clubs].sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr')).map(c=>`<option value="${escape(c.id)}" ${String(draft.payload.clubId)===String(c.id)?'selected':''}>${escape(c.name)} — ${escape(c.code)}</option>`).join('')}</select></label>
      <label>Numéro de licence (facultatif)<input maxlength="100" pattern="[A-Z]-[0-9]{2}-[0-9]+" placeholder="Laisser vide si inconnu" data-create-field="licenseNumber" value="${escape(values.licenseNumber)}"></label></div>
      <button type="button" class="ghost-button" data-create-check>Vérifier les doublons avant création</button><div data-create-alerts></div>
      <label class="import-club-alert"><input type="checkbox" data-create-confirm> J’ai vérifié les profils proposés ; aucun ne correspond. Je confirme l’identité, le club et la licence si elle est renseignée.</label>
      <button type="button" class="primary-button" data-create-save disabled>Confirmer la création dans NAP</button><p role="status" data-create-status></p></section>`;
    const fields=[...host.querySelectorAll('[data-create-field]')],club=host.querySelector('[data-create-club]'),confirm=host.querySelector('[data-create-confirm]'),check=host.querySelector('[data-create-check]'),save=host.querySelector('[data-create-save]'),status=host.querySelector('[data-create-status]'),alerts=host.querySelector('[data-create-alerts]');
    const active=()=>drafts.get(group.id)===draft;
    const input=()=>({importReview:true,clubId:club.value,swimmer:Object.fromEntries(fields.map(el=>[el.dataset.createField,el.value.trim()]))});
    const valid=()=>[...fields,club].every(el=>el.reportValidity());
    draft.update=()=>{
      save.disabled=draft.busy||!draft.confirmed||(!draft.operation&&!draft.preview)||draft.preview?.blocksCreation===true;
      check.disabled=draft.busy||!!draft.operation;[...fields,club].forEach(el=>el.disabled=draft.busy||!!draft.operation);confirm.disabled=draft.busy;confirm.checked=draft.confirmed;
      save.textContent=draft.operation?'Reprendre la même création':'Confirmer la création dans NAP';
      alerts.innerHTML=(draft.preview?.alerts||[]).map(a=>`<article class="import-profile-option"><strong>${escape(a.name)}</strong><p>${escape(a.birthDate)} — ${escape(a.clubName||a.clubId)} — NAP ${escape(a.swimmerId||a.swimmerIndexId)}</p><p>${escape(a.message)}</p></article>`).join('');
      status.textContent=draft.message;
    };
    const changed=()=>{draft.version++;draft.payload=input();draft.preview=null;draft.confirmed=false;draft.message='Informations modifiées : vérifier à nouveau les doublons.';draft.update();};
    [...fields,club].forEach(el=>el.addEventListener('input',changed));confirm.onchange=()=>{draft.confirmed=confirm.checked;draft.update();};
    check.onclick=async()=>{
      if(draft.busy||!valid())return;draft.payload=input();const current=++draft.version;draft.busy=true;draft.confirmed=false;draft.preview=null;draft.message='Recherche des doublons dans NAP…';draft.update();
      try{const response=await onPreview(draft.payload);if(!active()||current!==draft.version)return;draft.preview=response;
        draft.message=response.blocksCreation?'Une fiche existe : sélectionner le profil NAP proposé. La création est bloquée.':response.alerts?.length?'Des profils ressemblants existent : les vérifier avant de confirmer une nouvelle fiche.':'Aucun doublon détecté par ces contrôles. Confirmez les informations avant de créer la fiche.';
      }catch(error){if(active())draft.message=error.message||String(error);}finally{draft.busy=false;if(active())draft.update();}
    };
    save.onclick=async()=>{
      if(save.disabled||!valid())return;
      if(!draft.operation)draft.operation={payload:{...draft.payload,creationId:global.crypto.randomUUID(),confirmNewSwimmer:true,confirmAlerts:!!draft.preview.alerts?.length}};
      const operation=draft.operation;draft.busy=true;draft.message='Création de la fiche NAP…';draft.update();
      try{
        if(!operation.result)operation.result=await onCreate(operation.payload);
        if(!active())return;
        const p=operation.result.swimmer,c=clubs.find(c=>String(c.id)===String(p.clubId));
        await draft.onPick({...p,id:Number(p.id),clubCode:c?.code||p.club,clubName:c?.name||p.clubName,performanceCount:0});
      }catch(error){if(active())draft.message=(error.message||String(error))+' La même opération est conservée pour reprise ; ne créez pas une deuxième fiche.';}
      finally{draft.busy=false;if(active())draft.update();}
    };
    draft.update();
  }
  global.LivePalmesImportSwimmerCreation={mount,isOpen:id=>drafts.has(id),reset:()=>{drafts=new Map();}};
})(window);

(function attachImportRecordReview(global){
  "use strict";
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const labels={pending:'À contrôler',accepted:'Contrôlée — non publiée',rejected:'Ignorée',invalidated:'Source invalidée',published:'Publiée'};
  function create({host,call,canManage,onDraft}){
    const cache=new Map();let busy=false,items=[];
    function render(item){
      if(!item.recordReview?.eligible)return '';
      const result=cache.get(item.importId),review=result?.review,current=item.current&&item.status==='completed'&&!item.resultsDeleted&&!item.activeDeletionId;
      const count=result?.error?null:review?.status==='ready'?result.total:item.recordReview.status==='ready'?item.recordReview.count:null;
      return `<section class="import-record-review" data-native-record-review="${escape(item.importId)}"><h4>Records / MPF possibles${count===null?'':` · ${count}`}</h4>
        <p>Détection indicative, contrôle humain puis publication explicite dans Records / MPF.</p>
        ${result?.error?`<p role="alert">Détection ou revue indisponible : ${escape(result.error)}</p>`:''}
        <div class="competition-import-actions"><button type="button" data-import-record-command="read">Afficher la revue</button>${current?'<button type="button" class="ghost-button" data-import-record-command="detect">Actualiser la détection</button>':''}</div>
        ${review?`<p>${review.status==='ready'?`Référence officielle comparée : version ${escape(review.referenceRevision)}.`:'Détection à effectuer ; aucun bilan de candidatures disponible.'}</p>${review.candidates.map(candidate=>`<article class="competition-import-alert" data-alert-status="${escape(candidate.state)}">
          <div><strong>${escape(candidate.type)} · ${escape(candidate.swimmer)} · ${escape(candidate.course)} · ${escape(candidate.categoryCode)}</strong><small>${escape(candidate.source.origin==='passage'?'Passage individuel':candidate.source.origin==='first-relay'?'Premier relayeur':'Temps individuel')} · ${escape(candidate.date)} · ${escape(candidate.club)}</small></div>
          <div><strong>${escape(candidate.time)} ${candidate.status==='equal'?'égale':'améliore'} ${escape(candidate.referenceTime)}</strong><small>${escape(candidate.referenceSwimmer)}</small></div>
          <div><span>${escape(labels[candidate.state]||candidate.state)}${candidate.requiresReview?' — à réexaminer après modification de la source':''}${candidate.publishedRevision?` · version ${escape(candidate.publishedRevision)}`:''}</span>
          ${current&&canManage()&&['pending','accepted','rejected'].includes(candidate.state)?`<div class="competition-import-actions">${['pending','accepted','rejected'].filter(state=>state!==candidate.state).map(state=>`<button type="button" data-import-record-command="decision" data-candidate-id="${escape(candidate.id)}" data-candidate-state="${state}">${state==='accepted'?'Confirmer le contrôle':state==='rejected'?'Ignorer':'Remettre à contrôler'}</button>`).join('')}${candidate.state==='accepted'?`<button type="button" data-import-record-command="draft" data-candidate-id="${escape(candidate.id)}">Préparer le brouillon Records / MPF</button>`:''}</div>`:''}</div></article>`).join('')}
          ${review.status==='ready'&&!result.total?'<p>Aucune candidature détectée parmi les performances de cet import.</p>':''}
          ${result.offset||result.hasMore?`<div class="competition-import-actions"><button type="button" data-import-record-command="read" data-offset="${Math.max(0,result.offset-50)}"${!result.offset?' disabled':''}>Précédent</button><span>${result.offset+1}–${Math.min(result.offset+50,result.total)} / ${result.total}</span><button type="button" data-import-record-command="read" data-offset="${result.offset+50}"${!result.hasMore?' disabled':''}>Suivant</button></div>`:''}`:''}
        </section>`;
    }
    function repaint(importId){const item=items.find(item=>item.importId===importId),section=host.querySelector(`[data-native-record-review="${importId}"]`);if(item&&section)section.outerHTML=render(item);}
    async function open(importId,action='read',extra={}){
      if(busy)return;busy=true;
      const row=host.querySelector(`[data-import-id="${importId}"]`);if(row)row.open=true;
      const controls=[...host.querySelectorAll('[data-import-record-command]')].map(button=>[button,button.disabled]);controls.forEach(([button])=>button.disabled=true);
      try{
        const result=await call('updateCompetitionImportRecordAlertDecision',{importId,action,...extra});
        if(result.draft){await onDraft(result.draft);return;}
        cache.set(importId,result);
      }catch(error){cache.set(importId,{error:error.message||String(error)});}
      finally{busy=false;repaint(importId);controls.forEach(([button,disabled])=>{if(button.isConnected)button.disabled=disabled;});}
    }
    host.addEventListener('click',event=>{
      const button=event.target.closest('[data-import-record-command]'),section=button?.closest('[data-native-record-review]');if(!section)return;
      open(section.dataset.nativeRecordReview,button.dataset.importRecordCommand,{candidateId:button.dataset.candidateId,state:button.dataset.candidateState,offset:Number(button.dataset.offset||0)});
    });
    return {render,open,reset(next){items=next;cache.clear();}};
  }
  global.LivePalmesImportRecordReview={create};
})(window);

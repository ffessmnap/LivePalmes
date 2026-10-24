(function attachImportSwimmerReview(global) {
  "use strict";
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const states={matched:["Rapprochés","Identité rapprochée"],review:["À rapprocher","À vérifier"],unknown:["Inconnus","Aucun profil retrouvé"]};
  const issueLabels={
    'club-difference-unconfirmed':'Club différent à confirmer dans la fiche du nageur.',
    'first-relay-incomplete':'Premier relayeur : identité, catégorie individuelle ou temps initial manquant, ambigu ou incohérent.',
    'native-duration-review-required':'Temps avec heures : encodage NAP à vérifier.',
    'unsupported-course':'Correspondance de l’épreuve avec NAP à vérifier.',
    'conflicting-swimmer-bindings':'Des profils différents ont été choisis pour une même identité.',
    'competition-date-mismatch':'La date du fichier diffère de celle de la compétition NAP.',
    'competition-pool-mismatch':'Le champ bassin du fichier diffère de NAP ; en eau libre, vérifier la fiche et les épreuves.',
    'competition-timing-mismatch':'Le chronométrage manque ou diffère de celui de la compétition.',
    'invalid-points-or-rank':'Points ou classement invalides.',
    'duplicate-relay-member':'Un même nageur apparaît plusieurs fois dans ce relais.',
    'multiple-competitions':'Le fichier contient plusieurs compétitions.',
    'unsupported-record':'Cette ligne du fichier n’est pas reconnue.',
    'incomplete-result':'La ligne de résultat est incomplète.',
    'unknown-status':'Le statut manque ou n’est pas reconnu.',
    'missing-or-invalid-final-time':'Le temps final manque ou est invalide.',
    'missing-result-reference':'Le club, la course ou la catégorie manque.',
    'incomplete-swimmer-identity':'L’identité du nageur est incomplète.',
    'missing-competition':'La date ou le nom de la compétition manque.'
  };
  let open=new Map(),searches=new Map(),pending=new Map(),page=0,diffPage=0,relayPage=0;
  function time(value) { const s=String(value??'');if(!/^\d{5,6}$/.test(s))return s;return `${Number(s.slice(0,-4))}:${s.slice(-4,-2)}.${s.slice(-2)}`; }
  function birth(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):value; }
  function reset(){open=new Map();searches=new Map();pending=new Map();page=0;diffPage=0;relayPage=0;}
  function profile(p) {
    if(!p)return '<p>Aucun profil NAP choisi.</p>';
    return `<strong>${escape(p.lastName)} ${escape(p.firstName)}</strong><p>Né(e) le ${escape(birth(p.birthDate))} — ${escape(p.sex)}<br>Club actuel : ${escape(p.clubCode||p.club||p.clubName||'non renseigné')} ${escape(p.clubName||'')}<br>Identifiant NAP : ${escape(p.id)}<br>Lignes de performances en base (passages inclus) : ${p.performanceCount==null?'non calculées (lecture plafonnée ou recherche complémentaire)':Number(p.performanceCount)}</p>`;
  }
  function candidates(key,items) {
    return items.map(p=>`<article class="import-profile-option">${profile(p)}<button type="button" class="ghost-button" data-review-pick="${escape(JSON.stringify([key,Number(p.id)]))}">Choisir ce nageur</button></article>`).join('');
  }
  function search(key,items) {
    const extra=searches.get(key)||[];
    return `<details><summary>Choisir ou rechercher un profil NAP</summary><div class="import-profile-list">${candidates(key,items)}</div><label>Nom, prénom ou identifiant NAP<input type="search" maxlength="80" minlength="2" data-review-query="${escape(key)}"></label><button type="button" class="ghost-button" data-review-search="${escape(key)}">Rechercher dans NAP</button><div data-review-search-results="${escape(key)}" aria-live="polite">${candidates(key,extra)}</div></details>`;
  }
  function diffHtml(diff,payload,result) {
    if(!diff)return '<p>Le bilan détaillé de remplacement sera disponible après résolution des rapprochements et alertes.</p>';
    const s=diff.summary;
    const label=r=>`${r.kind||'Statut'} — nageur ${r.swimmerId||'relais'} — ${r.course} — ${time(r.time||r.status)} — club ${r.clubId||r.club||''}${r.members?' — membres '+r.members.join(', '):''}`;
    const lists=[['Ajouts',diff.additions||[]],['Retraits',diff.removals||[]],['Statuts ajoutés',diff.statusAdditions||[]],['Statuts retirés',diff.statusRemovals||[]]];
    const pages=Math.max(1,...lists.map(([,rows])=>Math.ceil(rows.length/100)),Math.ceil((diff.changes?.length||0)/100));diffPage=Math.min(diffPage,pages-1);
    return `<details class="import-replacement" open><summary>${diff.identical?'Résultats identiques — remplacement inutile':diff.hasExisting?'Remplacement des résultats existants à contrôler':'Premier import — aucun résultat existant'}</summary>
      <p>Individuels : ${s.individual.additions} ajouts, ${s.individual.removals} retraits, ${s.individual.unchanged} inchangés. Relais : ${s.relays.additions} ajouts, ${s.relays.removals} retraits, ${s.relays.unchanged} inchangés. ${s.changes||0} modification(s) appariée(s), incluses dans les ajouts/retraits.</p>
      <p>L’ancienne version ne sera pas supprimée au dépôt du ZIP. Un futur remplacement exigera sauvegarde et nouvelle vérification de l’état courant. Aucun remplacement n’est exécuté dans cet aperçu.</p>
      ${lists.map(([title,rows])=>`<details><summary>${title} (${rows.length})</summary>${rows.slice(diffPage*100,(diffPage+1)*100).map(r=>`<p>${escape(label(r))}</p>`).join('')}</details>`).join('')}
      <details><summary>Modifications appariées (${diff.changes?.length||0})</summary>${(diff.changes||[]).slice(diffPage*100,(diffPage+1)*100).map(c=>`<p>Avant : ${escape(label(c.before))}<br>Après : ${escape(label(c.after))}</p>`).join('')}</details>
      <p>Inventaire : page ${diffPage+1}/${pages}. Le rapport contient la totalité des différences.</p><button type="button" class="ghost-button" data-diff-page="-1" ${diffPage===0?'disabled':''}>Différences précédentes</button> <button type="button" class="ghost-button" data-diff-page="1" ${diffPage+1===pages?'disabled':''}>Différences suivantes</button>
      ${diff.requiresReplacementConfirmation?`<label class="import-club-alert"><input type="checkbox" data-review-replacement ${!result.reviewReady?'disabled':''} ${payload.confirmReplacement&&payload.replacementReviewFingerprint===result.previewFingerprint?'checked':''}> J’approuve les ajouts, modifications et retraits affichés pour cet aperçu de remplacement.</label>`:''}</details>`;
  }
  function render({result,payload,host,summary,onChange,onRefresh,onSearch}) {
    const remember=()=>host.querySelectorAll('details[data-review-open]').forEach(el=>open.set(el.dataset.reviewOpen,el.open));
    const review=result.review,profiles=new Map((review?.profiles||[]).map(p=>[p.id,p]));
    const groups=(review?.groups||[]).map(g=>({...g,candidates:(g.candidateIds||[]).map(id=>profiles.get(id)).filter(Boolean)})),total=Math.max(1,Math.ceil(groups.length/100));page=Math.min(page,total-1);
    const visible=groups.slice(page*100,(page+1)*100);
    summary.textContent=`${result.metadata?.competitionName||'Résultats WinPalme'} — ${review?groups.length+' nageurs':'choisir une compétition pour rapprocher les nageurs'} — contrôle national, sans écriture`;
    const person=g=>{
      const selected=pending.get(g.id)||g.profile;
      const status=pending.has(g.id)?'review':g.state;
      return `<details class="import-swimmer" data-state="${status}" data-review-open="${g.id}" ${open.get(g.id)?'open':''}><summary>${escape(g.source.lastName)} ${escape(g.source.firstName)} — ${g.performances.length} résultat(s) — ${states[status][1]}${g.manual?' (choix national)':''}${g.clubAlerts.length?' — alerte de club':''}</summary>
        <div class="import-profile-comparison"><article><h4>Dans le fichier</h4><strong>${escape(g.source.lastName)} ${escape(g.source.firstName)}</strong><p>Né(e) le ${escape(birth(g.source.birthDate))} — ${escape(g.source.sex)}<br>Club(s) représenté(s) : ${escape(g.clubs.map(c=>`${c.code} ${c.name}`).join(' ; '))}</p></article><article><h4>Profil NAP ${pending.has(g.id)?'à vérifier':'retenu'}</h4>${profile(selected)}</article></div>
        ${search(g.id,g.candidates)}
        ${g.clubAlerts.map(a=>`<label class="import-club-alert"><input type="checkbox" data-review-ack="${a.key}" ${a.confirmed?'checked':''} ${!a.id?'disabled':''}> Club différent : ${escape(a.code)} dans le fichier, ${escape(g.profile?.clubCode||g.profile?.clubId)} actuellement dans NAP. Je confirme le club représenté pour cette compétition.${!a.id?' Rattacher d’abord le club importé.':''}</label>`).join('')}
        <details><summary>Performances et passages (${g.performances.length})</summary><ul>${g.performances.map(r=>`<li>${escape(r.course)} — ${escape(time(r.time))} — ${escape(r.status)} — club ${escape(r.clubCode)} — ${r.origin==='first-relay'?'Premier relayeur':r.origin==='passage'?'Temps de passage':'Course individuelle'}</li>`).join('')}</ul></details></details>`;
    };
    host.classList.add('import-grouped-review');
    host.innerHTML=`<p role="status" data-review-status>${pending.size||result.reviewStale?'Choix modifiés : actualiser l’aperçu pour les vérifier.':result.reviewReady?'Rapprochements contrôlés pour cet aperçu. Aucun résultat ni PDF enregistré.':'Contrôle national en cours : résoudre les rapprochements et les alertes.'}</p>
      ${result.requiresCompetitionChoice?`<label>Compétition existante<select data-review-competition><option value="">Choisir la compétition</option>${result.competitions.map(c=>`<option value="${c.id}">${escape(c.libelle)} — ${escape(c.lieu)} (${c.id})</option>`).join('')}</select></label>`:`<p>Compétition NAP : ${escape(result.competition?.libelle)} (${Number(result.competition?.id)})</p>`}
      ${(result.issues||[]).slice(0,100).map(i=>`<p class="import-club-alert">${i.sourceLine?'Ligne '+i.sourceLine+' : ':''}${escape(issueLabels[i.code]||i.code)}</p>`).join('')}
      ${Object.entries(states).map(([state,[label]])=>`<details class="import-swimmer-group" data-state="${state}" data-review-open="group:${state}" ${(open.get('group:'+state)??state!=='matched')?'open':''}><summary>${label} (${groups.filter(g=>g.state===state).length})</summary>${visible.filter(g=>g.state===state).map(person).join('')||'<p>Aucun nageur de ce groupe sur cette page.</p>'}</details>`).join('')}
      <p>Nageurs : page ${page+1}/${total}</p><button type="button" class="ghost-button" data-review-page="-1" ${page===0?'disabled':''}>Nageurs précédents</button> <button type="button" class="ghost-button" data-review-page="1" ${page+1===total?'disabled':''}>Nageurs suivants</button>
      <details><summary>Clubs à rattacher (${result.unresolvedClubs?.length||0})</summary>${(result.unresolvedClubs||[]).slice(0,20).map(c=>`<label>Club importé ${escape(c.code)}<select data-review-club="${escape(c.code)}"><option value="">Choisir un club NAP</option>${(result.clubs||[]).map(p=>`<option value="${p.id}" ${(payload.clubBindings||[]).some(b=>b.code===c.code&&b.clubId===p.id)?'selected':''}>${escape(p.code)} — ${escape(p.name)} — ${escape(p.federalNumber)}</option>`).join('')}</select></label>`).join('')} ${(result.unresolvedClubs?.length||0)>20?'<p>Résoudre ces vingt clubs puis actualiser pour afficher la suite.</p>':''}</details>
      <details data-review-open="relays" ${open.get('relays')?'open':''}><summary>Relais (${review?.relays?.length||0})</summary>${(review?.relays||[]).slice(relayPage*50,(relayPage+1)*50).map(r=>`<details><summary>${escape(r.course)} — ${escape(r.clubCode)} — ${escape(r.time)}</summary>${r.members.map(m=>`<article><h4>Relayeur ${m.position}</h4>${profile(m.profile)}${search(`member:${r.sourceLine}:${m.position}`,m.profile?[m.profile]:[])}</article>`).join('')}</details>`).join('')}<p>Page relais ${relayPage+1}/${Math.max(1,Math.ceil((review?.relays?.length||0)/50))}</p><button type="button" class="ghost-button" data-relay-page="-1" ${relayPage===0?'disabled':''}>Relais précédents</button><button type="button" class="ghost-button" data-relay-page="1" ${(relayPage+1)*50>=(review?.relays?.length||0)?'disabled':''}>Relais suivants</button></details>
      <details><summary>Lignes explicitement sans résultat</summary>${result.rows.filter(r=>!r.status&&!r.time).map(r=>`<label><input type="checkbox" data-review-exclude="${r.sourceLine}" ${(payload.excludedSourceLines||[]).includes(r.sourceLine)?'checked':''}> Écarter la ligne ${r.sourceLine} sans statut ni temps</label>`).join('')}</details>
      ${review?diffHtml(result.diff,payload,result):''}
      <button type="button" class="ghost-button" data-review-refresh>Actualiser l’aperçu avec mes choix</button><button type="button" class="primary-button" data-nap-save disabled>Aperçu uniquement — enregistrement désactivé</button>`;
    const redraw=()=>{remember();render({result,payload,host,summary,onChange,onRefresh,onSearch});};
    const invalidate=()=>{payload.confirmReplacement=false;payload.replacementReviewFingerprint='';onChange();const checkbox=host.querySelector('[data-review-replacement]');if(checkbox){checkbox.checked=false;checkbox.disabled=true;}host.querySelector('[data-review-status]').textContent='Choix modifiés : actualiser l’aperçu pour les vérifier.';};
    const wirePicks=()=>host.querySelectorAll('[data-review-pick]').forEach(button=>button.onclick=()=>{
      const [key,id]=JSON.parse(button.dataset.reviewPick);
      if(key.startsWith('member:')) { const [,line,position]=key.split(':').map(Number);payload.memberBindings=(payload.memberBindings||[]).filter(b=>b.sourceLine!==line||b.position!==position);payload.memberBindings.push({sourceLine:line,position,swimmerId:id}); }
      else {const g=groups.find(g=>g.id===key);payload.swimmerBindings=(payload.swimmerBindings||[]).filter(b=>!g.sourceLines.includes(b.sourceLine));payload.swimmerBindings.push(...g.sourceLines.map(sourceLine=>({sourceLine,swimmerId:id})));pending.set(key,[...g.candidates,...(searches.get(key)||[])].find(p=>Number(p.id)===id));}
      payload.clubAcknowledgements=[];invalidate();redraw();
    });
    wirePicks();
    host.querySelectorAll('[data-review-search]').forEach(button=>button.onclick=async()=>{
      const key=button.dataset.reviewSearch,input=[...host.querySelectorAll('[data-review-query]')].find(el=>el.dataset.reviewQuery===key),target=[...host.querySelectorAll('[data-review-search-results]')].find(el=>el.dataset.reviewSearchResults===key);
      button.disabled=true;
      try{const rows=await onSearch(input.value);if(!button.isConnected)return;searches.set(key,rows);target.innerHTML=rows.length?candidates(key,rows):'<p>Aucun profil trouvé. Précisez la recherche ou vérifiez la fiche dans Mes nageurs.</p>';wirePicks();}catch(error){target.textContent=error.message;}finally{button.disabled=false;}
    });
    host.querySelector('[data-review-competition]')?.addEventListener('change',e=>{payload.competitionId=Number(e.target.value)||undefined;invalidate();});
    host.querySelectorAll('[data-review-club]').forEach(el=>el.onchange=()=>{payload.clubBindings=(payload.clubBindings||[]).filter(b=>b.code!==el.dataset.reviewClub);if(el.value)payload.clubBindings.push({code:el.dataset.reviewClub,clubId:el.value});payload.clubAcknowledgements=[];invalidate();});
    host.querySelectorAll('[data-review-ack]').forEach(el=>el.onchange=()=>{const set=new Set(payload.clubAcknowledgements||[]);if(el.checked)set.add(el.dataset.reviewAck);else set.delete(el.dataset.reviewAck);payload.clubAcknowledgements=[...set];invalidate();});
    host.querySelectorAll('[data-review-exclude]').forEach(el=>el.onchange=()=>{const set=new Set(payload.excludedSourceLines||[]);if(el.checked)set.add(Number(el.dataset.reviewExclude));else set.delete(Number(el.dataset.reviewExclude));payload.excludedSourceLines=[...set];invalidate();});
    host.querySelector('[data-review-replacement]')?.addEventListener('change',e=>{payload.confirmReplacement=e.target.checked;payload.replacementReviewFingerprint=e.target.checked?result.previewFingerprint:'';});
    host.querySelectorAll('[data-review-page]').forEach(el=>el.onclick=()=>{page+=Number(el.dataset.reviewPage);redraw();});
    host.querySelectorAll('[data-diff-page]').forEach(el=>el.onclick=()=>{diffPage+=Number(el.dataset.diffPage);redraw();});
    host.querySelectorAll('[data-relay-page]').forEach(el=>el.onclick=()=>{relayPage+=Number(el.dataset.relayPage);redraw();});
    host.querySelector('[data-review-refresh]').onclick=async()=>{remember();await onRefresh();};
  }
  global.LivePalmesImportReview={render,reset,settled:()=>pending.clear()};
})(window);

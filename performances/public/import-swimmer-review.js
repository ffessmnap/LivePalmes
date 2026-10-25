(function attachImportSwimmerReview(global) {
  "use strict";
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const states={matched:["Rapprochés","Identité rapprochée"],review:["À rapprocher","À vérifier"],unknown:["Inconnus","Aucun profil retrouvé"]};
  const issueLabels={
    'club-difference-unconfirmed':'Club différent à confirmer dans la fiche du nageur.',
    'source-club-unresolved':'Le club du fichier doit être rattaché à un club NAP avant de vérifier une éventuelle différence de club.',
    'first-relay-incomplete':'Premier relayeur : identité, catégorie individuelle ou temps initial manquant, ambigu ou incohérent.',
    'relay-binding-conflict':'Le profil choisi dans le relais diffère de la fiche du nageur. Reprendre le choix depuis cette fiche pour l’appliquer à toutes ses épreuves.',
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
  let open=new Map(),searches=new Map(),pending=new Map(),clubSearches=new Map(),courseSearches=new Map(),page=0,diffPage=0,relayPage=0,coursePage=0;
  function time(value) { const s=String(value??'');if(!/^\d{5,6}$/.test(s))return s;return `${Number(s.slice(0,-4))}:${s.slice(-4,-2)}.${s.slice(-2)}`; }
  function birth(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):value; }
  function reset(){open=new Map();searches=new Map();pending=new Map();clubSearches=new Map();courseSearches=new Map();page=0;diffPage=0;relayPage=0;coursePage=0;global.LivePalmesImportSwimmerCreation?.reset();}
  const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function courseOptions(result,payload,source,query=''){
    const binding=(payload.courseBindings||[]).find(b=>b.sourceCode===source.sourceCode),chosen=binding?.courseId||'';
    const words=fold(query).trim().split(/\s+/).filter(Boolean),all=(result.courseReview?.courses||[]).filter(c=>source.candidateIds.includes(c.id)).sort((a,b)=>a.label.localeCompare(b.label,'fr',{sensitivity:'base',numeric:true})||a.code.localeCompare(b.code,'fr',{numeric:true}));
    const filtered=all.filter(c=>words.every(word=>fold([c.label,c.code,c.longDistance?'longue distance eau libre':'',c.kind==='REL'?'relais':'individuelle'].join(' ')).includes(word)));
    const option=c=>`<option value="${escape(c.id)}" ${chosen===c.id?'selected':''}>${escape(c.label)} — code NAP ${escape(c.code)}${c.longDistance?' — longue distance':''}${!c.active?' — historique':''}</option>`;
    const selected=all.find(c=>c.id===chosen);
    return {count:filtered.length,html:'<option value="">Choisir une épreuve NAP</option>'+(selected&&!filtered.includes(selected)?`<optgroup label="Choix actuel (hors recherche)">${option(selected)}</optgroup>`:'')+filtered.map(option).join('')};
  }
  function coursesHtml(result,payload){
    const sources=result.courseReview?.sources;if(!sources?.length)return '';
    const pages=Math.ceil(sources.length/20);coursePage=Math.min(coursePage,pages-1);
    return `<details data-review-open="courses" ${(open.get('courses')??sources.some(s=>!s.selectedId))?'open':''}><summary>Épreuves à rattacher (${sources.filter(s=>!s.selectedId).length})</summary><p>Choisir l’épreuve NAP pour toutes les lignes de chaque code du fichier, puis actualiser l’aperçu. Aucun rapprochement sportif n’est déduit automatiquement.</p>${sources.slice(coursePage*20,(coursePage+1)*20).map(s=>{const query=courseSearches.get(s.sourceCode)||'',options=courseOptions(result,payload,s,query);return `<section><h4>Épreuve du fichier : ${escape(s.sourceCode)} — ${s.count} résultat(s)</h4>${s.targetCode?`<p>Correspondance vérifiée dans cet aperçu : ${escape(s.sourceCode)} → ${escape(s.targetCode)}.</p>`:''}<label>Rechercher une épreuve par nom, distance ou code NAP<input type="search" data-review-course-search="${escape(s.sourceCode)}" value="${escape(query)}" placeholder="Ex. 2000, bi-palmes, 4000BI"></label><p data-review-course-count="${escape(s.sourceCode)}">${options.count} épreuve(s) compatible(s) avec le type et le sexe des lignes.</p><label>Choisir l’épreuve NAP<select data-review-course="${escape(s.sourceCode)}">${options.html}</select></label></section>`;}).join('')}<p>Épreuves : page ${coursePage+1}/${pages}</p><button type="button" class="ghost-button" data-course-page="-1" ${coursePage===0?'disabled':''}>Épreuves précédentes</button><button type="button" class="ghost-button" data-course-page="1" ${coursePage+1===pages?'disabled':''}>Épreuves suivantes</button></details>`;
  }
  function clubOptions(result,payload,code,query='') {
    const source=(result.sourceClubs||[]).find(c=>c.code===code),chosen=(payload.clubBindings||[]).find(c=>c.code===code)?.clubId;
    const clubs=[...(result.clubs||[])].sort((a,b)=>String(a.name||a.code).localeCompare(String(b.name||b.code),'fr',{sensitivity:'base',numeric:true})||String(a.id).localeCompare(String(b.id)));
    const words=fold(query).trim().split(/\s+/).filter(Boolean),filtered=clubs.filter(c=>words.every(word=>fold([c.name,c.code,c.federalNumber,c.id].join(' ')).includes(word)));
    const proposed=filtered.filter(c=>fold(c.code).trim()===fold(code).trim()||source?.federalNumber&&c.federalNumber===source.federalNumber),ids=new Set(proposed.map(c=>c.id)),other=filtered.filter(c=>!ids.has(c.id));
    const option=c=>`<option value="${escape(c.id)}" ${String(chosen)===String(c.id)?'selected':''}>${escape(c.name||c.code)} — ${escape(c.code)} — ${escape(c.federalNumber||'numéro fédéral absent')}</option>`;
    const selected=clubs.find(c=>String(c.id)===String(chosen));
    return {html:'<option value="">Choisir un club NAP</option>'+(selected&&!filtered.includes(selected)?`<optgroup label="Choix actuel (hors recherche)">${option(selected)}</optgroup>`:'')+(proposed.length?`<optgroup label="Correspondances proposées">${proposed.map(option).join('')}</optgroup>`:'')+(other.length?`<optgroup label="Autres clubs — ordre alphabétique">${other.map(option).join('')}</optgroup>`:''),count:filtered.length,proposed:proposed.length};
  }
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
  function render({result,payload,host,summary,onChange,onRefresh,onSearch,onPreviewCreation,onCreateSwimmer}) {
    const renderAgain=()=>render({result,payload,host,summary,onChange,onRefresh,onSearch,onPreviewCreation,onCreateSwimmer});
    const remember=()=>host.querySelectorAll('details[data-review-open]').forEach(el=>open.set(el.dataset.reviewOpen,el.open));
    const review=result.review,profiles=new Map((review?.profiles||[]).map(p=>[p.id,p]));
    const groups=(review?.groups||[]).map(g=>({...g,candidates:(g.candidateIds||[]).map(id=>profiles.get(id)).filter(Boolean)})),total=Math.max(1,Math.ceil(groups.length/100));page=Math.min(page,total-1);
    const visible=groups.slice(page*100,(page+1)*100);
    summary.textContent=`${result.metadata?.competitionName||'Résultats WinPalme'} — ${review?groups.length+' nageurs':'choisir une compétition pour rapprocher les nageurs'} — contrôle national, résultats en aperçu`;
    const person=g=>{
      const selected=pending.get(g.id)||g.profile;
      const status=pending.has(g.id)?'review':g.state;
      return `<details class="import-swimmer" data-state="${status}" data-review-open="${g.id}" ${open.get(g.id)?'open':''}><summary>${escape(g.source.lastName)} ${escape(g.source.firstName)} — ${g.performances.length} résultat(s) — ${states[status][1]}${g.manual?' (choix national)':''}${g.clubAlerts.length?' — alerte de club':''}</summary>
        <div class="import-profile-comparison"><article><h4>Dans le fichier</h4><strong>${escape(g.source.lastName)} ${escape(g.source.firstName)}</strong><p>Né(e) le ${escape(birth(g.source.birthDate))} — ${escape(g.source.sex)}<br>Club(s) représenté(s) : ${escape(g.clubs.map(c=>`${c.code} ${c.name}`).join(' ; '))}</p></article><article><h4>Profil NAP ${pending.has(g.id)?'à vérifier':'retenu'}</h4>${profile(selected)}</article></div>
        ${search(g.id,g.candidates)}
        ${g.state==='unknown'&&!selected?`<button type="button" class="ghost-button" data-review-create="${g.id}">Créer un nageur après vérification</button><div data-review-creation="${g.id}"></div>`:''}
        ${g.clubAlerts.map(a=>`<label class="import-club-alert"><input type="checkbox" data-review-ack="${a.key}" ${a.confirmed?'checked':''} ${!a.id?'disabled':''}> Club différent : ${escape(a.code)} dans le fichier, ${escape(g.profile?.clubCode||g.profile?.clubId)} actuellement dans NAP. Je confirme le club représenté pour cette compétition.${!a.id?' Rattacher d’abord le club importé.':''}</label>`).join('')}
        <details><summary>Performances et passages (${g.performances.length})</summary><ul>${g.performances.map(r=>`<li>${r.sourceCourse?escape(r.sourceCourse)+' → ':''}${escape(r.course)} — ${escape(time(r.time))} — ${escape(r.status)} — club ${escape(r.clubCode)} — ${r.origin==='first-relay'?'Premier relayeur':r.origin==='passage'?'Temps de passage':'Course individuelle'}</li>`).join('')}</ul></details></details>`;
    };
    host.classList.add('import-grouped-review');
    host.innerHTML=`<p role="status" data-review-status>${pending.size||result.reviewStale?'Choix modifiés : actualiser l’aperçu pour les vérifier.':result.reviewReady?'Rapprochements contrôlés pour cet aperçu. Aucun résultat ni PDF enregistré.':'Contrôle national en cours : résoudre les rapprochements et les alertes.'}</p>
      ${result.requiresCompetitionChoice?`<label>Compétition existante<select data-review-competition><option value="">Choisir la compétition</option>${result.competitions.map(c=>`<option value="${c.id}">${escape(c.libelle)} — ${escape(c.lieu)} (${c.id})</option>`).join('')}</select></label>`:`<p>Compétition NAP : ${escape(result.competition?.libelle)} (${Number(result.competition?.id)})</p>`}
      ${review?'<button type="button" class="ghost-button" data-prepare-confirmation '+(result.reviewStale?'disabled':'')+'>Préparer un message pour l’informatique</button><div data-confirmation-host></div>':''}
      ${(result.issues||[]).map(i=>global.LivePalmesImportConfirmation?.visibleIssue(result,i)??(global.LivePalmesImportConfirmation?null:i)).filter(Boolean).slice(0,100).map((i,index)=>{
        const label=global.LivePalmesImportConfirmation?.describeIssue(result,i)||issueLabels[i.code]||i.code;
        const group=groups.find(g=>g.id===i.groupId||(i.context?.relatedSourceLines||[]).some(line=>g.sourceLines.includes(line)));
        return `<div class="import-club-alert"><p>${escape(label)}</p><small>Repère dans le fichier TXT : ${i.sourceLine?'ligne '+i.sourceLine:'en-tête'}</small>${group?` <button type="button" class="ghost-button" data-issue-person="${group.id}">Voir le nageur</button>`:''}${i.code==='source-club-unresolved'?` <button type="button" class="ghost-button" data-issue-club="${escape(i.context?.clubCode||'')}">Choisir le club</button>`:''}${i.code==='unmapped-course'?` <button type="button" class="ghost-button" data-issue-course="${escape(i.context?.sourceCode||'')}">Choisir l’épreuve</button>`:''}${i.code==='first-relay-incomplete'?` <button type="button" class="ghost-button" data-issue-relay="${i.sourceLine}">Voir le relais</button>`:''}</div>`;
      }).join('')}
      ${Object.entries(states).map(([state,[label]])=>`<details class="import-swimmer-group" data-state="${state}" data-review-open="group:${state}" ${(open.get('group:'+state)??state!=='matched')?'open':''}><summary>${label} (${groups.filter(g=>g.state===state).length})</summary>${visible.filter(g=>g.state===state).map(person).join('')||'<p>Aucun nageur de ce groupe sur cette page.</p>'}</details>`).join('')}
      <p>Nageurs : page ${page+1}/${total}</p><button type="button" class="ghost-button" data-review-page="-1" ${page===0?'disabled':''}>Nageurs précédents</button> <button type="button" class="ghost-button" data-review-page="1" ${page+1===total?'disabled':''}>Nageurs suivants</button>
      ${coursesHtml(result,payload)}
      <details data-review-open="clubs" ${open.get('clubs')?'open':''}><summary>Clubs à rattacher (${result.unresolvedClubs?.length||0})</summary>${(result.unresolvedClubs||[]).slice(0,20).map(c=>{const query=clubSearches.get(c.code)||'',options=clubOptions(result,payload,c.code,query);return `<section><h4>Club du fichier : ${escape(c.code)}</h4><label>Rechercher par nom, abréviation ou numéro fédéral<input type="search" data-review-club-search="${escape(c.code)}" value="${escape(query)}" placeholder="Ex. Lorient, CSL, 03560008"></label><p data-review-club-count="${escape(c.code)}">${options.count} club(s), dont ${options.proposed} correspondance(s) proposée(s).</p><label>Choisir le club représenté<select data-review-club="${escape(c.code)}">${options.html}</select></label></section>`;}).join('')} ${(result.unresolvedClubs?.length||0)>20?'<p>Résoudre ces vingt clubs puis actualiser pour afficher la suite.</p>':''}</details>
      <details data-review-open="relays" ${open.get('relays')?'open':''}><summary>Relais (${review?.relays?.length||0})</summary>${(review?.relays||[]).slice(relayPage*50,(relayPage+1)*50).map(r=>`<details data-review-open="relay:${r.sourceLine}" ${open.get('relay:'+r.sourceLine)?'open':''}><summary>${escape(r.course)} — ${escape(r.clubCode)} — ${escape(r.time)}</summary>${r.members.map(m=>`<article><h4>Relayeur ${m.position}</h4>${m.source?`<p>Dans le fichier : ${escape(m.source.lastName)} ${escape(m.source.firstName)} — ${escape(birth(m.source.birthDate))} — ${escape(m.source.clubCode)}</p>`:''}${profile(pending.get(m.sourceGroupId)||m.profile)}${pending.has(m.sourceGroupId)?'<p>Profil déjà choisi dans la fiche du nageur : actualiser l’aperçu pour le vérifier et le reprendre dans le relais.</p>':m.profile?'<p>Profil NAP identifié : aucune nouvelle sélection nécessaire.</p>':'<p>Le profil NAP reste à rapprocher.</p>'}${m.sourceGroupId?`<button type="button" class="ghost-button" data-issue-person="${m.sourceGroupId}">${m.profile?'Voir la fiche du nageur':'Rapprocher depuis la fiche du nageur'}</button>`:m.profile?`<details><summary>Modifier exceptionnellement le relayeur</summary>${search(`member:${r.sourceLine}:${m.position}`,[m.profile])}</details>`:search(`member:${r.sourceLine}:${m.position}`,[])}</article>`).join('')}</details>`).join('')}<p>Page relais ${relayPage+1}/${Math.max(1,Math.ceil((review?.relays?.length||0)/50))}</p><button type="button" class="ghost-button" data-relay-page="-1" ${relayPage===0?'disabled':''}>Relais précédents</button><button type="button" class="ghost-button" data-relay-page="1" ${(relayPage+1)*50>=(review?.relays?.length||0)?'disabled':''}>Relais suivants</button></details>
      <details><summary>Lignes explicitement sans résultat</summary>${result.rows.filter(r=>!r.status&&!r.time).map(r=>`<label><input type="checkbox" data-review-exclude="${r.sourceLine}" ${(payload.excludedSourceLines||[]).includes(r.sourceLine)?'checked':''}> Écarter la ligne ${r.sourceLine} sans statut ni temps</label>`).join('')}</details>
      ${review?diffHtml(result.diff,payload,result):''}
      <button type="button" class="ghost-button" data-review-refresh>Actualiser l’aperçu avec mes choix</button><button type="button" class="primary-button" data-nap-save disabled>Aperçu uniquement — enregistrement désactivé</button>`;
    const redraw=()=>{remember();renderAgain();};
    const invalidate=()=>{payload.confirmReplacement=false;payload.replacementReviewFingerprint='';onChange();const checkbox=host.querySelector('[data-review-replacement]');if(checkbox){checkbox.checked=false;checkbox.disabled=true;}const prepare=host.querySelector('[data-prepare-confirmation]');if(prepare)prepare.disabled=true;const message=host.querySelector('[data-confirmation-host]');if(message)message.replaceChildren();host.querySelector('[data-review-status]').textContent='Choix modifiés : actualiser l’aperçu pour les vérifier.';};
    host.querySelector('[data-prepare-confirmation]')?.addEventListener('click',()=>{
      const target=host.querySelector('[data-confirmation-host]');
      if(result.reviewStale)return;
      if(!global.LivePalmesImportConfirmation){target.textContent='Rechargez le portail pour préparer le message.';return;}
      const message=global.LivePalmesImportConfirmation.build(result);
      if(!message.count){target.textContent='Aucun cas d’identification, de club ou de relais à transmettre. Les éventuels contrôles techniques restent dans l’analyse.';return;}
      target.innerHTML='<section class="import-confirmation-message"><h4>Message à relire avant envoi</h4><p>Aucun mail n’est envoyé par le portail. Le message reprend les cas non résolus de tout l’aperçu, y compris les groupes repliés et les autres pages. Les formats techniques à traiter côté national restent dans l’analyse.</p><label>Objet et message<textarea rows="14" readonly data-confirmation-text></textarea></label><button type="button" class="ghost-button" data-confirmation-copy>Copier le message</button><button type="button" class="ghost-button" data-confirmation-download>Télécharger le message (.txt)</button><p data-confirmation-status role="status"></p></section>';
      const text=target.querySelector('[data-confirmation-text]'),status=target.querySelector('[data-confirmation-status]');text.value=message.text;
      target.querySelector('[data-confirmation-copy]').onclick=async()=>{try{if(!global.navigator?.clipboard?.writeText)throw Error('clipboard unavailable');await global.navigator.clipboard.writeText(text.value);status.textContent='Message copié. Relisez-le dans votre messagerie avant l’envoi.';}catch{text.focus();text.select();status.textContent='Sélectionnez Copier dans le menu de votre appareil ou utilisez Ctrl+C. Vous pouvez aussi télécharger le message.';}};
      target.querySelector('[data-confirmation-download]').onclick=()=>{const url=global.URL.createObjectURL(new Blob([text.value],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='demande-confirmation-import.txt';document.body.append(link);link.click();link.remove();global.setTimeout(()=>global.URL.revokeObjectURL(url),1000);};
    });
    host.querySelectorAll('[data-issue-person]').forEach(button=>button.onclick=()=>{const index=groups.findIndex(g=>g.id===button.dataset.issuePerson);if(index<0)return;remember();const g=groups[index];page=Math.floor(index/100);open.set('group:'+g.state,true);open.set(g.id,true);renderAgain();host.querySelector(`[data-review-open="${g.id}"] > summary`)?.focus();host.querySelector(`[data-review-open="${g.id}"]`)?.scrollIntoView({block:'center'});});
    host.querySelectorAll('[data-issue-relay]').forEach(button=>button.onclick=()=>{const line=Number(button.dataset.issueRelay),index=(review?.relays||[]).findIndex(r=>r.sourceLine===line);if(index<0)return;remember();relayPage=Math.floor(index/50);open.set('relays',true);open.set('relay:'+line,true);renderAgain();host.querySelector(`[data-review-open="relay:${line}"] > summary`)?.focus();host.querySelector(`[data-review-open="relay:${line}"]`)?.scrollIntoView({block:'center'});});
    host.querySelectorAll('[data-issue-club]').forEach(button=>button.onclick=()=>{const code=button.dataset.issueClub;remember();open.set('clubs',true);renderAgain();const input=[...host.querySelectorAll('[data-review-club-search]')].find(el=>el.dataset.reviewClubSearch===code);input?.focus();input?.scrollIntoView({block:'center'});});
    const pick=(key,id)=>{
      if(key.startsWith('member:')) { const [,line,position]=key.split(':').map(Number);payload.memberBindings=(payload.memberBindings||[]).filter(b=>b.sourceLine!==line||b.position!==position);payload.memberBindings.push({sourceLine:line,position,swimmerId:id}); }
      else {const g=groups.find(g=>g.id===key);payload.swimmerBindings=(payload.swimmerBindings||[]).filter(b=>!g.sourceLines.includes(b.sourceLine));payload.swimmerBindings.push(...g.sourceLines.map(sourceLine=>({sourceLine,swimmerId:id})));const linked=new Set((review.relays||[]).flatMap(r=>r.members.filter(m=>m.sourceGroupId===g.id).map(m=>`${r.sourceLine}:${m.position}`)));payload.memberBindings=(payload.memberBindings||[]).filter(b=>!linked.has(`${b.sourceLine}:${b.position}`));pending.set(key,[...g.candidates,...(searches.get(key)||[])].find(p=>Number(p.id)===id));}
      payload.clubAcknowledgements=[];invalidate();redraw();
    };
    const wirePicks=()=>host.querySelectorAll('[data-review-pick]').forEach(button=>button.onclick=()=>pick(...JSON.parse(button.dataset.reviewPick)));
    wirePicks();
    host.querySelectorAll('[data-issue-course]').forEach(button=>button.onclick=()=>{const code=button.dataset.issueCourse,index=result.courseReview.sources.findIndex(s=>s.sourceCode===code);if(index<0)return;remember();coursePage=Math.floor(index/20);open.set('courses',true);renderAgain();const input=[...host.querySelectorAll('[data-review-course-search]')].find(el=>el.dataset.reviewCourseSearch===code);input?.focus();input?.scrollIntoView({block:'center'});});
    host.querySelectorAll('[data-review-course]').forEach(select=>select.onchange=()=>{const sourceCode=select.dataset.reviewCourse;payload.courseBindings=(payload.courseBindings||[]).filter(b=>b.sourceCode!==sourceCode);if(select.value)payload.courseBindings.push({sourceCode,courseId:select.value});invalidate();});
    host.querySelectorAll('[data-review-course-search]').forEach(input=>input.oninput=()=>{const code=input.dataset.reviewCourseSearch;courseSearches.set(code,input.value);const source=result.courseReview.sources.find(s=>s.sourceCode===code),options=courseOptions(result,payload,source,input.value),select=[...host.querySelectorAll('[data-review-course]')].find(el=>el.dataset.reviewCourse===code),count=[...host.querySelectorAll('[data-review-course-count]')].find(el=>el.dataset.reviewCourseCount===code);select.innerHTML=options.html;count.textContent=`${options.count} épreuve(s) compatible(s) avec le type et le sexe des lignes.`;});
    host.querySelectorAll('[data-course-page]').forEach(button=>button.onclick=()=>{coursePage+=Number(button.dataset.coursePage);redraw();});
    host.querySelectorAll('[data-review-create]').forEach(button=>button.onclick=()=>{
      const key=button.dataset.reviewCreate,g=groups.find(g=>g.id===key),target=host.querySelector(`[data-review-creation="${key}"]`);
      if(!searches.has(key)){target.textContent='Recherchez d’abord le nageur dans NAP, puis vérifiez les profils proposés avant d’ouvrir la création.';return;}
      if(!global.LivePalmesImportSwimmerCreation){target.textContent='Rechargez le portail pour ouvrir la création.';return;}
      const ids=[...new Set(g.clubs.map(c=>(payload.clubBindings||[]).find(b=>b.code===c.code)?.clubId||c.id).filter(Boolean).map(String))];
      global.LivePalmesImportSwimmerCreation.mount({host:target,group:g,clubs:result.clubs||[],selectedClubId:ids.length===1?ids[0]:'',onPreview:onPreviewCreation,onCreate:onCreateSwimmer,
        onPick:async p=>{searches.set(key,[...(searches.get(key)||[]).filter(c=>c.id!==p.id),p]);pick(key,p.id);await onRefresh();}});
    });
    host.querySelectorAll('[data-review-search]').forEach(button=>button.onclick=async()=>{
      const key=button.dataset.reviewSearch,input=[...host.querySelectorAll('[data-review-query]')].find(el=>el.dataset.reviewQuery===key),target=[...host.querySelectorAll('[data-review-search-results]')].find(el=>el.dataset.reviewSearchResults===key);
      button.disabled=true;
      try{const rows=await onSearch(input.value);if(!button.isConnected)return;searches.set(key,rows);target.innerHTML=rows.length?candidates(key,rows):'<p>Aucun profil trouvé. Précisez la recherche ou vérifiez la fiche dans Mes nageurs.</p>';wirePicks();}catch(error){target.textContent=error.message;}finally{button.disabled=false;}
    });
    host.querySelector('[data-review-competition]')?.addEventListener('change',e=>{payload.competitionId=Number(e.target.value)||undefined;invalidate();});
    host.querySelectorAll('[data-review-club]').forEach(el=>el.onchange=()=>{payload.clubBindings=(payload.clubBindings||[]).filter(b=>b.code!==el.dataset.reviewClub);if(el.value)payload.clubBindings.push({code:el.dataset.reviewClub,clubId:el.value});payload.clubAcknowledgements=[];invalidate();});
    host.querySelectorAll('[data-review-club-search]').forEach(input=>input.oninput=()=>{const code=input.dataset.reviewClubSearch;clubSearches.set(code,input.value);const options=clubOptions(result,payload,code,input.value),select=[...host.querySelectorAll('[data-review-club]')].find(el=>el.dataset.reviewClub===code),count=[...host.querySelectorAll('[data-review-club-count]')].find(el=>el.dataset.reviewClubCount===code);select.innerHTML=options.html;count.textContent=`${options.count} club(s), dont ${options.proposed} correspondance(s) proposée(s).`;});
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

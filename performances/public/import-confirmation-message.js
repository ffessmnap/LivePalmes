(function attachImportConfirmationMessage(global) {
  "use strict";
  const clean=v=>String(v??'').replace(/[\r\n\t\u0000-\u001f]+/g,' ').trim();
  const birth=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.split('-').reverse().join('/'):clean(v);
  const name=p=>[p?.lastName,p?.firstName].map(clean).filter(Boolean).join(' ');
  const identity=p=>`${name(p)||'Identité non renseignée'}${p?.birthDate?' — né(e) le '+birth(p.birthDate):''}`;
  const firstReasons={
    'unsupported-relay-course':'le code de l’épreuve du relais doit être vérifié',
    'missing-first-leg-time':'le temps du premier relayeur n’est pas renseigné',
    'invalid-first-leg-time':'le temps du premier relayeur est invalide',
    'first-leg-time-exceeds-final':'le temps du premier relayeur est supérieur ou égal au temps total du relais',
    'first-member-not-specified':'le nom du premier relayeur n’est pas renseigné dans le fichier',
    'first-member-unresolved':'le profil NAP du premier relayeur n’est pas encore choisi avec certitude',
    'first-member-category-missing':'aucune catégorie individuelle n’est disponible pour le premier relayeur dans les résultats du fichier',
    'first-member-category-ambiguous':'plusieurs catégories individuelles sont présentes pour le premier relayeur dans le fichier'
  };
  function describeIssue(result,issue) {
    const c=issue.context;
    if(issue.code==='first-relay-incomplete'&&c) {
      const reasons=(issue.reasons||[]).map(r=>firstReasons[r]||clean(r)).join(' ; ');
      return `Relais ${clean(c.course)} du club ${clean(c.clubCode)}${c.firstPerson?' — premier relayeur '+name(c.firstPerson):''} : ${reasons||'informations du premier relayeur à vérifier'}.${c.firstTime?' Temps initial du fichier : '+clean(c.firstTime)+'.':''}${issue.reasons?.includes('first-member-unresolved')?' Choisir le bon profil NAP, puis actualiser l’aperçu. Le temps du fichier n’est pas remis en cause par cette seule alerte.':''}${issue.reasons?.includes('first-member-not-specified')?' Demander la composition du relais à l’informatique de la compétition.':''}`;
    }
    if(issue.code==='club-difference-unconfirmed'&&c)return `${identity(c.person)} : club représenté dans le fichier ${clean(c.clubCode)}${c.sourceClubName?' — '+clean(c.sourceClubName):''}, club actuel du profil NAP ${clean(c.napClubCode||c.napClubId)||'non renseigné'}${c.napClubName?' — '+clean(c.napClubName):''}. Confirmer le club représenté à cette compétition ; ne pas remplacer automatiquement par le club actuel.`;
    if(issue.code==='source-club-unresolved'&&c)return `${identity(c.person)} : le club ${clean(c.clubCode)} du fichier n’est pas encore rattaché à un club NAP. Vérifier son nom et son numéro fédéral dans « Clubs à rattacher ». Ce message ne prouve pas que le nageur a changé de club.`;
    return null;
  }
  function build(result) {
    const review=result.review,metadata=result.metadata||{};
    const subject=`Vérifications avant import — ${clean(metadata.competitionName)||'compétition'}${metadata.date?' — '+birth(metadata.date):''}`;
    const lines=['Bonjour,','',`Avant de valider l’import des résultats de « ${clean(metadata.competitionName)||'la compétition'} »${metadata.date?' du '+birth(metadata.date):''}${metadata.location?' à '+clean(metadata.location):''}, merci de nous aider à confirmer les points suivants issus de l’export WinPalme.`];
    if(result.reviewStale)lines.unshift('BROUILLON À ACTUALISER : les choix ont changé depuis la dernière analyse.','');
    if(!review)return {subject,body:'Choisir la compétition et actualiser l’aperçu avant de préparer le message.',text:'Choisir la compétition et actualiser l’aperçu avant de préparer le message.',count:0};
    const profiles=new Map((review.profiles||[]).map(p=>[Number(p.id),p])),groups=review.groups||[],pending=groups.filter(g=>g.state!=='matched');
    let count=0;
    if(pending.length){lines.push('','NAGEURS À IDENTIFIER OU À RAPPROCHER');for(const g of pending){count++;lines.push('',`- ${identity(g.source)} — club(s) du fichier : ${(g.clubs||[]).map(c=>clean(c.code)+(c.name?' — '+clean(c.name):'')).join(' ; ')||'non renseigné'}.`,g.state==='unknown'?'  Aucun profil NAP n’a été retrouvé avec certitude lors de cette analyse.':'  Le rapprochement avec une fiche NAP reste à confirmer.');
      const candidates=(g.candidateIds||[]).map(id=>profiles.get(Number(id))).filter(Boolean);
      if(candidates.length){lines.push('  Profils proposés, non validés :');for(const p of candidates.slice(0,5))lines.push(`  • NAP ${p.id} : ${identity(p)} — club actuel ${clean(p.clubCode||p.clubName)||'non renseigné'}.`);if(candidates.length>5||g.moreCandidates)lines.push('  D’autres profils restent consultables dans le portail.');}
      lines.push('  Merci de confirmer le nom, le prénom, la date de naissance et le club représenté ; préciser l’identifiant NAP si vous le connaissez.');
    }}
    const unmapped=new Map(),differences=[];
    for(const g of groups)for(const a of g.clubAlerts||[])if(!a.confirmed){if(!a.id){const item=unmapped.get(a.code)||{code:a.code,name:a.name,people:[]};item.people.push(name(g.source));unmapped.set(a.code,item);}else differences.push({g,a});}
    if(unmapped.size||differences.length){lines.push('','CLUBS À CONFIRMER');for(const c of unmapped.values()){count++;const source=(result.sourceClubs||[]).find(s=>s.code===c.code);lines.push('',`- Club du fichier : ${clean(c.code)} — ${clean(c.name)}${source?.federalNumber?' — numéro fédéral fourni : '+clean(source.federalNumber):''}.`,`  Nageurs concernés : ${[...new Set(c.people)].map(clean).join(', ')}.`, '  Ce club n’est pas encore rattaché à un club NAP. Merci de confirmer son nom complet et son numéro fédéral ; cela ne signifie pas nécessairement un changement de club des nageurs.');}
      for(const {g,a} of differences){count++;lines.push('',`- ${identity(g.source)} : club représenté dans le fichier ${clean(a.code)} — ${clean(a.name)} ; club actuel de la fiche NAP retenue ${clean(g.profile?.clubCode||g.profile?.clubId)} — ${clean(g.profile?.clubName)}.`, '  Merci de confirmer le club réellement représenté lors de cette compétition. Le club actuel ne sera pas substitué automatiquement.');}
    }
    const relayIssues=(result.issues||[]).filter(i=>i.code==='first-relay-incomplete'),relays=(review.relays||[]).filter(r=>r.members.some(m=>!m.profile)||relayIssues.some(i=>i.sourceLine===r.sourceLine));
    if(relays.length){lines.push('','RELAIS À COMPLÉTER OU À VÉRIFIER');for(const r of relays){count++;lines.push('',`- ${clean(r.course)} — ${clean(r.clubCode)} — temps total ${clean(r.time)} (repère dans le TXT : ligne ${r.sourceLine}).`);for(const m of r.members.filter(m=>!m.profile))lines.push(`  Relayeur ${m.position} : ${m.source?name(m.source)+' — profil NAP à confirmer (si déjà cité ci-dessus, une seule confirmation suffit)':'identité non renseignée ou non retrouvée dans le fichier'}.`);
      const issue=relayIssues.find(i=>i.sourceLine===r.sourceLine),dataReasons=(issue?.reasons||[]).filter(reason=>reason!=='first-member-unresolved'&&reason!=='first-member-not-specified');
      for(const reason of dataReasons)lines.push('  À vérifier : '+(firstReasons[reason]||clean(reason))+'.');
      const missing=r.members.filter(m=>!m.profile&&!m.source);if(missing.length)lines.push(`  Merci de fournir les noms, prénoms, dates de naissance et clubs des relayeurs ${missing.map(m=>m.position).join(', ')}, en confirmant leur ordre.`);
      else if(r.members.some(m=>!m.profile))lines.push('  Merci de confirmer les identités indiquées et l’ordre du relais afin de terminer le rapprochement NAP.');
    }}
    if(!count)lines.push('','Aucun nageur, club ou relais ne nécessite actuellement de demande de confirmation dans cet aperçu.');
    lines.push('','Merci de répondre point par point ou de transmettre un nouvel export WinPalme corrigé, avec un TXT et un protocole complet cohérents.','Cette analyse n’a pas enregistré de nouveaux résultats.','','Cordialement,');
    const body=lines.join('\n');return {subject,body,text:`Objet : ${subject}\n\n${body}`,count};
  }
  const api={build,describeIssue};if(typeof module==='object'&&module.exports)module.exports=api;else global.LivePalmesImportConfirmation=api;
})(typeof window==='object'?window:globalThis);

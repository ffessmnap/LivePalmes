(function (root) {
  "use strict";
  const metadata = {
    "nap.swimmerActivity.complete": ["Activité du nageur modifiée", "people"],
    "nap.swimmerCreate.complete": ["Nageur créé", "people"],
    "nap.swimmerDelete.complete": ["Nageur supprimé", "people"],
    "nap.swimmer.identityCorrected": ["Fiche nageur corrigée", "people"],
    "nap.swimmer.changeRequested": ["Correction de nageur demandée", "requests"],
    "nap.swimmer.changeApproved": ["Correction de nageur validée", "requests"],
    "nap.swimmer.changeRejected": ["Correction de nageur refusée", "requests"],
    "nap.swimmer.duplicateReportClosed": ["Signalement de doublon traité", "requests"],
    "nap.swimmerMerge.complete": ["Fiches nageur fusionnées", "people"],
    "nap.personStatus.complete": ["Statut d’un officiel modifié", "people"],
    "nap.personDelete.complete": ["Officiel supprimé", "people"],
    "nap.personMerge.complete": ["Fiches officiel fusionnées", "people"],
    "engagementClubPerson.created": ["Officiel créé", "people"],
    "nap.clubCreate.complete": ["Club créé", "clubs"],
    "nap.clubEdit.complete": ["Club modifié", "clubs"],
    "nap.clubDelete.complete": ["Club supprimé", "clubs"],
    "nap.licenses.corrected": ["Licences corrigées", "people"],
    "nap.competition.changed": ["Compétition modifiée", "competitions"],
    "nap.competitionDelete.complete": ["Compétition supprimée", "competitions"],
    "nap.calendarEvent.changed": ["Événement du calendrier modifié", "competitions"],
    "nap.calendarEventDelete.complete": ["Événement du calendrier supprimé", "competitions"],
    "nap.featured.saved": ["Mise en avant enregistrée", "competitions"],
    "nap.document.saved": ["Document enregistré", "competitions"],
    "nap.nationalDocument.saved": ["Document national enregistré", "competitions"]
  };
  const labels = {firstName:"Prénom",lastName:"Nom",birthDate:"Date de naissance",sex:"Sexe",licenseNumber:"Licence",clubId:"Club",active:"Actif",status:"Statut",course:"Épreuve",tps:"Temps NAP",nom:"Nom",prenom:"Prénom",date:"Date",sexe:"Sexe",number:"Licence",club:"Club",actif:"Actif",role_official:"Rôle officiel",role_team_leader:"Rôle chef d’équipe",name:"Nom",email:"Courriel",entryStatus:"État des engagements"};
  const technical = key => /hash|fingerprint|token|password|secret|^pin$|^id$|^version$|_at$|_by$|^creation$|^operation$|^auditPreparationId$/.test(key);
  function value(item) {
    if(item===undefined)return "Absent";
    if(item===null||item==="")return "Non renseigné";
    if(typeof item==="boolean")return item?"Oui":"Non";
    if(item==="active")return "Actif";
    if(item==="inactive")return "Inactif";
    if(Array.isArray(item))return item.map(value).join(" ; ")||"Aucun";
    if(typeof item==="object")return Object.entries(item).filter(([key])=>!technical(key)).map(([key,v])=>`${labels[key]||key} : ${value(v)}`).join(" · ")||"Aucun";
    return String(item);
  }
  function changes(target) {
    const rows=[];
    function pair(before,after,prefix=""){
      const a=before&&typeof before==="object"?before:{},b=after&&typeof after==="object"?after:{};
      for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
        if(technical(key)||JSON.stringify(a[key])===JSON.stringify(b[key]))continue;
        rows.push({label:`${prefix}${labels[key]||key}`,before:value(a[key]),after:value(b[key])});
      }
    }
    for(const operation of target.operations||[])pair(operation.before,operation.after,`${operation.table||"Modification"} · `);
    const plans=target.plan?.plans;
    if(Array.isArray(plans))for(const plan of plans){
      const person=(target.journalPeople||[]).find(p=>String(p.id)===String(plan.swimmerId));
      const name=person?[person.firstName,person.lastName].filter(Boolean).join(" "):plan.swimmerId?`Nageur réf. ${plan.swimmerId}`:plan.relayId?`Relais réf. ${plan.relayId}`:"";
      const prefix=name?`${name} · `:"";
      if(Array.isArray(plan.before)){
        for(const row of plan.additions||[])rows.push({label:`${prefix}${row.course||"Épreuve"}`,before:"Non engagé",after:`Engagé · ${value(row.tps)}`});
        for(const row of plan.removals||[])rows.push({label:`${prefix}${row.course||"Épreuve"}`,before:`Engagé · ${value(row.tps)}`,after:"Retiré"});
        for(const row of plan.updates||[])pair({tps:row.before?.tps},{tps:row.tps},`${prefix}${row.before?.course||""} · `);
      }else pair(plan.before,plan.remove?null:plan.after,prefix);
    }
    const plan=target.plan;
    if(plan&&!Array.isArray(plans))for(const [key,state] of [["additions","Ajouté"],["removals","Retiré"]])for(const row of plan[key]||[]){
      const person=row.swimmer||row;
      const name=[person.firstName||person.prenom,person.lastName||person.nom].filter(Boolean).join(" ");
      rows.push({label:name||`Personne réf. ${person.id||person.officiel||"inconnue"}`,before:state==="Ajouté"?"Absent":"Présent",after:state});
    }
    return rows;
  }
  function merge(previous,incoming){
    const map=new Map(previous.map(log=>[log.id,log]));
    for(const log of incoming){const old=map.get(log.id);map.set(log.id,old?.historyComplete&&!log.historyComplete?old:log);}
    return [...map.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  function byDayAndActor(logs){
    const groups=new Map();
    for(const log of logs){
      const date=new Date(log.createdAt);
      const day=Number.isFinite(date.getTime())?new Intl.DateTimeFormat("fr-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(date):"Date inconnue";
      const key=`${day}|${log.actorUid||"system"}`;
      if(!groups.has(key))groups.set(key,{day,logs:[]});
      groups.get(key).logs.push(log);
    }
    return [...groups.values()];
  }
  const api={metadata,labels,value,changes,merge,byDayAndActor};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.LivePalmesActivityJournal=api;
})(typeof window!=="undefined"?window:this);

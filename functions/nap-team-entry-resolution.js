"use strict";
const model=require('./nap-team-entries');
const {positiveId}=require('./nap-calendar-values');
const {compact}=require('./nap-individual-entry-resolution');
function period(date){const year=Number(date.slice(0,4)),start=Number(date.slice(5,7))>=9?year:year-1;return {start:`${start-3}-09-01`,end:`${start}-11-30`};}
async function resolveTeamDossier(input,services){
  const {connection,competition:pack,pack:dossier}=input,competition=services.view(pack),profile=model.profile(pack);
  if(pack.event.eventType!=='pool'||pack.event.level!=='national'||pack.groups.length||pack.standards.length||Number(pack.nativeParameters.qualif)>0)throw new TypeError('Profil réservé aux championnats nationaux piscine sans grille de qualification.');
  const reason=require('./nap-swimmer-entry-plan').selectionLockReason(pack);if(reason)throw new TypeError(reason);
  const value=model.normalize(input.dossier,competition,dossier,services),roles=model.roles(value),people=[...roles.keys()];
  const categories=await require('./nap-entry-course-rules').readCategories(connection),allowed=new Map();
  const selected=dossier.swimmers.filter(person=>roles.has(String(person.id)));
  const participation=require('./nap-entry-participation-rules'),evidence=await participation.readEvidence(connection,selected,pack);
  for(const person of selected){
    if(!participation.eligible(pack,person.id,evidence))throw new TypeError('Un résultat NAP dans une compétition requise est nécessaire.');
    require('./nap-entry-birth-policy').assertEligible(pack,person);
    const same=row=>String(person.firstName).trim().toLocaleLowerCase('fr-FR')===String(row.prenom).trim().toLocaleLowerCase('fr-FR')&&String(person.lastName).trim().toLocaleLowerCase('fr-FR')===String(row.nom).trim().toLocaleLowerCase('fr-FR')&&person.birthDate===row.date;
    if(dossier.leaders.some(same)||dossier.officials.some(same))throw new TypeError('Une même personne ne peut être nageur et chef d’équipe ou officiel.');
    allowed.set(String(person.id),require('./nap-entry-course-rules').allowedCourses(person,pack,competition,categories,services));
  }
  const history=new Map(),timePeople=selected.filter(p=>roles.get(String(p.id)).role==='titular'&&value.individuals.some(row=>row.swimmerId===String(p.id)&&row.eventCodes.length));
  // At most eight indexed grouped reads; never one history query per swimmer.
  for(let i=0;i<timePeople.length;i+=100){const batch=await (services.history||require('./nap-entry-performance-history').readEntryHistory)(connection,timePeople.slice(i,i+100));for(const [id,rows]of batch)history.set(id,rows);}
  const dates=period(competition.date),individual=[];
  for(const row of value.individuals)for(const eventCode of row.eventCodes){
    if(!allowed.get(row.swimmerId)?.includes(eventCode))throw new TypeError(`Course ${eventCode} non autorisée pour ce nageur.`);
    let tps='595999';
    if(roles.get(row.swimmerId).role==='titular'){
      const known=(history.get(row.swimmerId)||[]).filter(x=>x.course===eventCode&&x.date>=dates.start&&x.date<=dates.end&&x.active!==false&&x.status!=='hidden'&&Number(x.timeValue)>0).sort((a,b)=>a.timeValue-b.timeValue);
      if(known.length)tps=compact(Number(known[0].timeValue));
    }
    individual.push({swimmerId:row.swimmerId,course:eventCode,tps});
  }
  const relays=[];
  for(const team of value.teams)for(const relay of team.relays){
    const event=competition.events.find(x=>x.code===relay.eventCode&&x.type==='relay');
    const courses=event.nativeCourses.filter(x=>Number(x.relais)===1&&(team.sex==='X'?['0','X'].includes(String(x.sexe)):x.sexe===team.sex));
    if(courses.length!==1)throw new TypeError('Référence native du relais absente ou ambiguë.');
    const nativeCategory=team.sex==='X'?0:require('./nap-relay-resolution').nativeCategory('S',team.sex==='F'?'female':'male',categories);
    if(profile.format==='clubs'){
      const legs=profile.relays[model.relayKey(relay.eventCode,profile)],distance=relay.eventCode.startsWith('6X100')?100:50;
      relay.members.forEach((id,i)=>{const required=distance+legs[i];if(!allowed.get(id)?.includes(required))throw new TypeError('Une spécialité du relais est interdite pour ce nageur.');});
    }
    relays.push({key:team.id+'|'+relay.eventCode,course:positiveId(courses[0].id_course),categorie:nativeCategory,tps:relay.entryTime,members:relay.members});
  }
  return {value,people,individual,relays};
}
module.exports={resolveTeamDossier,period};

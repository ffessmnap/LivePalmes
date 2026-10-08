"use strict";
const {positiveId}=require("./nap-direct-calendar");
const {allowedCourses}=require("./nap-entry-course-rules");
const {resolveTime}=require("./nap-entry-time-rules");
const normalize=value=>String(value || "").toUpperCase().replace(/\s+/g,"");
function compact(value) {
  if(!Number.isInteger(value) || value<=0 || value>599999) throw new TypeError("Temps individuel invalide pour NAP.");
  return `${String(Math.floor(value/6000)).padStart(2,"0")}${String(Math.floor(value/100)%60).padStart(2,"0")}${String(value%100).padStart(2,"0")}`;
}
async function resolveChanges(input,services) {
  const {competition:pack,pack:dossier,changes,histories,categories}=input;
  if(!Array.isArray(changes) || !changes.length || changes.length>100 || !(histories instanceof Map) || typeof services?.view!=="function" || typeof services?.automatic!=="function" || typeof services?.parse!=="function" || typeof services?.validateTimes!=="function") throw new TypeError("Resolution des courses natives incomplete.");
  const competition=services.view(pack),result=[],manualSwimmers=[],seen=new Set();
  const participation=require("./nap-entry-participation-rules");
  const requestedPeople=dossier.swimmers.filter(person=>changes.some(change=>Number(change.swimmerId)===Number(person.id)));
  const qualified=competition.qualifications?.enabled===true;
  const evaluations=qualified&&typeof services.prepareQualifications==='function'?await services.prepareQualifications(input.connection,{pack,people:requestedPeople,histories}):null;
  if(qualified&&!(evaluations instanceof Map))throw new TypeError('Controle des qualifications NAP requis avant enregistrement.');
  const evidence=await participation.readEvidence(input.connection,requestedPeople,pack);
  for(const change of changes) {
    const id=positiveId(change.swimmerId);
    if(seen.has(id) || !Array.isArray(change.entries) || change.entries.length>64) throw new TypeError("Courses demandees invalides ou dupliquees.");
    seen.add(id);
    const people=dossier.swimmers.filter(person=>Number(person.id)===id && String(person.clubId)===String(dossier.clubId));
    const links=dossier.inscriptions.filter(row=>Number(row.nageur)===id);
    if(people.length!==1 || links.length!==1) throw new TypeError("Nageur non engage ou inscription native ambigue.");
    const person=people[0],before=dossier.individual.filter(row=>Number(row.engagement)===Number(links[0].id));
    const eligible=participation.eligible(pack,id,evidence),history=participation.filterTimes(histories.get(String(id)) || [],pack);
    const managedCourses=allowedCourses(person,pack,competition,categories,services);
    if(qualified){
      const evaluation=evaluations.get(String(id));
      if(evaluation?.enabled!==true||require('./engagement-qualification').reconcile(change.entries.filter(entry=>managedCourses.includes(normalize(entry.eventCode))),evaluation).removed.length)throw new TypeError('Une course demandee ne respecte pas les qualifications. Rechargez les temps proposes.');
    }
    const openWater=competition.competitionType==="openWater";
    const storageCode=code=>{
      if(!openWater) return code;
      const event=competition.events.find(row=>row.code===code);
      const nativeCodes=[...new Set((event?.nativeCourses || []).filter(row=>row.sexe===person.sex).map(row=>normalize(row.course)))];
      if(nativeCodes.length!==1) throw new TypeError("Correspondance native de la course eau libre ambigue.");
      return nativeCodes[0];
    };
    const entries=[],manualEntries=[],requested=new Set();
    for(const raw of change.entries) {
      const code=normalize(raw?.eventCode);
      if(!/^[A-Z0-9]{1,32}$/.test(code) || requested.has(code)) throw new TypeError("Course demandee invalide ou dupliquee.");
      requested.add(code);
      const stored=managedCourses.includes(code) ? storageCode(code) : code;
      const saved=before.filter(row=>normalize(row.course)===stored || openWater && require("./nap-open-water-courses").displayCode(row.course,"openWater")===code);
      if(saved.length>1) throw new TypeError("Courses natives dupliquees a verifier avant modification.");
      const unchanged=saved.length===1 && raw.entryTimeMode==="native" && String(raw.nativeEntryId)===String(saved[0].id) && raw.nativeTime===saved[0].tps;
      if(!managedCourses.includes(code)) {
        if(unchanged) continue; // Unmanaged historical rows remain in the plan.
        throw new TypeError(`Course ${code} non autorisee pour ce nageur.`);
      }
      if(unchanged&&!qualified) {
        if(!/^\d{1,6}$/.test(saved[0].tps) || Number(saved[0].tps.slice(-4,-2)||0)>59) managedCourses.splice(managedCourses.indexOf(code),1);
        else entries.push({course:stored,tps:saved[0].tps});
        continue;
      }
      if(raw.entryTimeMode==="native"&&!unchanged) throw new TypeError("Temps natif modifie ailleurs. Rechargez le dossier.");
      if(!eligible) throw new TypeError("Un resultat NAP dans au moins une competition requise est necessaire pour ajouter ou modifier une course.");
      if(openWater) {
        if(raw.manualEntryTime || raw.entryTime) throw new TypeError("Aucun temps a saisir pour une course eau libre.");
        entries.push({course:stored,tps:"000000"});
        continue;
      }
      const resolved=resolveTime({...raw,eventCode:code,...(qualified&&unchanged?{entryTimeMode:'auto',entryTime:'',manualEntryTime:''}:{})},competition,{
        automatic:entry=>services.automatic(entry,history,competition),parse:services.parse,
        known:entry=>require("./nap-entry-time-policy").known(entry,history,competition,services.parse)
      });
      const tps=resolved.nativeTime==="599999" ? "599999" : compact(resolved.entryTimeValue);
      const previousValue=unchanged?require('./nap-performance-normalization').parseCompactTime(saved[0].tps):null;
      entries.push({course:code,tps:unchanged&&previousValue===resolved.entryTimeValue?saved[0].tps:tps});
      if(resolved.entryTimeMode==="manual") manualEntries.push(resolved);
    }
    const managedNativeCourses=managedCourses.map(storageCode);
    const untouched=before.filter(row=>!managedNativeCourses.includes(row.course));
    const maximum=Number(competition.maxEventsPerSwimmer || 0);
    if(maximum>0 && new Set([...entries.map(row=>row.course),...untouched.map(row=>normalize(row.course))]).size>maximum) throw new TypeError("Limite d'epreuves par nageur depassee.");
    if(manualEntries.length) manualSwimmers.push({...person,category:services.category(competition.date,person.birthDate),individualEntries:manualEntries});
    result.push({swimmerId:id,managedCourses:managedNativeCourses,entries});
  }
  if(manualSwimmers.length) await services.validateTimes(manualSwimmers,competition);
  return result;
}
module.exports={compact,resolveChanges};

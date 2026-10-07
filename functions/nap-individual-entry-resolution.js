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
  for(const change of changes) {
    const id=positiveId(change.swimmerId);
    if(seen.has(id) || !Array.isArray(change.entries) || change.entries.length>64) throw new TypeError("Courses demandees invalides ou dupliquees.");
    seen.add(id);
    const people=dossier.swimmers.filter(person=>Number(person.id)===id && String(person.clubId)===String(dossier.clubId));
    const links=dossier.inscriptions.filter(row=>Number(row.nageur)===id);
    if(people.length!==1 || links.length!==1) throw new TypeError("Nageur non engage ou inscription native ambigue.");
    const person=people[0],before=dossier.individual.filter(row=>Number(row.engagement)===Number(links[0].id));
    const managedCourses=allowedCourses(person,pack,competition,categories,services);
    const entries=[],manualEntries=[],requested=new Set();
    for(const raw of change.entries) {
      const code=normalize(raw?.eventCode);
      if(!/^[A-Z0-9]{1,32}$/.test(code) || requested.has(code)) throw new TypeError("Course demandee invalide ou dupliquee.");
      requested.add(code);
      const saved=before.filter(row=>normalize(row.course)===code);
      if(saved.length>1) throw new TypeError("Courses natives dupliquees a verifier avant modification.");
      const unchanged=saved.length===1 && raw.entryTimeMode==="native" && String(raw.nativeEntryId)===String(saved[0].id) && raw.nativeTime===saved[0].tps;
      if(!managedCourses.includes(code)) {
        if(unchanged) continue; // Unmanaged historical rows remain in the plan.
        throw new TypeError(`Course ${code} non autorisee pour ce nageur.`);
      }
      if(unchanged) {
        if(!/^\d{1,6}$/.test(saved[0].tps) || Number(saved[0].tps.slice(-4,-2)||0)>59) managedCourses.splice(managedCourses.indexOf(code),1);
        else entries.push({course:code,tps:saved[0].tps});
        continue;
      }
      if(raw.entryTimeMode==="native") throw new TypeError("Temps natif modifie ailleurs. Rechargez le dossier.");
      const resolved=resolveTime({...raw,eventCode:code},competition,{
        automatic:entry=>services.automatic(entry,histories.get(String(id)) || [],competition),parse:services.parse,
        known:entry=>require("./nap-entry-time-policy").known(entry,histories.get(String(id)) || [],competition,services.parse)
      });
      entries.push({course:code,tps:resolved.nativeTime==="599999" ? "599999" : compact(resolved.entryTimeValue)});
      if(resolved.entryTimeMode==="manual") manualEntries.push(resolved);
    }
    const untouched=before.filter(row=>!managedCourses.includes(row.course));
    const maximum=Number(competition.maxEventsPerSwimmer || 0);
    if(maximum>0 && new Set([...entries.map(row=>row.course),...untouched.map(row=>normalize(row.course))]).size>maximum) throw new TypeError("Limite d'epreuves par nageur depassee.");
    if(manualEntries.length) manualSwimmers.push({...person,category:services.category(competition.date,person.birthDate),individualEntries:manualEntries});
    result.push({swimmerId:id,managedCourses,entries});
  }
  if(manualSwimmers.length) await services.validateTimes(manualSwimmers,competition);
  return result;
}
module.exports={compact,resolveChanges};

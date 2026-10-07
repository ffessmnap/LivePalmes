"use strict";
// Pure preparation. The caller must authorize the club, check opening/leader
// and resolve sporting eligibility and times before calling this module.
// Never rewrites an entire dossier: at most 100 explicitly changed swimmers.
const {positiveId}=require("./nap-direct-calendar");
const course=value=>{
  if(typeof value!=="string" || !/^[A-Z0-9]{1,32}$/.test(value)) throw new TypeError("Course NAP invalide.");
  return value;
};
function planIndividualEntries(pack,changes) {
  if(!pack || !/^\d{1,16}$/.test(String(pack.clubId)) || !Array.isArray(pack.swimmers) || pack.swimmers.length>800 || !Array.isArray(pack.inscriptions) || pack.inscriptions.length>800 || !Array.isArray(pack.individual) || pack.individual.length>5000 || !Array.isArray(changes) || changes.length>100) throw new TypeError("Dossier NAP borne requis.");
  const competitionId=positiveId(pack.competitionId),clubId=String(pack.clubId);
  const people=new Map();
  for(const row of pack.swimmers) {
    const id=positiveId(row.id);
    if(people.has(id) || String(row.clubId)!==clubId) throw new TypeError("Nageur hors club ou ambigu.");
    people.set(id,row);
  }
  const inscriptions=new Map(),inscriptionIds=new Set();
  for(const row of pack.inscriptions) {
    const id=positiveId(row.id),swimmerId=positiveId(row.nageur);
    if(Number(row.compet)!==competitionId || !people.has(swimmerId) || inscriptionIds.has(id)) throw new TypeError("Inscription hors dossier ou ambigue.");
    inscriptionIds.add(id);
    const rows=inscriptions.get(swimmerId)||[]; rows.push(row); inscriptions.set(swimmerId,rows);
  }
  const entryIds=new Set();
  for(const row of pack.individual) {
    const id=positiveId(row.id);
    if(!inscriptionIds.has(positiveId(row.engagement)) || entryIds.has(id)) throw new TypeError("Course hors dossier ou ambigue.");
    entryIds.add(id);
  }
  const seen=new Set(),plans=[];
  for(const change of changes) {
    const swimmerId=positiveId(change?.swimmerId);
    if(seen.has(swimmerId) || !people.has(swimmerId) || !Array.isArray(change.entries) || change.entries.length>64 || !Array.isArray(change.managedCourses) || change.managedCourses.length>64) throw new TypeError("Nageur modifie invalide ou duplique.");
    const managed=new Set(change.managedCourses.map(course));
    if(managed.size!==change.managedCourses.length) throw new TypeError("Liste des courses ambigue.");
    seen.add(swimmerId);
    const links=inscriptions.get(swimmerId)||[];
    // Historical duplicate inscriptions are never arbitrarily merged.
    if(links.length!==1) throw new TypeError("Inscription NAP unique requise avant les courses.");
    const inscriptionId=positiveId(links[0].id),before=pack.individual.filter(row=>Number(row.engagement)===inscriptionId);
    const desired=new Map();
    for(const row of change.entries) {
      const code=course(row?.course);
      if(!managed.has(code)) throw new TypeError("Course non geree par cette modification.");
      // Compact native format is parsed from the right. Leading zeroes in
      // existing NAP values are retained when the requested value is equal.
      const time=row?.tps;
      if(typeof time!=="string" || !/^\d{1,6}$/.test(time) || time!=="599999" && Number(time.slice(-4,-2)||0)>59 || desired.has(code)) throw new TypeError("Temps ou course resolue invalide.");
      desired.set(code,time);
    }
    const removals=[],updates=[],additions=[];
    for(const row of before) {
      if(!managed.has(row.course)) continue;
      if(!desired.has(row.course)) removals.push({...row});
      else if(Number(row.tps)!==Number(desired.get(row.course))) updates.push({before:{...row},tps:desired.get(row.course)});
    }
    for(const [code,tps] of desired) if(!before.some(row=>row.course===code)) additions.push({engagement:inscriptionId,course:code,tps});
    plans.push({swimmerId,inscriptionId,before:before.map(row=>({...row})),removals,updates,additions});
  }
  return {competitionId,clubId,plans};
}
module.exports={planIndividualEntries};

"use strict";
// Explicit national merge only. Historical chefsdequipe declarations stay intact.
// Keep the chosen identity, combine existing roles and deduplicate the merged
// official within each competition/represented club, as the previous portal did.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual:equal}=require("node:util");
const {reference,changedOptions}=require("./nap-club-person-status");
const {person,normalizeOptions,SOURCES,OPTION_COLUMNS}=require("./nap-club-people");
const {nativeEqual}=require("./nap-native-compare");
function operation(input) {return createHash("sha256").update(JSON.stringify(["person-merge",input.actorUid,input.sourcePersonId,input.targetPersonId,input.sourceFingerprint,input.targetFingerprint])).digest("hex");}
function planMerge(input,source,target,sourceOptions,targetOptions,links) {
  const a=reference(input?.sourcePersonId),b=reference(input?.targetPersonId);
  if(a.kind!=="officials" || b.kind!=="officials" || a.id===b.id || input.confirmMerge!==true || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input.sourceFingerprint||"") || !/^[a-f0-9]{64}$/.test(input.targetFingerprint||"")) throw new TypeError("Deux fiches reutilisables et confirmation nationale requises.");
  if(Number(source?.id)!==a.id || Number(target?.id)!==b.id)throw new TypeError("Personnes source et cible requises.");
  const beforeSourceOptions=normalizeOptions(sourceOptions),beforeTargetOptions=normalizeOptions(targetOptions);
  const sourcePerson=person(source,"officials",beforeSourceOptions),targetPerson=person(target,"officials",beforeTargetOptions);
  if(sourcePerson.napFingerprint!==input.sourceFingerprint || targetPerson.napFingerprint!==input.targetFingerprint)throw new TypeError("Une fiche a change. Rechargez avant de fusionner.");
  if(sourcePerson.clubId!==targetPerson.clubId && input.confirmClubMismatch!==true)throw new TypeError("Les clubs sont differents. Confirmation speciale requise.");
  if(!Array.isArray(links) || links.length>4000)throw new RangeError("Historique trop volumineux pour cette fusion bornee.");
  const ids=new Set();
  for(const row of links) {
    if(!Number.isSafeInteger(Number(row.id)) || Number(row.id)<=0 || ids.has(Number(row.id)) || ![a.id,b.id].includes(Number(row.officiel)) || !Number.isSafeInteger(Number(row.compet)) || Number(row.compet)<=0 || !/^\d{1,16}$/.test(String(row.club)))throw new TypeError("Liens de personnes incoherents.");
    ids.add(Number(row.id));
  }
  const afterOptions=changedOptions("officials",target,beforeTargetOptions,true,input.timestamp,input.actorUid);
  afterOptions.role_team_leader=sourcePerson.roles.teamLeader||targetPerson.roles.teamLeader?1:0;
  afterOptions.role_official=sourcePerson.roles.official||targetPerson.roles.official?1:0;
  const beforeLinks=links.map(row=>({...row})),afterLinks=beforeLinks.filter(row=>Number(row.officiel)===b.id).map(row=>({...row}));
  const occupied=new Set(afterLinks.map(row=>JSON.stringify([row.compet,String(row.club)])));
  const updates=[],removals=[];
  for(const row of beforeLinks.filter(row=>Number(row.officiel)===a.id).sort((l,r)=>Number(l.id)-Number(r.id))) {
    const key=JSON.stringify([row.compet,String(row.club)]);
    if(occupied.has(key))removals.push({...row});
    else {const after={...row,officiel:target.id};afterLinks.push(after);updates.push({before:{...row},after});occupied.add(key);}
  }
  afterLinks.sort((l,r)=>Number(l.officiel)-Number(r.officiel)||Number(l.id)-Number(r.id));
  const plan={kind:"native-person-merge",operation:operation(input),actorUid:input.actorUid,sourcePersonId:input.sourcePersonId,targetPersonId:input.targetPersonId,sourceFingerprint:input.sourceFingerprint,targetFingerprint:input.targetFingerprint,confirmClubMismatch:input.confirmClubMismatch===true,source:{...source},target:{...target},sourceOptions:beforeSourceOptions,targetOptions:beforeTargetOptions,afterOptions,beforeLinks,afterLinks,updates,removals};
  if(Buffer.byteLength(JSON.stringify(plan))>500000)throw new RangeError("Sauvegarde trop volumineuse pour cette fusion bornee.");
  return plan;
}
function validateSaved(plan,input) {
  if(!equal(plan,planMerge({...input,timestamp:plan.afterOptions.updated_at},plan.source,plan.target,plan.sourceOptions,plan.targetOptions,plan.beforeLinks)))throw new TypeError("Sauvegarde de fusion incompatible.");
}
function linkStatement(kind,rows) {
  if(!rows.length)return null;
  const before=rows.map(row=>row.before||row),guard=before.map(()=>"(id=? AND compet=? AND officiel=? AND BINARY club <=> BINARY ?)").join(" OR ");
  return {sql:kind==="update"?`UPDATE officielsengager SET officiel=? WHERE ${guard}`:`DELETE FROM officielsengager WHERE ${guard}`,values:[...(kind==="update"?[rows[0].after.officiel]:[]),...before.flatMap(row=>[row.id,row.compet,row.officiel,row.club])],count:rows.length};
}
function deleteSource(plan) {
  return {sql:`DELETE FROM officiels WHERE id=? AND ${SOURCES.officials.columns.slice(1).map(c=>nativeEqual(`\`${c}\``)).join(" AND ")} LIMIT 1`,values:[plan.source.id,...SOURCES.officials.columns.slice(1).map(c=>plan.source[c])]};
}
function deleteSourceOptions(plan) {
  if(!plan.sourceOptions)return null;
  return {sql:`DELETE FROM livepalmes_club_people_options WHERE source=? AND person_id=? AND ${OPTION_COLUMNS.map(c=>nativeEqual(`\`${c}\``)).join(" AND ")} LIMIT 1`,values:["officiels",plan.source.id,...OPTION_COLUMNS.map(c=>plan.sourceOptions[c])]};
}
module.exports={operation,planMerge,validateSaved,linkStatement,deleteSource,deleteSourceOptions};

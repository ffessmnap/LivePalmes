"use strict";
// Pure preparation for the existing four NAP supplements. It never allocates
// native ids, updates a sporting row or assumes a control has been confirmed.
const engine=require("./engagement-qualification");
const {fromPack}=require("./nap-qualification-rules");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {isDeepStrictEqual}=require("node:util");
function plan(pack,input) {
  if(input?.national!==true) throw new TypeError("Grille reservee a l'administration nationale.");
  if(!pack||fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("La competition a change. Rechargez la fiche.");
  if(pack.event?.competitionType!=="pool") throw new TypeError("Grille de qualification reservee aux competitions en piscine.");
  const competitionId=positiveId(pack.event.id);
  const groups=pack.groups,standards=pack.standards,links=pack.qualifyingCompetitions;
  if(!Array.isArray(groups)||groups.length>12||!Array.isArray(standards)||standards.length>3000||!Array.isArray(links)||links.length>2400) throw new TypeError("Ancienne grille NAP incomplete.");
  const before=fromPack(pack,input.events);
  // Retain the already verified native-level qualifier until its own minimum
  // semantics have been mapped, rather than silently turning it off.
  if(![0,29].includes(Number(pack.nativeParameters?.qualif||0))) throw new TypeError("L'ancienne grille IntraNAP doit etre verifiee avant cette modification.");
  let rules;
  try{rules=engine.validateRules(input.rules,input.events,true);}catch(error){throw new TypeError(error.message);}
  const plannedGroups=rules.groups.map((group,position)=>({
    position:position+1,label:group.label,categories:group.categories,mode:group.mode,start_date:group.startDate,end_date:group.endDate,
    electronic_only:group.electronicOnly?1:0,pools:group.pools,competition_mode:group.competitionMode,bonus_requires_selected:group.bonusRequiresSelectedCompetition?1:0,
    qualifyingCompetitionIds:group.competitionIds.map(positiveId)
  }));
  const minima=Object.entries(rules.standards).map(([key,minimum_centiseconds])=>{
    const [category,sex,event_code]=key.split("|");return {category,sex,event_code,minimum_centiseconds};
  }).sort((a,b)=>`${a.category}|${a.sex}|${a.event_code}`.localeCompare(`${b.category}|${b.sex}|${b.event_code}`));
  if(plannedGroups.reduce((n,g)=>n+g.qualifyingCompetitionIds.length,0)>2400) throw new RangeError("Trop de competitions qualificatives.");
  return {competitionId,changed:!isDeepStrictEqual(before,rules),before:structuredClone({options:pack.options,groups,standards,qualifyingCompetitions:links}),after:{enabled:rules.enabled,groups:plannedGroups,standards:minima},rules};
}
module.exports={plan};

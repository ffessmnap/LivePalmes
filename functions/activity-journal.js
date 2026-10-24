"use strict";
// Read-only projection of durable NAP preparations and their exact receipts.
// No scan, mutation, or lookup of today's sporting data to reconstruct history.
const {createHash}=require("node:crypto");
const hash=value=>createHash("sha256").update(value).digest("hex");
const RULES=[
  ["nap.swimmerActivity.prepare","nap-swimmer-activity","nap.swimmerActivity.complete",true],
  ["nap.swimmerCreate.prepare","nap-swimmer-create","nap.swimmerCreate.complete",true],
  ["nap.swimmerDelete.prepare","nap-swimmer-delete","nap.swimmerDelete.complete",true],
  ["nap.swimmer.recovery.prepare","nap-swimmer-recovery","engagementClubSwimmer.recovered"],
  ["nap.swimmer.identityCorrection.prepare","nap-identity","nap.swimmer.identityCorrected"],
  ["nap.swimmerMerge.prepare","nap-swimmer-merge","nap.swimmerMerge.complete",true],
  ["nap.person.status.prepare","nap-person-status","engagementClubPerson.statusChanged"],
  ["nap.personStatus.prepare","nap-person-status","nap.personStatus.complete",true],
  ["nap.person.create.prepare","nap-person-create","engagementClubPerson.created"],
  ["nap.person.identity.prepare","nap-person-identity","engagementClubPerson.saved"],
  ["nap.personDelete.prepare","nap-person-delete","nap.personDelete.complete",true],
  ["nap.personMerge.prepare","nap-person-merge","nap.personMerge.complete",true],
  ["nap.clubCreate.prepare","nap-club-create","nap.clubCreate.complete",true],
  ["nap.clubEdit.prepare","nap-club-edit","nap.clubEdit.complete",true],
  ["nap.clubDelete.prepare","nap-club-delete","nap.clubDelete.complete",true],
  ["nap.licenses.correction.prepare","nap-licenses","nap.licenses.corrected"],
  ["nap.swimmerSelection.prepare","nap-swimmer-selection","engagementClubEntry.swimmerSelectionsSaved"],
  ["nap.individualEntry.prepare","nap-individual","engagementClubEntry.individualEntriesSaved"],
  ["nap.officialEntry.prepare","nap-official","engagementClubEntry.officialsSaved"],
  ["nap.teamLeader.change.prepare","nap-team-leader","engagementClubEntry.teamLeaderSaved"],
  ["nap.teamLeader.remove.prepare","nap-team-leader-remove","engagementClubEntry.teamLeaderRemoved"],
  ["nap.relay.prepare","nap-relay","engagementClubEntry.relaysSaved"],
  ["nap.competition.change.prepare","nap-competition","nap.competition.changed"],
  ["nap.competition.create.prepare","nap-competition-create","engagementCompetition.created"],
  ["nap.competitionDelete.prepare","nap-competition-delete","nap.competitionDelete.complete",true],
  ["nap.calendarEvent.change.prepare","nap-calendar-event","nap.calendarEvent.changed"],
  ["nap.calendarEventDelete.prepare","nap-competition-delete","nap.calendarEventDelete.complete",true],
  ["nap.featured.prepare","nap-featured","nap.featured.saved"],
  ["nap.document.prepare","nap-document","nap.document.saved"],
  ["nap.nationalDocument.prepare","national-document","nap.nationalDocument.saved"]
];
function preparation(log){
  const rule=RULES.find(([action])=>action===log.action);
  if(!rule)return null;
  const operation=log.id.startsWith(`${rule[1]}-`)&&log.id.endsWith("-before")
    ?log.id.slice(rule[1].length+1,-7):"";
  if(!/^[a-f0-9]{64}$/.test(operation))return null;
  const event=rule[3]?`${rule[1]}-${operation}-complete`:operation;
  return {rule,operation,receiptId:hash(`${rule[2]}|${event}`).slice(0,40)};
}
const fields={nom:"lastName",prenom:"firstName",date:"birthDate",sexe:"sex",number:"licenseNumber",club:"clubId",actif:"active"};
function readable(row){
  if(!row||typeof row!=="object"||Array.isArray(row))return row;
  return Object.fromEntries(Object.entries(row).filter(([key])=>!/(hash|fingerprint|token|password|pin|secret)/i.test(key)).map(([key,value])=>[
    fields[key]||key,["actif","active"].includes(key)&&value!==null&&[0,1].includes(Number(value))?Number(value)===1:value
  ]));
}
function project(prep,receipt,info){
  const saved=prep.target||{}, target={...saved,...receipt?.target};
  if(saved.before)target.before=readable(saved.before);
  if(saved.after)target.after=readable(saved.after);
  const person=saved.native||saved.after||saved.before||saved.target||{};
  target.firstName=target.firstName||person.prenom||person.firstName||"";
  target.lastName=target.lastName||person.nom||person.lastName||"";
  for(const [key,native] of [["birthDate","date"],["sex","sexe"],["licenseNumber","number"]]){
    if(!Object.hasOwn(target,key)&&Object.hasOwn(person,native))target[key]=person[native];
  }
  if(!target.clubName&&saved.native?.nom_club)target.clubName=saved.native.nom_club;
  const name=row=>[row?.prenom||row?.firstName,row?.nom||row?.lastName].filter(Boolean).join(" ");
  if(saved.source)target.sourcePersonName=name(saved.source);
  if(saved.target)target.targetPersonName=name(saved.target);
  target.operation=info.operation;
  return {...prep,id:info.receiptId,action:info.rule[2],target,
    createdAt:prep.createdAt,completedAt:receipt?.createdAt||"",startedAt:prep.createdAt,
    outcome:receipt?"completed":"unconfirmed",historyComplete:true};
}
async function projectPage(logs,readMany){
  // At most one counterpart per raw row, all fetched together and deduplicated.
  const ids=new Set();
  const inPage=new Map(logs.map(log=>[log.id,log]));
  for(const log of logs){
    const info=preparation(log);
    if(info&&!inPage.has(info.receiptId))ids.add(info.receiptId);
    const ref=log.target?.auditPreparationId;
    if(typeof ref==="string"&&/^[a-z-]+-[a-f0-9]{64}-before$/.test(ref)&&!inPage.has(ref))ids.add(ref);
  }
  const requested=[...ids];
  const extra=requested.length?await readMany(requested):[];
  const all=new Map([...inPage,...extra.filter(Boolean).map(log=>[log.id,log])]);
  const result=new Map();
  for(const log of logs){
    const ref=log.target?.auditPreparationId;
    const prep=preparation(log)?log:all.get(ref);
    const info=prep&&preparation(prep);
    const receipt=info&&all.get(info.receiptId);
    const valid=receipt&&receipt.action===info.rule[2]&&receipt.actorUid===prep.actorUid;
    const linked=info&&(!ref||info.receiptId===log.id);
    if(linked){
      const item=project(prep,valid?receipt:null,info);
      result.set(item.id,item);
    }else if(!result.has(log.id))result.set(log.id,log);
  }
  return {logs:[...result.values()],counterpartDocuments:requested.length};
}
module.exports={RULES,preparation,projectPage,readable};

"use strict";
// Existing sporting engine over an already-grouped NAP history. No database,
// Firestore source, generated cache or new sporting rule is used here.
const engine=require("./engagement-qualification");
const {fromPack}=require("./nap-qualification-rules");
const {positiveId}=require("./nap-direct-calendar");
function evaluatePerson({pack,person,events,rows,grants=[],categoryFor}) {
  if(typeof categoryFor!=="function"||!Array.isArray(rows)||rows.length>2000||!Array.isArray(grants)||grants.length>64) throw new TypeError("Controle de qualification NAP borne requis.");
  if(![0,29].includes(Number(pack.nativeParameters?.qualif||0))) throw new TypeError("Ancienne grille IntraNAP non raccordee.");
  if(!/^[0-9]{1,16}$/.test(String(person.clubId))) throw new TypeError("Club NAP invalide.");
  const competitionId=positiveId(pack.event.id),swimmerId=positiveId(person.id),clubId=String(person.clubId),seen=new Set();
  for(const grant of grants) {
    if(Number(grant.competition_id)!==competitionId||Number(grant.swimmer_id)!==swimmerId||String(grant.club_id)!==clubId||!["accepted","revoked"].includes(grant.status)||!/^[A-Z0-9]{1,32}$/.test(grant.event_code)||seen.has(grant.event_code)) throw new TypeError("Exception NAP hors perimetre ou ambigue.");
    seen.add(grant.event_code);
  }
  const rules=fromPack(pack,events);
  const result=engine.evaluate({rules,category:categoryFor(pack.event.date,person.birthDate),sex:person.sex,events,rows,
    approvals:grants.map(row=>({eventCode:row.event_code,status:row.status}))});
  return {rules,evaluation:result};
}
module.exports={evaluatePerson};

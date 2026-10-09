"use strict";
// Technical creation receipts only; the club itself is always read from NAP.
function id(value){if(!/^[1-9]\d{0,9}$/.test(String(value)))throw new TypeError("Club NAP requis.");return String(value);}
const reference=(db,clubId)=>db.collection("auditLogs").doc(`nap-club-created-${id(clubId)}`);
async function record(db,operation,target,actorUid){
  if(!/^[a-f0-9]{64}$/.test(operation)||target?.created!==true||target.verified!==true||!actorUid)throw new TypeError("Creation nationale verifiee requise.");
  const clubId=id(target.clubId),ref=reference(db,clubId);
  await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(existing.exists&&existing.data().operation!==operation)throw new TypeError("Origine de creation du club a verifier.");if(!existing.exists)tx.create(ref,{action:"nap.clubCreate.provenance",operation,clubId,actorUid,createdAt:new Date().toISOString()});});
}
async function eligibility(db,clubId){const clean=id(clubId),doc=await reference(db,clean).get();const row=doc.exists?doc.data():null;return row?.action==="nap.clubCreate.provenance"&&row.clubId===clean&&/^[a-f0-9]{64}$/.test(row.operation||"")?row:null;}
async function creation(db,clubId){
  const pointer=await eligibility(db,clubId);if(!pointer)throw new TypeError("Un club historique doit etre desactive et ne peut pas etre supprime.");
  const saved=await db.collection("auditLogs").doc(`nap-club-create-${pointer.operation}-before`).get(),plan=saved.exists?saved.data().target:null;
  if(!plan||plan.operation!==pointer.operation||plan.phase!=="identified"||String(plan.nativeId)!==id(clubId)||plan.actorUid!==pointer.actorUid)throw new TypeError("Preuve de creation du club incomplete.");
  return plan;
}
module.exports={record,eligibility,creation};

"use strict";
const ns=require("./nap-swimmer-ns");
function audit(backend,uid) {
  return {
    read:async operation=>{const doc=await backend.db.collection("auditLogs").doc(`nap-ns-${operation}-before`).get();return doc.exists?doc.data().target:null;},
    prepare:(operation,target)=>backend.db.collection("auditLogs").doc(`nap-ns-${operation}-before`).create({action:"nap.swimmer.ns.prepare",actorUid:uid,target,createdAt:new Date().toISOString()}),
    complete:(operation,target)=>backend.writeAuditLogOnce("nap.swimmer.ns.changed",uid,{...target,auditPreparationId:`nap-ns-${operation}-before`},operation)
  };
}
async function club(backend,context,input) {
  if(!["read","save"].includes(input.nsAction))throw new TypeError("Action NS invalide.");
  const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
  const row=await ns.read(pool,input,context), swimmer=require("./nap-portal-swimmers").person(row);
  if(input.nsAction==="save"&&input.nonSelectable===true)return ns.change(pool,input,context,audit(backend,context.uid));
  const requestId=backend.stableHash(["nap-ns",String(row.id),String(context.clubId),ns.fingerprint(row)].join("|")).slice(0,40);
  const ref=backend.db.collection(backend.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
  if(input.nsAction==="read") {
    if(!swimmer.nsAvailable)return {ok:true,swimmer,nsRequest:null};
    const snapshot=await ref.get();
    return {ok:true,swimmer,nsRequest:snapshot.exists?backend.engagementSwimmerChangeRequestItem(snapshot):null};
  }
  const proposal=ns.proposal(row,input), now=new Date().toISOString();
  const payload={...proposal,id:requestId,status:"pending",clubId:String(context.clubId),clubName:context.clubName||"",regionId:context.regionId||"",
    requestedAt:now,requestedBy:context.uid,requestedByEmail:context.email||"",requestedByFirstName:context.firstName||"",requestedByLastName:context.lastName||"",updatedAt:now,updatedBy:context.uid};
  await backend.db.runTransaction(async transaction=>{
    const existing=await transaction.get(ref);
    // A rejected request may be submitted again after the club reviews the national comment.
    if(existing.exists&&existing.data()?.status!=="rejected")throw new backend.HttpsError("already-exists","Une demande de retrait NS est déjà en attente ou traitée. Rechargez la fiche.");
    transaction.set(ref,backend.cleanFirestoreValue(payload),{merge:false});
  },{maxAttempts:3});
  await backend.writeAuditLogOnce("nap.swimmer.ns.requested",context.uid,{requestId,swimmerId:String(row.id),clubId:String(context.clubId)},`${requestId}-${now}`);
  return {ok:true,swimmer,nsRequest:backend.engagementSwimmerChangeRequestItem({id:requestId,data:()=>payload})};
}
module.exports={audit,club};

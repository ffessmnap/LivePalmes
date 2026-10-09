"use strict";
// Fixed technical audit documents only. A pending operation also reserves both
// identities across failed invocations; another merge cannot split the history.
function createAudit(db,input,writeOnce){
  const ids=[Number(input.sourceSwimmerId),Number(input.targetSwimmerId)];
  if(ids.some(id=>!Number.isSafeInteger(id)||id<=0)||ids[0]===ids[1]||!input.actorUid)throw new TypeError("Deux fiches et acteur requis.");
  const pointerRefs=ids.map(id=>db.collection("auditLogs").doc(`nap-swimmer-merge-person-${id}`));
  const before=operation=>db.collection("auditLogs").doc(`nap-swimmer-merge-${operation}-before`);
  function check(pointers,operation){
    if(pointers.some(doc=>doc.exists&&doc.data().state==="pending"&&doc.data().operation!==operation))throw new TypeError("Une autre fusion est en attente pour une de ces fiches. Reprenez cette operation avant une nouvelle fusion.");
  }
  return {
    read:async operation=>{
      const [saved,...pointers]=await Promise.all([before(operation).get(),...pointerRefs.map(ref=>ref.get())]);check(pointers,operation);
      return saved.exists?saved.data().target:null;
    },
    prepare:(operation,target)=>db.runTransaction(async transaction=>{
      const [saved,...pointers]=await transaction.getAll(before(operation),...pointerRefs);check(pointers,operation);
      if(saved.exists)throw new TypeError("La preparation existe deja. Reprenez exactement la meme demande.");
      transaction.create(before(operation),{action:"nap.swimmerMerge.prepare",actorUid:input.actorUid,target,createdAt:new Date().toISOString()});
      for(const ref of pointerRefs)transaction.set(ref,{action:"nap.swimmerMerge.reservation",actorUid:input.actorUid,operation,state:"pending",updatedAt:new Date().toISOString()});
    }),
    complete:async(operation,target)=>{
      await writeOnce("nap.swimmerMerge.complete",input.actorUid,target,`nap-swimmer-merge-${operation}-complete`);
      await db.runTransaction(async transaction=>{
        const pointers=await transaction.getAll(...pointerRefs);check(pointers,operation);
        if(pointers.some(doc=>!doc.exists||doc.data().operation!==operation))throw new TypeError("Reservation de fusion a verifier.");
        for(const ref of pointerRefs)transaction.set(ref,{action:"nap.swimmerMerge.reservation",actorUid:input.actorUid,operation,state:"complete",updatedAt:new Date().toISOString()});
      });
    }
  };
}
module.exports={createAudit};

"use strict";
const store=require("./nap-records-store");
const review=require("./nap-import-record-review");
const detection=require("./nap-import-record-detection");
const {hash}=require("./nap-import-lifecycle");
function links(input){
  const result=input.importCandidates;
  if(!Array.isArray(result)||!result.length||result.length>100)throw new TypeError("Liens des candidatures invalides (100 maximum par publication).");
  if(result.some(item=>!item||!/^[a-f0-9]{64}$/.test(item.importId)||!/^[a-f0-9]{64}$/.test(item.candidateId)||typeof item.rowKey!=="string"||!item.rowKey||item.rowKey.length>500))throw new TypeError("Lien de candidature invalide.");
  if(new Set(result.map(item=>item.importId)).size!==1||new Set(result.map(item=>item.candidateId)).size!==result.length)throw new TypeError("Publiez les candidatures d’un seul import à la fois, sans doublon.");
  return result;
}
function matches(row,candidate){
  return row&&row.swimmer===candidate.swimmer&&String(row.swimmerId)===candidate.swimmerId&&Number(row.competitionId)===candidate.competitionId&&
    row.course===candidate.course&&row.sex===candidate.sex&&row.category===candidate.targetCategory&&Number(row.value)===candidate.timeValue&&
    row.time===candidate.time&&row.date===candidate.date&&row.birthDate===candidate.birthDate&&row.club===candidate.club&&row.location===candidate.location&&
    row.competition===candidate.competition&&row.seasonYear===candidate.seasonYear&&row.age===candidate.age&&row.points===candidate.points&&row.bassin===candidate.bassin&&row.chrono===candidate.chrono&&
    row.region===undefined&&row.intermediateTimes===undefined;
}
async function publish(pool,input,actor){
  const selected=links(input),importId=selected[0].importId;
  // Include provenance in private history, which is part of the existing
  // idempotency hash. A lost response cannot reuse this operation for other links.
  const history={id:`import-records|${input.operationId}`,action:"import-candidates",importId,candidates:selected.map(({candidateId,rowKey})=>({candidateId,rowKey}))};
  const proposal={...input,data:{...input.data,recordHistory:[history,...(input.data.recordHistory||[])].slice(0,1000)}};
  return review.guarded(pool,importId,(sourceQuery,competitionId,connection)=>store.publish({getConnection:async()=>connection},proposal,actor,{
    beforePublish:async({query,proposed})=>{
      const engines=await query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('livepalmes_performance_imports','livepalmes_records_current','livepalmes_records_versions') ORDER BY TABLE_NAME LIMIT 3");
      if(engines.length!==3||engines.some(table=>table.ENGINE!=="InnoDB"))throw new TypeError("La traçabilité atomique Records/MPF exige les trois tables InnoDB attendues.");
      const saved=await review.current(query,importId,{lock:true}),official=store.unpack(await query(store.READ_SQL));
      const fresh=new Map(detection.detect(importId,saved,official).map(candidate=>[candidate.id,candidate]));
      const candidates=selected.map(link=>{
        const candidate=saved.recordReview.candidates.find(candidate=>candidate.id===link.candidateId),current=fresh.get(link.candidateId);
        if(!candidate||candidate.state!=="accepted"||!current||candidate.referenceRevision!==official.revision||candidate.referenceFingerprint!==current.referenceFingerprint||candidate.source.fingerprint!==current.source.fingerprint)throw new TypeError("Une candidature n’est plus contrôlée ou sa référence a changé. Actualisez sa revue.");
        const rows=candidate.type==="MPF"?proposed.records:proposed.franceRecords,row=rows.find(row=>row.key===link.rowKey);
        if(rows.filter(row=>row.key===link.rowKey).length!==1||!matches(row,candidate)||(candidate.type!=="MPF"&&row.recordType!==candidate.type))throw new TypeError("Le brouillon diffère de sa candidature. Préparez-le à nouveau depuis l’import.");
        // Reuse the existing exact-time tie rule; do not retain a slower holder
        // in the same official cell when replacing an improved reference.
        const peers=rows.filter(row=>detection.recordKey(candidate.type,row)===candidate.recordKey&&(candidate.type==="MPF"||row.recordType===candidate.type));
        if(peers.some(peer=>Number(peer.value)!==candidate.timeValue))throw new TypeError("Plusieurs temps différents visent la même référence. Vérifiez les brouillons.");
        if(peers.some(peer=>peer.key!==link.rowKey&&detection.sameName(peer.swimmer,candidate.swimmer)))throw new TypeError("Le même titulaire apparaît plusieurs fois pour cette référence. Conservez un seul brouillon pour ses performances égales.");
        return {...candidate,publishedKey:link.rowKey};
      });
      await review.verifySources(sourceQuery,saved,candidates.map(candidate=>candidate.source));
      return {saved,candidates};
    },
    afterPublish:async({query,context,result})=>{
      const selected=new Map(context.candidates.map(candidate=>[candidate.id,candidate]));
      const next={...context.saved.recordReview,candidates:context.saved.recordReview.candidates.map(candidate=>selected.has(candidate.id)?{...candidate,state:"published",publishedRevision:result.revision,publishedKey:selected.get(candidate.id).publishedKey,publishedAt:result.data.updatedAt}:candidate)};
      await review.writeReview(query,importId,next);
      const saved=(await query("SELECT JSON_EXTRACT(metadata,'$.recordReview') AS record_review FROM livepalmes_performance_imports WHERE id=? LIMIT 1",[importId]))[0];
      if(hash(require("./nap-import-lifecycle").parse(saved?.record_review))!==hash(next))throw new TypeError("Traçabilité Records/MPF non confirmée.");
    }
  }));
}
module.exports={publish,links,matches};

"use strict";
// Import provenance and review lifecycle only: no record detection or sporting write.
const {createHash}=require("node:crypto");
const {stableStringify}=require("./public-records-data");
const hash=value=>createHash("sha256").update(stableStringify(value)).digest("hex");
const pointerId=competitionId=>hash(["nap-results-current",competitionId]);
const parse=value=>typeof value==="string"?JSON.parse(value):value;
function initialReview(){return {version:1,state:"current",candidates:[]};}
function sourceReference(importId,source){
  return {version:1,key:`${importId}:perfs:${source.performanceId}`,performanceId:source.performanceId,sourceLine:source.sourceLine,origin:source.origin,fingerprint:source.fingerprint};
}
function invalidateReview(review,{reason,operationId}){
  if(!review)return null; // Old imports are never backfilled/detected here.
  if(review.version!==1||!Array.isArray(review.candidates)||review.candidates.length>10000||Buffer.byteLength(JSON.stringify(review))>2*1024*1024)throw new TypeError("Journal des candidatures Records/MPF incompatible.");
  if(!["replaced","deleted"].includes(reason)||!/^[a-f0-9]{64}$/.test(operationId))throw new TypeError("Invalidation d’import incompatible.");
  return {...review,state:reason,invalidatedBy:{reason,operationId},candidates:review.candidates.map(candidate=>{
    if(!candidate||!["pending","accepted","rejected","published","invalidated"].includes(candidate.state))throw new TypeError("État de candidature Records/MPF incompatible.");
    if(candidate.state==="published"){
      if(!Number.isSafeInteger(candidate.publishedRevision)||candidate.publishedRevision<1)throw new TypeError("Version Records/MPF publiée manquante.");
      return {...candidate,requiresReview:true,sourceInvalidatedBy:{reason,operationId}};
    }
    return ["pending","accepted"].includes(candidate.state)?{...candidate,state:"invalidated",sourceInvalidatedBy:{reason,operationId}}:candidate;
  })};
}
async function invalidateImportReview(query,importId,change){
  const rows=await query("SELECT JSON_EXTRACT(metadata,'$.recordReview') AS record_review FROM livepalmes_performance_imports WHERE id=? LIMIT 1",[importId]);
  const review=invalidateReview(parse(rows[0]?.record_review),change);
  if(review)await query("UPDATE livepalmes_performance_imports SET metadata=JSON_SET(metadata,'$.recordReview',CAST(? AS JSON)),updated_at=UTC_TIMESTAMP(6) WHERE id=? LIMIT 1",[JSON.stringify(review),importId]);
}
module.exports={hash,pointerId,parse,initialReview,sourceReference,invalidateReview,invalidateImportReview};

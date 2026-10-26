"use strict";
const {previewImportDifferences}=require("./nap-import-operation-plan");
function importPreviewResponse(pack) {
  const rows=pack.decoded.rows.map(r=>({sourceLine:r.sourceLine,kind:r.kind,firstName:r.firstName||"",lastName:r.lastName||"",birthDate:r.birthDate||"",sex:r.sex||"",course:r.course,...(r.sourceCourse?{sourceCourse:r.sourceCourse}:{}),category:r.category,clubCode:r.clubCode,status:r.status,time:r.rawFinalTime,eligible:r.eligible,memberHints:r.memberHints||[]}));
  const base={ok:true,source:"nap",metadata:pack.decoded.metadata,rows,sourceClubs:pack.decoded.clubs.map(c=>({code:c.cells[1]||"",name:c.cells[2]||"",federalNumber:c.cells[3]||""})),excludedSourceLines:pack.decoded.excluded.map(r=>r.sourceLine),summary:pack.decoded.summary,canConfirm:false};
  base.automaticExcludedSourceLines=pack.decoded.excluded.filter(r=>r.exclusionReason==='empty-relay').map(r=>r.sourceLine);
  base.excludedRows=pack.decoded.excluded.map(r=>({sourceLine:r.sourceLine,kind:r.kind,lastName:r.lastName||"",firstName:r.firstName||"",birthDate:r.birthDate||"",course:r.course,clubCode:r.clubCode,time:r.rawFinalTime,status:r.status,exclusionReason:r.exclusionReason||'manual'}));
  if(pack.requiresCompetitionChoice)return {...base,issues:pack.decoded.issues,requiresCompetitionChoice:true,competitions:pack.competitions};
  const unresolved=pack.resolution.unresolved.map(r=>({...r,sourceLine:pack.decoded.rows.filter(r=>r.kind==="NAG")[r.rowIndex].sourceLine}));
  const resolved=pack.resolution.resolved.map(r=>({...r,sourceLine:pack.decoded.rows.filter(r=>r.kind==="NAG")[r.rowIndex].sourceLine}));
  const result={...base,...(pack.courseReview?{courseReview:pack.courseReview}:{}),...(pack.review?{review:pack.review,clubMatches:pack.clubMatches,existingCounts:{individual:pack.existing.length,relays:pack.existingRelays.length,statuses:pack.existingStatuses.length}}:{}),competition:pack.competition,canConfirm:pack.canConfirm,issues:pack.issues,resolved,unresolved,unresolvedClubs:pack.unresolvedClubs,unresolvedMembers:pack.unresolvedMembers,
    clubs:pack.clubs.map(c=>({id:String(c.num_club),code:c.abre_club,name:c.nom_club,federalNumber:c.federal_club||""})),expectedFingerprint:pack.expectedFingerprint,previewFingerprint:pack.previewFingerprint};
  if(pack.canConfirm) {
    try {
      const diff=previewImportDifferences(pack);
      result.diff={summary:diff.summary,requiresReplacementConfirmation:diff.requiresReplacementConfirmation,
        removals:[...diff.individual.removals.map(row=>({kind:"NAG",id:row.id,swimmerId:row.nageur,course:row.course,time:row.tps,clubId:row.club})),...diff.relays.removals.map(row=>({kind:"REL",id:row.id,course:row.distance,time:row.tps4,clubId:row.club}))]};
      if(pack.review){
        result.diff=require("./nap-import-replacement-review").replacementReview(pack,diff);
        if(pack.existingProtocol)result.protocolReview={previous:{fileName:pack.existingProtocol.fileName,hash:pack.existingProtocol.hash},managed:true};
        if(pack.protocolManifest){
          result.protocolReview={...result.protocolReview,incoming:pack.protocolManifest,changed:Boolean(pack.existingProtocol&&pack.existingProtocol.hash!==pack.protocolManifest.hash)};
          if(result.protocolReview.changed){result.diff.requiresReplacementConfirmation=true;result.diff.identical=false;}
        }
        if(pack.textManifest){
          result.textReview={incoming:pack.textManifest,previous:pack.existingText,changed:Boolean(pack.existingText&&pack.existingText.hash!==pack.textManifest.hash)};
          if(result.textReview.changed){result.diff.requiresReplacementConfirmation=true;result.diff.identical=false;}
        }
      }
    }catch(error){if(!(error instanceof TypeError||error instanceof RangeError))throw error;result.canConfirm=false;result.issues=[...result.issues,{sourceLine:0,code:error.message}];}
  }
  return result;
}
module.exports={importPreviewResponse};

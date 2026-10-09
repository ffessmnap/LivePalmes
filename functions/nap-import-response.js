"use strict";
const {previewImportDifferences}=require("./nap-import-operation-plan");
function importPreviewResponse(pack) {
  const rows=pack.decoded.rows.map(r=>({sourceLine:r.sourceLine,kind:r.kind,firstName:r.firstName||"",lastName:r.lastName||"",birthDate:r.birthDate||"",sex:r.sex||"",course:r.course,category:r.category,clubCode:r.clubCode,status:r.status,time:r.rawFinalTime,eligible:r.eligible}));
  const base={ok:true,source:"nap",metadata:pack.decoded.metadata,rows,excludedSourceLines:pack.decoded.excluded.map(r=>r.sourceLine),summary:pack.decoded.summary,canConfirm:false};
  if(pack.requiresCompetitionChoice)return {...base,requiresCompetitionChoice:true,competitions:pack.competitions};
  const unresolved=pack.resolution.unresolved.map(r=>({...r,sourceLine:pack.decoded.rows.filter(r=>r.kind==="NAG")[r.rowIndex].sourceLine}));
  const resolved=pack.resolution.resolved.map(r=>({...r,sourceLine:pack.decoded.rows.filter(r=>r.kind==="NAG")[r.rowIndex].sourceLine}));
  const result={...base,competition:pack.competition,canConfirm:pack.canConfirm,issues:pack.issues,resolved,unresolved,unresolvedClubs:pack.unresolvedClubs,unresolvedMembers:pack.unresolvedMembers,
    clubs:pack.clubs.map(c=>({id:String(c.num_club),code:c.abre_club,name:c.nom_club})),expectedFingerprint:pack.expectedFingerprint,previewFingerprint:pack.previewFingerprint};
  if(pack.canConfirm) {
    try {
      const diff=previewImportDifferences(pack);
      result.diff={summary:diff.summary,requiresReplacementConfirmation:diff.requiresReplacementConfirmation,
        removals:[...diff.individual.removals.map(row=>({kind:"NAG",id:row.id,swimmerId:row.nageur,course:row.course,time:row.tps,clubId:row.club})),...diff.relays.removals.map(row=>({kind:"REL",id:row.id,course:row.distance,time:row.tps4,clubId:row.club}))]};
    }catch(error){if(!(error instanceof TypeError||error instanceof RangeError))throw error;result.canConfirm=false;result.issues=[...result.issues,{sourceLine:0,code:error.message}];}
  }
  return result;
}
module.exports={importPreviewResponse};

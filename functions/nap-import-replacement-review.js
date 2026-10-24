"use strict";
// Only uniquely paired results are labelled changed. Ambiguous heat/final
// pairs stay explicit additions/removals instead of guessing provenance.
function replacementReview(pack,diff) {
  const describe=(kind,row)=>kind==="NAG"?{kind,id:row.id||null,swimmerId:row.nageur,course:row.course,time:row.tps,clubId:row.club,category:row.cat,passage:row.passage}:{kind,id:row.id||null,course:row.distance,time:row.tps4,clubId:row.club,category:row.categorie,members:[row.nageur1,row.nageur2,row.nageur3,row.nageur4]};
  const additions=[...diff.individual.additions.map(i=>describe("NAG",i.row)),...diff.relays.additions.map(i=>describe("REL",i.row))];
  const removals=[...diff.individual.removals.map(r=>describe("NAG",r)),...diff.relays.removals.map(r=>describe("REL",r))];
  const key=r=>JSON.stringify([r.kind,r.kind==="REL"?r.clubId:r.swimmerId,r.course,r.kind==="REL"?r.category:r.passage||0]);
  const changes=[];
  for(const removal of removals) {
    const before=removals.filter(r=>key(r)===key(removal)),after=additions.filter(r=>key(r)===key(removal));
    if(before.length===1&&after.length===1)changes.push({before:removal,after:after[0]});
  }
  const statusKey=r=>JSON.stringify([String(r.swimmerId||""),r.course,r.clubCode||r.club,r.category,r.status]);
  const old=(pack.existingStatuses||[]).map(r=>({...r})),statusAdditions=[];
  for(const row of pack.statusRows){const index=old.findIndex(r=>statusKey(r)===statusKey(row));if(index>=0)old.splice(index,1);else statusAdditions.push({swimmerId:row.swimmerId,course:row.course,club:row.clubCode,status:row.status,category:row.category});}
  const beforeCount=pack.existing.length+pack.existingRelays.length+(pack.existingStatuses||[]).length;
  const differs=Boolean(additions.length||removals.length||statusAdditions.length||old.length);
  return {additions,removals,changes,statusAdditions,statusRemovals:old,hasExisting:beforeCount>0,identical:beforeCount>0&&!differs&&!pack.statusRows.length&&!(pack.existingStatuses||[]).length,
    requiresReplacementConfirmation:beforeCount>0&&differs,summary:{...diff.summary,changes:changes.length,statusAdditions:statusAdditions.length,statusRemovals:old.length}};
}
module.exports={replacementReview};

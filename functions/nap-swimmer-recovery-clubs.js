"use strict";
// Recovery freezes unresolved historic clubs before changing the swimmer club.
const {isDeepStrictEqual:equal}=require("node:util");
const merge=require("./nap-swimmer-merge-plan"),clubs=require("./nap-swimmer-merge-clubs");
const {hash}=require("./nap-approved-swimmer-correction");
const specs=merge.TABLES.filter(spec=>clubs.TABLES.includes(spec.table));
async function readRows(query,id){
 const snapshots={};let count=0;
 for(const spec of specs){
  const rows=[];
  for(const field of spec.fields){
   const index=spec.table==="perfs"?"nageur":`livepalmes_${field}_id`;
   const batch=await query(`SELECT * FROM \`${spec.table}\` FORCE INDEX (\`${index}\`) WHERE \`${field}\`=? ORDER BY id LIMIT 4001`,[id]);
   if(batch.length>4000)throw new RangeError("Historique trop volumineux pour recuperation directe.");
   rows.push(...batch);
  }
  snapshots[spec.table]=[...new Map(rows.map(row=>[String(row.id),row])).values()];count+=snapshots[spec.table].length;
 }
 if(count>4000)throw new RangeError("Historique superieur a 4000 lignes.");
 return snapshots;
}
function build(before,snapshots,recognizedClubIds){
 const oldClub=String(before.club??""),recognized=[...recognizedClubIds].sort((a,b)=>Number(a)-Number(b));
 const changes=specs.map(spec=>({table:spec.table,key:spec.key,removals:[],updates:snapshots[spec.table]
  .filter(row=>recognized.includes(oldClub)&&!recognized.includes(String(row.club)))
  .map(row=>({before:{...row},after:{...row,club:oldClub}}))}));
 const body={version:1,snapshots,recognizedClubIds:recognized,changes};
 return {...body,hash:hash(body)};
}
function validate(plan){
 const policy=plan.performanceClubs;
 if(!policy||policy.version!==1||!Array.isArray(policy.recognizedClubIds)||policy.recognizedClubIds.some(id=>clubs.clubId(id)!==id)||new Set(policy.recognizedClubIds).size!==policy.recognizedClubIds.length)throw new TypeError("Sauvegarde des clubs historiques incompatible.");
 if(!equal(policy,build(plan.before,policy.snapshots,policy.recognizedClubIds)))throw new TypeError("Sauvegarde des clubs historiques incompatible.");
 for(const spec of specs)if(!Array.isArray(policy.snapshots[spec.table])||policy.snapshots[spec.table].some(row=>!spec.fields.some(field=>Number(row[field])===Number(plan.before.id))))throw new TypeError("Provenance historique incompatible.");
 if(Object.values(policy.snapshots).reduce((sum,rows)=>sum+rows.length,0)>4000||Buffer.byteLength(JSON.stringify(plan))>500000)throw new RangeError("Sauvegarde de recuperation trop volumineuse.");
}
async function prepare(query,before,snapshots){
 const rows=await clubs.readClubs({execute:async({sql},values)=>[await query(sql,values)]},[before.club,...Object.values(snapshots).flat().map(row=>row.club)]);
 return build(before,snapshots,rows.map(row=>String(row.num_club)));
}
module.exports={readRows,build,validate,prepare};

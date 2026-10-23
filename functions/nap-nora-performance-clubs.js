"use strict";
// Explicit, fixed-person repair. No arbitrary swimmer, club, SQL or journal input.
const {createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const merge=require("./nap-swimmer-merge-plan"),clubs=require("./nap-swimmer-merge-clubs");
const OPERATION="nap-nora-13787-performance-clubs-20261024",ID=13787;
const TABLES=merge.TABLES.filter(spec=>clubs.TABLES.includes(spec.table));
const digest=value=>createHash("sha256").update(JSON.stringify(value,(_,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item)).digest("hex");
const completeId=operation=>createHash("sha256").update(`nap.swimmerMerge.complete|nap-swimmer-merge-${operation}-complete`).digest("hex").slice(0,40);
const sameRows=(left,right)=>require("./nap-swimmer-merge").sameRows(left,right);
const isNora=row=>row&&row.nom==="LOISEL"&&row.prenom==="Nora"&&row.date==="2000-12-11";
function owner(row,spec,source,target){return [source,target].filter(person=>spec.fields.some(field=>Number(row[field])===Number(person.id)));}
function buildPlan(people,markers,events,snapshots,clubRows){
 const target=people.find(row=>Number(row.id)===ID);
 if(!isNora(target)||String(target.club)!=="107"||people.length!==1||markers.length!==2||events.length!==2)throw new TypeError("Perimetre de Nora divergent.");
 const known=clubRows.map(row=>String(row.num_club)),provenance=new Map(),conflicts=new Set();
 if(new Set(events.map(event=>event.plan?.sourceSwimmerId)).size!==2)throw new TypeError("Deux origines distinctes de Nora requises.");
 for(const event of [...events].sort((a,b)=>a.plan.timestamp.localeCompare(b.plan.timestamp))){
  const p=event.plan;
  if(!isNora(p.source)||!isNora(p.target)||Number(p.targetSwimmerId)!==ID||!p.permanentDelete||!markers.some(m=>equal(m,p.marker))||!event.verified)throw new TypeError("Journal de fusion non confirme pour Nora.");
  // Refuse a damaged journal; preserve the legacy policy of its exact version.
  merge.validateSaved(p,{...p,confirmMerge:true});
  for(const spec of TABLES)for(const row of p.snapshots[spec.table]){
   const origins=owner(row,spec,p.source,p.target),key=spec.table+":"+row.id;
   if(origins.length!==1){conflicts.add(key);continue;}
   const prior=provenance.get(key);
   // Later target snapshots include performances already transferred by the
   // earlier event. Their initial owner, not that later target, remains proof.
   if(prior){if(Number(origins[0].id)!==ID||!equal({...prior.row,...Object.fromEntries(spec.fields.map(field=>[field,Number(prior.row[field])===Number(prior.person.id)?ID:prior.row[field]]))},row))conflicts.add(key);continue;}
   provenance.set(key,{row,person:origins[0],operation:p.operation});
  }
 }
 const changes=[],skipped=[],retained=[];
 for(const spec of TABLES){
  const updates=[];
  for(const row of snapshots[spec.table]){
   if(known.includes(String(row.club))){retained.push({table:spec.table,id:row.id,club:row.club});continue;}
   const key=spec.table+":"+row.id,origin=provenance.get(key);
   if(!origin||conflicts.has(key)){skipped.push({table:spec.table,id:row.id,reason:"provenance_absente_ou_ambigue"});continue;}
   const expected={...origin.row};for(const field of spec.fields)if(markers.some(m=>Number(m.swimmer_id)===Number(expected[field])))expected[field]=ID;
   const club=known.includes(String(origin.row.club))?String(origin.row.club):String(origin.person.club);
   if(!equal(row,expected)||!known.includes(club)){skipped.push({table:spec.table,id:row.id,reason:"ligne_modifiee_ou_club_inconnu"});continue;}
   updates.push({before:{...row},after:{...row,club},originalSwimmerId:String(origin.person.id),originalClubId:String(origin.person.club),mergeOperation:origin.operation});
  }
  changes.push({table:spec.table,key:spec.key,updates,removals:[]});
 }
 const plan={operation:OPERATION,swimmerId:ID,actorUid:"github-livepalmes-test-backend",reason:"Accord explicite Antoine : restaurer les clubs certains de Nora depuis les audits de fusion, 24 octobre 2026",people,markers,snapshots,changes,skipped,retained,mergeOperations:events.map(e=>e.plan.operation).sort()};
 if(Buffer.byteLength(JSON.stringify(plan))>500000)throw new RangeError("Sauvegarde de Nora trop volumineuse.");
 return {...plan,planHash:digest(plan)};
}
function validatePlan(plan){
 const {planHash,...body}=plan;
 if(plan.operation!==OPERATION||plan.swimmerId!==ID||digest(body)!==planHash||!Array.isArray(plan.changes)||plan.changes.length!==2)throw new TypeError("Sauvegarde de Nora incompatible.");
 for(const change of plan.changes){
  if(!clubs.TABLES.includes(change.table)||!equal(change.key,["id"])||change.removals.length)throw new TypeError("Table de correction interdite.");
  for(const item of change.updates)if(!equal({...item.before,club:item.after.club},item.after)||!clubs.clubId(item.after.club)||!TABLES.find(s=>s.table===change.table).fields.some(field=>Number(item.before[field])===ID))throw new TypeError("Correction autre que le club refusee.");
 }
}
async function repair(pool,input,audit){
 if(input?.confirmation!==OPERATION||!["prepare","apply"].includes(input.phase))throw new TypeError("Accord fixe de Nora requis.");
 let plan=await audit.read();if(plan)validatePlan(plan);
 if(input.phase==="apply"&&(!plan||input.planHash!==plan.planHash))throw new TypeError("Sauvegarde prealable de Nora requise.");
 const connection=await pool.getConnection();let locked=false,safe=false,queries=0;
 const query=async(sql,values=[])=>{if(++queries>40)throw new RangeError("Budget de Nora depasse.");return(await connection.execute({sql,timeout:10000},values))[0];};
 const readMarkers=()=>query("SELECT swimmer_id,target_id,merged_at,merged_by FROM livepalmes_swimmer_merges FORCE INDEX (target_swimmer) WHERE target_id=? ORDER BY swimmer_id LIMIT 11",[ID]);
 const readPeople=ids=>query(`SELECT id,nom,prenom,date,club FROM nageurs FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id`,ids);
 const readRows=async()=>{
  const result={};let count=0;
  for(const spec of TABLES){const rows=[];for(const field of spec.fields)rows.push(...await query(`SELECT * FROM \`${spec.table}\` FORCE INDEX (\`${spec.table==="perfs"?"nageur":`livepalmes_${field}_id`}\`) WHERE \`${field}\`=? ORDER BY id LIMIT 4001`,[ID]));result[spec.table]=[...new Map(rows.map(row=>[String(row.id),row])).values()];count+=result[spec.table].length;}
  if(count>4000)throw new RangeError("Historique de Nora trop volumineux.");return result;
 };
 try{
  await connection.query({sql:"LOCK TABLES perfs WRITE,perfs_relais WRITE,nageurs READ,clubs READ,livepalmes_swimmer_merges READ",timeout:10000});locked=true;safe=true;
  const markers=await readMarkers();if(markers.length!==2)throw new TypeError("Deux fusions certaines de Nora requises.");
  const people=await readPeople([ID,...markers.map(m=>m.swimmer_id)]),snapshots=await readRows();
  if(!plan){
   const events=await Promise.all(markers.map(async marker=>{
    const pointer=await audit.readDocument(`nap-swimmer-merge-person-${marker.swimmer_id}`);
    if(pointer?.state!=="complete"||!/^[a-f0-9]{64}$/.test(pointer.operation||""))throw new TypeError("Fusion de Nora en attente ou sans preuve.");
    const before=await audit.readDocument(`nap-swimmer-merge-${pointer.operation}-before`),complete=await audit.readDocument(completeId(pointer.operation));
    return {plan:before?.target,verified:complete?.target?.verified===true&&complete?.target?.sourceDeleted===true&&complete?.target?.operation===pointer.operation};
   }));
   const clubRows=await clubs.readClubs(connection,[...events.flatMap(e=>[e.plan?.source?.club,e.plan?.target?.club]),...clubs.TABLES.flatMap(table=>snapshots[table].map(row=>row.club))]);
   plan=buildPlan(people,markers,events,snapshots,clubRows);validatePlan(plan);await audit.prepare(plan);
  }
  if(!sameRows(people,plan.people)||!sameRows(markers,plan.markers))throw new TypeError("Fiches ou fusions de Nora modifiees.");
  const activeClubs=await clubs.readClubs(connection,plan.changes.flatMap(change=>change.updates.map(item=>item.after.club)));
  if(plan.changes.some(change=>change.updates.some(item=>!activeClubs.some(club=>String(club.num_club)===item.after.club))))throw new TypeError("Club de correction disparu.");
  const work=plan.changes.map(change=>({...change,...require("./nap-swimmer-merge").pending(snapshots[change.table],plan.snapshots[change.table],change)}));
  if(input.phase==="prepare")return {source:"nap",mode:OPERATION,writesExecuted:false,plan};
  for(const change of work){
   const statement=merge.statement(change.table,change.key,change.updates);if(!statement)continue;
   const proof=await query(`EXPLAIN ${statement.sql}`,statement.values);
   if(!proof.length||proof.some(row=>row.table&&!String(row.table).startsWith("<")&&(!row.key||row.type==="ALL")))throw new TypeError("Correction de Nora non indexee.");
   if((await query(statement.sql,statement.values)).affectedRows!==statement.count)throw new Error("Correction de Nora interrompue ; reprendre la sauvegarde.");
  }
  const verified=await readRows();if(work.some(change=>!sameRows(verified[change.table],change.expected)))throw new Error("Clubs de Nora a verifier ; sauvegarde conservee.");
  const counts={};for(const change of plan.changes)for(const item of change.updates){const key=item.after.club;counts[key]=(counts[key]||0)+1;}
  const result={source:"nap",mode:OPERATION,swimmerId:ID,planHash:plan.planHash,verified:true,changed:plan.changes.reduce((n,c)=>n+c.updates.length,0),written:work.reduce((n,c)=>n+c.updates.length,0),counts,skipped:plan.skipped,retained:plan.retained.length};
  await connection.query({sql:"UNLOCK TABLES",timeout:10000});locked=false;await audit.complete(result);return result;
 }finally{
  try{if(locked)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}
  if(safe)connection.release();else connection.destroy();
 }
}
module.exports={OPERATION,ID,buildPlan,validatePlan,repair};

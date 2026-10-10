"use strict";
// Explicit preview then confirmation. MyISAM effects are backed up before writes;
// an interrupted multi-table deletion is reserved for manual recovery, never retried.
const {createHash}=require("node:crypto");
const refs=require("./nap-competition-deletion-references");
const MAX_ROWS=2000,MAX_BYTES=500000;
const canonical=value=>Buffer.isBuffer(value)?{nativeType:"buffer",base64:value.toString("base64")}:value instanceof Date?{nativeType:"date",iso:value.toISOString()}:Array.isArray(value)?value.map(canonical):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const sorted=rows=>rows.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
function idOf(value){const match=/^legacy-nap-([1-9]\d{0,9})$/.exec(value||"");if(!match||Number(match[1])>2147483647)throw new TypeError("Competition NAP requise.");return Number(match[1]);}
const extraTables=["competitions","winpalme_courses"];
function locks(previewOnly=false){const names=[...new Set([...extraTables,...refs.map(r=>r.table)])];return names.map(table=>`\`${table}\` ${!previewOnly&&(extraTables.includes(table)||refs.some(r=>r.table===table&&r.cleanup)||table==="livepalmes_qualification_competitions")?"WRITE":"READ"}`).join(",");}
async function readPlan(query,id,scope){
 const competition=(await query("SELECT * FROM competitions FORCE INDEX(PRIMARY) WHERE id=? LIMIT 1",[id]))[0];
 if(!competition)throw new TypeError("Competition NAP introuvable.");
 const cleanup=[];let total=0;
 // These two parent sets are required for the child-program/qualification queries.
 for(const ref of refs.filter(r=>r.cleanup)){
  const rows=sorted(await query(`SELECT * FROM \`${ref.table}\` FORCE INDEX(\`${ref.index}\`) WHERE \`${ref.field}\`=? LIMIT ${MAX_ROWS+1}`,[id]));
  if(ref.table==="livepalmes_qualification_jobs"&&rows.some(row=>!["done","cancelled"].includes(row.state)))throw new TypeError("Terminez ou annulez le controle de qualification avant suppression.");
  total+=rows.length;if(total>MAX_ROWS)throw new RangeError("Dossier trop volumineux pour cette suppression ; aucune donnee retiree.");
  cleanup.push({...ref,rows});
 }
 const groups=cleanup.find(r=>r.table==="livepalmes_qualification_groups").rows.map(r=>r.id);
 const sessions=cleanup.find(r=>r.table==="winpalme_sessions").rows.map(r=>r.id);
 for(const ref of refs.filter(r=>!r.cleanup)){
  let sql=`SELECT 1 FROM \`${ref.table}\` FORCE INDEX(\`${ref.index}\`) WHERE \`${ref.field}\`=?`,values=[id];
  if(ref.table==="livepalmes_qualification_competitions"&&groups.length){sql+=` AND group_id NOT IN (${groups.map(()=>"?").join(",")})`;values.push(...groups);}
  if((await query(sql+" LIMIT 1",values)).length)throw new TypeError("Cette competition possede des engagements, resultats ou un historique rattache. Elle doit etre conservee.");
 }
 if((await query("SELECT 1 FROM compet_participations FORCE INDEX(livepalmes_delete_participation) WHERE participation=? AND compet<>? LIMIT 1",[id,id])).length)throw new TypeError("Une autre competition utilise celle-ci comme condition de participation. Retirez ce lien avant suppression.");
 for(const [table,field,index,values]of [["winpalme_courses","session","livepalmes_session_pos_id",sessions],["livepalmes_qualification_competitions","group_id","PRIMARY",groups]]){
  const rows=values.length?sorted(await query(`SELECT * FROM \`${table}\` FORCE INDEX(\`${index}\`) WHERE \`${field}\` IN (${values.map(()=>"?").join(",")}) LIMIT ${MAX_ROWS+1}`,values)):[];
  total+=rows.length;if(total>MAX_ROWS)throw new RangeError("Dossier trop volumineux pour cette suppression.");
  // Children are deleted before the corresponding parent rows.
  cleanup.unshift({table,field,index,values,rows});
 }
 for(const key of ["id","date","enddate","comite","ld"])if(digest(competition[key]??null)!==digest(scope.nativeSnapshot.competition[key]??null))throw new TypeError("La competition a change. Rechargez sa fiche.");
 const parameters=cleanup.find(r=>r.table==="compet_parametres").rows;
 if(parameters.length!==1||["id","compet","niveau"].some(key=>digest(parameters[0][key]??null)!==digest(scope.nativeSnapshot.parameters[key]??null)))throw new TypeError("Les parametres ont change. Rechargez la fiche.");
 const plan={competitionId:id,competition,cleanup};
 if(Buffer.byteLength(JSON.stringify(plan))>MAX_BYTES)throw new RangeError("Sauvegarde trop volumineuse pour cette action.");
 return plan;
}
function summary(plan){
 const count=table=>plan.cleanup.find(r=>r.table===table)?.rows.length||0;
 const detailed=plan.cleanup.find(r=>r.table==="livepalmes_competition_programs")?.rows[0];
 return {ok:true,source:"nap",competitionId:`legacy-nap-${plan.competitionId}`,expectedFingerprint:digest(plan),name:plan.competition.libelle,
  documents:count("documents")+count("compet_file")+Number(Boolean(plan.competition.filepdf))+Number(Boolean(plan.competition.filetxt)),
  courses:count("compet_courses"),programSessions:count("winpalme_sessions"),programCourses:count("winpalme_courses"),detailedProgram:Boolean(detailed),
  warning:"La competition, ses documents rattaches, son programme et ses parametres seront retires. Cette action est irreversible."};
}
async function competitionDeletion(pool,input,audit,authorize){
 const id=idOf(input?.competitionId);
 if(typeof input.actorUid!=="string"||!input.actorUid||input.actorUid.length>128||typeof authorize!=="function")throw new TypeError("Controle du perimetre requis.");
 if(input.previewOnly!==true&&(input.confirmPermanent!==true||!/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"")))throw new TypeError("Apercu et confirmation explicite requis.");
 const scope=await authorize(id); // includes current role, region and past-event rules
 const connection=await pool.getConnection();let locked=false,safe=true,calls=0;
 const query=async(sql,values=[])=>{if(++calls>110)throw new RangeError("Budget de suppression depasse.");return(await connection.execute({sql,timeout:10000},values))[0];};
 try{
  const tables=[...new Set([...extraTables,...refs.map(r=>r.table)])];
  if((await query(`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN (${tables.map(()=>"?").join(",")}) LIMIT 1`,tables)).length)throw new TypeError("Declencheur NAP a verifier avant suppression.");
  if((await query("SELECT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME='competitions' LIMIT 1")).length)throw new TypeError("Liens declares de la competition a verifier avant suppression.");
  await connection.query({sql:`LOCK TABLES ${locks(input.previewOnly===true)}`,timeout:10000});locked=true;
  const plan=await readPlan(query,id,scope),preview=summary(plan);
  if(input.previewOnly===true)return preview;
  if(preview.expectedFingerprint!==input.expectedFingerprint)throw new TypeError("Le dossier a change depuis l'avertissement. Recommencez l'apercu.");
  const operation=digest(["competition-delete",input.actorUid,id,input.expectedFingerprint]);
  // A durable create-only reservation prevents automatic retries after any
  // uncertain effect. Raw native rows fit below the audit document ceiling.
  await audit.prepare(String(id),{operation,actorUid:input.actorUid,plan,scope:scope.event});
  for(const ref of plan.cleanup){
   if(!ref.rows.length)continue;
   const values=ref.values||[id];
   const result=await query(`DELETE FROM \`${ref.table}\` WHERE \`${ref.field}\` IN (${values.map(()=>"?").join(",")})`,values);
   if(result.affectedRows!==ref.rows.length)throw new Error("Suppression interrompue : sauvegarde conservee, verification requise.");
  }
  const result=await query("DELETE FROM competitions WHERE id=? LIMIT 1",[id]);
  if(result.affectedRows!==1||(await query("SELECT 1 FROM competitions FORCE INDEX(PRIMARY) WHERE id=? LIMIT 1",[id])).length)throw new Error("Suppression a verifier ; sauvegarde conservee.");
  await connection.query({sql:"UNLOCK TABLES",timeout:10000});locked=false;
  await audit.complete(String(id),{operation,competitionId:input.competitionId,verified:true});
  return {ok:true,source:"nap",deleted:true,competitionId:input.competitionId,operation};
 }finally{try{if(locked)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}if(safe)connection.release();else connection.destroy();}
}
module.exports={MAX_ROWS,MAX_BYTES,canonical,digest,idOf,locks,readPlan,summary,competitionDeletion};

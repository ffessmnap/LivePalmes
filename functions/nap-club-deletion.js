"use strict";
// National-created, unused clubs only. Fixed <=40 SQL calls, one row deleted.
const {createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util"),{nativeEqual}=require("./nap-native-compare");
const {COLUMNS}=require("./nap-club-change"),directory=require("./nap-club-directory"),{references}=require("./nap-club-deletion-references");
function operation(input){return createHash("sha256").update(JSON.stringify(["club-delete",input.actorUid,String(input.clubId),input.expectedFingerprint])).digest("hex");}
async function deleteClub(pool,input,audit,authorize){
 if(!/^[1-9]\d{0,9}$/.test(input?.clubId||"")||!input.actorUid||input.actorUid.length>128||input.confirmPermanent!==true||!/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"")||typeof authorize!=="function")throw new TypeError("Confirmation nationale et fiche affichee requises.");
 await authorize();
 const creation=await audit.creation(input.clubId);
 if(String(creation?.nativeId)!==input.clubId||creation.phase!=="identified"||!creation.timestamp)throw new TypeError("Seul un club cree dans LivePalmes peut etre supprime.");
 // Firebase accounts remain authoritative; query each technical relationship
 // once with limit 1 before taking the native locks.
 await audit.assertNoAccounts(input.clubId);
 const key=operation(input),saved=await audit.read(key);
 const connection=await pool.getConnection();let locked=false,safe=true,calls=0;
 const query=async(sql,values=[])=>{if(++calls>38)throw new RangeError("Budget de suppression club depasse.");return(await connection.execute({sql,timeout:10000},values))[0];};
 const read=()=>query(`SELECT ${COLUMNS.map(c=>`\`${c}\``).join(",")} FROM clubs FORCE INDEX (PRIMARY) WHERE num_club=? LIMIT 1`,[Number(input.clubId)]);
 try{
  if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='clubs' LIMIT 1")).length)throw new TypeError("Declencheur club a verifier.");
  await connection.query({sql:`LOCK TABLES clubs WRITE,${[...new Set(references.map(ref=>ref.table))].map(table=>`\`${table}\` READ`).join(",")}`,timeout:10000});locked=true;
  const rows=await read(),plan=saved||{operation:key,actorUid:input.actorUid,clubId:input.clubId,native:rows[0],creationOperation:creation.operation};
  if(!plan.native||COLUMNS.some(c=>!Object.hasOwn(plan.native,c))||plan.operation!==key||plan.actorUid!==input.actorUid||plan.clubId!==input.clubId||String(plan.native.num_club)!==input.clubId||directory.fingerprint(plan.native)!==input.expectedFingerprint||plan.native.integrationdate!==creation.timestamp||plan.creationOperation!==creation.operation||rows.length&&!equal(rows[0],plan.native))throw new TypeError("La fiche club ou sa preuve de creation a change. Rechargez avant de supprimer.");
  for(const ref of references){
   const values=ref.table==="winpalme_lignes"?[input.clubId,String(plan.native.abre_club),String(plan.native.federal_club)].filter(Boolean):[input.clubId];
   if((await query(`SELECT 1 FROM \`${ref.table}\` FORCE INDEX (\`${ref.index}\`) WHERE \`${ref.field}\` IN (${values.map(()=>"?").join(",")}) LIMIT 1`,values)).length)throw new TypeError("Ce club possede encore un element rattache. Desactivez-le plutot que de le supprimer.");
  }
  await audit.assertNoAccounts(input.clubId);
  if(!saved)await audit.prepare(key,plan);
  if(rows.length){const result=await query(`DELETE FROM clubs WHERE num_club=? AND ${COLUMNS.map(c=>nativeEqual(`\`${c}\``)).join(" AND ")} LIMIT 1`,[Number(input.clubId),...COLUMNS.map(c=>plan.native[c])]);if(result.affectedRows!==1)throw new Error("Suppression club interrompue ; sauvegarde conservee.");}
  if((await read()).length)throw new Error("Suppression club NAP a verifier.");
  await connection.query({sql:"UNLOCK TABLES",timeout:10000});locked=false;
  await audit.complete(key,{clubId:input.clubId,verified:true});return{ok:true,source:"nap",clubId:input.clubId,deleted:true,operation:key};
 }finally{try{if(locked)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}if(safe)connection.release();else connection.destroy();}
}
module.exports={operation,deleteClub};

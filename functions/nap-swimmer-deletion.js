"use strict";
// Unused native swimmers only. At most 40 SQL calls, 101 season records;
// no sporting reference is removed and no real deletion is used for tests.
const {createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const {COLUMNS}=require("./nap-approved-swimmer-correction");
const identity=require("./nap-portal-swimmer-change"),activity=require("./nap-swimmer-activity"),licenses=require("./nap-swimmer-merge-license-plan");
const {number}=require("./nap-license-state"),{nativeEqual}=require("./nap-native-compare");
const REFERENCES=require("./nap-swimmer-merge-plan").TABLES.filter(spec=>spec.table!=="engagements");
function operation(input){return createHash("sha256").update(JSON.stringify(["swimmer-delete",input.actorUid,String(input.swimmerId),input.expectedFingerprint,input.expectedActivityFingerprint,input.expectedLicenseNumber])).digest("hex");}
function validate(plan,input){
  if(plan?.operation!==operation(input)||plan.actorUid!==input.actorUid||String(plan.native?.id)!==String(input.swimmerId)||COLUMNS.some(key=>!Object.hasOwn(plan.native,key))||identity.fingerprint(plan.native)!==input.expectedFingerprint||activity.fingerprint(plan.native)!==input.expectedActivityFingerprint||number(plan.native.number)!==input.expectedLicenseNumber||!Array.isArray(plan.seasons)||plan.seasons.length>100)throw new TypeError("Sauvegarde de suppression incompatible.");
  licenses.planLicenseTransfer(plan.native,{...plan.native,id:Number(plan.native.id)===1?2:1},plan.seasons);
  if(Buffer.byteLength(JSON.stringify(plan))>500000)throw new RangeError("Sauvegarde trop volumineuse.");
}
async function deleteSwimmer(pool,input,audit,authorize){
  const id=Number(input?.swimmerId);
  if(!Number.isSafeInteger(id)||id<1||id>2147483647||input.confirmPermanent!==true||!input.actorUid||input.actorUid.length>128||typeof input.expectedLicenseNumber!=="string"||![input.expectedFingerprint,input.expectedActivityFingerprint].every(value=>/^[a-f0-9]{64}$/.test(value||""))||typeof authorize!=="function")throw new TypeError("Confirmation nationale et fiche affichee requises.");
  await authorize();const key=operation(input),saved=await audit.read(key);if(saved)validate(saved,input);
  const connection=await pool.getConnection();let locked=false,tableLocked=false,safe=true,calls=0;
  const query=async(sql,values=[])=>{if(++calls>38)throw new RangeError("Budget de suppression depasse.");return(await connection.execute({sql,timeout:10000},values))[0];};
  const lock=`livepalmes-swimmer-merge-${id}`;
  const read=()=>query(`SELECT ${COLUMNS.map(c=>`\`${c}\``).join(",")} FROM nageurs FORCE INDEX (PRIMARY) WHERE id=? LIMIT 1`,[id]);
  const seasons=()=>query(`SELECT ${licenses.COLUMNS.map(c=>`\`${c}\``).join(",")} FROM livepalmes_swimmer_license_seasons FORCE INDEX (PRIMARY) WHERE swimmer_id=? ORDER BY season LIMIT 101`,[id]);
  try{
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1)throw new TypeError("Nageur en cours de modification.");locked=true;
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('nageurs','livepalmes_swimmer_license_seasons') LIMIT 1")).length)throw new TypeError("Declencheur natif a verifier.");
    await connection.query({sql:`LOCK TABLES nageurs WRITE,livepalmes_swimmer_license_seasons WRITE,${REFERENCES.map(spec=>`\`${spec.table}\` READ`).join(",")}`,timeout:10000});tableLocked=true;
    const rows=await read(),currentSeasons=await seasons();
    if(currentSeasons.length>100)throw new RangeError("Historique de licence trop volumineux.");
    if(rows.length!==1&&!saved)throw new TypeError("Nageur NAP introuvable.");
    const plan=saved||{operation:key,actorUid:input.actorUid,native:rows[0],seasons:currentSeasons};validate(plan,input);
    if(rows.length&&!equal(rows[0],plan.native))throw new TypeError("La fiche a change. Rechargez avant de supprimer.");
    if((rows.length||currentSeasons.length)&&!equal(currentSeasons,plan.seasons))throw new TypeError("La validation de licence a change. Rechargez la fiche.");
    for(const spec of REFERENCES)for(const field of spec.fields){
      const index=spec.table==="perfs_relais"?`livepalmes_${field}_id`:spec.index;
      if((await query(`SELECT 1 FROM \`${spec.table}\` FORCE INDEX (\`${index}\`) WHERE \`${field}\`=? LIMIT 1`,[id])).length)throw new TypeError("Ce nageur est utilise dans l'historique. Desactivez-le plutot que de le supprimer.");
    }
    if((await query("SELECT swimmer_id FROM livepalmes_swimmer_merges FORCE INDEX (PRIMARY) WHERE swimmer_id=? LIMIT 1",[id])).length)throw new TypeError("Cette fiche fusionnee conserve ses anciens liens.");
    if(!saved)await audit.prepare(key,plan);
    // Delete identity first while both tables are locked. On interruption the
    // saved journal allows removing only its unchanged season records.
    if(rows.length){
      const removed=await query(`DELETE FROM nageurs WHERE id=? AND ${COLUMNS.map(c=>nativeEqual(`\`${c}\``)).join(" AND ")} LIMIT 1`,[id,...COLUMNS.map(c=>plan.native[c])]);
      if(removed.affectedRows!==1)throw new Error("Suppression interrompue ; sauvegarde conservee.");
    }
    if(currentSeasons.length){const removed=await query("DELETE FROM livepalmes_swimmer_license_seasons WHERE swimmer_id=? LIMIT 100",[id]);if(removed.affectedRows!==plan.seasons.length)throw new Error("Validation de licence a verifier ; sauvegarde conservee.");}
    if((await read()).length||(await seasons()).length)throw new Error("Suppression NAP a verifier.");
    await connection.query({sql:"UNLOCK TABLES",timeout:10000});tableLocked=false;
    await audit.complete(key,{swimmerId:String(id),clubId:String(plan.native.club),verified:true});
    return {ok:true,source:"nap",swimmerId:String(id),deleted:true,operation:key};
  }finally{
    try{if(tableLocked)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}
    try{if(locked&&Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={operation,validate,deleteSwimmer};

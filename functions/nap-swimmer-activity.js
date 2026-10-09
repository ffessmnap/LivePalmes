"use strict";
// Fixed budget: two PK reads, trigger check, one guarded UPDATE; audit read/two writes.
const {createHash}=require("node:crypto");
const {COLUMNS,hash}=require("./nap-approved-swimmer-correction");
const {nativeEqual}=require("./nap-native-compare");
function fingerprint(row) { return createHash("sha256").update(JSON.stringify([String(row.id),String(row.club),Number(row.actif)])).digest("hex"); }
function status(row) {
  if(![0,1].includes(Number(row.actif))) throw new TypeError("Statut NAP a verifier.");
  return Number(row.actif)===1?"active":"inactive";
}
async function change(connection,input,audit) {
  const id=require("./nap-direct-swimmer").swimmerId(input.id);
  if(!/^\d{1,16}$/.test(input.clubId||"") || !input.actorUid || !["active","inactive"].includes(input.status) || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"")) throw new TypeError("Fiche et statut requis.");
  const operation=createHash("sha256").update(JSON.stringify([id,input.clubId,input.actorUid,input.status,input.expectedFingerprint])).digest("hex");
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const read=async()=>{const rows=await query(`SELECT ${COLUMNS.map(k=>`\`${k}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`,[id]);if(rows.length!==1 || String(rows[0].club)!==input.clubId) throw new TypeError("Nageur absent de cet effectif NAP.");return rows[0];};
  const row=await read(); status(row);
  let saved=await audit.read(operation);
  if(!saved) {
    if(fingerprint(row)!==input.expectedFingerprint) throw new TypeError("Le statut a change. Rechargez la fiche.");
    const after={...row,actif:input.status==="active"?1:0};
    saved={operation,actorUid:input.actorUid,clubId:input.clubId,before:row,after,beforeHash:hash(row),afterHash:hash(after)};
    await audit.prepare(operation,saved);
  }
  if(saved.operation!==operation || saved.actorUid!==input.actorUid || saved.clubId!==input.clubId || String(saved.before?.id)!==String(id) || fingerprint(saved.before)!==input.expectedFingerprint || hash(saved.before)!==saved.beforeHash || hash(saved.after)!==saved.afterHash || hash({...saved.before,actif:input.status==="active"?1:0})!==saved.afterHash) throw new TypeError("Sauvegarde incompatible.");
  if(hash(row)!==saved.afterHash) {
    if(hash(row)!==saved.beforeHash) throw new TypeError("La fiche a change. Rechargez avant d'enregistrer.");
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='nageurs' LIMIT 1")).length) throw new TypeError("Declencheur NAP a verifier.");
    const result=await query(`UPDATE nageurs SET actif=? WHERE id=? AND ${COLUMNS.map(k=>nativeEqual(`\`${k}\``)).join(" AND ")} LIMIT 1`,[saved.after.actif,id,...COLUMNS.map(k=>saved.before[k])]);
    if(result.affectedRows!==1) throw new TypeError("La fiche a change. Rechargez avant d'enregistrer.");
  }
  const verified=await read();
  if(hash(verified)!==saved.afterHash) throw new Error("Statut NAP a verifier ; sauvegarde conservee.");
  await audit.complete(operation,{id,clubId:input.clubId,status:input.status,verified:true});
  return {ok:true,source:"nap",swimmer:require("./nap-portal-swimmers").person(verified)};
}
module.exports={fingerprint,status,change};

"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
const {createHash}=require("node:crypto");
const {COLUMNS,hash}=require("./nap-approved-swimmer-correction");
const {nativeEqual}=require("./nap-native-compare");
const {swimmerId}=require("./nap-direct-swimmer");
const {number}=require("./nap-license-state");
// A durable before-image is required: nageurs is MyISAM, so rollback is insufficient.
async function correctLicense(connection,input,audit) {
  const id=swimmerId(input?.id), proposed=number(input?.licenseNumber);
  if(!proposed || proposed.length>100 || /[\u0000-\u001f\u007f]/.test(proposed) || typeof input.expectedLicenseNumber!=="string" || !input.actorUid || input.actorUid.length>128) throw new TypeError("Correction de licence invalide.");
  const operation=createHash("sha256").update(JSON.stringify([id,input.expectedLicenseNumber,proposed,input.actorUid])).digest("hex");
  const read=async()=>{
    const [rows]=await connection.execute({sql:`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,timeout:10000},[id]);
    if(rows.length!==1) throw new TypeError("Nageur introuvable.");
    return rows[0];
  };
  let saved=await audit.read(operation);
  const row=await read();
  if(!saved) {
    if(number(row.number)!==input.expectedLicenseNumber) throw new TypeError("La licence a change. Rechargez la liste.");
    const after={...row,number:proposed};
    saved={operation,id,actorUid:input.actorUid,before:row,after,beforeHash:hash(row),afterHash:hash(after)};
    await audit.prepare(operation,saved);
  }
  if(saved.operation!==operation || saved.id!==id || saved.actorUid!==input.actorUid || saved.beforeHash!==hash(saved.before) || saved.afterHash!==hash(saved.after) || number(saved.before.number)!==input.expectedLicenseNumber || saved.after.number!==proposed || COLUMNS.some(key=>key!=="number" && saved.before[key]!==saved.after[key])) throw new Error("Sauvegarde de licence incompatible.");
  const currentHash=hash(row);
  if(currentHash!==saved.beforeHash && currentHash!==saved.afterHash) throw new TypeError("La fiche a change. Rechargez la liste.");
  const [owners]=await connection.execute({sql:`SELECT id FROM nageurs FORCE INDEX (livepalmes_license_number_id) WHERE number=? AND id<>? AND ${notMerged()} LIMIT 2`,timeout:10000},[proposed,id]);
  if(owners.length) throw new TypeError("Cette licence appartient deja a une autre fiche NAP.");
  const alreadyApplied=currentHash===saved.afterHash;
  if(!alreadyApplied) {
    const [result]=await connection.execute({sql:`UPDATE nageurs SET number=? WHERE ${notMerged()} AND ${COLUMNS.map(key=>nativeEqual(`\`${key}\``)).join(" AND ")} LIMIT 1`,timeout:10000},[proposed,...COLUMNS.map(key=>saved.before[key])]);
    if(result.affectedRows!==1) throw new TypeError("La fiche a change. Rechargez la liste.");
  }
  const verified=await read();
  if(hash(verified)!==saved.afterHash) throw new Error("Verification de licence incomplete.");
  const result={ok:true,source:"nap",operation,id:String(id),licenseNumber:proposed,alreadyApplied};
  await audit.complete(operation,result);
  return result;
}
async function correctLicenses(connection,items,actorUid,audit) {
  const operation=createHash("sha256").update(JSON.stringify([actorUid,items])).digest("hex");
  const marks=items.map(()=>"?").join(","),ids=items.map(item=>item.id);
  const read=async()=>{
    const [rows]=await connection.execute({sql:`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs FORCE INDEX (PRIMARY) WHERE id IN (${marks}) AND ${notMerged()} ORDER BY id LIMIT 101`,timeout:10000},ids);
    if(rows.length!==items.length) throw new TypeError("Fiches NAP absentes.");
    return rows;
  };
  let saved=await audit.read(operation);
  const rows=await read();
  if(!saved) {
    const changes=items.map(item=>{
      const before=rows.find(row=>Number(row.id)===item.id);
      if(number(before.number)!==item.expected) throw new TypeError("Une licence a change. Rechargez le lot.");
      const after={...before,number:item.number};
      return {before,after,beforeHash:hash(before),afterHash:hash(after)};
    });
    saved={operation,actorUid,changes};await audit.prepare(operation,saved);
  }
  if(saved.operation!==operation || saved.actorUid!==actorUid || saved.changes.length!==items.length || saved.changes.some(change=>{
    const item=items.find(item=>item.id===Number(change.before.id));
    return !item || hash(change.before)!==change.beforeHash || hash(change.after)!==change.afterHash || number(change.before.number)!==item.expected || change.after.number!==item.number || COLUMNS.some(key=>key!=="number"&&change.before[key]!==change.after[key]);
  })) throw new Error("Sauvegarde de licences incompatible.");
  const pending=saved.changes.filter(change=>{
    const current=rows.find(row=>Number(row.id)===Number(change.before.id)),digest=hash(current);
    if(digest!==change.beforeHash&&digest!==change.afterHash) throw new TypeError("Une fiche a change. Rechargez le lot.");
    return digest!==change.afterHash;
  });
  if(pending.length) {
    const cases=pending.map(()=>"WHEN ? THEN ?").join(" ");
    const guards=pending.map(()=>`(${COLUMNS.map(key=>nativeEqual(`\`${key}\``)).join(" AND ")})`).join(" OR ");
    await connection.execute({sql:`UPDATE nageurs SET number=CASE id ${cases} ELSE number END WHERE (${guards}) AND ${notMerged()} LIMIT 100`,timeout:10000},[...pending.flatMap(change=>[change.before.id,change.after.number]),...pending.flatMap(change=>COLUMNS.map(key=>change.before[key]))]);
  }
  const verified=await read();
  if(saved.changes.some(change=>hash(verified.find(row=>Number(row.id)===Number(change.after.id)))!==change.afterHash)) throw new Error("Correction concurrente : verification incomplete, reprendre le lot sauvegarde.");
  await audit.complete(operation,{ok:true,source:"nap",operation,count:items.length});
}
module.exports={correctLicense,correctLicenses};

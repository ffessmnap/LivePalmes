"use strict";
const {createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const {COLUMNS,hash}=require("./nap-approved-swimmer-correction");
const {fingerprint,planIdentityChange}=require("./nap-portal-swimmer-change");
const {person}=require("./nap-portal-swimmers"),{findClub}=require("./nap-club-directory");
const {notMerged}=require("./nap-swimmer-merge-state"),{nativeEqual}=require("./nap-native-compare");
// National caller only. Existing identity journal; no performance/entry writes.
async function correctNationalSwimmer(connection,input,audit){
 const id=Number(input.id),fields=input.proposed;
 if(!Number.isSafeInteger(id)||id<1||id>2147483647||!fields||Object.keys(fields).some(k=>!["firstName","lastName","birthDate","sex","clubId"].includes(k))||!input.actorUid||!input.reason?.trim()||input.reason.length>500||!/^[a-f0-9]{64}$/.test(input.expectedFingerprint||""))throw new TypeError("Fiche, club et motif national requis.");
 const clubId=String(fields.clubId||"");
 if(!/^[1-9]\d{0,15}$/.test(clubId)||!Number.isSafeInteger(Number(clubId)))throw new TypeError("Choisissez un club existant.");
 const operation=createHash("sha256").update(JSON.stringify([id,input.expectedFingerprint,input.actorUid,Object.keys(fields).sort().map(k=>[k,fields[k]])])).digest("hex");
 let saved=await audit.read(operation);
 const read=async()=> (await connection.execute({sql:`SELECT ${COLUMNS.map(k=>`\`${k}\``).join(",")} FROM nageurs FORCE INDEX (PRIMARY) WHERE id=? AND ${notMerged()} LIMIT 1`,timeout:10000},[id]))[0];
 const [row]=await read();if(!row)throw new TypeError("Nageur introuvable.");
 const club=await findClub(connection,clubId);if(!club)throw new TypeError("Club NAP introuvable.");
 if(!saved){
  if(fingerprint(row)!==input.expectedFingerprint)throw new TypeError("La fiche a change. Rechargez avant de corriger.");
  const {clubId:ignored,...identity}=fields;
  const identityChanged=Object.entries(identity).some(([k,v])=>v!==({firstName:row.prenom,lastName:row.nom,birthDate:row.date,sex:row.sexe})[k]);
  const plan=identityChanged?planIdentityChange(row,identity,input.expectedFingerprint):{after:{...row},changedColumns:[]};
  if(identityChanged){const [duplicates]=await connection.execute({sql:`SELECT id FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom=? AND prenom=? AND date=? AND id<>? AND ${notMerged()} LIMIT 3`,timeout:10000},[plan.after.nom,plan.after.prenom,plan.after.date,id]);if(duplicates.length)throw new TypeError("Une fiche identique existe deja. Verifiez les doublons.");}
  const after={...row,...plan.after,club:clubId},changedColumns=[...plan.changedColumns,...(String(row.club)!==clubId?["club"]:[])];
  if(!changedColumns.length)throw new TypeError("Aucune modification.");
  saved={id,operation,actorUid:input.actorUid,reason:input.reason.trim(),before:row,after,changedColumns,beforeHash:hash(row),afterHash:hash(after),clubId};
  await audit.prepare(operation,saved);
 }
 if(saved.id!==id||saved.operation!==operation||saved.actorUid!==input.actorUid||saved.clubId!==clubId||saved.beforeHash!==hash(saved.before)||saved.afterHash!==hash(saved.after)||fingerprint(saved.before)!==input.expectedFingerprint||!Array.isArray(saved.changedColumns)||saved.changedColumns.some(k=>!["nom","prenom","date","sexe","club"].includes(k)))throw new TypeError("Sauvegarde incompatible.");
 const alreadyApplied=equal(row,saved.after);if(!alreadyApplied&&!equal(row,saved.before))throw new TypeError("La fiche a change. Rechargez avant de corriger.");
 if(!alreadyApplied){
  const [result]=await connection.execute({sql:`UPDATE nageurs SET ${saved.changedColumns.map(k=>`\`${k}\`=?`).join(",")} WHERE id=? AND EXISTS (SELECT 1 FROM clubs FORCE INDEX (PRIMARY) WHERE num_club=?) AND ${notMerged()} AND ${COLUMNS.map(k=>nativeEqual(`\`${k}\``)).join(" AND ")} LIMIT 1`,timeout:10000},[...saved.changedColumns.map(k=>saved.after[k]),id,Number(clubId),...COLUMNS.map(k=>saved.before[k])]);
  if(result.affectedRows!==1)throw new TypeError("La fiche a change. Rechargez avant de corriger.");
 }
 const [verified]=await read();if(!verified||!equal(verified,saved.after))throw new Error("Correction a verifier ; sauvegarde conservee.");
 await audit.complete(operation,{id,operation,actorUid:input.actorUid,reason:saved.reason,oldClubId:String(saved.before.club),clubId,changedColumns:saved.changedColumns,beforeHash:saved.beforeHash,afterHash:saved.afterHash,verified:true});
 return {ok:true,source:"nap",operation,alreadyApplied,swimmer:person({...verified,abre_club:club.clubCode,nom_club:club.clubName}),changedColumns:saved.changedColumns,entryUpdateCount:0,relayUpdateCount:0,performanceUpdateCount:0};
}
module.exports={correctNationalSwimmer};

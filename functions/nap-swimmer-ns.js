"use strict";
// Portal metadata only: never consulted by sporting calculations or exports.
const {createHash}=require("node:crypto");
const {swimmerId}=require("./nap-direct-swimmer");
const {notMerged}=require("./nap-swimmer-merge-state");
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const {state,fingerprint}=require("./nap-swimmer-ns-state");
async function read(connection,input,context) {
  if(!context?.uid||!/^\d{1,16}$/.test(String(context.clubId||"")))throw new TypeError("Club NAP requis.");
  const id=swimmerId(input.swimmerId);
  // The native row has eleven small scalar columns, plus the two optional NS columns.
  // SELECT * supports the pre-migration schema; only person()'s curated fields leave the server.
  const [rows]=await connection.execute({sql:`SELECT * FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,timeout:10000},[id]);
  if(rows.length!==1||String(rows[0].club)!==String(context.clubId))throw new TypeError("Nageur absent du club actif.");
  return rows[0];
}
function proposal(row,input) {
  if(!state(row).nsAvailable)throw new TypeError("Le statut NS attend l’activation de la structure NAP.");
  if(input.expectedNsFingerprint!==fingerprint(row))throw new TypeError("Le statut ou la fiche a changé. Rechargez-la.");
  if(input.nonSelectable!==false||!state(row).nonSelectable)throw new TypeError("Une demande nationale concerne uniquement le retrait du statut NS.");
  const current=require("./nap-portal-swimmers").person(row);
  return {napSource:true,requestType:"swimmer-ns",nativeBefore:row,expectedFingerprint:fingerprint(row),
    requestedSource:"reference",targetSource:"reference",requestedSwimmerId:String(row.id),targetSwimmerId:String(row.id),
    current,proposed:{...current,nonSelectable:false},reason:"Demande de retrait du statut non sélectionnable (NS)."};
}
function prepareResolution(data,input,actorUid) {
  if(!actorUid||data?.requestType!=="swimmer-ns"||data.napSource!==true||!data.nativeBefore||
    !state(data.nativeBefore).nsAvailable||!state(data.nativeBefore).nonSelectable||fingerprint(data.nativeBefore)!==data.expectedFingerprint||
    String(data.nativeBefore.id)!==String(data.targetSwimmerId)||String(data.requestedSwimmerId)!==String(data.targetSwimmerId)||
    String(data.nativeBefore.club)!==String(data.clubId)||data.proposed?.nonSelectable!==false)throw new TypeError("Demande NS incompatible.");
  if(!["approved","rejected"].includes(input.decision)||input.proposed!==undefined)throw new TypeError("Décision NS invalide.");
  const note=String(input.resolutionNote||"").trim();if(note.length>500)throw new TypeError("Commentaire limité à 500 caractères.");
  return {id:swimmerId(data.targetSwimmerId),expectedFingerprint:data.expectedFingerprint,
    key:digest([data.targetSwimmerId,data.expectedFingerprint,actorUid,input.decision,note]),actorUid,decision:input.decision,note,
    resolvedProposed:{...data.current,nonSelectable:false},proposalAdjusted:false};
}
async function change(connection,input,context,audit,{nationalApproval=false}={}) {
  if(typeof input.nonSelectable!=="boolean"||(!input.nonSelectable&&!nationalApproval))throw new TypeError("Le retrait du statut NS exige une validation nationale.");
  let row=await read(connection,input,context);
  if(!state(row).nsAvailable)throw new TypeError("Le statut NS attend l’activation de la structure NAP.");
  const operation=digest([String(row.id),String(context.clubId),context.uid,input.nonSelectable,input.expectedNsFingerprint]);
  let saved=await audit.read(operation);
  if(!saved){
    if(input.expectedNsFingerprint!==fingerprint(row))throw new TypeError("Le statut ou la fiche a changé. Rechargez-la.");
    if(state(row).nonSelectable===input.nonSelectable)throw new TypeError("Aucune modification du statut NS.");
    if(state(row).nsVersion>=2147483647)throw new TypeError("Version NS à vérifier.");
    const after={...row,livepalmes_ns:input.nonSelectable?1:0,livepalmes_ns_version:state(row).nsVersion+1};
    saved={operation,actorUid:context.uid,clubId:String(context.clubId),before:row,after,beforeHash:fingerprint(row),afterHash:fingerprint(after)};
    await audit.prepare(operation,saved);
  }
  if(saved.operation!==operation||saved.actorUid!==context.uid||saved.clubId!==String(context.clubId)||String(saved.before?.id)!==String(row.id)||
    saved.beforeHash!==input.expectedNsFingerprint||fingerprint(saved.before)!==saved.beforeHash||fingerprint(saved.after)!==saved.afterHash||
    saved.afterHash!==fingerprint({...saved.before,livepalmes_ns:input.nonSelectable?1:0,livepalmes_ns_version:state(saved.before).nsVersion+1}))throw new TypeError("Sauvegarde NS incompatible.");
  if(fingerprint(row)!==saved.afterHash){
    if(fingerprint(row)!==saved.beforeHash)throw new TypeError("La fiche a changé. Rechargez-la.");
    const [triggers]=await connection.execute({sql:"SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='nageurs' LIMIT 1",timeout:10000},[]);
    if(triggers.length)throw new TypeError("Déclencheur NAP à vérifier.");
    const before=saved.before;
    const [result]=await connection.execute({sql:`UPDATE nageurs SET livepalmes_ns=?,livepalmes_ns_version=? WHERE id=? AND BINARY club=BINARY ? AND BINARY nom=BINARY ? AND BINARY prenom=BINARY ? AND date=? AND BINARY sexe=BINARY ? AND livepalmes_ns <=> ? AND livepalmes_ns_version <=> ? AND ${notMerged()} LIMIT 1`,timeout:10000},
      [saved.after.livepalmes_ns,saved.after.livepalmes_ns_version,before.id,before.club,before.nom,before.prenom,before.date,before.sexe,before.livepalmes_ns,before.livepalmes_ns_version]);
    if(result.affectedRows!==1)throw new TypeError("La fiche a changé. Rechargez-la.");
  }
  row=await read(connection,input,context);
  if(fingerprint(row)!==saved.afterHash)throw new Error("Statut NS à vérifier ; sauvegarde conservée.");
  await audit.complete(operation,{id:String(row.id),clubId:String(context.clubId),nonSelectable:input.nonSelectable,verified:true});
  return {ok:true,source:"nap",swimmer:require("./nap-portal-swimmers").person(row)};
}
module.exports={state,fingerprint,read,proposal,prepareResolution,change};

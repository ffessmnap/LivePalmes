"use strict";
const {createHash}=require("node:crypto");
const { SOURCES, OPTION_COLUMNS, normalizeOptions, person } = require("./nap-club-people-values");
const {reference}=require("./nap-club-person-status");
const {planIdentity}=require("./nap-club-person-edit");
const FIELDS=["firstName","lastName","birthDate","sex"];
function fields(raw) {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).some(key=>!FIELDS.includes(key))) throw new TypeError("La licence ne fait pas partie des corrections du club.");
  return raw;
}
function requestedPatch(data) {
  return Object.fromEntries(FIELDS.filter(k=>data.current[k]!==data.proposed[k]).map(k=>[k,data.proposed[k]]));
}
async function prepareRequest(connection,input,context) {
  const {kind,id}=reference(input.personId);
  if(kind!=="officials"||!context?.uid||!/^\d{1,16}$/.test(String(context.clubId||""))) throw new TypeError("Fiche officielle du club requise.");
  const spec=SOURCES.officials;
  const [rows]=await connection.execute({sql:`SELECT ${spec.columns.map(c=>`\`${c}\``).join(",")} FROM officiels WHERE id=? LIMIT 1`,timeout:10000},[id]);
  const [options]=await connection.execute({sql:`SELECT ${OPTION_COLUMNS.map(c=>`\`${c}\``).join(",")} FROM livepalmes_club_people_options WHERE source='officiels' AND person_id=? LIMIT 1`,timeout:10000},[id]);
  const row=rows[0],savedOptions=normalizeOptions(options[0]);
  if(rows.length!==1||String(row.club)!==String(context.clubId)) throw new TypeError("Personne hors du club actif.");
  const current=person(row,"officials",savedOptions);
  if(current.napFingerprint!==input.expectedFingerprint) throw new TypeError("La fiche a changé. Rechargez la liste.");
  const after=planIdentity(row,fields(input.proposed));
  if(JSON.stringify(after)===JSON.stringify(row)) throw new TypeError("Aucune modification.");
  const reason=String(input.reason||"").trim();
  if(!reason||reason.length>500) throw new TypeError("Motif obligatoire, 500 caractères maximum.");
  return {napSource:true,requestType:"person-change",nativeBefore:row,nativeOptions:savedOptions,expectedFingerprint:current.napFingerprint,
    requestedSource:"officials",requestedSwimmerId:input.personId,targetSource:"officials",targetSwimmerId:input.personId,
    current,proposed:person(after,"officials",savedOptions),reason};
}
function validateRequest(data,actorUid) {
  if(data?.requestType!=="person-change"||data.napSource!==true||!actorUid||String(data.nativeBefore?.club)!==String(data.clubId)) throw new TypeError("Demande de personne incompatible.");
  const {kind,id}=reference(data.targetSwimmerId);
  if(kind!=="officials"||data.requestedSwimmerId!==data.targetSwimmerId||Number(data.nativeBefore.id)!==id||person(data.nativeBefore,kind,data.nativeOptions).napFingerprint!==data.expectedFingerprint) throw new TypeError("Empreinte de personne incompatible.");
  return {kind,id};
}
function reviewedBase(data,review,actorUid) {
  const {kind,id}=validateRequest(data,actorUid);
  if(!review)return {native:data.nativeBefore,options:data.nativeOptions,expectedFingerprint:data.expectedFingerprint};
  if(review.requestedAt!==data.requestedAt||review.requestFingerprint!==data.expectedFingerprint||Number(review.nativeBefore?.id)!==id||String(review.nativeBefore?.club)!==String(data.clubId)||person(review.nativeBefore,kind,review.nativeOptions).napFingerprint!==review.expectedFingerprint)throw new TypeError("Réexamen incompatible. Réexaminez la fiche actuelle.");
  // The editor re-reads SQL under its locks and verifies this full fingerprint.
  // A client snapshot never grants authority to write a different native row.
  return {native:review.nativeBefore,options:review.nativeOptions,expectedFingerprint:review.expectedFingerprint};
}
async function reviewRequest(pool,data,actorUid) {
  const {id}=validateRequest(data,actorUid);
  if(data.status!=="pending")throw new TypeError("Demande déjà traitée.");
  if(data.nativeResolution&&data.nativeResolution.actorUid!==actorUid)throw new TypeError("Une décision est en cours. Sa reprise est réservée au même compte.");
  if(data.nativeResolution) {
    const held=data.nativeResolution,base=reviewedBase(data,held.review,actorUid),current=person(base.native,"officials",base.options);
    const review=held.review||{requestedAt:data.requestedAt,requestFingerprint:data.expectedFingerprint,nativeBefore:data.nativeBefore,nativeOptions:data.nativeOptions,expectedFingerprint:data.expectedFingerprint};
    return {ok:true,current,proposed:held.proposed||data.proposed,review,changed:true,resuming:true,resolutionNote:held.resolutionNote||""};
  }
  const spec=SOURCES.officials;
  const [rows]=await pool.execute({sql:`SELECT ${spec.columns.map(c=>`\`${c}\``).join(",")} FROM officiels WHERE id=? LIMIT 1`,timeout:10000},[id]);
  if(rows.length!==1||String(rows[0].club)!==String(data.clubId))throw new TypeError("Fiche absente ou déplacée hors du club. Vérification nationale nécessaire.");
  const [options]=await pool.execute({sql:`SELECT ${OPTION_COLUMNS.map(c=>`\`${c}\``).join(",")} FROM livepalmes_club_people_options WHERE source='officiels' AND person_id=? LIMIT 1`,timeout:10000},[id]);
  const nativeOptions=normalizeOptions(options[0]),current=person(rows[0],"officials",nativeOptions);
  // Carry only the requested identity changes; preserve subsequently filled fields.
  const proposed=person(planIdentity(rows[0],requestedPatch(data)),"officials",nativeOptions);
  const review={requestedAt:data.requestedAt,requestFingerprint:data.expectedFingerprint,nativeBefore:rows[0],nativeOptions,expectedFingerprint:current.napFingerprint};
  const statusChanges=[["Statut actif",data.current.active,current.active],["Rôle chef d’équipe",data.current.roles?.teamLeader,current.roles.teamLeader],["Rôle officiel",data.current.roles?.official,current.roles.official]]
    .filter(([,before,after])=>typeof before==="boolean"&&before!==after).map(([label,before,after])=>({label,before:before?"Oui":"Non",after:after?"Oui":"Non"}));
  return {ok:true,current,proposed,review,statusChanges,changed:current.napFingerprint!==data.expectedFingerprint,resuming:false};
}
function prepareResolution(data,input,actorUid) {
  const {kind}=validateRequest(data,actorUid);
  const base=reviewedBase(data,input.review,actorUid);
  if(!["approved","rejected"].includes(input.decision)) throw new TypeError("Décision invalide.");
  const note=String(input.resolutionNote||"").trim();if(note.length>500) throw new TypeError("Commentaire limité à 500 caractères.");
  const defaultProposal=input.decision==="approved"&&input.review?person(planIdentity(base.native,requestedPatch(data)),kind,base.options):data.proposed;
  const proposed=input.decision==="approved"?fields(input.proposed??Object.fromEntries(FIELDS.map(k=>[k,defaultProposal[k]]))):null;
  const resolvedProposed=proposed?person(planIdentity(base.native,proposed),kind,base.options):null;
  const key=createHash("sha256").update(JSON.stringify([data.targetSwimmerId,base.expectedFingerprint,actorUid,input.decision,note,proposed])).digest("hex");
  return {key,actorUid,decision:input.decision,note,proposed,resolvedProposed,proposalAdjusted:!!resolvedProposed&&FIELDS.some(k=>resolvedProposed[k]!==data.proposed[k]),id:data.targetSwimmerId,expectedFingerprint:base.expectedFingerprint,reason:note||data.reason};
}
module.exports={prepareRequest,prepareResolution,reviewRequest};

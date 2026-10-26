"use strict";
const {createHash}=require("node:crypto");
const {SOURCES,OPTION_COLUMNS,normalizeOptions,person}=require("./nap-club-people");
const {reference}=require("./nap-club-person-status");
const {planIdentity}=require("./nap-club-person-edit");
const FIELDS=["firstName","lastName","birthDate","sex"];
function fields(raw) {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).some(key=>!FIELDS.includes(key))) throw new TypeError("La licence ne fait pas partie des corrections du club.");
  return raw;
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
function prepareResolution(data,input,actorUid) {
  if(data?.requestType!=="person-change"||data.napSource!==true||!actorUid||String(data.nativeBefore?.club)!==String(data.clubId)) throw new TypeError("Demande de personne incompatible.");
  const {kind,id}=reference(data.targetSwimmerId);
  if(kind!=="officials"||data.requestedSwimmerId!==data.targetSwimmerId||Number(data.nativeBefore.id)!==id||person(data.nativeBefore,kind,data.nativeOptions).napFingerprint!==data.expectedFingerprint) throw new TypeError("Empreinte de personne incompatible.");
  if(!["approved","rejected"].includes(input.decision)) throw new TypeError("Décision invalide.");
  const note=String(input.resolutionNote||"").trim();if(note.length>500) throw new TypeError("Commentaire limité à 500 caractères.");
  const proposed=input.decision==="approved"?fields(input.proposed??Object.fromEntries(FIELDS.map(k=>[k,data.proposed[k]]))):null;
  const resolvedProposed=proposed?person(planIdentity(data.nativeBefore,proposed),kind,data.nativeOptions):null;
  const key=createHash("sha256").update(JSON.stringify([data.targetSwimmerId,data.expectedFingerprint,actorUid,input.decision,note,proposed])).digest("hex");
  return {key,actorUid,decision:input.decision,note,proposed,resolvedProposed,proposalAdjusted:!!resolvedProposed&&FIELDS.some(k=>resolvedProposed[k]!==data.proposed[k]),id:data.targetSwimmerId,expectedFingerprint:data.expectedFingerprint,reason:note||data.reason};
}
module.exports={prepareRequest,prepareResolution};

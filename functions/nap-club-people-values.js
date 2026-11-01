"use strict";
// Existing singleton, values or query bodies; no business change.
const {createHash}=require("node:crypto");

const { date } = require("./nap-calendar-values");

const PAGE_SIZE=100;

const OPTION_COLUMNS=require("./nap-approved-people-schema").columns.map(([name])=>name);

const SOURCES={
  leaders:{table:"chefsdequipe",columns:["id","compet","nom","prenom","date","club","pourclub"],prefix:"nap-leader"},
  officials:{table:"officiels",columns:["id","nom","prenom","date","club","sexe","number"],prefix:"nap-official"}
};

function normalizeOptions(row) {
  if(!row) return null;
  return Object.fromEntries(OPTION_COLUMNS.map(key=>[key,["person_id","role_team_leader","role_official","active","version"].includes(key)?Number(row[key]):row[key]]));
}

function cursors(value) {
  if(value===undefined || value===null) return {leaders:0,officials:0};
  if(typeof value!=="object" || Array.isArray(value) || Object.keys(value).length!==2 || Object.keys(value).some(key=>!Object.hasOwn(SOURCES,key))) throw new TypeError("Page de personnes invalide.");
  for(const id of Object.values(value)) if(id!==null && (!Number.isSafeInteger(id) || id<0 || id>2147483647)) throw new TypeError("Page de personnes invalide.");
  return {...value};
}

function person(row,kind,options=null) {
  options=normalizeOptions(options);
  const spec=SOURCES[kind];
  if(!spec || spec.columns.some(key=>!Object.hasOwn(row,key)) || !Number.isSafeInteger(Number(row.id)) || Number(row.id)<=0) throw new TypeError("Fiche NAP incomplete.");
  if(options && (options.source!==spec.table || Number(options.person_id)!==Number(row.id) || String(options.club_id)!==String(row.club) || ["active","role_team_leader","role_official"].some(key=>![0,1].includes(Number(options[key]))) || !Number.isSafeInteger(Number(options.version)) || Number(options.version)<1)) throw new TypeError("Options de personne incompatibles.");
  return {id:`${spec.prefix}-${row.id}`,nativePersonId:String(row.id),nativePersonKind:kind,napSource:true,nativeDirectoryReadOnly:true,nativeIdentityEditable:kind==="officials",nativeStatusEditable:kind==="officials",
    napFingerprint:createHash("sha256").update(JSON.stringify([spec.columns.map(key=>[key,row[key]]),options?OPTION_COLUMNS.map(key=>[key,options[key]]):null])).digest("hex"),
    firstName:String(row.prenom || "").trim(),lastName:String(row.nom || "").trim(),birthDate:date(row.date),clubId:String(row.club),
    licenseNumber:String(row.number||"").trim(),sex:["F","M"].includes(row.sexe)?row.sexe:"",active:options?Number(options.active)===1:true,roles:options?{teamLeader:Number(options.role_team_leader)===1,official:Number(options.role_official)===1}:{teamLeader:true,official:kind==="officials"},
    ...(kind==="leaders"?{nativeCompetitionId:String(row.compet),representedClubId:String(row.pourclub)}:{})};
}

module.exports = { PAGE_SIZE, OPTION_COLUMNS, SOURCES, normalizeOptions, cursors, person };

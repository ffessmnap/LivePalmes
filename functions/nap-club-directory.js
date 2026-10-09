"use strict";
// One indexed bounded page; directory mode refuses overflow rather than truncating.
const {REGIONS}=require("./nap-competition-scope");
const CLUB_REGIONS=Object.freeze({...REGIONS,4:"CNNP",5:"CMAS",12:"Nouvelle Calédonie",14:"Polynésie",19:"OPEN",20:"CD13",21:"CD62",23:"Corse",24:"Mayotte"});
// Portal code 12 is Corse; NAP's club committee 12 is Nouvelle Caledonie.
// Preserve committees outside the portal list with an explicit native prefix.
const EXTRA_COMMITTEES=new Set([4,12,14,19,20,21,24]);
function portalRegion(nativeId){const id=Number(nativeId);return id===23?"12":EXTRA_COMMITTEES.has(id)?`nap-${id}`:String(nativeId);}
function region(value) {
 if(String(value)==="12")return 23;
 const extra=/^nap-(\d+)$/.exec(String(value));if(extra&&EXTRA_COMMITTEES.has(Number(extra[1])))return Number(extra[1]);
 const id=Object.keys(CLUB_REGIONS).find(id=>String(value)===id || value===CLUB_REGIONS[id]);if(!id)throw new TypeError("Comite du club NAP non reconnu.");return Number(id);
}
const COLUMNS=["num_club","federal_club","nom_club","abre_club","comite_club","actif_club","ville","postalcode"];
const fingerprint=row=>require("node:crypto").createHash("sha256").update(JSON.stringify(COLUMNS.map(key=>row[key]))).digest("hex");
function club(row) {
  if(!Number.isSafeInteger(Number(row.num_club)) || Number(row.num_club)<1) throw new TypeError("Club NAP incoherent.");
  return {clubId:String(row.num_club),clubCode:String(row.abre_club||""),clubName:String(row.nom_club||""),federalNumber:String(row.federal_club||""),regionId:portalRegion(row.comite_club),regionLabel:CLUB_REGIONS[row.comite_club]||String(row.comite_club||""),active:![0,"0",false].includes(row.actif_club),city:String(row.ville||""),postalCode:String(row.postalcode||""),source:"nap",napSource:true,napFingerprint:fingerprint(row)};
}
async function directory(pool) {
 const [rows]=await pool.execute({sql:`SELECT ${COLUMNS.map(k=>`\`${k}\``).join(",")} FROM clubs FORCE INDEX (PRIMARY) ORDER BY num_club LIMIT 1001`,timeout:10000});
 if(rows.length>1000) throw new RangeError("Annuaire NAP superieur a 1000 clubs : pagination requise.");
 return {ok:true,source:"nap",clubs:rows.map(club),replaceDirectory:true,hasMore:false,cursor:null,syncWatermark:new Date().toISOString(),sqlBudget:{queriesMax:1,rowsMax:1001}};
}
module.exports={COLUMNS,CLUB_REGIONS,portalRegion,region,club,directory,fingerprint};

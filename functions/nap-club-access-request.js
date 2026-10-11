"use strict";
const {createHash}=require("node:crypto");
const directory=require("./nap-club-directory"),creation=require("./nap-club-create");
// One indexed lookup, at most two rows. Never consult the former sporting directory.
async function findByFederalNumber(pool,value) {
 const number=String(value||"").trim().toUpperCase().slice(0,24);
 if(!number)return null;
 const [rows]=await pool.execute({sql:`SELECT ${directory.COLUMNS.map(key=>`\`${key}\``).join(",")} FROM clubs FORCE INDEX (livepalmes_federal_id) WHERE federal_club=? LIMIT 2`,values:[number],timeout:10000});
 if(rows.length>1)throw new TypeError("Plusieurs clubs NAP portent ce numero federal. Verification nationale requise.");
 return rows.length?directory.club(rows[0]):null;
}
function creationId(requestId) {
 if(typeof requestId!=="string"||!requestId||requestId.length>80)throw new TypeError("Demande de creation requise.");
 const hex=createHash("sha256").update(`nap-access-club:${requestId}`).digest("hex");
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
async function createFromRequest(pool,{payload,actorUid,requestId},audit) {
 const id=creationId(requestId),operation=createHash("sha256").update(JSON.stringify([actorUid,id])).digest("hex");
 // Resume an existing receipt first, including uncertain writes; do not bypass recovery.
 const saved=await audit.read(operation);
 if(!saved){const existing=await findByFederalNumber(pool,payload.newClub?.federalNumber);if(existing)return {club:existing,created:false};}
 const result=await creation.create(pool,{actorUid,creationId:id,club:{...payload.newClub,regionId:payload.regionId,active:true}},audit,()=>{if(!actorUid)throw new TypeError("Validation nationale requise.");});
 return {club:result.club,created:result.created};
}
module.exports={findByFederalNumber,creationId,createFromRequest};

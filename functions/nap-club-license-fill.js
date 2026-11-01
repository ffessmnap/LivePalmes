"use strict";
const {createHash}=require("node:crypto");
const {correctLicense}=require("./nap-license-correction");
const {COLUMNS}=require("./nap-approved-swimmer-correction");
const { person } = require("./nap-swimmer-profile");
const { fingerprint } = require("./nap-swimmer-identity-values");
const {notMerged}=require("./nap-swimmer-merge-state");
const { swimmerId } = require("./nap-swimmer-values");
const {clean}=require("./nap-club-identity-fields");
async function fillClubLicense(pool,input,context,audit) {
  const id=swimmerId(input.swimmerId);
  if(!context?.uid||!/^\d{1,16}$/.test(String(context.clubId||""))||! /^[a-f0-9]{64}$/.test(input.expectedFingerprint||"")) throw new TypeError("Fiche et club requis.");
  if(!input.proposed||Object.keys(input.proposed).length!==1||!Object.hasOwn(input.proposed,"licenseNumber")) throw new TypeError("Complétez la licence séparément d’une correction d’identité.");
  const licenseNumber=clean("licenseNumber",input.proposed.licenseNumber);
  if(!licenseNumber) throw new TypeError("Numéro de licence obligatoire.");
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[])=>(await connection.execute({sql,timeout:10000},values))[0];
  try {
    if(Number((await query("SELECT GET_LOCK('livepalmes_license_control',0) AS acquired"))[0]?.acquired)!==1) throw new TypeError("Un contrôle de licences est en cours.");
    locked=true;
    const [row]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,[id]);
    if(!row||String(row.club)!==String(context.clubId)||fingerprint(row)!==input.expectedFingerprint) throw new TypeError("Fiche absente du club ou périmée. Rechargez la liste.");
    // Durable exact replay is allowed after a lost SQL response; a new request
    // can never overwrite or claim a number already present.
    const operation=createHash("sha256").update(JSON.stringify([id,"",licenseNumber,context.uid])).digest("hex");
    const saved=await audit.read(operation);
    if(String(row.number??"").trim()&&(!saved||String(saved.before?.number??"").trim()||saved.after?.number!==licenseNumber)) throw new TypeError("La licence est déjà renseignée et verrouillée.");
    const scopedConnection={execute:async(statement,values)=>{
      const response=await connection.execute(statement,values);
      if(statement.sql.startsWith("SELECT")&&statement.sql.includes("FROM nageurs WHERE id=?")) {
        const latest=response[0];
        if(latest.length!==1||String(latest[0].club)!==String(context.clubId)||fingerprint(latest[0])!==input.expectedFingerprint)throw new TypeError("La fiche a changé de club ou d’identité. Rechargez la liste.");
      }
      return response;
    }};
    const result=await correctLicense(scopedConnection,{id,licenseNumber,expectedLicenseNumber:"",actorUid:context.uid},audit);
    const [verified]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,[id]);
    return {...result,swimmer:person(verified),completedWithoutRequest:true};
  } finally {try{if(locked)await query("SELECT RELEASE_LOCK('livepalmes_license_control')");}finally{connection.release();}}
}
module.exports={fillClubLicense};

"use strict";
// Preparation only: no schema creation, migration or Firebase fallback here.
// One indexed singleton read per opening; at most 111 legacy/default courses.
const {createHash}=require("node:crypto");
const MAX_COURSES=111,MAX_BYTES=64000;
function decode(value) {
  let courses;
  try { courses=typeof value==="string"?JSON.parse(value):value; }
  catch { throw new TypeError("Bibliotheque eau libre NAP illisible."); }
  if(!Array.isArray(courses)||courses.length>MAX_COURSES||Buffer.byteLength(JSON.stringify(courses))>MAX_BYTES) throw new TypeError("Bibliotheque eau libre NAP hors limites.");
  const ids=new Set();
  return courses.map(raw=>{
    const distance=raw?.distance,discipline=raw?.discipline;
    if(!Number.isInteger(distance)||distance<1||distance>100000||!["SF","BI","SUP"].includes(discipline)||(distance===150&&discipline==="SUP")) throw new TypeError("Course eau libre NAP invalide.");
    const format=distance===150?"elimination":"standard";
    const id=`${distance===150?"150-elimination":distance}-${discipline}`;
    if(raw.id!==id||raw.format!==format||typeof raw.active!=="boolean"||typeof raw.label!=="string"||!raw.label||raw.label.length>150||ids.has(id)) throw new TypeError("Identite de course eau libre NAP invalide.");
    ids.add(id);
    return {id,distance,discipline,label:raw.label,format,active:raw.active};
  });
}
function snapshot(row) {
  if(!row) throw new TypeError("Bibliotheque eau libre NAP non preparee.");
  const version=Number(row.version),courses=decode(row.courses);
  if(Number(row.id)!==1||!Number.isSafeInteger(version)||version<1) throw new TypeError("Version de bibliotheque eau libre NAP invalide.");
  const fingerprint=createHash("sha256").update(JSON.stringify({version,courses})).digest("hex");
  return {courses,version,fingerprint};
}
async function read(connection) {
  const [rows]=await connection.execute({sql:"SELECT id,courses,version FROM livepalmes_open_water_course_library FORCE INDEX (PRIMARY) WHERE id=1 LIMIT 1",timeout:10000},[]);
  return {ok:true,source:"nap",...snapshot(rows[0]),readStats:{nativeQueries:1,maxNativeRows:1}};
}
function plan(current,input) {
  if(!current||input?.expectedFingerprint!==current.fingerprint) throw new TypeError("La bibliotheque a change. Rechargez avant d'enregistrer.");
  const courses=decode(current.courses);
  if(input.action==="add") {
    const [course]=decode([input.course]);
    if(courses.some(item=>item.id===course.id)) throw new TypeError("Cette course existe deja dans la bibliotheque eau libre.");
    // Preserve the existing 100-course addition ceiling, including defaults.
    if(courses.length>=100) throw new RangeError("La bibliotheque eau libre a atteint sa limite de courses.");
    courses.push(course);
  } else if(input.action==="status") {
    if(typeof input.active!=="boolean") throw new TypeError("Activation de course requise.");
    const index=courses.findIndex(course=>course.id===input.courseId);
    if(index<0) throw new TypeError("Course eau libre introuvable.");
    courses[index]={...courses[index],active:input.active};
  } else throw new TypeError("Action de bibliotheque eau libre invalide.");
  courses.sort((a,b)=>a.distance-b.distance||a.label.localeCompare(b.label,"fr"));
  const version=current.version+1;
  if(!Number.isSafeInteger(version)) throw new RangeError("Version de bibliotheque hors limites.");
  return {before:{version:current.version,courses:decode(current.courses)},after:{version,courses}};
}
async function change(pool,input,actorUid,backup) {
  if(typeof actorUid!=="string"||!actorUid||actorUid.length>128||typeof backup!=="function")throw new TypeError("Auteur et sauvegarde requis.");
  const connection=await pool.getConnection();let transaction=false,safe=true;
  try {
    await connection.beginTransaction();transaction=true;
    const [rows]=await connection.execute({sql:"SELECT id,courses,version FROM livepalmes_open_water_course_library FORCE INDEX (PRIMARY) WHERE id=1 LIMIT 1 FOR UPDATE",timeout:10000},[]);
    const current=snapshot(rows[0]);
    const prepared=plan(current,{...input,expectedFingerprint:input.expectedFingerprint||current.fingerprint});
    await backup({kind:"nap-open-water-library-change",actorUid,...prepared});
    const [result]=await connection.execute({sql:"UPDATE livepalmes_open_water_course_library SET courses=?,version=?,updated_at=UTC_TIMESTAMP(6),updated_by=? WHERE id=1 AND version=?",timeout:10000},[JSON.stringify(prepared.after.courses),prepared.after.version,actorUid,current.version]);
    if(result.affectedRows!==1)throw new TypeError("Bibliotheque modifiee pendant l'enregistrement.");
    await connection.commit();transaction=false;
    return {ok:true,source:"nap",...snapshot({id:1,...prepared.after}),...(input.action==="add"?{course:input.course}:{})};
  } finally {
    if(transaction) {try{await connection.rollback();}catch{safe=false;}}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={decode,snapshot,read,plan,change};

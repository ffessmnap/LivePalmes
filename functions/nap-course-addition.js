"use strict";
// Additive native edit. Never replaces courses, entries or old restrictions.
// Fixed budget: dossier + catalog (<=300), defaults (3), triggers (1), plan,
// two locked course reads (<=300 each), authority, one grouped INSERT, verify.
const {isDeepStrictEqual}=require("node:util");
const native=require("./nap-portal-competitions");
const { fingerprint } = require("./nap-competition-fingerprint");
const { nativeCourseCode } = require("./nap-competition-view-values");
const {operationHash,authorityGuard}=require("./nap-portal-competition-change");
const { positiveId } = require("./nap-calendar-values");
const COLUMNS=["compet","pos","id_course","opencourse","cost","limitnageur"];
const READ="SELECT id,compet,pos,id_course,opencourse,cost,limitnageur FROM compet_courses WHERE compet=? ORDER BY pos,id LIMIT 301";
const CATALOG="SELECT id,course,sexe,final,relais,categorie,ld,mixte,actif FROM course_dispo FORCE INDEX(PRIMARY) WHERE id>0 ORDER BY id LIMIT 301";
const project=row=>Object.fromEntries(COLUMNS.map(key=>[key,row[key]]));
const same=(a,b)=>COLUMNS.every(key=>a[key]==null||b[key]==null ? a[key]===b[key] : String(a[key])===String(b[key]));
function planAdditions(pack,raw,catalog,defaults,definitions){
  const water=pack.event.eventType==="openWater"||pack.event.competitionType==="openWater";
  if(!water&&pack.event.eventType!=="pool"&&pack.event.competitionType!=="pool")throw new TypeError("Type de competition incompatible avec l'ajout natif.");
  if(!Array.isArray(raw)||!raw.length||raw.length>80||new Set(raw.map(row=>row?.code)).size!==raw.length)throw new TypeError("Selection de courses invalide.");
  if(pack.groups?.length||Number(pack.nativeParameters.qualif))throw new TypeError("Une grille de qualification existe : son programme doit etre verifie avant ajout de courses.");
  if(catalog.length>300||pack.courses.length>300)throw new RangeError("Referentiel de courses trop volumineux.");
  const fallback={};
  for(const key of ["opencourse","cost","limitnageur"]){
    const row=defaults.find(item=>item.COLUMN_NAME===key);
    // Native IntraNAP courses use zero cost/limit at creation even though
    // those two NOT NULL columns have no SQL default. Do not change the schema
    // or infer the value of an unknown/new column from nullability alone.
    const expectedType=key==="cost" ? "decimal(10,0)" : "int(11)";
    if(!row||row.COLUMN_TYPE!==expectedType||row.IS_NULLABLE!=="NO"||row.EXTRA||
        (row.COLUMN_DEFAULT!=null&&String(row.COLUMN_DEFAULT)!=="0"))throw new TypeError("Structure native des tarifs ou limites a verifier.");
    if(key==="opencourse"&&String(row.COLUMN_DEFAULT)!=="0")throw new TypeError("Valeur native Open a verifier.");
    fallback[key]=key==="cost"?"0":0;
  }
  let pos=Math.max(0,...pack.courses.map(row=>Number(row.pos)||0));
  if(!Number.isSafeInteger(pos)||pos>2147483300)throw new TypeError("Ordre natif des courses a verifier.");
  const existing=new Set(pack.courses.map(row=>Number(row.id_course))),additions=[];
  for(const event of raw){
    const waterRows=water?catalog.filter(row=>require('./nap-open-water-courses').definition(row.course)?.code===event.code):[];
    const definition=definitions?.get(event.code)||(waterRows.length?require('./nap-open-water-courses').definition(waterRows[0].course):null);
    if(!definition)throw new TypeError("Course inconnue du programme LivePalmes.");
    const mixed=definition.relayMixedRule==="required"||definition.relayMixedRule==="mastersOnly"&&event.relayMixedMode==="masters";
    const rows=catalog.filter(row=>(water?require('./nap-open-water-courses').definition(row.course)?.code===event.code:nativeCourseCode(row.course)===event.code)&&Number(row.final)===0&&Number(row.actif)===1&&Number(row.ld)===(water?1:0)&&Number(row.categorie)===0&&Boolean(Number(row.relais))===(definition.type==="relay")&&Boolean(Number(row.mixte))===mixed);
    if(mixed ? rows.length!==1||String(rows[0].sexe)!=="0" : rows.length!==2||new Set(rows.map(row=>row.sexe)).size!==2||!rows.every(row=>["M","F"].includes(row.sexe)))throw new TypeError(`Correspondance native absente ou ambigue : ${event.code}.`);
    for(const row of rows)if(!existing.has(Number(row.id))){additions.push({compet:positiveId(pack.event.id),pos:++pos,id_course:Number(row.id),...fallback});existing.add(Number(row.id));}
  }
  if(pack.courses.length+additions.length>300)throw new RangeError("Trop de courses dans cette competition.");
  return additions;
}
function missingAdditions(current,before,additions){
  if(current.length>300||before.some(row=>!current.some(item=>Number(item.id)===Number(row.id)&&same(item,row))))throw new TypeError("Les courses existantes ont change. Rechargez la fiche.");
  const newRows=current.filter(row=>!before.some(old=>Number(old.id)===Number(row.id)));
  if(newRows.some(row=>!additions.some(item=>same(item,row)))||new Set(newRows.map(row=>row.id_course)).size!==newRows.length)throw new TypeError("Ajout concurrent de courses. Rechargez la fiche.");
  return additions.filter(row=>!newRows.some(item=>same(item,row)));
}
async function addNativeCourses(pool,input,audit,authorize){
  if(typeof authorize!=="function"||Object.keys(input.patch||{}).length!==1||!Object.hasOwn(input.patch,"addNativeCourses"))throw new TypeError("Enregistrez les nouvelles courses separement.");
  const id=positiveId(input.competitionId),operation=operationHash(input),connection=await pool.getConnection();let locked=false;
  // MySQL 5.7 cannot prepare LOCK/UNLOCK TABLES. Only these fixed internal
  // statements use query(); all values continue through prepared statements.
  const query=async(sql,values=[])=>(await (/^(LOCK TABLES|UNLOCK TABLES)/.test(sql)
    ? connection.query({sql,timeout:10000}) : connection.execute({sql,timeout:10000},values)))[0];
  try{
    const pack=await native.readNativeCompetition(connection,id,authorize);
    if(!pack)throw new TypeError("Competition introuvable.");
    let saved=await audit.read(operation);
    if(!saved&&fingerprint(pack)!==input.expectedFingerprint)throw new TypeError("La competition a change. Rechargez la fiche.");
    const catalog=await query(CATALOG);
    const defaults=await query("SELECT COLUMN_NAME,COLUMN_TYPE,COLUMN_DEFAULT,IS_NULLABLE,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='compet_courses' AND COLUMN_NAME IN ('opencourse','cost','limitnageur') ORDER BY COLUMN_NAME LIMIT 4");
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='compet_courses' LIMIT 1")).length)throw new TypeError("Declencheur natif a verifier avant ajout.");
    const authority={competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters};
    if(saved){
      if(saved.kind!=="native-course-addition"||saved.operation!==operation||saved.actorUid!==input.actorUid||saved.competitionId!==id||saved.expectedFingerprint!==input.expectedFingerprint||!isDeepStrictEqual(saved.authority,authority)||!isDeepStrictEqual(saved.catalog,catalog)||!isDeepStrictEqual(saved.defaults,defaults)||!Array.isArray(saved.before)||!Array.isArray(saved.additions))throw new TypeError("Sauvegarde d'ajout incompatible.");
      if(!isDeepStrictEqual(planAdditions({...pack,courses:saved.before},input.patch.addNativeCourses,catalog,defaults,input.eventDefinitions),saved.additions))throw new TypeError("Plan d'ajout incompatible.");
    }else{
      const additions=planAdditions(pack,input.patch.addNativeCourses,catalog,defaults,input.eventDefinitions);
      saved={kind:"native-course-addition",operation,actorUid:input.actorUid,competitionId:id,expectedFingerprint:input.expectedFingerprint,authority,catalog,defaults,before:pack.courses.map(row=>({id:row.id,compet:id,...project({...row,compet:id})})),additions};
      await audit.prepare(operation,saved);
    }
    const plan=await query(`EXPLAIN ${READ}`,[id]);
    if(!plan.length||plan.some(row=>row.table&&(!row.key||row.type==="ALL")))throw new TypeError("Index des courses a verifier.");
    await query("LOCK TABLES compet_courses WRITE, course_dispo READ, competitions AS scope_c READ, compet_parametres AS scope_p READ");locked=true;
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='compet_courses' LIMIT 1")).length)throw new TypeError("Declencheur natif a verifier avant ajout.");
    const guard=authorityGuard("compet_courses",authority);
    if(!(await query(`SELECT 1 AS authorized FROM DUAL WHERE ${guard.sql}`,guard.values)).length)throw new TypeError("Le perimetre a change. Rechargez la fiche.");
    if(!isDeepStrictEqual(await query(CATALOG),catalog))throw new TypeError("Le referentiel de courses a change.");
    const missing=missingAdditions(await query(READ,[id]),saved.before,saved.additions);
    if(missing.length){
      const result=await query(`INSERT INTO compet_courses (${COLUMNS.map(key=>`\`${key}\``).join(',')}) VALUES ${missing.map(()=>`(${COLUMNS.map(()=>'?').join(',')})`).join(',')}`,missing.flatMap(row=>COLUMNS.map(key=>row[key])));
      if(Number(result.affectedRows)!==missing.length)throw new Error("Ajout incomplet : reprenez la meme selection.");
    }
    if(missingAdditions(await query(READ,[id]),saved.before,saved.additions).length)throw new Error("Ajout a verifier : sauvegarde conservee.");
    await query("UNLOCK TABLES");locked=false;
    await audit.complete(operation,{competitionId:id,actorUid:input.actorUid,operation,added:saved.additions.length,verified:true});
    return {ok:true,source:"nap",operation,added:saved.additions.length};
  }finally{
    if(locked){try{await query("UNLOCK TABLES");}catch(error){connection.destroy();throw error;}}
    connection.release();
  }
}
module.exports={planAdditions,missingAdditions,addNativeCourses,COLUMNS};

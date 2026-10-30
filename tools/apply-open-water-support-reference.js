"use strict";
// Only the two references approved by Antoine on 2026-10-30. No connection,
// credentials or CLI apply by default. Caller supplies a verified durable backup.
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {prepareSupportReference,fields}=require('./plan-open-water-support-reference');
const water=require('../functions/nap-open-water-courses');
const CONFIRMATION='AJOUT-1000M-SUPPORT-FH-AUTORISE';
const CATALOG='SELECT id,'+fields.map(f=>'`'+f+'`').join(',')+' FROM course_dispo FORCE INDEX(PRIMARY) WHERE id>0 ORDER BY id LIMIT 301';
const COLUMNS="SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='course_dispo' ORDER BY ORDINAL_POSITION LIMIT 81";
const TRIGGERS="SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='course_dispo' LIMIT 1";
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const target=row=>water.definition(row.course)?.code==='OW1000SUP';
async function applySupportReference(connection,{confirmation,approvedPlan,expectedColumns,backupVerified}){
 if(confirmation!==CONFIRMATION||typeof backupVerified!=='function'||!Array.isArray(expectedColumns)||expectedColumns.length!==18||approvedPlan?.kind!=='prepare-only-open-water-1000-support'||approvedPlan.newReferences?.length!==2||approvedPlan.existingRowsPreserved!==275)throw new TypeError('Accord exact, plan approuve et sauvegarde verifiee requis.');
 const query=async(sql,values=[])=>(await (/^(LOCK TABLES|UNLOCK TABLES)/.test(sql)?connection.query({sql,timeout:10000}):connection.execute({sql,timeout:10000},values)))[0];
 let locked=false;
 try{
  const columns=await query(COLUMNS);if(!isDeepStrictEqual(columns,expectedColumns))throw new TypeError('Structure du catalogue modifiee.');
  const tables=await query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='course_dispo' LIMIT 1");if(tables.length!==1||tables[0].ENGINE!=='MyISAM')throw new TypeError('Moteur du catalogue modifie.');
  if((await query(TRIGGERS)).length)throw new TypeError('Declencheur du catalogue a verifier.');
  const explain=await query('EXPLAIN '+CATALOG);if(!explain.length||explain.some(row=>row.table&&(!row.key||row.type==='ALL')))throw new TypeError('Index du catalogue a verifier.');
  await query('LOCK TABLES course_dispo WRITE');locked=true;
  if(!isDeepStrictEqual(await query(COLUMNS),columns))throw new TypeError('Structure modifiee avant verrouillage.');
  if((await query(TRIGGERS)).length)throw new TypeError('Declencheur du catalogue a verifier.');
  const before=await query(CATALOG);if(before.length>300)throw new RangeError('Catalogue hors limites.');
  const templates=before.filter(row=>[405,406].includes(Number(row.id)));
  const plan=prepareSupportReference(before,templates);
  if(hash(templates)!==approvedPlan.templateFingerprint||hash(before.filter(row=>!target(row)))!==approvedPlan.expectedCatalogFingerprint)throw new TypeError('Catalogue ou modeles differents du bilan approuve.');
  const approvedRows=approvedPlan.newReferences.map(x=>x.row);
  if(plan.newReferences.some(x=>!approvedRows.some(row=>isDeepStrictEqual(row,x.row)))||before.filter(target).some(row=>!approvedRows.some(proposal=>isDeepStrictEqual(proposal,Object.fromEntries(fields.map(f=>[f,row[f]]))))))throw new TypeError('Perimetre different des deux references approuvees.');
  // Durable storage must be reopened, decrypted and compared by the caller.
  const backup=await backupVerified({kind:'nap-1000-support-before',columns,engine:tables[0].ENGINE,catalog:before,plan,approvedPlan,createdAt:new Date().toISOString()});
  if(!backup||backup.verified!==true||typeof backup.sha256!=='string'||!/^[a-f0-9]{64}$/.test(backup.sha256))throw new TypeError('Sauvegarde non verifiee.');
  const missing=plan.newReferences;
  if(missing.length){
   const result=await query('INSERT INTO course_dispo ('+fields.map(f=>'`'+f+'`').join(',')+') VALUES '+missing.map(()=>'('+fields.map(()=>'?').join(',')+')').join(','),missing.flatMap(x=>fields.map(f=>x.row[f])));
   if(Number(result.affectedRows)!==missing.length)throw new Error('Ajout incomplet : sauvegarde conservee.');
  }
  const after=await query(CATALOG),added=after.filter(target);
  if(after.length!==277||added.length!==2||hash(after.filter(row=>!target(row)))!==approvedPlan.expectedCatalogFingerprint||added.some(row=>!approvedRows.some(proposal=>isDeepStrictEqual(proposal,Object.fromEntries(fields.map(f=>[f,row[f]]))))))throw new Error('Verification du catalogue incomplete.');
  await query('UNLOCK TABLES');locked=false;
  return {ok:true,kind:'nap-1000-support-added',inserted:missing.length,references:added.map(({id,course,sexe,wplabel})=>({id,course,sexe,wplabel})),beforeExisting:275,afterCount:277,oldRowsUnchanged:true,backup,competitionsChanged:0,entriesChanged:0,verifiedAt:new Date().toISOString()};
 }finally{if(locked)await query('UNLOCK TABLES');}
}
module.exports={applySupportReference,CONFIRMATION,CATALOG,COLUMNS,TRIGGERS};

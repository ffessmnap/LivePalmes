"use strict";
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {planDistanceReferences,FIELDS}=require('./nap-open-water-reference-plan');
const CATALOG='SELECT id,'+FIELDS.map(key=>'`'+key+'`').join(',')+' FROM course_dispo FORCE INDEX(PRIMARY) WHERE id>0 ORDER BY id LIMIT 301';
const COLUMNS="SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='course_dispo' ORDER BY ORDINAL_POSITION LIMIT 81";
const TRIGGERS="SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='course_dispo' LIMIT 1";
const ENGINE="SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='course_dispo' LIMIT 1";
const TYPES={id:'int(11)',course:'varchar(15)',sexe:'char(2)',final:'int(11)',relais:'int(11)',categorie:'int(11)',p:'int(11)',ld:'int(11)',bi:'int(11)',_order:'int(11)',wplabel:'varchar(16)',mixte:'int(11)',style:'varchar(5)',type_:'int(11)',longueur:'bigint(20)',nbnageur:'int(11)',validation:'int(11)',actif:'int(11)'};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const project=row=>Object.fromEntries(FIELDS.map(key=>[key,row[key]]));
function validateColumns(columns){
 if(columns.length!==18||new Set(columns.map(row=>row.COLUMN_NAME)).size!==18||columns.some(row=>TYPES[row.COLUMN_NAME]!==row.COLUMN_TYPE||row.IS_NULLABLE!==(['bi','_order','actif'].includes(row.COLUMN_NAME)?'YES':'NO')||(row.EXTRA||'')!==(row.COLUMN_NAME==='id'?'auto_increment':'')))throw new TypeError('Structure du catalogue NAP à vérifier.');
}
function assertPreserved(before,after){
 const byId=new Map(after.map(row=>[Number(row.id),row]));
 if(after.length>300||byId.size!==after.length||before.some(row=>!isDeepStrictEqual(row,byId.get(Number(row.id)))))throw new TypeError('Les références NAP existantes ont changé. Reprenez l’ajout.');
}
async function ensureDistanceReferences(pool,{distance,actorUid},backupVerified){
 if(!Number.isInteger(distance)||distance<1||distance>100000||typeof actorUid!=='string'||!actorUid||actorUid.length>128||typeof backupVerified!=='function')throw new TypeError('Distance et auteur NAP requis.');
 // Elimination references are already catalogued; never generate a sporting format.
 if(distance===150)return {created:0,referenceIds:[]};
 const connection=await pool.getConnection();let lockAttempted=false,created=0;
 const query=async(sql,values=[])=>(await (/^(LOCK TABLES|UNLOCK TABLES)/.test(sql)?connection.query({sql,timeout:10000}):connection.execute({sql,timeout:10000},values)))[0];
 const catalog=async()=>{const rows=plain(await query(CATALOG));if(rows.length>300)throw new RangeError('Catalogue NAP hors limites.');return rows;};
 try{
  const explain=await query('EXPLAIN '+CATALOG);if(!explain.length||explain.some(row=>row.table&&(!row.key||row.type==='ALL')))throw new TypeError('Index du catalogue NAP à vérifier.');
  const before=await catalog(),plan=planDistanceReferences(distance,before);
  if(!plan.additions.length)return {created:0,referenceIds:plan.references.map(row=>row.id)};
  const columns=plain(await query(COLUMNS));validateColumns(columns);
  const engine=plain(await query(ENGINE));if(engine.length!==1||engine[0].ENGINE!=='MyISAM')throw new TypeError('Moteur du catalogue NAP à vérifier.');
  if((await query(TRIGGERS)).length)throw new TypeError('Déclencheur du catalogue NAP à vérifier.');
  const payload={kind:'native-open-water-reference-addition',actorUid,distance,columns,engine,before,plan};
  // The backup is persisted, reopened and compared before taking the MyISAM
  // write lock, so no network call holds up other catalogue readers.
  const backup=await backupVerified(payload);
  if(backup?.verified!==true||backup.payloadHash!==hash(payload)||typeof backup.complete!=='function')throw new TypeError('Sauvegarde NAP vérifiée requise avant ajout.');
  lockAttempted=true;await query('LOCK TABLES course_dispo WRITE');
  if(!isDeepStrictEqual(plain(await query(COLUMNS)),columns)||!isDeepStrictEqual(plain(await query(ENGINE)),engine)||(await query(TRIGGERS)).length)throw new TypeError('Structure du catalogue NAP modifiée.');
  const current=await catalog();assertPreserved(before,current);
  if(!isDeepStrictEqual(before,current)){
   const currentPlan=planDistanceReferences(distance,current);
   const oldIds=new Set(before.map(row=>Number(row.id)));
   const concurrent=current.filter(row=>!oldIds.has(Number(row.id)));
   if(currentPlan.additions.length||concurrent.some(row=>!plan.additions.some(item=>isDeepStrictEqual(item.row,project(row)))))throw new TypeError('Catalogue NAP modifié pendant la préparation. Reprenez l’ajout.');
   await query('UNLOCK TABLES');lockAttempted=false;
   return {created:0,referenceIds:currentPlan.references.map(row=>row.id)};
  }
  const result=await query('INSERT INTO course_dispo ('+FIELDS.map(key=>'`'+key+'`').join(',')+') VALUES '+plan.additions.map(()=>'('+FIELDS.map(()=>'?').join(',')+')').join(','),plan.additions.flatMap(item=>FIELDS.map(key=>item.row[key])));
  created=Number(result.affectedRows)||0;
  if(created!==plan.additions.length)throw new Error('Ajout NAP incomplet. Reprenez la même distance ; la sauvegarde est conservée.');
  const after=await catalog();assertPreserved(before,after);
  const oldIds=new Set(before.map(row=>Number(row.id))),added=after.filter(row=>!oldIds.has(Number(row.id)));
  if(after.length!==before.length+created||added.length!==created||added.some(row=>!plan.additions.some(item=>isDeepStrictEqual(item.row,project(row)))))throw new Error('Vérification des nouvelles références NAP incomplète.');
  const verified=planDistanceReferences(distance,after);if(verified.additions.length)throw new Error('Références Femmes/Hommes NAP incomplètes.');
  await query('UNLOCK TABLES');lockAttempted=false;
  const receipt={created,distance,referenceIds:verified.references.map(row=>row.id),oldRowsUnchanged:true,competitionWrites:0,entryWrites:0};
  await backup.complete(receipt);
  return {...receipt,backupId:backup.documentId};
 }catch(error){if(created)error.nativeReferencesCreated=created;throw error;}
 finally{
  if(lockAttempted){try{await query('UNLOCK TABLES');}catch(error){connection.destroy();throw error;}}
  connection.release();
 }
}
module.exports={ensureDistanceReferences,validateColumns,CATALOG,COLUMNS,ENGINE,TRIGGERS};

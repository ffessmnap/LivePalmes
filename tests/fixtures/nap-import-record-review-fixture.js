"use strict";
const assert=require('node:assert/strict');
const store=require('../../functions/nap-records-store'),lifecycle=require('../../functions/nap-import-lifecycle');
const {canonical}=require('../../functions/nap-import-operation-plan'),{COLUMNS}=require('../../functions/nap-performance-change-plan');
const nativeHash=require('../../functions/nap-import-preview').hash;
const clone=structuredClone,importId='a'.repeat(64);
function fixture(){
 const competition={id:5162,libelle:'Fixture',date:'2026-06-01',lieu:'Piscine',bassin:'50',chrono:'E'};
 const perfs=[1,2,3].map(id=>({id,nageur:10+id,compet:5162,course:'50SF',cat:'HJU',tps:'002000',points:0,newpoints:0,passage:id===2?1:0,club:'106',relais:0,pid:null,classement:0}));
 const people=perfs.map(row=>({id:row.nageur,nom:'FICTIF',prenom:`Nageur${row.id}`,date:'2009-01-01',sexe:'M',club:'106'}));
 const reference=(key,extra={})=>({key,sex:'M',category:'J',course:'50SF',swimmer:'Autre FICTIF',time:'24.00',value:2400,date:'2026-01-01',club:'Club',...extra});
 const data={id:'records',records:[reference('mpf')],franceRecords:[reference('rf',{recordType:'RF',category:'S'}),reference('rfj',{recordType:'RFJ'})],filters:{},recordHistory:[]};
 const metadata={sourceContractVersion:1,competition,people,clubs:[{num_club:'106',nom_club:'Club fixture'}],plan:{perfs:{after:perfs,sources:perfs.map((row,i)=>({performanceId:row.id,sourceLine:4+i,origin:['individual','passage','first-relay'][i],fingerprint:nativeHash(canonical(row,COLUMNS))}))}},recordReview:{...lifecycle.initialReview(),detectionVersion:1,status:'pending'}};
 const state={metadata:clone(metadata),perfs:clone(perfs),people:clone(people),competition:clone(competition),visibility:[],pointer:{currentImportId:importId},status:'completed',official:{revision:1,data:clone(data)},versions:[],locked:false,denyLock:false,trace:[],commits:0,rollbacks:0,released:0};
 const payload=official=>({revision:official.revision,payload:JSON.stringify(official.data),payload_sha256:store.hash(official.data)});
 function connection(){let snapshot=null,tables=false;return {
  beginTransaction:async()=>{snapshot=clone({metadata:state.metadata,official:state.official,versions:state.versions});},
  commit:async()=>{snapshot=null;state.commits++;},rollback:async()=>{if(snapshot)Object.assign(state,snapshot);snapshot=null;state.rollbacks++;},release:()=>{state.released++;},
  query:async({sql})=>{state.trace.push(sql);if(sql.startsWith('LOCK TABLES')){assert.match(sql,/perfs READ/);tables=true;state.locked=true;}else if(sql==='UNLOCK TABLES'){tables=false;state.locked=false;}else throw Error(sql);},
  execute:async({sql},values=[])=>{
   state.trace.push(sql);
   if(sql.includes('GET_LOCK'))return [[{acquired:state.denyLock?0:1}]];
   if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
   if(sql.startsWith('SELECT TABLE_NAME,ENGINE'))return [['livepalmes_performance_imports','livepalmes_records_current','livepalmes_records_versions'].map(TABLE_NAME=>({TABLE_NAME,ENGINE:state.badEngine?'MyISAM':'InnoDB'}))];
   if(sql.startsWith('SELECT competition_id,status,metadata'))return [[{competition_id:5162,status:state.status,metadata:clone(state.metadata)}]];
   if(sql.startsWith("SELECT competition_id,JSON_EXTRACT"))return [[{competition_id:5162,source_version:state.metadata.sourceContractVersion,record_review:clone(state.metadata.recordReview)}]];
   if(sql.startsWith('SELECT metadata FROM livepalmes_performance_imports'))return [[{metadata:clone(state.pointer)}]];
   if(sql===store.READ_SQL)return [[payload(state.official)]];
   if(sql.startsWith('SELECT revision FROM livepalmes_records_current'))return [[{revision:state.official.revision}]];
   if(sql.startsWith('SELECT revision,payload,payload_sha256,actor_uid'))return [state.versions.filter(row=>row.operation_id===values[0])];
   if(sql.startsWith('SELECT `id`')){assert.ok(tables,'Native results must remain read-locked');return [clone(state.perfs.filter(row=>values.includes(row.id)))];}
   if(sql.startsWith('SELECT performance_id,hidden'))return [clone(state.visibility)];
   if(sql.startsWith('SELECT id,libelle,date,lieu,bassin,chrono'))return [[clone(state.competition)]];
   if(sql.startsWith('SELECT id,nom,prenom,date,sexe,club'))return [clone(state.people.filter(person=>values.includes(person.id)))];
   if(sql.startsWith('UPDATE livepalmes_performance_imports')){state.metadata.recordReview=JSON.parse(values[0]);return [{affectedRows:1}];}
   if(sql.startsWith("SELECT JSON_EXTRACT(metadata,'$.recordReview')")){
    const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,value])=>[key,reverse(value)])):value;
    return [[{record_review:state.badReviewRead?{}:reverse(state.metadata.recordReview)}]];
   }
   if(sql.startsWith('INSERT INTO livepalmes_records_versions')){const saved={revision:values[0],operation_id:values[1],payload:values[2],payload_sha256:values[3],actor_uid:values[4]};state.versions.push(saved);return [{affectedRows:1}];}
   if(sql.startsWith('UPDATE livepalmes_records_current')){const saved=state.versions.find(row=>row.revision===values[0]);state.official={revision:saved.revision,data:JSON.parse(saved.payload)};return [{affectedRows:1}];}
   throw Error('Unexpected fixture SQL: '+sql);
  }
 };}
 const pool={getConnection:async()=>connection(),execute:(...args)=>connection().execute(...args)};
 return {state,pool,importId,actor:{uid:'manager',email:'fixture@example.test'},data};
}
module.exports={fixture,importId};

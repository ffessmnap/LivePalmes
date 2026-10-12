"use strict";
const assert=require("node:assert/strict");
const store=require("../functions/nap-records-store");
const schema=require("../functions/nap-approved-records-schema");
const data={id:"records",records:[{key:"mpf",swimmer:"Test",course:"50AP",time:"15.90",value:1590}],franceRecords:[],filters:{courses:["50AP"]},recordHistory:[{adminEmail:"private@example.test"}],updatedAt:"2026-10-12T00:00:00Z"};
assert.deepEqual(store.validate(data),data);
assert.throws(()=>store.validate({...data,records:[{...data.records[0],email:"private"}]}),/Ligne/);
assert.throws(()=>store.validate({...data,extra:true}),/Contenu/);
assert.throws(()=>store.validate({...data,records:[{swimmer:"a".repeat(store.MAX_BYTES)}]}),/volumineux/);
assert.throws(()=>store.unpack([{revision:1,payload:JSON.stringify(data),payload_sha256:"bad"}]),/Empreinte/);
for(const d of schema.definitions){assert.equal(schema.validate(d,{tables:[],columns:[],keys:[]}),false);assert.throws(()=>schema.validate(d,{tables:[{ENGINE:"MyISAM"}],columns:[],keys:[]}),/incompatible/);}
function fake({revision=1,failUpdate=false,prior=null}={}){
  let saved=null,committed=false,rolledBack=false,released=false;const calls=[];
  const connection={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{released=true;},execute:async({sql},values)=>{
    calls.push(sql);
    if(sql.includes("FOR UPDATE"))return [[{revision}]];
    if(sql.includes("WHERE operation_id"))return [prior?[prior]:[]];
    if(sql.startsWith("INSERT")){saved={revision:values[0],payload:values[2],payload_sha256:values[3],actor_uid:values[4]};return [{affectedRows:1}];}
    if(sql.startsWith("UPDATE"))return [{affectedRows:failUpdate?0:1}];
    if(sql===store.READ_SQL)return [[saved||{revision,payload:JSON.stringify(data),payload_sha256:store.hash(data)}]];
    throw Error(sql);
  }};
  return {connection,getConnection:async()=>connection,execute:connection.execute,state:()=>({saved,committed,rolledBack,released,calls})};
}
(async()=>{
  const publicRead=await store.read(fake());assert.equal(publicRead.data.recordHistory,undefined);assert.equal(publicRead.data.updatedByEmail,undefined);
  const input={expectedRevision:1,operationId:"11111111-1111-4111-8111-111111111111",data};
  const pool=fake();const result=await store.publish(pool,input,{uid:"admin",email:"actor@example.test"});assert.equal(result.revision,2);assert.equal(result.data.updatedBy,"admin");assert.equal(pool.state().committed,true);assert.equal(pool.state().released,true);
  const conflict=fake({revision:2});await assert.rejects(()=>store.publish(conflict,input,{uid:"admin"}),/gestionnaire/);assert.equal(conflict.state().saved,null);assert.equal(conflict.state().rolledBack,true);
  const failed=fake({failUpdate:true});await assert.rejects(()=>store.publish(failed,input,{uid:"admin"}),/version active/);assert.equal(failed.state().committed,false);assert.equal(failed.state().rolledBack,true);
  const retry=fake({revision:2,prior:pool.state().saved});const replay=await store.publish(retry,input,{uid:"admin"});assert.equal(replay.replayed,true);assert.equal(retry.state().saved,null);
  await assert.rejects(()=>store.publish(fake({prior:pool.state().saved}),input,{uid:"other"}),/incompatible/);
  console.log("NAP Records: projection privée/publique, limites, empreinte, concurrence, reprise et rollback vérifiés.");
})().catch(e=>{console.error(e);process.exitCode=1;});

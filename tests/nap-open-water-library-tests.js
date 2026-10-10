"use strict";
const assert=require("node:assert/strict");
const library=require("../functions/nap-open-water-library");
function course(distance,discipline="SF") {return {id:`${distance===150?"150-elimination":distance}-${discipline}`,distance,discipline,label:`${distance} m ${discipline}`,format:distance===150?"elimination":"standard",active:true};}
async function run() {
  const current=library.snapshot({id:1,version:"2",courses:JSON.stringify([course(150),course(1000)])});
  const input={action:"status",courseId:"1000-SF",active:false,expectedFingerprint:current.fingerprint};
  const changed=library.plan(current,input);
  assert.equal(changed.after.version,3);
  assert.equal(changed.after.courses[1].active,false);
  assert.equal(current.courses[1].active,true,"Preview must not mutate its source");
  assert.throws(()=>library.plan(current,{...input,expectedFingerprint:"stale"}),/change/);
  assert.throws(()=>library.plan(current,{...input,active:"false"}),/Activation/);
  assert.throws(()=>library.plan(current,{...input,courseId:"missing"}),/introuvable/);
  assert.throws(()=>library.plan(current,{action:"add",course:course(1000),expectedFingerprint:current.fingerprint}),/deja/);
  const added=library.plan(current,{action:"add",course:course(500,"BI"),expectedFingerprint:current.fingerprint});
  assert.deepEqual(added.after.courses.map(item=>item.distance),[150,500,1000]);
  assert.throws(()=>library.decode([course(150,"SUP")]),/invalide/);
  assert.throws(()=>library.decode([course(1000),course(1000)]),/Identite/);
  assert.throws(()=>library.decode("bad json"),/illisible/);
  assert.throws(()=>library.snapshot(),/non preparee/);
  const legacy=Array.from({length:111},(_,index)=>course(index+1000));
  const full=library.snapshot({id:1,version:1,courses:legacy});
  assert.equal(library.plan(full,{...input,courseId:"1000-SF",expectedFingerprint:full.fingerprint}).after.courses.length,111,"Legacy/default courses must not be truncated");
  assert.throws(()=>library.plan(full,{action:"add",course:course(9000),expectedFingerprint:full.fingerprint}),/limite/);
  assert.throws(()=>library.decode([...legacy,course(9000)]),/limites/);
  let calls=0;
  const result=await library.read({execute:async(query,values)=>{
    calls++;assert.match(query.sql,/FORCE INDEX \(PRIMARY\).*WHERE id=1 LIMIT 1/);
    assert.deepEqual(values,[]);return [[{id:1,version:2,courses:current.courses}]];
  }});
  assert.equal(calls,1);assert.equal(result.source,"nap");assert.deepEqual(result.courses,current.courses);
  await assert.rejects(library.read({execute:async()=>[[]]}),/non preparee/);
  for(const failure of [false,true]) {
    let saved=false,committed=false,rolledBack=false,released=false;
    const connection={beginTransaction:async()=>{},execute:async(query)=>{
      if(query.sql.startsWith("SELECT")){assert.match(query.sql,/FOR UPDATE$/);return [[{id:1,version:2,courses:current.courses}]];}
      assert.equal(saved,true,"Backup before SQL write");return [{affectedRows:1}];
    },commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{released=true;}};
    const action=()=>library.change({getConnection:async()=>connection},input,"admin",async()=>{if(failure)throw Error("backup failed");saved=true;});
    if(failure){await assert.rejects(action(),/backup/);assert.equal(committed,false);assert.equal(rolledBack,true);}
    else {assert.equal((await action()).courses[1].active,false);assert.equal(committed,true);}
    assert.equal(released,true);
  }
  console.log("NAP open-water library: bounded reads, legacy preservation and change guards passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});

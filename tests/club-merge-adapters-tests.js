"use strict";
const assert=require("node:assert/strict"), path=require("node:path"), {spawnSync}=require("node:child_process");
const p=require("../tools/club-merge-plan"), {fixture}=require("./club-merge-fixture"), f=require("../tools/club-merge-firestore"), s=require("../tools/club-merge-sql");
async function main(){
  const {plan}=fixture(), saved=new Map(plan.docs.map(d=>[f.prefix+d.path,{name:f.prefix+d.path,fields:p.clone(d.fields),updateTime:d.updateTime}]));
  let race=false,failCommit=false,commits=0;
  const calls=[];
  const fetcher=async(url,input)=>{
    const body=JSON.parse(input.body); calls.push({url,body});
    assert.equal(input.headers.Authorization,"Bearer fixture-token");
    if(url.endsWith(":batchGet")){
      assert(body.documents.length<=100);
      const result=body.documents.map(name=>saved.has(name)?{found:p.clone(saved.get(name))}:{missing:name});
      if(race){saved.get(f.prefix+"users/fiction-target-a").updateTime="2026-10-31T03:00:00Z";race=false;}
      return {ok:true,json:async()=>result};
    }
    assert(url.endsWith(":commit"));commits++;
    if(failCommit||body.writes.some(w=>(saved.get(w.verify||w.update.name)?.updateTime)!==w.currentDocument.updateTime))return {ok:false,status:412};
    assert.equal(body.writes.length,7);
    const next=new Map(saved);
    for(const write of body.writes)if(write.update){
      const op=plan.firestore.find(o=>f.prefix+o.path===write.update.name);
      assert.deepEqual(write.updateMask.fieldPaths,op.mask);
      assert(!write.updateMask.fieldPaths.includes("capabilities"));
      next.set(write.update.name,{...write.update,updateTime:"2026-10-31T04:00:00Z"});
    }
    saved.clear();for(const [k,v]of next)saved.set(k,v);
    return {ok:true,json:async()=>({writeResults:body.writes.map(()=>({updateTime:"2026-10-31T04:00:00Z"}))})};
  };
  const firestore=f.adapter(async()=>"fixture-token",fetcher);
  const original=p.clone([...saved]);race=true;await assert.rejects(()=>firestore.commit(plan,"apply"),/FAILED_412/);
  assert.deepEqual([...saved].map(([k,d])=>[k,d.fields]),original.map(([k,d])=>[k,d.fields]));
  await firestore.commit(plan,"apply");
  for(const op of plan.firestore)assert.deepEqual(saved.get(f.prefix+op.path).fields,op.after);
  await firestore.commit(plan,"apply"); // atomic verify only, no repeated field writes
  const last=calls.at(-1).body.writes;assert(last.every(w=>w.verify));
  await firestore.commit(plan,"restore");
  for(const op of plan.firestore)assert.deepEqual(saved.get(f.prefix+op.path).fields,op.before);
  failCommit=true;await assert.rejects(()=>firestore.commit(plan,"apply"),/FAILED_412/);
  assert.equal(commits,5);
  const limits=f.adapter(async()=>"fixture",async()=>({ok:true,json:async()=>Array.from({length:101},(_,i)=>({document:{name:f.prefix+"users/"+i,fields:{},updateTime:"same"}}))}));
  await assert.rejects(()=>limits.query("users","clubId",p.ids.map(stringValue=>({stringValue}))),/QUERY_LIMIT/);
  const incomplete=f.adapter(async()=>"fixture",async()=>({ok:true,json:async()=>[]}));
  await assert.rejects(()=>incomplete.get(["users/fiction"]),/INCOMPLETE/);
  const queries=[];let affected=1;
  const connection={execute:async(input,values)=>{queries.push({sql:input.sql,values});return[{affectedRows:affected}];},query:async(input)=>{queries.push({sql:input.sql});return[[]];},destroy:()=>{}};
  const sql=s.adapter(connection), op=plan.changes.find(o=>o.table==="nageurs");
  await sql.mutate(op,"apply");
  assert.match(queries.at(-1).sql,/WHERE `id`=\? AND /);
  assert.match(queries.at(-1).sql,/CAST\(`id` AS BINARY\) <=> CAST\(\? AS BINARY\)/);
  assert.match(queries.at(-1).sql,/CAST\(CONVERT\(`name` USING utf8mb4\) AS BINARY\) <=> CAST\(CONVERT\(\? USING utf8mb4\) AS BINARY\)/);
  assert(queries.at(-1).values.some(Buffer.isBuffer));
  assert.match(queries.at(-1).sql,/CAST\(`bytes` AS BINARY\) <=> CAST\(\? AS BINARY\)/,"Binary columns must never undergo text conversion");
  assert(!queries.at(-1).sql.includes("Épreuve"));
  affected=0;await assert.rejects(()=>sql.mutate(op,"apply"),/COMPARE_AND_SWAP/);affected=1;
  const deleted=plan.changes.find(o=>!o.after);await sql.mutate(deleted,"apply");assert.match(queries.at(-1).sql,/^DELETE FROM `clubs`.*LIMIT 1$/);
  await sql.mutate(deleted,"restore");assert.match(queries.at(-1).sql,/^INSERT INTO `clubs`/);assert(!queries.at(-1).sql.includes("IGNORE"));
  await assert.rejects(()=>sql.locked(async()=>{throw Error("failure");}),/failure/);
  assert(queries.some(r=>r.sql.startsWith("LOCK TABLES ")));
  assert(queries.some(r=>r.sql.startsWith("LOCK TABLES ")&&!r.sql.includes(s.projectionTable)));
  assert.equal(queries.at(-1).sql,"UNLOCK TABLES");
  const records=s.adapter({execute:async input=>[input.sql.includes("FROM records") ? [{id:1,club:"JSCC"}] : [{revision:1,payload:JSON.stringify({records:[{club:"JSCC"}],franceRecords:[]})}]]});
  assert.equal((await records.historical()).labels.length,1);
  const legacyRows=Array.from({length:2955},(_,i)=>({id:i+1,club:"JSCC"}));
  const fullHistory=s.adapter({execute:async input=>[input.sql.includes("FROM records") ? legacyRows : [{revision:1,payload:JSON.stringify({records:[],franceRecords:[]})}]]});
  assert.equal((await fullHistory.historical()).labels.length,2955,"Real legacy cardinality stays bounded without false refusal");
  const cappedHistory=s.adapter({execute:async()=>[Array.from({length:10001},(_,i)=>({id:i+1,club:"JSCC"}))]});
  await assert.rejects(()=>cappedHistory.historical(),/HISTORICAL_RECORD_DEPENDENCY_CHANGED/);
  const orphan=s.adapter({execute:async input=>[input.sql.includes("FROM records") ? [] : [{revision:1,payload:JSON.stringify({records:[{clubId:"518"}],franceRecords:[]})}]]});
  await assert.rejects(()=>orphan.historical(),/CLUB_ID_DEPENDENCY/);
  assert.throws(()=>s.quote("clubs;DROP"),/IDENTIFIER/);
  const help=spawnSync(process.execPath,[path.join(__dirname,"../tools/club-merge.js"),"--help"],{encoding:"utf8",env:{...process.env,NAP_DB_PASSWORD:"",CLUB_MERGE_KEY_FILE:""}});
  assert.equal(help.status,0);assert.match(help.stdout,/Aucun mode par defaut/);
  console.log("Club merge adapters: raw Firestore masks/CAS and concurrent guards, query sentinels, indexed binary SQL CAS, physical delete/reinsert, locks released, no credentials on help; offline only.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

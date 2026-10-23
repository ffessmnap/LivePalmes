"use strict";
const assert=require("node:assert/strict"),{isDeepStrictEqual:equal}=require("node:util"),{createHash}=require("node:crypto");
const service=require("../functions/nap-nora-performance-clubs"),merge=require("../functions/nap-swimmer-merge-plan"),{fingerprint}=require("../functions/nap-portal-swimmer-change");
const person=(id,club)=>({id,club,nom:"LOISEL",prenom:"Nora",date:"2000-12-11",sexe:"F",actif:1,wc:null,edf:1,creation:"2020-01-01",number:""});
const target=person(13787,"107"),one=person(12,"90"),two=person(14783,"583");
const snapshots=()=>Object.fromEntries(merge.TABLES.map(spec=>[spec.table,[]]));
const event=(source,snapshot,timestamp)=>{
 const input={sourceSwimmerId:String(source.id),targetSwimmerId:String(target.id),sourceFingerprint:fingerprint(source),targetFingerprint:fingerprint(target),sourceLicenseNumber:"",targetLicenseNumber:"",actorUid:"national",confirmMerge:true,confirmClubMismatch:true,finalClubId:"107",timestamp};
 return {plan:merge.planMerge(input,source,target,snapshot,[]),verified:true};
};
function data(){
 const first=snapshots();first.perfs=[{id:1,nageur:12,club:"13310",compet:10,tps:"005168",points:"456"},{id:2,nageur:13787,club:"583",compet:10,tps:"015200"},{id:3,nageur:13787,club:"",compet:10,tps:"025000"},{id:6,nageur:13787,club:"0",compet:10,tps:"030000"}];
 first.perfs_relais=[{id:11,nageur1:12,nageur2:20,nageur3:21,nageur4:22,club:null,tps1:"12345"}];
 const e1=event(one,first,"2026-10-23 23:00:00.000000"),second=snapshots();second.perfs=first.perfs.map(row=>({...row,nageur:13787}));second.perfs.push({id:4,nageur:14783,club:"13685",compet:11,tps:"015222"});second.perfs_relais=first.perfs_relais.map(row=>({...row,nageur1:13787}));
 const e2=event(two,second,"2026-10-23 23:01:00.000000");
 const current={perfs:second.perfs.map(row=>({...row,nageur:13787})),perfs_relais:structuredClone(second.perfs_relais)};current.perfs.push({id:5,nageur:13787,club:"99999",compet:12,tps:"010000"});current.perfs.find(row=>row.id===6).tps="029999";
 const markers=[e1.plan.marker,e2.plan.marker],people=[{id:13787,club:"107",nom:"LOISEL",prenom:"Nora",date:"2000-12-11"}],clubs=[90,107,583].map(num_club=>({num_club}));
 return {events:[e1,e2],current,markers,people,clubs};
}
function fixture(options={}){
 const d=data(),documents={};let saved,writes=0,fail=true,destroyed=false,locked=false,complete;
 for(const e of d.events){documents[`nap-swimmer-merge-person-${e.plan.sourceSwimmerId}`]={state:"complete",operation:e.plan.operation};documents[`nap-swimmer-merge-${e.plan.operation}-before`]={target:e.plan};const id=createHash("sha256").update(`nap.swimmerMerge.complete|nap-swimmer-merge-${e.plan.operation}-complete`).digest("hex").slice(0,40);documents[id]={target:{operation:e.plan.operation,verified:true,sourceDeleted:true}};}
 const calls=[];const connection={query:async q=>{calls.push(q.sql);locked=q.sql.startsWith("LOCK TABLES");if(options.lockFailure&&locked)throw Error("Lock lost");},release:()=>assert.equal(locked,false),destroy:()=>{destroyed=true;},execute:async({sql},values=[])=>{
  calls.push(sql);assert.doesNotMatch(sql,/^(DELETE|INSERT|ALTER|CREATE)/);
  if(sql.startsWith("SELECT swimmer_id"))return [structuredClone(d.markers)];
  if(sql.startsWith("SELECT id,nom"))return [structuredClone(d.people)];
  if(sql.startsWith("SELECT num_club"))return [structuredClone(d.clubs.filter(c=>values.includes(c.num_club)))];
  if(sql.startsWith("SELECT *")){const table=sql.includes("`perfs_relais`")?"perfs_relais":"perfs",field=sql.match(/WHERE `([a-z0-9_]+)`=/)[1];return [structuredClone(d.current[table].filter(row=>Number(row[field])===13787))];}
  if(sql.startsWith("EXPLAIN"))return [[{table:"perfs",type:options.unindexed?"ALL":"range",key:options.unindexed?null:"PRIMARY"}]];
  assert.ok(saved,"Backup before write");assert.match(sql,/^UPDATE `(perfs|perfs_relais)` SET `club`=CASE/);assert.doesNotMatch(sql,/`(tps|nageur|points|compet)`=CASE/);const table=sql.match(/^UPDATE `([a-z_]+)`/)[1];let count=0;
  for(const item of saved.changes.find(c=>c.table===table).updates){const at=d.current[table].findIndex(row=>equal(row,item.before));if(at>=0){d.current[table][at]=structuredClone(item.after);count++;}}
  writes++;if(options.lostResponse&&fail){fail=false;throw Error("Lost response");}return [{affectedRows:count}];
 }};
 const audit={read:async()=>saved,readDocument:async id=>{assert.ok(Object.hasOwn(documents,id),"Bounded exact audit document");return structuredClone(documents[id]);},prepare:async plan=>{if(options.backupFailure)throw Error("Audit unavailable");saved=structuredClone(plan);},complete:async result=>{if(options.completeFailure&&fail){fail=false;throw Error("Receipt lost");}complete=result;}};
 return {d,calls,run:phase=>service.repair({getConnection:async()=>connection},{confirmation:service.OPERATION,phase,planHash:saved?.planHash},audit),saved:()=>saved,writes:()=>writes,complete:()=>complete,destroyed:()=>destroyed};
}
(async()=>{
 await assert.rejects(service.repair({getConnection:async()=>{throw Error("Must not connect");}},{confirmation:"arbitrary",phase:"apply"},{}),/Accord fixe/);
 const d=data(),p=service.buildPlan(d.people,d.markers,d.events,d.current,d.clubs);service.validatePlan(p);assert.deepEqual(p.changes[0].updates.map(i=>[i.before.id,i.after.club,i.originalSwimmerId]),[[1,"90","12"],[3,"107","13787"],[4,"583","14783"]]);assert.equal(p.changes[1].updates[0].after.club,"90");assert.equal(p.retained.length,1);assert.equal(p.skipped.length,2);
 const changed=structuredClone(p);changed.changes[0].updates[0].after.tps="000001";assert.throws(()=>service.validatePlan(changed));
 const wrong=data();wrong.events[1].verified=false;assert.throws(()=>service.buildPlan(wrong.people,wrong.markers,wrong.events,wrong.current,wrong.clubs));
 const normal=fixture();await normal.run("prepare");assert.equal(normal.writes(),0);const before=structuredClone(normal.d.current);const receipt=await normal.run("apply");assert.equal(receipt.changed,4);assert.deepEqual(receipt.counts,{90:2,107:1,583:1});assert.equal(receipt.skipped.length,2);assert.ok(receipt.verified);await normal.run("apply");assert.equal(normal.writes(),2);for(const table of ["perfs","perfs_relais"])for(const row of normal.d.current[table])assert.deepEqual({...row,club:before[table].find(r=>r.id===row.id).club},before[table].find(r=>r.id===row.id));
 for(const options of [{lostResponse:true},{completeFailure:true}]){const f=fixture(options);await f.run("prepare");await assert.rejects(f.run("apply"));await f.run("apply");assert.equal(f.writes(),2);assert.ok(f.complete().verified);}
 const noBackup=fixture({backupFailure:true});await assert.rejects(noBackup.run("prepare"));assert.equal(noBackup.writes(),0);
 const stale=fixture();await stale.run("prepare");stale.d.current.perfs[0].tps="changed";await assert.rejects(stale.run("apply"),/change/);assert.equal(stale.writes(),0);
 const unindexed=fixture({unindexed:true});await unindexed.run("prepare");await assert.rejects(unindexed.run("apply"),/indexee/);assert.equal(unindexed.writes(),0);
 const lock=fixture({lockFailure:true});await assert.rejects(lock.run("prepare"));assert.ok(lock.destroyed());assert.equal(lock.writes(),0);
 const fs=require("node:fs"),vm=require("node:vm"),source=fs.readFileSync("functions/index.js","utf8");
 const handler=source.slice(source.indexOf("exports.exportNapPublicPage ="),source.indexOf("\nconst ENGAGEMENT_MAIL_CALLABLE_OPTIONS")).replace(/\n\}\s*$/,"");
 let poolCalls=0,repairCalls=0,status,payload;
 const response={set(){return this;},status(value){status=value;return this;},json(value){payload=value;}};
 const sandbox={exports:{},REGION:"europe-west1",napPool:null,napPassword:{value:()=>"not-a-secret"},onRequest:(options,callback)=>{assert.equal(options.invoker,"github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com");return callback;},createNapPool:()=>{poolCalls++;return {};},TypeError,RangeError,
 require:name=>{assert.equal(name,"./nap-nora-performance-clubs");return {repair:async(_,input)=>{repairCalls++;assert.equal(input.confirmation,service.OPERATION);return {source:"nap"};}};}};
 vm.runInNewContext(handler,sandbox);await sandbox.exports.exportNapPublicPage({method:"GET",query:{action:"approved-nora-performance-clubs"}},response);assert.equal(status,405);assert.equal(poolCalls,0);
 await sandbox.exports.exportNapPublicPage({method:"POST",query:{action:"approved-nora-performance-clubs"},body:{confirmation:service.OPERATION,phase:"prepare"}},response);assert.equal(poolCalls,1);assert.equal(repairCalls,1);assert.equal(payload.source,"nap");
 const workflow=fs.readFileSync(".github/workflows/nap-authorized-nora-performance-clubs.yml","utf8");assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));assert.ok(workflow.indexOf("name: nora-performance-clubs-before")<workflow.indexOf("NORA_CLUBS_PHASE: apply"));assert.ok(workflow.includes('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'));
 assert.ok(normal.calls.length<100);console.log("Nora fixed repair: two completed audits, original source/target provenance, ambiguity/changed row exclusion, known club preservation, club-only grouped CAS, durable backup, exact receipt ids, indexed plans, lost-response and audit retry passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});

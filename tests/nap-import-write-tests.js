"use strict";
const assert=require("node:assert/strict"),{createNativeImportWriter}=require("../functions/nap-import-write"),{COLUMNS}=require("../functions/nap-performance-change-plan"),{hash}=require("../functions/nap-import-preview");
const old={id:973,nageur:168,compet:5162,course:"100SF",cat:"HSE",tps:"14200",points:"0",newpoints:"0",passage:0,club:"106",relais:0,pid:null,classement:1};
const {id,...proposed}=old,competition={id:5162,libelle:"Test",date:"2026-11-07",lieu:"Paris",bassin:50,chrono:"E"};
const person={id:168,nom:"TEST",prenom:"PERSON",date:"2000-01-01",sexe:"M",club:"106"},club={num_club:106,abre_club:"TEST",nom_club:"Test"};
const pack={canConfirm:true,competition,existing:[old],existingRelays:[],incoming:[{sourceLine:4,row:{...proposed,tps:"014100"}}],incomingRelays:[],statusRows:[{sourceLine:5,status:"DSQ",swimmerId:168,clubId:"106"}],decoded:{fileHash:"f".repeat(64),excluded:[{sourceLine:6,status:"",rawFinalTime:""}]},resolution:{resolved:[{swimmerId:168}]},candidates:[person],clubs:[club],previewFingerprint:"a".repeat(64)};
pack.expectedFingerprint=hash({competition,existing:pack.existing,existingRelays:[]});
const input={operationId:"11111111-1111-4111-8111-111111111111",competitionId:5162,fileName:"test.txt",rawText:"test",expectedFingerprint:pack.expectedFingerprint,previewFingerprint:pack.previewFingerprint,confirmReplacement:true};
function fixture({denied=false,lock=true,triggers=false,lost="",withRelay=false}={}) {
 const {RELAY_COLUMNS}=require("../functions/nap-import-operation-plan");
 const people=withRelay?[person,...[169,170,171].map(id=>({...person,id}))]:[person];
 const previewPack=withRelay?{...pack,candidates:people,incomingRelays:[{sourceLine:7,row:{club:"106",distance:"4X100SF",nageur1:168,nageur2:169,nageur3:170,nageur4:171,tps1:"010000",tps2:"020000",tps3:"030000",tps4:"040000",categorie:"HSE",pts:500,compet:5162}}]}:pack;
 const state={authorized:false,pools:0,connections:0,locked:false,released:0,writes:0,journal:null,pointer:null,rows:[{...old}],lines:[],previews:0,lost};
 state.relayRows=[];
 const execute=async({sql},values=[])=>{
  assert.equal(state.authorized,true);
  if(sql.startsWith("SELECT GET_LOCK"))return [[{acquired:lock?1:0}]];
  if(sql.startsWith("SELECT RELEASE_LOCK"))return [[{released:1}]];
  if(sql.includes("FROM information_schema.TRIGGERS"))return [triggers?[{TRIGGER_NAME:"unexpected"}]:[]];
  if(sql.includes("AUTO_INCREMENT FROM information_schema.TABLES"))return [[{TABLE_NAME:"perfs",ENGINE:"MyISAM",AUTO_INCREMENT:1000},{TABLE_NAME:"perfs_relais",ENGINE:"MyISAM",AUTO_INCREMENT:100}]];
  if(sql.startsWith("SELECT competition_id,created_by,status,metadata"))return [state.journal?[state.journal]:[]];
  if(sql.startsWith("SELECT metadata FROM livepalmes_performance_imports"))return [state.pointer?[{metadata:JSON.stringify(state.pointer)}]:[]];
  if(sql.includes("FROM competitions"))return [[competition]];
  if(sql.includes("FROM nageurs"))return [people];
  if(sql.includes("FROM clubs"))return [[club]];
  if(sql.startsWith("SELECT")&&sql.includes("FROM perfs_relais"))return [state.relayRows.filter(row=>sql.includes("WHERE id IN")?values.includes(row.id):row.compet===values[0])];
  if(sql.startsWith("SELECT")&&sql.includes("FROM perfs "))return [state.rows.filter(row=>sql.includes("WHERE id IN")?values.includes(row.id):row.compet===values[0])];
  if(sql.startsWith("SELECT")&&sql.includes("FROM livepalmes_performance_visibility"))return [[]];
  if(sql.startsWith("SELECT row_number,expected_row"))return [state.lines.map(r=>({row_number:r.number,expected_row:JSON.stringify(r.record)}))];
  assert.equal(state.locked,true,"write lock before journal or mutation");
  if(sql.startsWith("INSERT INTO livepalmes_performance_imports")) {
   if(sql.includes("'pointer'")){state.pointer=JSON.parse(values[4]);return [{affectedRows:1}];}
   assert.equal(state.writes,0,"durable complete before image before sporting write");
   const metadata=JSON.parse(values[5]);assert.deepEqual(metadata.plan.perfs.before,[old]);assert.equal(metadata.plan.statusRows[0].status,"DSQ");
   state.journal={competition_id:5162,created_by:"importer",status:"prepared",metadata:JSON.stringify(metadata)};return [{affectedRows:1}];
  }
  if(sql.startsWith("DELETE FROM perfs WHERE")) {assert.ok(state.journal);state.rows=state.rows.filter(row=>!values.includes(row.id));state.writes++;if(state.lost==="delete"){state.lost="";throw Error("lost delete response");}return [{affectedRows:1}];}
  if(sql.startsWith("INSERT INTO perfs (")) {assert.ok(state.journal);for(let i=0;i<values.length;i+=COLUMNS.length){const row=Object.fromEntries(COLUMNS.map((c,j)=>[c,values[i+j]]));row.points=String(row.points);row.newpoints=String(row.newpoints);state.rows.push(row);}state.writes++;if(state.lost==="insert"){state.lost="";throw Error("lost insert response");}return [{affectedRows:1}];}
  if(sql.startsWith("INSERT INTO perfs_relais (")){assert.ok(state.journal);for(let i=0;i<values.length;i+=RELAY_COLUMNS.length)state.relayRows.push(Object.fromEntries(RELAY_COLUMNS.map((c,j)=>[c,values[i+j]])));state.writes++;if(state.lost==="relay"){state.lost="";throw Error("lost relay reply");}return[{affectedRows:1}];}
  if(sql.startsWith("DELETE FROM livepalmes_performance_visibility"))return [{affectedRows:0}];
  if(sql.startsWith("INSERT INTO livepalmes_performance_import_rows")){for(let i=0;i<values.length;i+=4)state.lines.push({number:values[i+1],record:JSON.parse(values[i+3])});return [{affectedRows:1}];}
  if(sql.startsWith("UPDATE livepalmes_performance_imports SET status='completed'")){state.journal.status="completed";return [{affectedRows:1}];}
  throw Error("Unexpected statement: "+sql);
 };
 const conn={execute,query:async({sql})=>{if(sql.startsWith("LOCK TABLES")){state.locked=true;return[{}];}assert.equal(sql,"UNLOCK TABLES");state.locked=false;return[{}];},release:()=>state.released++};
 const writer=createNativeImportWriter({authorize:async()=>{if(denied)throw Error("denied");state.authorized=true;return{uid:"importer",national:false};},getPool:async()=>{state.pools++;return{execute,getConnection:async()=>{state.connections++;return conn;}};},preview:async()=>{assert.equal(state.connections,0,"no held pool connection while preview borrows one");state.previews++;return previewPack;}});
 return {state,writer};
}
(async()=>{
 let f=fixture();const result=await f.writer({data:input});assert.equal(result.source,"nap");assert.equal(f.state.writes,2);assert.equal(f.state.rows[0].id,1000);assert.equal(f.state.rows[0].tps,"014100");assert.equal(f.state.lines.length,3);assert.equal(f.state.journal.status,"completed");assert.equal(f.state.locked,false);assert.equal(f.state.released,1);assert.ok(f.state.pointer.currentImportId);
 await f.writer({data:input});assert.equal(f.state.writes,2,"completed retry does not duplicate results");assert.equal(f.state.previews,1);
 await assert.rejects(()=>f.writer({data:{...input,fileName:"changed.txt"}}),/autre contenu/);assert.equal(f.state.writes,2);
 for(const lost of ["delete","insert"]){f=fixture({lost});await assert.rejects(()=>f.writer({data:input}),/lost/);assert.equal(f.state.locked,false);assert.equal(f.state.journal.status,"prepared");await f.writer({data:input});assert.equal(f.state.rows.length,1);assert.equal(f.state.writes,2);assert.equal(f.state.lines.length,3);assert.equal(f.state.journal.status,"completed");}
 f=fixture({lost:"delete"});await assert.rejects(()=>f.writer({data:input}));f.state.rows.push({...old,id:1000,compet:999});await assert.rejects(()=>f.writer({data:input}),/Identifiant natif/);assert.equal(f.state.writes,1,"foreign allocated id is refused before further mutation");
 f=fixture({lost:"delete"});await assert.rejects(()=>f.writer({data:input}));const receipt=f.state.pointer.activeImportId;await f.writer({data:{resumeImportId:receipt}});assert.equal(f.state.writes,2);assert.equal(f.state.previews,1,"history resume needs neither source file nor new preview");assert.equal(f.state.journal.status,"completed");
 f=fixture({withRelay:true,lost:"relay"});await assert.rejects(()=>f.writer({data:input}),/lost relay/);assert.equal(f.state.relayRows.length,1);await f.writer({data:{resumeImportId:f.state.pointer.activeImportId}});assert.equal(f.state.relayRows.length,1,"lost native team insertion is not duplicated");assert.equal(f.state.relayRows[0].tps4,"040000");assert.equal(f.state.relayRows[0].nageur4,171);assert.equal(f.state.writes,3);assert.equal(f.state.lines.length,4);
 f=fixture({denied:true});await assert.rejects(()=>f.writer({data:input}),/denied/);assert.equal(f.state.pools,0);
 for(const options of [{lock:false},{triggers:true}]){f=fixture(options);await assert.rejects(()=>f.writer({data:input}));assert.equal(f.state.writes,0);assert.equal(f.state.released,1);}
 f=fixture();await assert.rejects(()=>f.writer({data:{...input,confirmReplacement:false}}),/explicitement/);assert.equal(f.state.journal,null);assert.equal(f.state.writes,0);
 console.log("NAP native import writer: authorization, before-image journal, bulk replacement, status/exclusion retention, lost-response recovery, id collision refusal and lock cleanup passed without live writes.");
})().catch(e=>{console.error(e);process.exitCode=1;});

"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const mod=require("../functions/nap-competition-deletion"),refs=require("../functions/nap-competition-deletion-references");
function fixture(){
 const competition={id:5162,libelle:"Test",date:"2026-11-07",enddate:null,comite:1,ld:0,filepdf:null,filetxt:null};
 const parameter={id:9,compet:5162,niveau:1};
 const state={competitions:[competition],compet_parametres:[parameter],documents:[{id:4,competition:5162,name:"Protocole",url:"https://example.test/protocol.pdf"}],compet_courses:[{id:5,compet:5162}],livepalmes_competition_programs:[{competition_id:5162,program_sessions:"[]"}]};
 const log=[],options={};let prepared=false,reserved=false;
 const connection={
  async execute({sql},values){
   log.push({sql,values});
   if(sql.includes("information_schema"))return [options.triggers?[{TRIGGER_NAME:"unexpected"}]:[]];
   if(sql.includes("WHERE participation="))return [options.externalParticipation?[{present:1}]:[]];
   const table=/FROM `?([a-z_]+)`?/.exec(sql)?.[1];
   if(sql.startsWith("SELECT *"))return [structuredClone(state[table]||[])];
   if(sql.startsWith("SELECT 1")){
    if(table==="livepalmes_qualification_competitions")return [options.externalQualification?[{present:1}]:[]];
    return [(state[table]||[]).length?[{present:1}]:[]];
   }
   if(sql.startsWith("DELETE")){
    assert.equal(prepared,true,"Backup must precede every native write");
    if(options.failTable===table)throw Error("Interrupted");
    const affectedRows=(state[table]||[]).length;state[table]=[];return [{affectedRows}];
   }
   throw Error(sql);
  },
  async query({sql}){log.push({sql});if(options.unlockFailure&&sql==="UNLOCK TABLES")throw Error("Unlock failed");return [[]];},
  release(){log.push({release:true});},destroy(){log.push({destroy:true});}
 };
 const pool={async getConnection(){log.push({connection:true});return connection;}};
 const scope={event:{id:"legacy-nap-5162",date:competition.date,regionId:"1"},nativeSnapshot:{competition:structuredClone(competition),parameters:structuredClone(parameter)}};
 const audit={async prepare(id,target){assert.equal(id,"5162");if(options.backupFailure||reserved)throw Error("Backup refused");reserved=true;prepared=true;log.push({backup:structuredClone(target)});},async complete(id,target){log.push({complete:target});}};
 const authorize=async()=>{if(options.denied)throw Error("Denied");return scope;};
 const input={competitionId:"legacy-nap-5162",actorUid:"national",previewOnly:true};
 return {state,log,options,pool,scope,audit,authorize,input,run:changes=>mod.competitionDeletion(pool,{...input,...changes},audit,authorize)};
}
(async()=>{
 assert.equal(refs.length,47);assert.ok(refs.every(r=>/^[a-z_]+$/.test(r.table)&&r.index));
 assert.deepEqual(refs.find(r=>r.table==="livepalmes_calendar_event_details"),{table:"livepalmes_calendar_event_details",field:"competition_id",index:"PRIMARY",cleanup:true});
 for(const id of ["5162","legacy-nap-0","legacy-nap-2147483648","legacy-nap-1 OR 1=1",null])assert.throws(()=>mod.idOf(id));
 let f=fixture(),preview=await f.run();
 assert.equal(preview.documents,1);assert.equal(preview.courses,1);assert.equal(preview.detailedProgram,true);assert.match(preview.expectedFingerprint,/^[a-f0-9]{64}$/);
 assert.ok(!f.log.some(x=>x.backup||x.sql?.startsWith("DELETE")),"Preview never saves or deletes");
 assert.ok(f.log.filter(x=>x.sql).length<110);
 const result=await f.run({previewOnly:false,confirmPermanent:true,expectedFingerprint:preview.expectedFingerprint});
 assert.equal(result.deleted,true);assert.equal(f.state.competitions.length,0);assert.equal(f.state.documents.length,0);
 assert.equal(f.log.filter(x=>x.complete).length,1);
 const backup=f.log.find(x=>x.backup).backup;assert.equal(backup.plan.cleanup.find(r=>r.table==="documents").rows[0].url,"https://example.test/protocol.pdf");
 assert.ok(!mod.locks(true).includes(" WRITE"));
 const deletes=f.log.filter(x=>x.sql?.startsWith("DELETE"));assert.match(deletes.at(-1).sql,/DELETE FROM competitions/);
 assert.ok(f.log.some(x=>x.sql==="UNLOCK TABLES"));
 f=fixture();f.state.livepalmes_club_entry_options=[{competition_id:5162,club_id:"1"}];f.state.livepalmes_qualification_jobs=[{id:"old",competition_id:5162,state:"done"}];f.state.winpalme_sessions=[{id:7,compet:5162}];f.state.winpalme_courses=[{id:8,session:7}];preview=await f.run();assert.equal(preview.programCourses,1);await f.run({previewOnly:false,confirmPermanent:true,expectedFingerprint:preview.expectedFingerprint});const childDelete=f.log.findIndex(x=>x.sql?.startsWith("DELETE FROM `winpalme_courses`"));const parentDelete=f.log.findIndex(x=>x.sql?.startsWith("DELETE FROM `winpalme_sessions`"));assert.ok(childDelete>=0&&childDelete<parentDelete);assert.deepEqual(f.log[childDelete].values,[7]);
 for(const state of ["preview","ready","apply","unknown"]){f=fixture();f.state.livepalmes_qualification_jobs=[{state}];await assert.rejects(f.run(),/controle de qualification/);assert.ok(!f.log.some(x=>x.backup));}
 for(const table of ["nageursengager","engagements_relais","perfs","perfs_relais","officielsengager","chefsdequipe","import_relais"]){f=fixture();f.state[table]=[{id:1}];await assert.rejects(f.run(),/engagements, resultats ou un historique/);assert.ok(!f.log.some(x=>x.backup||x.sql?.startsWith("DELETE")));}
 for(const flag of ["externalParticipation","externalQualification","triggers"]){f=fixture();f.options[flag]=true;await assert.rejects(f.run());assert.ok(!f.log.some(x=>x.backup));}
 f=fixture();f.options.denied=true;await assert.rejects(f.run(),/Denied/);assert.equal(f.log.length,0);
 f=fixture();await assert.rejects(f.run({previewOnly:false}),/confirmation/);assert.equal(f.log.length,0);
 f=fixture();preview=await f.run();f.state.documents.push({id:6,competition:5162});await assert.rejects(f.run({previewOnly:false,confirmPermanent:true,expectedFingerprint:preview.expectedFingerprint}),/change depuis/);assert.ok(!f.log.some(x=>x.backup));
 f=fixture();f.state.competitions[0].comite=2;await assert.rejects(f.run(),/competition a change/);
 f=fixture();f.state.compet_parametres[0].niveau=2;await assert.rejects(f.run(),/parametres ont change/);
 f=fixture();preview=await f.run();f.options.backupFailure=true;await assert.rejects(f.run({previewOnly:false,confirmPermanent:true,expectedFingerprint:preview.expectedFingerprint}),/Backup refused/);assert.ok(!f.log.some(x=>x.sql?.startsWith("DELETE")));
 f=fixture();f.state.documents[0].name="x".repeat(mod.MAX_BYTES);await assert.rejects(f.run(),/Sauvegarde trop volumineuse/);
 f=fixture();f.state.documents=Array.from({length:mod.MAX_ROWS+1},(_,id)=>({id}));await assert.rejects(f.run(),/volumineux/);
 f=fixture();preview=await f.run();f.options.failTable="documents";await assert.rejects(f.run({previewOnly:false,confirmPermanent:true,expectedFingerprint:preview.expectedFingerprint}),/Interrupted/);assert.ok(f.log.some(x=>x.backup));assert.ok(!f.log.some(x=>x.complete));assert.equal(f.state.competitions.length,1);
 f=fixture();f.options.unlockFailure=true;await f.run();assert.ok(f.log.some(x=>x.destroy));
 const ui=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");assert.ok(ui.includes('previewOnly: true'));assert.ok(ui.includes('confirmPermanent: true, expectedFingerprint: nativePreview.expectedFingerprint'));
 const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");const callback=source.slice(source.indexOf('exports.deleteEngagementCompetition ='),source.indexOf('exports.requestEngagementCompetitionDeletion ='));
 assert.ok(callback.indexOf('competitionDeletion(pool')<callback.indexOf('db.collection("engagementCompetitions")'));assert.ok(callback.includes('assertCanModifyEngagementEvent(context,event)'));
 console.log("Native competition deletion: preview without writes, blockers, scope/concurrency, raw backup, size bounds, deletion order and interrupted-operation refusal verified without a database.");
})().catch(error=>{console.error(error);process.exitCode=1;});

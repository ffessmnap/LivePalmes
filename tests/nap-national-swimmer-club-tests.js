"use strict";
const assert=require("node:assert/strict"),{correctNationalSwimmer}=require("../functions/nap-national-swimmer-correction"),{fingerprint}=require("../functions/nap-portal-swimmer-change"),{COLUMNS}=require("../functions/nap-approved-swimmer-correction");
const original={id:12,nom:"FICTIF",prenom:"Test",date:"1980-01-01",sexe:"F",club:"106",actif:1,wc:0,edf:0,creation:"2020-01-01",number:"A-00-123456"};
function fixture(options={}){
 let row={...original},saved,writes=0,fail=true;const calls=[];
 const input={id:12,actorUid:"national",reason:"Correction club",expectedFingerprint:fingerprint(original),proposed:{clubId:"107"}};
 const connection={execute:async(query,values=[])=>{
  calls.push(query.sql);assert.ok(!/FROM perfs|UPDATE perfs|UPDATE engagements|DELETE /i.test(query.sql));
  if(query.sql.startsWith("SELECT")&&query.sql.includes("FROM clubs"))return [options.missing?[]:[{num_club:107,nom_club:"Club fictif",abre_club:"FIC",comite_club:1,actif_club:1}]];
  if(query.sql.startsWith("SELECT id FROM nageurs"))return [options.duplicate?[{id:13}]:[]];
  if(query.sql.startsWith("SELECT"))return [[{...row}]];
  assert.ok(saved);assert.match(query.sql,/^UPDATE nageurs SET/);assert.ok(query.sql.includes("WHERE id=? AND EXISTS (SELECT 1 FROM clubs FORCE INDEX (PRIMARY) WHERE num_club=?)"));
  if(options.race)return [{affectedRows:0}];
  const columns=[...query.sql.matchAll(/`(nom|prenom|date|sexe|club)`=\?/g)].map(x=>x[1]);
  for(let i=0;i<saved.changedColumns.length;i++)row[saved.changedColumns[i]]=values[i];
  writes++;if(options.lostResponse&&fail){fail=false;throw Error("Lost response");}return [{affectedRows:1}];
 }};
 const audit={read:async()=>saved,prepare:async(_,plan)=>{if(options.backupFailure)throw Error("Backup failed");saved=structuredClone(plan);},complete:async()=>{if(options.auditFailure&&fail){fail=false;throw Error("Audit failed");}}};
 return {run:extra=>correctNationalSwimmer(connection,{...input,...extra},audit),row:()=>row,writes:()=>writes,calls,saved:()=>saved};
}
(async()=>{
 const f=fixture(),result=await f.run();assert.equal(result.swimmer.clubId,"107");assert.equal(result.swimmer.club,"FIC");assert.deepEqual(f.row(),{...original,club:"107"});assert.equal(f.writes(),1);await f.run();assert.equal(f.writes(),1);assert.equal(f.saved().before.club,"106");
 for(const options of [{lostResponse:true},{auditFailure:true}]){const f=fixture(options);await assert.rejects(f.run());await f.run();assert.equal(f.writes(),1);}
 for(const options of [{missing:true},{race:true},{backupFailure:true}]){const f=fixture(options);await assert.rejects(f.run());assert.equal(f.writes(),0);}
 for(const proposed of [{clubId:"no"},{clubId:"107",licenseNumber:"x"},{clubId:"107",actif:0}]){const f=fixture();await assert.rejects(f.run({proposed}),TypeError);assert.equal(f.writes(),0);}
 const stale=fixture();stale.row().club="108";await assert.rejects(stale.run(),/change/);assert.equal(stale.writes(),0);
 const combined=fixture();await combined.run({proposed:{clubId:"107",lastName:"CORRIGE"}});assert.equal(combined.row().nom,"CORRIGE");assert.equal(combined.row().club,"107");assert.equal(combined.writes(),1);
 const duplicate=fixture({duplicate:true});await assert.rejects(duplicate.run({proposed:{clubId:"107",lastName:"CORRIGE"}}),/identique/);assert.equal(duplicate.writes(),0);
 console.log("National swimmer club: guarded native update, unchanged history/licence, combined identity, missing club, conflict, durable audit and lost-response retry passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});

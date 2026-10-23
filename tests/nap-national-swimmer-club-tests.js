"use strict";
const assert=require("node:assert/strict"),{correctNationalSwimmer}=require("../functions/nap-national-swimmer-correction"),{fingerprint}=require("../functions/nap-portal-swimmer-change"),{COLUMNS}=require("../functions/nap-approved-swimmer-correction");
const original={id:12,nom:"FICTIF",prenom:"Test",date:"1980-01-01",sexe:"F",club:"106",actif:1,wc:0,edf:0,creation:"2020-01-01",number:"A-00-123456"};
function fixture(options={}){
 let row={...original},saved,writes=0,fail=true,locked=false,completed;const calls=[];
 const input={id:12,actorUid:"national",reason:"Correction club",expectedFingerprint:fingerprint(original),expectedLicenseNumber:original.number,proposed:{clubId:"107"}};
 const connection={execute:async(query,values=[])=>{
  calls.push(query.sql);assert.ok(!/FROM perfs|UPDATE perfs|UPDATE engagements|DELETE /i.test(query.sql));
  if(query.sql.startsWith("SELECT")&&query.sql.includes("FROM clubs"))return [options.missing?[]:[{num_club:107,nom_club:"Club fictif",abre_club:"FIC",comite_club:1,actif_club:1}]];
  if(query.sql.startsWith("SELECT id FROM nageurs"))return [(query.sql.includes("livepalmes_license_number_id")?options.licenseDuplicate:options.duplicate)?[{id:13}]:[]];
  if(query.sql.startsWith("SELECT"))return [[{...row}]];
  assert.ok(saved);assert.match(query.sql,/^UPDATE nageurs SET/);assert.ok(query.sql.includes("WHERE id=? AND EXISTS (SELECT 1 FROM clubs FORCE INDEX (PRIMARY) WHERE num_club=?)"));
  if(options.race)return [{affectedRows:0}];
  const columns=[...query.sql.matchAll(/`(nom|prenom|date|sexe|club)`=\?/g)].map(x=>x[1]);
  for(let i=0;i<saved.changedColumns.length;i++)row[saved.changedColumns[i]]=values[i];
  writes++;if(options.lostResponse&&fail){fail=false;throw Error("Lost response");}return [{affectedRows:1}];
 },query:async query=>{calls.push(query.sql);locked=query.sql.startsWith("LOCK TABLES");if(options.lockFailure&&locked)throw Error("Uncertain lock");if(options.unlockFailure&&!locked)throw Error("Uncertain unlock");},release:()=>{assert.equal(locked,false);assert.ok(!options.lockFailure&&!options.unlockFailure);},destroy:()=>{assert.ok(options.lockFailure||options.unlockFailure);}};
 const pool={...connection,getConnection:async()=>connection};
 const audit={read:async()=>saved,prepare:async(_,plan)=>{if(options.backupFailure)throw Error("Backup failed");saved=structuredClone(plan);},complete:async(_,result)=>{if(options.auditFailure&&fail){fail=false;throw Error("Audit failed");}completed=result;}};
 return {run:extra=>correctNationalSwimmer(pool,{...input,...extra},audit),row:()=>row,writes:()=>writes,calls,saved:()=>saved,completed:()=>completed};
}
(async()=>{
 const f=fixture(),result=await f.run();assert.equal(result.swimmer.clubId,"107");assert.equal(result.swimmer.club,"FIC");assert.deepEqual(f.row(),{...original,club:"107"});assert.equal(f.writes(),1);await f.run();assert.equal(f.writes(),1);assert.equal(f.saved().before.club,"106");
 for(const options of [{lostResponse:true},{auditFailure:true}]){const f=fixture(options);await assert.rejects(f.run());await f.run();assert.equal(f.writes(),1);}
 for(const options of [{missing:true},{race:true},{backupFailure:true}]){const f=fixture(options);await assert.rejects(f.run());assert.equal(f.writes(),0);}
 for(const proposed of [{clubId:"no"},{clubId:"107",licenseNumber:"x\n"},{clubId:"107",licenseNumber:12},{clubId:"107",licenseNumber:""},{clubId:"107",actif:0}]){const f=fixture();await assert.rejects(f.run({proposed}),TypeError);assert.equal(f.writes(),0);}
 const stale=fixture();stale.row().club="108";await assert.rejects(stale.run(),/change/);assert.equal(stale.writes(),0);
 const combined=fixture();await combined.run({proposed:{clubId:"107",lastName:"CORRIGE"}});assert.equal(combined.row().nom,"CORRIGE");assert.equal(combined.row().club,"107");assert.equal(combined.writes(),1);
 const duplicate=fixture({duplicate:true});await assert.rejects(duplicate.run({proposed:{clubId:"107",lastName:"CORRIGE"}}),/identique/);assert.equal(duplicate.writes(),0);
 const proposed={clubId:"106",licenseNumber:"A-03-999999"};
 const license=fixture();await license.run({proposed});assert.deepEqual(license.row(),{...original,number:proposed.licenseNumber});assert.equal(license.completed().oldLicenseNumber,original.number);assert.equal(license.completed().licenseNumber,proposed.licenseNumber);assert.equal(license.completed().verified,true);await license.run({proposed});assert.equal(license.writes(),1);assert.match(license.calls[0],/^LOCK TABLES nageurs WRITE,clubs READ,livepalmes_swimmer_merges READ$/);assert.equal(license.calls.at(-1),"UNLOCK TABLES");
 for(const options of [{lostResponse:true},{auditFailure:true}]){const f=fixture(options);await assert.rejects(f.run({proposed}));assert.equal(f.calls.at(-1),"UNLOCK TABLES");await f.run({proposed});assert.equal(f.writes(),1);}
 const owner=fixture({licenseDuplicate:true});await assert.rejects(owner.run({proposed}),/appartient deja/);assert.equal(owner.writes(),0);assert.equal(owner.saved(),undefined);assert.equal(owner.calls.at(-1),"UNLOCK TABLES");
 const staleLicense=fixture();staleLicense.row().number="A-00-888888";await assert.rejects(staleLicense.run({proposed}),/licence a change/);assert.equal(staleLicense.writes(),0);
 for(const options of [{missing:true},{race:true},{backupFailure:true}]){const f=fixture(options);await assert.rejects(f.run({proposed}));assert.equal(f.writes(),0);assert.equal(f.calls.at(-1),"UNLOCK TABLES");}
 const noExpected=fixture();await assert.rejects(noExpected.run({proposed,expectedLicenseNumber:undefined}),/Rechargez la licence/);assert.equal(noExpected.writes(),0);
 const lockFailure=fixture({lockFailure:true});await assert.rejects(lockFailure.run({proposed}),/Uncertain lock/);assert.equal(lockFailure.writes(),0);
 const unlockFailure=fixture({unlockFailure:true});await unlockFailure.run({proposed});assert.equal(unlockFailure.writes(),1);
 const empty=fixture();empty.row().number="";await empty.run({expectedLicenseNumber:"",proposed});assert.equal(empty.row().number,proposed.licenseNumber);
 const all=fixture();await all.run({proposed:{...proposed,clubId:"107",lastName:"CORRIGE"}});assert.deepEqual(all.row(),{...original,number:proposed.licenseNumber,club:"107",nom:"CORRIGE"});assert.equal(all.writes(),1);
 console.log("National swimmer correction: club/identity/license atomic update, duplicate owner, stale license, empty initial license, locks, durable audit and retry; no history writes, offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});

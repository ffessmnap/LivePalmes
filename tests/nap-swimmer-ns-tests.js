"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("./helpers/source-files");
const ns=require("../functions/nap-swimmer-ns"),native=require("../functions/nap-portal-swimmers");
const before={id:42,club:"106",nom:"EXEMPLE",prenom:"Fictif",date:"2000-01-01",sexe:"F",number:"A-01-123",actif:1,livepalmes_ns:null,livepalmes_ns_version:null};
const context={uid:"club-test",clubId:"106"};
function fixture(options={}) {
  let row={...before,...options.row},writes=0,queries=0,fail=!!options.failComplete;
  const backups=new Map();
  const connection={execute:async({sql},values)=>{
    queries++;
    if(sql.includes("information_schema.TRIGGERS"))return [options.trigger?[{TRIGGER_NAME:"trigger"}]:[]];
    if(sql.startsWith("SELECT")){assert.match(sql,/WHERE id=\?.*LIMIT 1/);return [[{...row}]];}
    assert.match(sql,/UPDATE nageurs SET livepalmes_ns=\?,livepalmes_ns_version=\?/);assert.ok(backups.size);
    assert.match(sql,/livepalmes_ns <=> \? AND livepalmes_ns_version <=> \?.*LIMIT 1/);
    if(options.race)return [{affectedRows:0}];
    writes++;row.livepalmes_ns=values[0];row.livepalmes_ns_version=values[1];return [{affectedRows:1}];
  }};
  const audit={read:async key=>backups.get(key),prepare:async(key,data)=>{if(options.backupFail)throw Error("backup unavailable");backups.set(key,structuredClone(data));},complete:async()=>{if(fail){fail=false;throw Error("completion unavailable");}}};
  return {connection,audit,row,backups,count:()=>({writes,queries}),change:(input,scope=context,approval={})=>ns.change(connection,input,scope,audit,approval)};
}
const input=row=>({swimmerId:"42",nonSelectable:true,expectedNsFingerprint:ns.fingerprint(row)});
async function main(){
  const schema=require("../functions/nap-swimmer-ns-schema");
  assert.match(schema.sql,/^ALTER TABLE nageurs ADD COLUMN livepalmes_ns TINYINT NULL DEFAULT NULL, ADD COLUMN livepalmes_ns_version INT UNSIGNED NULL DEFAULT NULL$/);
  assert.match(schema.planHash,/^[a-f0-9]{64}$/);
  assert.deepEqual(ns.state({}),{nonSelectable:false,nsAvailable:false,nsVersion:0});
  assert.equal(ns.state(before).nonSelectable,false);
  const f=fixture();const added=await f.change(input(f.row));assert.equal(added.swimmer.nonSelectable,true);assert.equal(f.count().writes,1);assert.equal(f.row.livepalmes_ns_version,1);
  await f.change(input(before));assert.equal(f.count().writes,1,"same operation reuses backup");
  const remove={...input(f.row),nonSelectable:false};
  await assert.rejects(f.change(remove),/nationale/);assert.equal(f.row.livepalmes_ns,1);
  const proposal=ns.proposal(f.row,remove);assert.equal(proposal.current.nonSelectable,true);assert.equal(proposal.proposed.nonSelectable,false);assert.equal(f.count().writes,1,"request preparation never changes NAP");
  const request={...proposal,clubId:"106"};
  const refusal=ns.prepareResolution(request,{decision:"rejected"},"national-test");assert.equal(refusal.decision,"rejected");assert.equal(f.row.livepalmes_ns,1);
  for(const patch of [{decision:"approved",proposed:{nonSelectable:true}},{decision:"invalid"}])assert.throws(()=>ns.prepareResolution(request,patch,"national-test"));
  assert.throws(()=>ns.prepareResolution({...request,clubId:"999"},{decision:"approved"},"national-test"));
  const resolution=ns.prepareResolution(request,{decision:"approved"},"national-test");
  const approved=await f.change({...remove,expectedNsFingerprint:resolution.expectedFingerprint},{uid:"national-test",clubId:"106"},{nationalApproval:true});
  assert.equal(approved.swimmer.nonSelectable,false);assert.equal(f.row.livepalmes_ns_version,2);
  // An old decision cannot clear a later NS status, even after an identical identity returns.
  await f.change(input(f.row));await assert.rejects(f.change(remove,{uid:"other-national",clubId:"106"},{nationalApproval:true}),/changé/);assert.equal(f.row.livepalmes_ns,1);
  for(const options of [{race:true},{backupFail:true},{trigger:true}]){const refused=fixture(options);await assert.rejects(refused.change(input(refused.row)));assert.equal(refused.count().writes,0);}
  const retry=fixture({failComplete:true});await assert.rejects(retry.change(input(before)),/completion/);await retry.change(input(before));assert.equal(retry.count().writes,1);
  const outside=fixture();await assert.rejects(outside.change(input(before),{uid:"user",clubId:"999"}),/club/);assert.equal(outside.count().writes,0);
  const missing=fixture();delete missing.row.livepalmes_ns;delete missing.row.livepalmes_ns_version;assert.equal(native.person(missing.row).nsAvailable,false);await assert.rejects(missing.change(input(missing.row)),/activation/);
  for(const row of [{...before,livepalmes_ns:2},{...before,livepalmes_ns_version:-1}])assert.throws(()=>ns.state(row));
  // The deployed callable must establish club authorization before entering the NS handler.
  const handler=require("../functions/portal-national-handlers").createNationalHandlers;
  let touched=false;
  const handlers=handler({engagementClubAccessContext:async()=>{throw Error("denied");},ENVIRONMENT:{sportingDataSource:"nap"},db:{get collection(){touched=true;throw Error("unexpected read");}}});
  await assert.rejects(handlers.requestEngagementClubSwimmerChange({data:{nsAction:"save",nonSelectable:true}}),/denied/);assert.equal(touched,false);
  const index=fs.readFileSync("functions/index.js","utf8");const code=index.slice(index.indexOf("exports.resolveEngagementSwimmerChangeRequest ="),index.indexOf("exports.updateEngagementNationalSwimmerIdentity ="));
  const sandbox={exports:{},onCall:(_options,fn)=>fn,ENVIRONMENT:{sportingDataSource:"nap"},ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS:{},defineSecret:x=>x,
    engagementAccessContext:async()=>({national:false}),HttpsError:class extends Error{constructor(code,msg){super(msg);this.code=code;}}};
  vm.runInNewContext(code,sandbox);await assert.rejects(sandbox.exports.resolveEngagementSwimmerChangeRequest({data:{}}),error=>error.code==="permission-denied");
  assert.equal(f.count().queries<=15,true,"fixed budget, no directory scan");
  console.log("NS : defaults, club scope, national-only removal, refusal, version guard, concurrency, durable backup and exact retry passed offline.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

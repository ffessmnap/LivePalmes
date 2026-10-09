"use strict";
const assert=require("node:assert/strict"),service=require("../functions/nap-swimmer-deletion");
const identity=require("../functions/nap-portal-swimmer-change"),activity=require("../functions/nap-swimmer-activity");
function fixture({failAfter=0,used=false,changed=false,failBackup=false}={}){
  const original={id:12,nom:"TEST",prenom:"Personne",date:"1980-01-01",sexe:"M",club:"106",actif:1,wc:0,edf:0,creation:"2020-01-01",number:"A-05-000001"};
  const input={swimmerId:"12",actorUid:"national",expectedFingerprint:identity.fingerprint(original),expectedActivityFingerprint:activity.fingerprint(original),expectedLicenseNumber:original.number,confirmPermanent:true};
  let row=structuredClone(original),seasons=[{swimmer_id:12,season:"2026-2027",license_number:original.number,status:"valid",source:"national_manual",federal_validity_end_date:null,validated_at:"2026-10-09 10:00:00.000000",validated_by:"national",version:"1"}],saved,writes=0,failed=false,authorized=false;
  if(changed)row.number="B-OTHER";
  const calls=[];
  const connection={execute:async({sql})=>{
    assert.ok(authorized);calls.push(sql);
    if(sql.includes("GET_LOCK"))return[[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return[[{released:1}]];
    if(sql.includes("information_schema.TRIGGERS"))return[[]];
    if(sql.startsWith("SELECT `id`"))return[[...(row?[structuredClone(row)]:[])]];
    if(sql.startsWith("SELECT `swimmer_id`"))return[structuredClone(seasons)];
    if(sql.startsWith("SELECT 1 FROM"))return[[...(used&&sql.includes("`perfs`")?[{1:1}]:[])]];
    if(sql.startsWith("SELECT swimmer_id"))return[[]];
    if(sql.startsWith("DELETE")){
      assert.ok(saved,"backup before destructive statement");
      const count=sql.startsWith("DELETE FROM nageurs")?(row?1:0):seasons.length;
      if(sql.startsWith("DELETE FROM nageurs"))row=null;else seasons=[];
      writes++;if(writes===failAfter&&!failed){failed=true;throw Error("Lost response");}
      return[{affectedRows:count}];
    }
    throw Error(sql);
  },query:async({sql})=>{calls.push(sql);return[{}];},release(){},destroy(){}};
  const pool={getConnection:async()=>{assert.ok(authorized);return connection;}};
  const audit={read:async()=>saved,prepare:async(key,plan)=>{if(failBackup)throw Error("Backup refused");saved=structuredClone(plan);},complete:async()=>{}};
  return{input,calls,pool,audit,authorize:async()=>{authorized=true;},state:()=>({row,seasons,writes})};
}
(async()=>{
  for(const failAfter of [0,1,2]){
    const f=fixture({failAfter});
    if(failAfter)await assert.rejects(service.deleteSwimmer(f.pool,f.input,f.audit,f.authorize),/Lost response/);
    const result=await service.deleteSwimmer(f.pool,f.input,f.audit,f.authorize);assert.equal(result.source,"nap");assert.equal(f.state().row,null);assert.deepEqual(f.state().seasons,[]);assert.equal(f.state().writes,2);
    await service.deleteSwimmer(f.pool,f.input,f.audit,f.authorize);assert.equal(f.state().writes,2,"completed retry never repeats deletion");
  }
  for(const options of [{used:true},{changed:true},{failBackup:true}]){const f=fixture(options);await assert.rejects(service.deleteSwimmer(f.pool,f.input,f.audit,f.authorize));assert.equal(f.state().writes,0);}
  const f=fixture();await assert.rejects(service.deleteSwimmer(f.pool,f.input,f.audit,async()=>{throw Error("Denied");}),/Denied/);assert.equal(f.calls.length,0);
  console.log("Native unused swimmer deletion: authorization, indexed references, before-image backup, stale licence, blocked history and recovery after each lost write response passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});

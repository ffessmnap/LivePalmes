"use strict";
const assert=require("node:assert/strict");
const {state,currentSeason,seasonInfo,join}=require("../functions/nap-license-state");
const {correctLicense}=require("../functions/nap-license-correction");
const row={id:42,nom:"EXEMPLE",prenom:"Test",date:"2000-01-01",sexe:"F",club:"106",actif:1,wc:null,edf:0,creation:null,number:"A-11-001234"};
const valid={...row,license_validation_season:"2026-2027",license_validated_number:row.number,license_validation_status:"valid",license_validation_source:"admin_import",license_validated_at:"2026-10-09",license_validated_by:"national",license_validity_end_date:"2027-12-31"};
assert.equal(state(row,"2026-2027").licenseSeasonStatus,"to_check");
assert.equal(state(valid,"2026-2027").licenseSeasonStatus,"valid");
for(const changed of [{number:null},{number:""},{number:"A-11-009999"},{license_validation_season:"2025-2026"},{license_validity_end_date:"2027-12-30"},{license_validated_by:""},{license_validation_source:"unknown"}]) assert.equal(state({...valid,...changed},"2026-2027").licenseSeasonStatus,"to_check");
assert.equal(state({...valid,number:"001234",license_validated_number:"001234"},"2026-2027").licenseNumber,"001234");
assert.equal(currentSeason(new Date("2026-08-31T21:59:59Z")),"2025-2026");
assert.equal(currentSeason(new Date("2026-08-31T22:00:00Z")),"2026-2027");
assert.throws(()=>seasonInfo("2026-2028"));assert.throws(()=>join("n;DROP"));
function fixture(options={}) {
  let current={...row}, saved, writes=0,completed=0;
  const connection={execute:async(query,values)=>{
    if(query.sql.includes("FORCE INDEX")) return [options.duplicate?[{id:43}]:[]];
    if(query.sql.startsWith("SELECT")) return [[{...current}]];
    assert.ok(saved,"backup must precede write");
    assert.match(query.sql,/^UPDATE nageurs SET number=\? WHERE NOT EXISTS \(SELECT 1 FROM livepalmes_swimmer_merges WHERE swimmer_id=nageurs.id\) AND BINARY/);
    assert.equal(values.length,12);writes++;
    if(options.race) return [{affectedRows:0}];
    current.number=values[0];return [{affectedRows:1}];
  }};
  const audit={read:async()=>saved,prepare:async(_,value)=>{if(options.backupFailure)throw Error("backup");saved=structuredClone(value);},complete:async()=>{completed++;if(options.completeFailure && completed===1)throw Error("audit");}};
  const input={id:42,expectedLicenseNumber:row.number,licenseNumber:"A-11-000001",actorUid:"national"};
  return {run:extra=>correctLicense(connection,{...input,...extra},audit),writes:()=>writes,current:()=>current};
}
(async()=>{
  const f=fixture();await f.run();assert.equal(f.writes(),1);await f.run();assert.equal(f.writes(),1);assert.equal(f.current().nom,row.nom);
  for(const options of [{duplicate:true},{backupFailure:true}]){const f=fixture(options);await assert.rejects(f.run());assert.equal(f.writes(),0);}
  const stale=fixture();await assert.rejects(stale.run({expectedLicenseNumber:"old"}));assert.equal(stale.writes(),0);
  const race=fixture({race:true});await assert.rejects(race.run(),/change/);
  const retry=fixture({completeFailure:true});await assert.rejects(retry.run());await retry.run();assert.equal(retry.writes(),1);
  for(const licenseNumber of ["","x".repeat(101),"A\n123"]){const f=fixture();await assert.rejects(f.run({licenseNumber}));assert.equal(f.writes(),0);}
  console.log("NAP license state and protected correction tests passed");
})().catch(error=>{console.error(error);process.exitCode=1;});

"use strict";
const assert=require("node:assert/strict");
const {prepareBatch,validateBatch,validDate}=require("../functions/nap-license-control");
const {correctLicenses}=require("../functions/nap-license-correction");
const schema=require("../functions/nap-approved-license-schema");
const original={id:42,nom:"EXEMPLE",prenom:"Test",date:"2000-01-01",sexe:"F",club:"106",actif:1,wc:null,edf:0,creation:null,number:"A-11-001234"};
(async()=>{
  assert.ok(validDate("2028-02-29"));assert.ok(!validDate("2027-02-29"));assert.ok(!validDate("2027-13-01"));
  for(const input of [{season:"2026-2028",competitionIds:[1]},{season:"2026-2027",competitionIds:[]},{season:"2026-2027",competitionIds:[1,2,3,4,5,6]}]) await assert.rejects(prepareBatch({execute:()=>{throw Error("should not read");}},input));
  let reads=0;
  const batch=await prepareBatch({execute:async({sql})=>{reads++;assert.ok(sql.includes("LIMIT"));return [reads===1?[{id:1,name:"Test",date:"2026-11-07"}]:[{...original,compet:1}]];}},{season:"2026-2027",competitionIds:["legacy-nap-1"]});
  assert.equal(reads,2);assert.equal(batch.people[0].expectedLicenseNumber,original.number);assert.equal(batch.people[0].seasonStatus,"to_check");assert.equal(batch.people[0].livePalmesId,"42");
  const noRead={execute:()=>{throw Error("should not read");}};
  for(const items of [[],[{swimmerIndexId:42,licenseNumber:"",expectedLicenseNumber:""}],[{swimmerIndexId:42,licenseNumber:"A-11-1",expectedLicenseNumber:"",federalValidityEndDate:"2027-02-29"}]]) await assert.rejects(validateBatch(noRead,{season:"2026-2027",source:"admin_import",items},"national",{}));
  let row={...original},saved,updates=0,queries=0,completes=0;
  const connection={execute:async({sql},values)=>{queries++;if(sql.startsWith("SELECT"))return [[{...row}]];assert.ok(saved);assert.ok(sql.startsWith("UPDATE nageurs SET number=CASE id"));updates++;row.number=values[1];return [{affectedRows:1}];}};
  const audit={read:async()=>saved,prepare:async(_,v)=>{saved=structuredClone(v);},complete:async()=>{completes++;}};
  const items=[{id:42,expected:original.number,number:"A-11-000000"}];
  await correctLicenses(connection,items,"national",audit);assert.equal(queries,3);assert.equal(updates,1);assert.equal(completes,1);
  await correctLicenses(connection,items,"national",audit);assert.equal(updates,1);
  row.prenom="Concurrent";await assert.rejects(correctLicenses(connection,items,"national",audit),/change/);
  assert.deepEqual(schema.validate({tables:[],columns:[],keys:[],index:[]}),{table:false,index:false});
  assert.throws(()=>schema.validate({tables:[],columns:[{}],keys:[],index:[]}));
  assert.throws(()=>schema.validate({tables:[],columns:[],keys:[],index:[{COLUMN_NAME:"number",SEQ_IN_INDEX:1,NON_UNIQUE:1,SUB_PART:20}]}));
  for(const fail of [false,true]) {
    let current={...original},saved,commits=0,rollbacks=0,nativeReads=0;
    const mock={beginTransaction:async()=>{},commit:async()=>{commits++;},rollback:async()=>{rollbacks++;},execute:async({sql},values)=>{
      if(sql.startsWith("INSERT INTO")){assert.ok(sql.includes("FROM (SELECT ? AS swimmer_id"));assert.equal(values.length,7);return [{affectedRows:1}];}
      if(sql.startsWith("UPDATE")){current.number=values[1];return [{affectedRows:1}];}
      nativeReads++;
      if(sql.startsWith("SELECT swimmer_id"))return [[]];
      if(sql.startsWith("SELECT id,number"))return [current.number===original.number?[]:[{id:42,number:current.number}]];
      if(sql.includes("license_validation_season"))return [[{...current,license_validation_season:"2026-2027",license_validated_number:current.number,license_validation_status:fail?"pending":"valid",license_validation_source:"national_manual",license_validated_at:"2026-10-09",license_validated_by:"national"}]];
      return [[{...current}]];
    }};
    const input={season:"2026-2027",source:"national_manual",items:[{swimmerIndexId:42,expectedLicenseNumber:original.number,licenseNumber:"A-11-999999"}]};
    const audit={read:async()=>saved,prepare:async(_,v)=>{saved=structuredClone(v);},complete:async()=>{}};
    if(fail){await assert.rejects(validateBatch(mock,input,"national",audit),/incomplete/);assert.equal(rollbacks,1);assert.equal(commits,0);}
    else {const result=await validateBatch(mock,input,"national",audit);assert.equal(result.validatedCount,1);assert.equal(commits,1);assert.equal(rollbacks,0);}
    assert.equal(nativeReads,6);
  }
  console.log("NAP licence batches, string preservation, bounded reads, grouped CAS, replay and schema guards passed");
})().catch(error=>{console.error(error);process.exitCode=1;});

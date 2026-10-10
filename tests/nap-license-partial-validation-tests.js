"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {validateBatch}=require("../functions/nap-license-control");
(async()=>{
  const people=[1,2,3,4,5,6].map(id=>({id,nom:"TEST",prenom:"Test",date:"2000-01-01",sexe:"F",club:"1",actif:1,wc:null,edf:0,creation:null,number:`A-01-${id}`}));
  const saved=new Map();let committed=0,reads=0,writes=0;
  const db={beginTransaction:async()=>{},commit:async()=>{committed++;},rollback:async()=>{throw Error("Unexpected rollback");},execute:async({sql},values)=>{
    if(sql.startsWith("UPDATE")){throw Error("Unchanged licences must not need a native write");}
    if(sql.startsWith("INSERT")){writes++;assert.equal(values[0],1);assert.equal(values.length,7);return [{affectedRows:1}];}
    reads++;assert.match(sql,/LIMIT/);
    if(sql.startsWith("SELECT swimmer_id"))return [[{swimmer_id:99,license_number:"A-01-3"}].filter(p=>values.includes(p.license_number))];
    if(sql.includes("license_validation_season"))return [[{...people[0],license_validation_season:"2026-2027",license_validated_number:people[0].number,license_validation_status:"valid",license_validation_source:"national_manual",license_validated_at:"2026-10-10",license_validated_by:"admin"}]];
    if(sql.includes("FORCE INDEX (livepalmes_license_number_id)"))return [[...people.filter(p=>p.id===1||p.id===2),{id:98,number:"A-01-2"}].filter(p=>values.includes(p.number))];
    if(sql.startsWith("SELECT id,number"))return [people.filter(p=>p.id<=4).map(p=>({...p,number:p.id===4?"changed":p.number}))];
    return [[{...people[0]}]];
  }};
  const audit={read:async op=>saved.get(op),prepare:async(op,data)=>saved.set(op,data),complete:async()=>{}};
  const result=await validateBatch(db,{partialValidation:true,season:"2026-2027",source:"national_manual",items:people.map(p=>({swimmerIndexId:p.id,licenseNumber:p.id===6?"":p.number,expectedLicenseNumber:p.number}))},"admin",audit);
  assert.deepEqual(result.validatedIds,["1"]);assert.equal(result.validatedCount,1);assert.equal(result.blockedCount,5);assert.equal(committed,1);assert.equal(writes,1);assert.ok(reads<=9);
  assert.deepEqual(result.blocked.find(p=>p.id==="2").conflictingSwimmerIds,["98"]);
  assert.deepEqual(result.blocked.find(p=>p.id==="3").conflictingSwimmerIds,["99"]);
  assert.match(result.blocked.find(p=>p.id==="4").reason,/change/);assert.match(result.blocked.find(p=>p.id==="5").reason,/absente/);
  const duplicates=await validateBatch({execute(){throw Error("No reads for duplicate proposed licences");}},{partialValidation:true,season:"2026-2027",source:"national_manual",items:[1,2].map(id=>({swimmerIndexId:id,licenseNumber:"A-01-9",expectedLicenseNumber:""}))},"admin",audit);
  assert.equal(duplicates.validatedCount,0);assert.equal(duplicates.blockedCount,2);
  const source=fs.readFileSync("assets/livepalmes-license-administration.js","utf8");
  const validateSource=source.slice(source.indexOf("  async function validatePeople("),source.indexOf('  elements.competitions.addEventListener'));
  const records=[{livePalmesId:"1",seasonStatus:"to_check",selected:true,licenseNumber:"A-01-1"},{livePalmesId:"2",seasonStatus:"to_check",selected:true,licenseNumber:"A-01-2"}];let message="";
  await vm.runInNewContext(validateSource+"\nvalidatePeople(state.batch.people)",{state:{batch:{season:{label:"2026-2027"},people:records},imported:new Map()},window:{confirm:()=>true},elements:{season:{},prepare:{},reload:{},importInput:{},selectPending:{}},syncPrepareButton(){},syncValidateButton(){},setStatus(s){message=s;},renderBatch(){},validationPayload:p=>p,bridge:{callFunction:async()=>result,licensesChanged(){}}});
  assert.equal(records[0].seasonStatus,"valid");assert.equal(records[1].seasonStatus,"to_check");assert.equal(records[1].selected,true);assert.match(records[1].validationError,/98/);assert.match(message,/1 fiche.*1 fiche/);
  const interrupted=Array.from({length:101},(_,i)=>({livePalmesId:String(i+1),seasonStatus:"to_check",licenseNumber:"A-01-"+(i+1),selected:true}));let calls=0;
  await vm.runInNewContext(validateSource+"\nvalidatePeople(state.batch.people)",{state:{batch:{source:"nap",season:{label:"2026-2027"},people:interrupted},imported:new Map()},window:{confirm:()=>true},elements:{season:{},prepare:{},reload:{},importInput:{},selectPending:{}},syncPrepareButton(){},syncValidateButton(){},setStatus(){},renderBatch(){},validationPayload:p=>p,bridge:{callFunction:async()=>{calls++;if(calls===1)throw Error("Network unavailable");return {validatedIds:["101"],blocked:[]};},licensesChanged(){}}});
  assert.equal(calls,2);assert.equal(interrupted.filter(p=>p.seasonStatus==="valid").length,1);assert.match(interrupted[0].validationError,/non confirmé/);
  const exportSource=source.slice(source.indexOf("  function exportBatch("),source.indexOf("  function chooseDelimiter("));
  for(const mode of ["pending","all"]) {let csv;vm.runInNewContext(exportSource+"\nexportBatch();",{state:{batch:{batchId:"lot",season:{label:"2026-2027"},people:records.map(p=>({...p,competitions:[]}))}},elements:{exportScope:{value:mode}},displayDate:v=>v,csvCell:v=>String(v??""),download:v=>{csv=v;},setStatus(){}});assert.equal(csv.split("\r\n").length,mode==="pending"?3:4);}
  console.log("Partial licence validation: mixed conflicts, confirmed statuses, duplicate proposals and both CSV scopes passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});

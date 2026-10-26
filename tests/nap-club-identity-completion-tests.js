"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {plan}=require("../functions/nap-club-identity-fields");
const {classify}=require("../assets/livepalmes-club-identity");
const {person}=require("../functions/nap-club-people");
const requests=require("../functions/nap-person-change-requests");
const {fillClubLicense}=require("../functions/nap-club-license-fill");
const {fingerprint}=require("../functions/nap-portal-swimmer-change");
const {hash}=require("../functions/nap-approved-swimmer-correction");
const schema=require("../functions/nap-approved-official-identity-schema");
const original={id:7,nom:"EXEMPLE",prenom:"Test",date:"1980-01-02",club:"106",sexe:null,number:null};
const current=person(original,"officials");
assert.deepEqual(plan(original,{sex:"M",licenseNumber:"a-12-34567"},{fillOnly:true}).after,{...original,sexe:"M",number:"A-12-34567"});
for(const patch of [{lastName:"CORRIGE"},{birthDate:"1981-01-02"},{firstName:"Autre"}])assert.throws(()=>plan(original,patch,{fillOnly:true}),/visa national/);
assert.throws(()=>plan({...original,number:"A-12-34567"},{licenseNumber:"A-12-76543"}),/verrouillée/);
assert.throws(()=>plan({...original,sexe:"M"},{sex:""}),/effacée/);
assert.throws(()=>plan(original,{sex:"X"}),/Femme ou Homme/);
assert.throws(()=>plan(original,{licenseNumber:"texte"}),/Licence invalide/);
assert.equal(plan(original,{lastName:"CORRIGE"}).after.nom,"CORRIGE","national correction may replace existing identity");
assert.equal(plan({...original,date:"1980-01-02 00:00:00"},{birthDate:"1980-01-02"},{fillOnly:true}).changed.length,0,"equivalent legacy SQL dates are preserved verbatim");
assert.equal(classify(current,{...current,sex:"M"},true).action,"complete");
assert.equal(classify(current,{...current,lastName:"CORRIGE"},true).action,"request");
assert.equal(classify(current,{...current,licenseNumber:"A-12-34567"},false).action,"complete");
assert.throws(()=>classify(current,{...current,lastName:"CORRIGE",licenseNumber:"A-12-34567"},true),/licence seule/);
assert.throws(()=>classify({...current,licenseNumber:"A-12-34567"},{...current,licenseNumber:"A-12-76543"},true),/verrouillée/);

function licenseFixture(){
  const state={row:{...original,actif:1,wc:null,edf:0,creation:"2000-01-01"},saved:null,writes:0,seasonWrites:0,sql:[],owners:[],completeFailure:false};
  const connection={execute:async({sql},values=[])=>{
    state.sql.push(sql);
    if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(sql.includes("FORCE INDEX (livepalmes_license_number_id)"))return [state.owners];
    if(sql.startsWith("SELECT")){state.nativeReads=(state.nativeReads||0)+1;if(state.transferOnRead&&state.nativeReads===2)state.row.club="107";return [[{...state.row}]];}
    assert.ok(sql.startsWith("UPDATE nageurs SET number=?"),"no season validation, identity or engagement write");
    assert.ok(state.saved,"durable backup before write");
    assert.equal(hash(state.row),state.saved.beforeHash,"raw complete CAS witness");
    assert.equal(values[0],state.saved.after.number);
    state.row={...state.saved.after};state.writes++;
    if(state.lostResponse){state.lostResponse=false;throw Error("SQL response lost");}
    return [{affectedRows:1}];
  },release:()=>{state.released=true;}};
  state.input={swimmerId:"7",expectedFingerprint:fingerprint(state.row),proposed:{licenseNumber:"A-12-34567"}};
  state.run=(input=state.input,context={uid:"club",clubId:"106"})=>fillClubLicense({getConnection:async()=>connection},input,context,{
    read:async()=>state.saved,
    prepare:async(_,value)=>{state.saved=structuredClone(value);},
    complete:async()=>{if(state.completeFailure)throw Error("audit unavailable");}
  });
  return state;
}
async function schemaTests(){
  const base=["id","nom","prenom","date","club"].map(COLUMN_NAME=>({COLUMN_NAME,COLUMN_TYPE:"varchar(100)",IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""}));
  let columns=[...base],writes=0;
  const connection={execute:async({sql})=>{
    if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[]];
    if(sql.includes("PROCESSLIST"))return [[]];
    if(sql.includes("TABLES"))return [[{ENGINE:"MyISAM",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
    if(sql.includes("COLUMNS"))return [columns];
    if(sql.includes("STATISTICS"))return [[]];
    throw Error(sql);
  },query:async({sql})=>{
    assert.equal(sql,schema.sql,"only two nullable columns, no UPDATE/INSERT or index migration");writes++;
    columns=[...columns,...Object.entries({sexe:"char(1)",number:"varchar(100)"}).map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""}))];
  },release:()=>{}};
  const pool={getConnection:async()=>connection},confirmation="nap-add-official-identity-fields";
  const prepared=await schema.approvedOfficialIdentitySchema(pool,{confirmation,phase:"prepare"});assert.equal(writes,0);
  await assert.rejects(schema.approvedOfficialIdentitySchema(pool,{confirmation,phase:"apply",planHash:schema.planHash,schemaHash:"wrong"}),/Structure modifiée/);assert.equal(writes,0);
  const applied=await schema.approvedOfficialIdentitySchema(pool,{confirmation,phase:"apply",planHash:prepared.planHash,schemaHash:prepared.schemaHash});assert.equal(applied.verified,true);assert.equal(writes,1);
  const second=await schema.approvedOfficialIdentitySchema(pool,{confirmation,phase:"prepare"});await schema.approvedOfficialIdentitySchema(pool,{confirmation,phase:"apply",planHash:second.planHash,schemaHash:second.schemaHash});assert.equal(writes,1,"idempotent, no row rewrite");
}
(async()=>{
  const conn={execute:async({sql})=>sql.includes("FROM officiels")?[[original]]:[[]]};
  const proposal=await requests.prepareRequest(conn,{personId:current.id,expectedFingerprint:current.napFingerprint,proposed:{lastName:"CORRIGE"},reason:"Erreur de saisie"},{uid:"club",clubId:"106"});
  assert.equal(proposal.requestType,"person-change");
  const stored={...proposal,clubId:"106"};
  assert.equal(requests.prepareResolution(stored,{decision:"approved"},"national").resolvedProposed.lastName,"CORRIGE");
  assert.throws(()=>requests.prepareResolution(stored,{decision:"approved",proposed:{licenseNumber:"A-12-34567"}},"national"),/licence/);
  assert.throws(()=>requests.prepareResolution({...stored,clubId:"107"},{decision:"approved"},"national"),/incompatible/);
  await assert.rejects(requests.prepareRequest(conn,{personId:current.id,expectedFingerprint:current.napFingerprint,proposed:{lastName:"CORRIGE"},reason:"Motif"},{uid:"club",clubId:"107"}),/hors du club/);
  let s=licenseFixture();const reply=await s.run();assert.equal(s.writes,1);assert.equal(reply.completedWithoutRequest,true);assert.equal(reply.swimmer.licenseNumber,"A-12-34567");assert.equal(reply.swimmer.licenseVerificationStatus,"pending","club number does not validate a season");await s.run();assert.equal(s.writes,1);
  s=licenseFixture();s.lostResponse=true;await assert.rejects(s.run(),/lost/);await s.run();assert.equal(s.writes,1);
  s=licenseFixture();s.row.number="A-12-76543";await assert.rejects(s.run(),/verrouillée/);assert.equal(s.writes,0);
  s=licenseFixture();await assert.rejects(s.run(s.input,{uid:"club",clubId:"107"}),/club/);assert.equal(s.writes,0);
  s=licenseFixture();s.transferOnRead=true;await assert.rejects(s.run(),/changé de club/);assert.equal(s.writes,0,"membership is rechecked on the helper's own read before any write");
  s=licenseFixture();s.owners=[{id:9}];await assert.rejects(s.run(),/autre fiche/);assert.equal(s.writes,0);
  s=licenseFixture();await assert.rejects(s.run({...s.input,proposed:{licenseNumber:"A-12-34567",lastName:"CORRIGE"}}),/séparément/);assert.equal(s.writes,0);
  await schemaTests();
  const index=fs.readFileSync("functions/index.js","utf8");assert.ok(index.includes('request.body?.confirmation === "nap-add-official-identity-fields"'));
  console.log("Club identity: missing-only writes, mandatory creation fields, lifetime licence lock, national correction, isolated season state, ownership, durable retry and additive schema passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});

"use strict";
const assert=require("node:assert/strict");
const {proposed,previewCreation,createSwimmer}=require("../functions/nap-swimmer-creation");
const input={clubId:"106",actorUid:"club-admin",creationId:"11111111-1111-4111-8111-111111111111",swimmer:{firstName:"Test",lastName:"EXEMPLE",birthDate:"1980-01-02",sex:"M",licenseNumber:"A-05-000001"}};
const native={id:7,nom:"EXEMPLE",prenom:"Test",date:"1980-01-02",sexe:"M",number:"A-05-000002",club:"107"};
const format=(match,type)=>({type:type|| (match.clubId===input.clubId?"duplicate":"club-change"),name:match.name,swimmerIndexId:match.id});
function fixture(){
  const state={allowed:false,queries:[],exact:[],similar:[],licenseMatches:[],audit:null,native:null,writes:0,checkpoints:0};
  const connection={execute:async({sql,timeout},values=[])=>{
    assert.equal(state.allowed,true);assert.equal(timeout,10000);state.queries.push(sql);
    if(sql.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) return [[{released:1}]];
    if(sql.startsWith("SELECT id FROM nageurs")) {assert.match(sql,/FORCE INDEX \(livepalmes_license_number_id\).*LIMIT 2$/);return [state.licenseMatches];}
    if(sql.includes(" UNION ")) return [state.exact];
    if(sql.includes("nom LIKE")) {assert.match(sql,/ESCAPE '=' LIMIT 201/);return [state.similar];}
    if(sql.includes("TRIGGERS")) return [state.trigger?[{}]:[]];
    if(sql.startsWith("EXPLAIN")) return [[{table:"duplicate",key:state.badPlan?null:"livepalmes_license_number_id"},{table:"cl",key:"PRIMARY"}]];
    if(sql.startsWith("INSERT INTO nageurs")) {
      assert.equal(state.audit.phase,"writing");assert.match(sql,/NOT EXISTS/);
      if(state.zeroRows) return [{affectedRows:0,insertId:0}];
      state.native={id:99,...state.audit.native,creation:state.audit.timestamp,actif:1,wc:null,edf:1};state.writes++;
      if(state.lostResponse) throw Error("response lost");
      return [{affectedRows:1,insertId:99}];
    }
    if(sql.includes("FROM nageurs WHERE id=?")) return [state.native?[{...state.native}]:[]];
    throw Error(`Unexpected ${sql}`);
  },release:()=>{state.released=true;},destroy:()=>{state.destroyed=true;}};
  const authorize=()=>{state.allowed=true;};
  state.preview=(patch={},auth=authorize)=>previewCreation(connection,{...input,...patch},auth,format);
  state.run=(patch={},auth=authorize)=>createSwimmer({getConnection:async()=>connection},{...input,...patch},{
    read:async()=>state.audit,
    prepare:async(operation,plan)=>{if(state.failBackup) throw Error("backup failure");state.audit=structuredClone(plan);},
    checkpoint:async(operation,plan)=>{state.checkpoints++;if(state.failIdCheckpoint && plan.phase==="identified") throw Error("checkpoint failure");state.audit=structuredClone(plan);},
    complete:async()=>{if(state.failComplete) throw Error("journal failure");state.done=true;}
  },auth,format);
  return state;
}
(async()=>{
  const empty=fixture();const preview=await empty.preview();assert.equal(preview.requiresConfirmation,false);assert.equal(preview.blocksCreation,false);assert.equal(empty.queries.length,4);
  const exact=fixture();exact.exact=[native];let warning=await exact.preview();assert.equal(warning.requiresConfirmation,true);assert.equal(warning.alerts[0].type,"club-change");
  exact.exact=[{...native,club:"106"}];assert.equal((await exact.preview()).alerts[0].type,"duplicate");
  const inverted=fixture();inverted.exact=[{...native,nom:"Test",prenom:"EXEMPLE"}];warning=await inverted.preview();assert.equal(warning.blocksCreation,true);await assert.rejects(inverted.run({confirmAlerts:true}),/inverses/);assert.equal(inverted.writes,0);
  const similar=fixture();similar.similar=[{...native,date:"1980-04-03",prenom:"Tester"}];assert.equal((await similar.preview()).alerts[0].type,"possible-duplicate");
  similar.similar=[{...native,date:"1981-01-02"}];assert.equal((await similar.preview()).alerts.length,0);
  for(const patch of [{licenseNumber:""},{licenseNumber:123},{firstName:"x".repeat(65)},{birthDate:"1980-02-30"},{sex:"X"}]) assert.throws(()=>proposed({...input,swimmer:{...input.swimmer,...patch}}),TypeError);
  assert.equal(proposed(input).number,"A-05-000001");
  const denied=fixture();await assert.rejects(denied.run({},()=>{throw Error("denied");}),/denied/);assert.equal(denied.queries.length,0);
  const created=fixture();const result=await created.run();assert.equal(result.swimmer.id,"99");assert.equal(result.swimmer.licenseNumber,input.swimmer.licenseNumber);assert.equal(result.swimmer.licenseSeasonStatus,"to_check");assert.equal(created.writes,1);assert.equal(created.queries.length,10);
  await created.run();assert.equal(created.writes,1,"retry never inserts a second swimmer");
  for(const tweak of [s=>s.busy=true,s=>s.trigger=true,s=>s.badPlan=true,s=>s.failBackup=true,s=>s.zeroRows=true,s=>s.licenseMatches=[{id:7}],s=>s.similar=Array(201).fill(native),s=>s.exact=[native]]) {
    const blocked=fixture();tweak(blocked);await assert.rejects(blocked.run());assert.equal(blocked.writes,0);
  }
  const confirmed=fixture();confirmed.exact=[native];assert.equal((await confirmed.run({confirmAlerts:true})).alerts.length,1);
  for(const tweak of [s=>s.lostResponse=true,s=>s.failIdCheckpoint=true]) {const uncertain=fixture();tweak(uncertain);await assert.rejects(uncertain.run());assert.equal(uncertain.writes,1);await assert.rejects(uncertain.run(),/identifiant non confirme/);assert.equal(uncertain.writes,1);}
  const completed=fixture();completed.failComplete=true;await assert.rejects(completed.run());completed.failComplete=false;await completed.run();assert.equal(completed.writes,1);assert.equal(completed.done,true);
  const changed=fixture();changed.failComplete=true;await assert.rejects(changed.run());changed.native.nom="Correction IntraNAP";await assert.rejects(changed.run(),/fiche creee a change/);assert.equal(changed.writes,1);
  console.log("NAP swimmer creation: mandatory string licence, native duplicate alerts, inversion block, durable intent, uncertain insert refusal and generated-id retry verified without network.");
})().catch(error=>{console.error(error);process.exitCode=1;});

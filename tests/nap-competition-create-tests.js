"use strict";
const assert=require("node:assert/strict");
const {planCreation,createCompetition}=require("../functions/nap-competition-create");
const contract=require("../functions/nap-competition-create-schema.json");
const schema=require("../functions/nap-approved-portal-schema");
const input={actorUid:"manager",creationId:"11111111-1111-4111-8111-111111111111",committeeId:3,event:{competitionType:"pool",name:"Essai",city:"Paris",date:"2026-11-07",endDate:"2026-11-07",level:"regional"}};
function fixture() {
  const s={saved:null,writes:0,queries:0,competition:null,parameters:null,options:null,authorized:0};
  const conn={release(){s.released=true;},async execute({sql},values=[]) {
    s.queries++;
    if(sql.includes("GET_LOCK"))return [[{acquired:s.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(sql.startsWith("SHOW CREATE")){const table=sql.match(/`([^`]+)`/)[1];return [[{"Create Table":contract[table]+(s.drift?" altered":"")}]];}
    const calendarSpec=require("../functions/nap-approved-calendar-schema").specs.find(spec=>spec.table===values[0]);
    if(calendarSpec && sql.includes("information_schema.")) {
      if(sql.includes("TABLES"))return [[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
      if(sql.includes("COLUMNS"))return [calendarSpec.columns.map(([name,type,nullable,def])=>({COLUMN_NAME:name,COLUMN_TYPE:type,IS_NULLABLE:nullable,COLUMN_DEFAULT:def??null,EXTRA:""}))];
      return [[{INDEX_NAME:"PRIMARY",COLUMN_NAME:calendarSpec.key,SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}]];
    }
    if(sql.includes("information_schema.TABLES"))return [schema.tables.map(t=>({TABLE_NAME:t.name,ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}))];
    if(sql.includes("information_schema.COLUMNS"))return [[...schema.tables.flatMap(t=>t.columns.map(c=>({TABLE_NAME:t.name,COLUMN_NAME:c.name,COLUMN_TYPE:c.type,IS_NULLABLE:c.nullable?"YES":"NO",COLUMN_DEFAULT:c.defaultValue,EXTRA:c.extra}))),...(s.eventType?[{TABLE_NAME:"livepalmes_competition_options",COLUMN_NAME:"event_type",COLUMN_TYPE:"varchar(16)",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""}]:[]),...(s.noClosure?[]:[{TABLE_NAME:"livepalmes_competition_options",COLUMN_NAME:"entry_closed",COLUMN_TYPE:"tinyint",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""}])]];
    if(sql.includes("information_schema.STATISTICS"))return [schema.tables.flatMap(t=>t.keys.flatMap(k=>k.columns.map((c,i)=>({TABLE_NAME:t.name,INDEX_NAME:k.name,COLUMN_NAME:c,SEQ_IN_INDEX:i+1,NON_UNIQUE:k.unique?0:1,SUB_PART:null}))))];
    if(sql.includes("TRIGGERS"))return [s.trigger?[{}]:[]];
    if(sql.includes("FROM compet_types"))return [[{id:0,label:"Piscine"},{id:1,label:s.wrongType?"Changed":"Eau libre"},{id:2,label:"Formation"},{id:3,label:"Stage"},{id:4,label:"Réunion"}]];
    if(sql.includes("FROM compet_type"))return [[{id:6,label:"AUTRE"}]];
    if(sql.startsWith("INSERT")) {
      const table=sql.match(/INTO `([^`]+)`/)[1],keys=sql.match(/\(([^)]+)\)/)[1].split(",").map(k=>k.replace(/`/g,""));
      assert.equal(sql.match(/\?/g).length,values.length);
      assert.ok(s.saved,"journal before every write");
      const row=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
      if(table==="competitions") {assert.equal(s.saved.phase,"writing");s.competition={id:99,...row};s.writes++;if(s.lostReply)throw Error("network");return [{affectedRows:1,insertId:99}];}
      if(table==="compet_parametres") {assert.equal(s.saved.phase,"writing");assert.match(sql,/NOT EXISTS.*FORCE INDEX\(compet\)/);s.parameters={id:77,...row};s.writes++;if(s.lostParameterReply)throw Error("network");return [{affectedRows:1,insertId:77}];}
      if(table==="livepalmes_calendar_event_details"){assert.match(sql,/competitions FORCE INDEX\(PRIMARY\)/);s.calendarDetails=row;s.writes++;if(s.lostCalendarReply){s.lostCalendarReply=false;throw Error("network");}return [{affectedRows:1}];}
      assert.match(sql,/compet_parametres FORCE INDEX\(PRIMARY\)/);
      if(s.failOptions){s.failOptions=false;throw Error("network");}
      if(s.options)throw Object.assign(Error("duplicate"),{code:"ER_DUP_ENTRY"});
      s.options=row;s.writes++;return [{affectedRows:1}];
    }
    if(sql.includes("FROM `competitions`"))return [s.competition?[s.competition]:[]];
    if(sql.includes("FROM `compet_parametres`"))return [s.parameters?[s.parameters]:[]];
    if(sql.includes("FROM `livepalmes_competition_options`"))return [s.options?[s.options]:[]];
    if(sql.includes("FROM `livepalmes_calendar_event_details`"))return [s.calendarDetails?[s.calendarDetails]:[]];
    throw Error("Unexpected query");
  }};
  s.run=(data=input,authorize=()=>{s.authorized++;})=>createCompetition({getConnection:async()=>conn},data,{
    read:async()=>s.saved,prepare:async(_,plan)=>{s.saved=structuredClone(plan);},checkpoint:async(_,plan)=>{if(s.failCheckpoint && plan.phase==="identified")throw Error("checkpoint");s.saved=structuredClone(plan);},complete:async()=>{s.done=true;}
  },authorize);
  return s;
}
(async()=>{
  const p=planCreation(input);assert.equal(p.competition.type,0);assert.equal(p.competition.typecnc,0);assert.equal(p.parameters.saisie,1);assert.equal(p.parameters.actif,0);assert.equal(p.parameters.date_limit,null);assert.equal(p.parameters.qualif,0);
  for(const date of ["1900-01-01","9999-01-01"]) assert.throws(()=>planCreation({...input,event:{...input.event,date,endDate:date}}),/saisons/);
  const water=planCreation({...input,event:{...input.event,competitionType:"openWater"}}).competition;assert.equal(water.ld,1);assert.equal(water.type,1);assert.equal(water.typecnc,0);
  for(const event of [{...input.event,date:"2026-02-30"},{...input.event,city:"x".repeat(65)},{...input.event,level:"unknown"},{...input.event,name:"🏊"}])assert.throws(()=>planCreation({...input,event}),TypeError);
  const ambiguous={...input,event:{...input.event,name:"Stage competition"}};
  let s=fixture();await assert.rejects(s.run(ambiguous),/type explicite/);assert.equal(s.writes,0);
  s=fixture();s.eventType=true;await s.run(ambiguous);assert.equal(s.options.event_type,"pool");assert.equal(s.writes,3);
  for(const [competitionType,kind] of [["training",2],["stage",3],["meeting",4]]) {
    const data={...input,event:{...input.event,competitionType}};
    s=fixture();await assert.rejects(s.run(data),/type explicite requis/);assert.equal(s.writes,0);
    s=fixture();s.eventType=true;await s.run(data);assert.equal(s.competition.ld,kind);assert.equal(s.competition.type,kind);assert.equal(s.competition.typecnc,0);assert.equal(s.options.event_type,competitionType);assert.equal(s.parameters.actif,0);assert.ok(s.queries<=26);assert.equal(s.calendarDetails.competition_id,99);
  }
  s=fixture();await s.run();assert.equal(s.writes,3);assert.ok(s.queries<=17);assert.ok(s.done&&s.released);await s.run();assert.equal(s.writes,3,"completed retry does not duplicate");
  for(const flag of ["drift","trigger","wrongType","busy","noClosure"]){s=fixture();s[flag]=true;await assert.rejects(s.run());assert.equal(s.writes,0);assert.equal(s.saved,null);}
  s=fixture();await assert.rejects(s.run(input,()=>{throw Error("denied");}));assert.equal(s.queries,0);
  for(const flag of ["lostReply","lostParameterReply","failCheckpoint"]){s=fixture();s[flag]=true;await assert.rejects(s.run());const writes=s.writes;s[flag]=false;await assert.rejects(s.run(),/identifiant non confirme/);assert.equal(s.writes,writes,"uncertain native id cannot be retried");}
  s=fixture();s.failOptions=true;await assert.rejects(s.run());assert.equal(s.writes,2);await s.run();assert.equal(s.writes,3,"identified native rows reused");
  s=fixture();s.failOptions=true;await assert.rejects(s.run());s.competition.libelle="Changed";await assert.rejects(s.run(),/a change/);assert.equal(s.writes,2);
  s=fixture();await s.run();await assert.rejects(s.run({...input,event:{...input.event,name:"Different"}}),/incompatible/);assert.equal(s.writes,3);
  s=fixture();s.eventType=true;s.lostCalendarReply=true;
  const training={...input,event:{...input.event,competitionType:"training",registrationUrl:"https://example.org",programSessions:[{label:"Accueil"}],address:"Adresse",organizer:"CNHC"}};
  await assert.rejects(s.run(training),/network/);assert.equal(s.writes,4);await s.run(training);assert.equal(s.writes,4,"Lost calendar reply must not duplicate the event or details");assert.equal(s.options.organizer_label,"CNHC");
  console.log("NAP competition creation: validation, budget, guards and uncertain retries passed");
})().catch(error=>{console.error(error);process.exitCode=1;});

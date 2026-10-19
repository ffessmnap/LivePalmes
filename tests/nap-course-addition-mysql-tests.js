"use strict";
// Explicit isolated integration test, never part of an online business recipe.
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const mysql=require("../functions/node_modules/mysql2/promise");
const native=require("../functions/nap-portal-competitions");
const workspaces=require("../functions/nap-portal-workspaces");
const {addNativeCourses}=require("../functions/nap-course-addition");
const {applyCompetitionChange}=require("../functions/nap-portal-competition-change");
function normalizers(definitions){
  const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
  const ast=require("./firestore-rules/node_modules/acorn").parse(source,{ecmaVersion:"latest"});
  const names=new Set(["engagementCategoryCodesForEvent","normalizeEngagementEventCategoryRestrictions","cleanEngagementRelayMixedMode","cleanEngagementCompetitionType","cleanEngagementCompetitionEvents","cleanEngagementProgramSessions"]);
  const individuals=["P","B","M","C","J","S","M30+","M40+","M50+","M60+","M70+","M80+"];
  const relays=["P","B","M","C","J","S","R140","R180","R220","R260"];
  const context={cleanText:v=>String(v??'').trim(),cleanIsoDate:v=>v||'',HttpsError:Error,
    ENGAGEMENT_EVENT_DEFINITION_BY_CODE:definitions,ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES:individuals,
    ENGAGEMENT_RELAY_CATEGORY_CODES:relays,ENGAGEMENT_CATEGORY_CODE_SET:new Set([...individuals,...relays]),
    ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES:{'50AP':new Set(['P','B','M'])},
    ENGAGEMENT_RELAY_MIXED_MODES:new Set(['none','masters']),ENGAGEMENT_COMPETITION_TYPES:new Set(['pool','openWater']),
    ENGAGEMENT_PROGRAM_GENDER_MODES:new Set(['female','male','mixed']),ENGAGEMENT_PROGRAM_PHASES:new Set(['direct','heats','final','slowHeats','fastHeat'])};
  vm.createContext(context);
  for(const node of ast.body)if(node.type==='FunctionDeclaration'&&names.has(node.id.name))vm.runInContext(source.slice(node.start,node.end),context);
  return {normalizeEvents:(...args)=>JSON.parse(JSON.stringify(context.cleanEngagementCompetitionEvents(...args))),
    normalizeProgram:(...args)=>JSON.parse(JSON.stringify(context.cleanEngagementProgramSessions(...args)))};
}
async function main(){
  const database=process.env.NAP_COURSE_CLONE_DATABASE;
  assert.match(database||'',/^lp_documents_courses_[0-9]+$/,'isolated database required');
  assert.ok(process.env.NAP_COURSE_CLONE_PASSWORD,'local clone password required');
  const pool=mysql.createPool({host:'127.0.0.1',port:33317,user:'root',password:process.env.NAP_COURSE_CLONE_PASSWORD,database,
    dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false,connectionLimit:2});
  const q=async(sql,values=[])=>(await pool.execute({sql,timeout:10000},values))[0];
  const id=2000000001,proof={database,sourceWrites:0,checks:[]},saved=new Map();
  const audit={read:async op=>saved.get(op),prepare:async(op,value)=>{saved.set(op,structuredClone(value));},complete:async()=>{}};
  const authorize=()=>{};
  const codes=['50SF','200SF','1500SF','50AP','200IS','100BI','400BI','4X100SF','4X100BI'];
  const definitions=new Map(codes.map(code=>[code,{code,type:code.startsWith('4X')?'relay':'individual',...(code==='4X100BI'?{relayMixedRule:'required'}:{})}]));
  const services={eventDefinitions:definitions,...normalizers(definitions)};
  const pack=()=>native.readNativeCompetition(pool,id,authorize);
  const common=async patch=>({competitionId:id,actorUid:'isolated-course-clone',national:true,expectedFingerprint:workspaces.fingerprint(await pack()),patch,...services});
  try{
    const [runtime]=await q('SELECT VERSION() AS version,@@port AS port,@@bind_address AS address,DATABASE() AS db');
    assert.equal(runtime.version,'5.7.30');assert.equal(Number(runtime.port),33317);assert.equal(runtime.address,'127.0.0.1');assert.equal(runtime.db,database);proof.runtime=runtime;
    const defaults=await q("SELECT COLUMN_NAME,COLUMN_DEFAULT,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='compet_courses' AND COLUMN_NAME IN ('cost','limitnageur') ORDER BY COLUMN_NAME LIMIT 3");
    assert.equal(defaults.length,2);assert.ok(defaults.every(row=>row.COLUMN_DEFAULT===null&&row.IS_NULLABLE==='NO'));proof.checks.push('actual-not-null-schema-without-sql-defaults');
    const requested={addNativeCourses:codes.map(code=>({code}))};
    const first=await common(requested);
    await addNativeCourses(pool,first,audit,authorize);
    const added=await pack();assert.equal(added.courses.length,17);
    assert.ok(added.courses.every(row=>row.cost==='0'&&row.limitnageur===0&&row.opencourse===0));
    const before=JSON.stringify(added.courses);await addNativeCourses(pool,first,audit,authorize);
    assert.equal(JSON.stringify((await pack()).courses),before);proof.checks.push('real-grouped-native-insert-and-idempotent-retry');
    const item=(eventCode,genderMode)=>({eventCode,genderMode,phase:'direct'});
    const programSessions=[{id:'session-1',date:'2026-11-07',startTime:'',items:codes.flatMap(code=>code==='1500SF'||code==='4X100BI'?[item(code,'mixed')]:[item(code,'female'),item(code,'male')])}];
    const courseOptions=codes.map(code=>({code,categoryRestrictions:[],...(code.startsWith('4X')?{relayMixedMode:code==='4X100BI'?'required':'',multipleRelaysAllowed:true}:{})}));
    await applyCompetitionChange(pool,await common({courseOptions,programSessions}),audit,authorize);
    const result=workspaces.competitionItem(await pack(),definitions);
    assert.equal(result.events.length,9);assert.equal(result.programSessions[0].items.length,16);
    assert.equal(result.programSessions[0].items.find(row=>row.eventCode==='1500SF').genderMode,'mixed');
    const individual=result.events.find(row=>row.code==='1500SF');assert.deepEqual(individual.nativeCourses.map(row=>row.sexe).sort(),['F','M']);
    const relay=result.events.find(row=>row.code==='4X100BI');assert.deepEqual(relay.nativeCourses.map(row=>row.sexe),['0']);
    assert.equal(JSON.stringify((await pack()).courses),before,'program settings preserve native rows and sexes');
    proof.checks.push('complete-add-settings-program-readback','combined-individual-keeps-native-female-and-male','mixed-relay-keeps-native-zero-sex');
    const counts=await q('SELECT (SELECT COUNT(*) FROM perfs) AS perfs,(SELECT COUNT(*) FROM nageursengager) AS swimmers');
    assert.equal(Number(counts[0].perfs),0);assert.equal(Number(counts[0].swimmers),0);
    proof.checks.push('no-performance-or-entry-created');proof.result='success';
    console.log(JSON.stringify(proof));return proof;
  }finally{await pool.end();}
}
module.exports={main};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});

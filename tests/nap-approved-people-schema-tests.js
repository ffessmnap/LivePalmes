"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {columns,sql,planHash,validate,approvedPeopleSchema}=require("../functions/nap-approved-people-schema");
function metadata(present) {
  return present?{
    tables:[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}],
    columns:columns.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""})),
    indexes:Object.entries({PRIMARY:["source","person_id"],club_person:["club_id","source","person_id"]}).flatMap(([INDEX_NAME,names])=>names.map((COLUMN_NAME,i)=>({INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:i+1,NON_UNIQUE:INDEX_NAME==="PRIMARY"?0:1,SUB_PART:null})))
  }:{tables:[],columns:[],indexes:[]};
}
assert.equal(validate(metadata(false)),false); assert.equal(validate(metadata(true)),true);
for(const mutate of [m=>m.tables[0].ENGINE="MyISAM",m=>m.columns[0].COLUMN_TYPE="text",m=>m.columns.push(m.columns[0]),m=>m.indexes[0].SUB_PART=1,m=>m.indexes.pop()]) {
  const m=metadata(true); mutate(m); assert.throws(()=>validate(m),/incompatible/i);
}
function fixture() {
  const state={present:false,busy:false,writing:false,creates:0,releases:0,unlocks:0};
  const connection={execute:async({sql:query},values)=>{
    if(query.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(query.includes("RELEASE_LOCK")) {state.unlocks++;return [[{}]];}
    if(query.includes("PROCESSLIST")) return [state.writing?[{ID:1}]:[]];
    assert.deepEqual(values,["livepalmes_club_people_options"]);
    const key=query.includes("information_schema.TABLES")?"tables":query.includes("information_schema.COLUMNS")?"columns":"indexes";
    assert.ok(/LIMIT (2|12|6)$/.test(query)); return [metadata(state.present)[key]];
  },query:async({sql:query})=>{assert.equal(query,sql);state.creates++;state.present=true;return [{}];},release:()=>state.releases++};
  state.pool={getConnection:async()=>connection};return state;
}
(async()=>{
  const s=fixture(),prepare={phase:"prepare",confirmation:"nap-create-club-people-options"};
  await assert.rejects(approvedPeopleSchema(s.pool,{...prepare,confirmation:"wrong"}),/Confirmation/);
  const before=await approvedPeopleSchema(s.pool,prepare); assert.equal(s.creates,0);
  const apply={...prepare,phase:"apply",planHash,schemaHash:before.schemaHash};
  await assert.rejects(approvedPeopleSchema(s.pool,{...apply,planHash:"wrong"}),/Plan/);
  await assert.rejects(approvedPeopleSchema(s.pool,{...apply,schemaHash:"wrong"}),/Structure/);
  s.busy=true;await assert.rejects(approvedPeopleSchema(s.pool,apply),/deja en cours/);s.busy=false;
  s.writing=true;await assert.rejects(approvedPeopleSchema(s.pool,apply),/Ecriture/);s.writing=false;
  const result=await approvedPeopleSchema(s.pool,apply);assert.equal(result.verified,true);assert.equal(result.dataRowsWritten,false);assert.equal(s.creates,1);
  const retry=await approvedPeopleSchema(s.pool,prepare);await approvedPeopleSchema(s.pool,{...apply,schemaHash:retry.schemaHash});assert.equal(s.creates,1);
  assert.equal(s.releases,8);assert.equal(s.unlocks,4);
  assert.ok(!/\b(nom|prenom|date|licence)\b/.test(sql));
  const workflow=fs.readFileSync(".github/workflows/nap-authorized-people-schema.yml","utf8");
  assert.ok(workflow.indexOf("name: nap-people-schema-before")<workflow.indexOf("NAP_PEOPLE_SCHEMA_PHASE: apply"));
  assert.ok(workflow.includes('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'));
  for(const name of ["livepalmes-test-common.yml","livepalmes-test-backend.yml"]) assert.ok(!fs.readFileSync(`.github/workflows/${name}`,"utf8").includes("add-nap-people-options"));
  const endpoint=fs.readFileSync("functions/index.js","utf8");
  assert.ok(endpoint.includes('const peopleSchema = request.method === "POST" && request.query.action === "approved-people-schema"'));
  assert.ok(endpoint.includes('invoker: "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com"'));
  console.log("Complement personnes : creation fixe, structure stricte, sauvegarde, concurrence et reprise verifies hors connexion.");
})().catch(error=>{console.error(error);process.exitCode=1;});

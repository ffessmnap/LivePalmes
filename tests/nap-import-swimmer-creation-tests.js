"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs');
const {service}=require('../functions/nap-import-swimmer-creation');
const input={importReview:true,clubId:'106',creationId:'11111111-1111-4111-8111-111111111111',confirmNewSwimmer:true,swimmer:{firstName:'Test',lastName:'EXEMPLE',birthDate:'1980-01-02',sex:'M',licenseNumber:'A-05-000001'}};
function fixture(){
 const state={queries:[],writes:0,connections:0,alerts:[],plan:null,exact:[],licence:[]};
 const connection={execute:async({sql,timeout},values=[])=>{
  assert.equal(timeout,10000);state.queries.push(sql);
  if(sql.includes('GET_LOCK'))return [[{acquired:1}]];
  if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
  if(sql.startsWith('SELECT id FROM nageurs'))return [state.licence];
  if(sql.includes(' UNION '))return [state.exact];
  if(sql.includes('nom LIKE'))return [[]];
  if(sql.includes('TRIGGERS'))return [[]];
  if(sql.startsWith('EXPLAIN'))return [[{table:'duplicate',key:'livepalmes_license_number_id'},{table:'cl',key:'PRIMARY'}]];
  if(sql.startsWith('INSERT INTO nageurs')){assert.equal(state.plan.phase,'writing');state.writes++;state.native={id:174,...state.plan.native,creation:state.plan.timestamp};return [{affectedRows:1,insertId:174}];}
  if(sql.includes('FROM nageurs WHERE id=?'))return [[state.native]];
  throw Error(sql);
 },release(){},destroy(){}};
 state.run=service({authorize:async()=>({uid:'national',national:state.national!==false}),getPool:()=>{state.connections++;return {...connection,getConnection:async()=>connection};},
  formatAlert:(match,type,clubId)=>({type:type||(match.clubId===clubId?'duplicate':'club-change'),name:match.name,swimmerId:match.id}),
  audit:()=>({read:async()=>state.plan,prepare:async(_,p)=>{state.plan=structuredClone(p);},checkpoint:async(_,p)=>{state.plan=structuredClone(p);},complete:async()=>{state.completed=true;}})});
 return state;
}
(async()=>{
 const denied=fixture();denied.national=false;await assert.rejects(denied.run({data:input},true),/national/);assert.equal(denied.connections,0);
 const missing=fixture();await assert.rejects(missing.run({data:{...input,confirmNewSwimmer:false}},true),/Confirmez/);assert.equal(missing.connections,0);
 await assert.rejects(missing.run({data:{...input,importReview:false}}),/Contexte/);assert.equal(missing.connections,0);
 const invalid=fixture();await assert.rejects(invalid.run({data:{...input,swimmer:{...input.swimmer,licenseNumber:''}}}),/licence/);assert.equal(invalid.connections,0);
 const clean=fixture();const preview=await clean.run({data:input});assert.equal(preview.blocksCreation,false);assert.equal(clean.queries.length,4);assert.equal(clean.writes,0);
 const result=await clean.run({data:input},true);assert.equal(result.swimmer.id,'174');assert.equal(clean.writes,1);assert.equal(clean.completed,true);
 await clean.run({data:input},true);assert.equal(clean.writes,1,'Durable retry uses the same native receipt');
 for(const club of ['106','107']){
  const exact=fixture();exact.exact=[{id:7,nom:'EXEMPLE',prenom:'Test',date:'1980-01-02',sexe:'M',club,number:'A-05-000002'}];
  const p=await exact.run({data:input});assert.equal(p.blocksCreation,true,'Existing identity blocks creation even with another licence or club');
  await assert.rejects(exact.run({data:{...input,confirmAlerts:true}},true),/identite existe/);assert.equal(exact.writes,0);
 }
 const licence=fixture();licence.licence=[{id:7}];await assert.rejects(licence.run({data:input},true),/licence existe/);assert.equal(licence.writes,0);
 const index=fs.readFileSync('functions/index.js','utf8');
 for(const name of ['previewEngagementClubSwimmerCreation','createEngagementClubSwimmer']){
  const body=index.slice(index.indexOf('exports.'+name+' ='),index.indexOf('exports.'+name+' =')+700);
  assert.ok(body.indexOf('importSwimmerCreation')<body.indexOf('engagementClubAccessContext'),'National import branch is authorized separately before the club-only context');
 }
 console.log('Import swimmer creation: national authorization before pool, explicit confirmation, bounded native preview, exact identity/licence blocked, durable one-insert retry; offline only.');
})().catch(e=>{console.error(e);process.exitCode=1;});

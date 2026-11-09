"use strict";
const assert=require('node:assert/strict'),fs=require("./helpers/source-files");
const {service}=require('../functions/nap-import-swimmer-creation');
const input={importReview:true,clubId:'106',creationId:'11111111-1111-4111-8111-111111111111',confirmNewSwimmer:true,swimmer:{firstName:'Test',lastName:'EXEMPLE',birthDate:'1980-01-02',sex:'M',licenseNumber:'A-05-000001'}};
function fixture(){
 const state={queries:[],statements:[],writes:0,connections:0,alerts:[],plan:null,exact:[],similar:[],licence:[]};
 const connection={execute:async({sql,timeout},values=[])=>{
  assert.equal(timeout,10000);state.queries.push(sql);state.statements.push({sql,values});
  if(sql.includes('GET_LOCK'))return [[{acquired:state.busy||state.failIdentityLock&&values[0].startsWith('lp-import-person-')?0:1}]];
  if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
  if(sql.startsWith('SELECT id FROM nageurs'))return [state.licence];
  if(sql.includes(' UNION '))return [state.exact];
  if(sql.includes('nom LIKE'))return [state.similar];
  if(sql.includes('TRIGGERS'))return [[]];
  if(sql.startsWith('EXPLAIN'))return [[{table:'duplicate',key:'livepalmes_license_number_id'},{table:'identity_match',key:state.badIdentityPlan?null:'nageurs_clef'},{table:'cl',key:'PRIMARY'}]];
  if(sql.startsWith('INSERT INTO nageurs')){assert.equal(state.plan.phase,'writing');state.writes++;state.native={id:174,...state.plan.native,creation:state.plan.timestamp};if(state.lostResponse)throw Error('response lost');return [{affectedRows:1,insertId:174}];}
  if(sql.includes('FROM nageurs WHERE id=?'))return [[state.native]];
  throw Error(sql);
 },release(){},destroy(){}};
 state.run=service({authorize:async()=>({uid:'national',national:state.national!==false}),getPool:()=>{state.connections++;return {...connection,getConnection:async()=>connection};},
  formatAlert:(match,type,clubId)=>({type:type||(match.clubId===clubId?'duplicate':'club-change'),name:!type&&state.exactLabel||match.name,swimmerId:match.id}),
  audit:()=>({read:async()=>state.plan,prepare:async(_,p)=>{state.plan=structuredClone(p);},checkpoint:async(_,p)=>{state.plan=structuredClone(p);},complete:async()=>{if(state.failComplete)throw Error('journal failure');state.completed=true;}})});
 return state;
}
(async()=>{
 const denied=fixture();denied.national=false;await assert.rejects(denied.run({data:input},true),/national/);assert.equal(denied.connections,0);
 const missing=fixture();await assert.rejects(missing.run({data:{...input,confirmNewSwimmer:false}},true),/Confirmez/);assert.equal(missing.connections,0);
 await assert.rejects(missing.run({data:{...input,importReview:false}}),/Contexte/);assert.equal(missing.connections,0);
 const invalid=fixture();await assert.rejects(invalid.run({data:{...input,swimmer:{...input.swimmer,licenseNumber:'invalide'}}}),/licence/);assert.equal(invalid.connections,0);
 const clean=fixture();const preview=await clean.run({data:input});assert.equal(preview.blocksCreation,false);assert.equal(clean.queries.length,4);assert.equal(clean.writes,0);
 const result=await clean.run({data:input},true);assert.equal(result.swimmer.id,'174');assert.equal(clean.writes,1);assert.equal(clean.completed,true);
 await clean.run({data:input},true);assert.equal(clean.writes,1,'Durable retry uses the same native receipt');
 const unlicensed={...input,swimmer:{...input.swimmer,licenseNumber:''}},without=fixture();
 without.licence=[{id:88}];
 const unlicensedPreview=await without.run({data:unlicensed});assert.equal(unlicensedPreview.blocksCreation,false);assert.equal(unlicensedPreview.sqlBudget.queriesMax,3);assert.equal(without.queries.length,3);assert.equal(without.queries.some(sql=>sql.startsWith('SELECT id FROM nageurs')),false,'No search for an empty licence');
 const start=without.queries.length,created=await without.run({data:unlicensed},true);assert.equal(created.swimmer.licenseNumber,'');assert.equal(created.swimmer.licenseSeasonStatus,'to_check');assert.equal(without.queries.length-start,9);assert.equal(without.writes,1);
 const insert=without.statements.find(s=>s.sql.startsWith('INSERT INTO nageurs'));assert.match(insert.sql,/identity_match FORCE INDEX \(nageurs_clef\)/);assert.equal(insert.sql.includes('livepalmes_license_number_id'),false,'Existing empty licences must not block another identity');assert.equal(insert.sql.match(/\?/g).length,insert.values.length);
 await without.run({data:unlicensed},true);assert.equal(without.writes,1);
 const identityLock=s=>s.statements.find(q=>q.sql.includes('GET_LOCK')&&q.values[0].startsWith('lp-import-person-')).values[0];
 const different=fixture();await different.run({data:{...unlicensed,swimmer:{...unlicensed.swimmer,birthDate:'1981-01-02'}}},true);assert.notEqual(identityLock(without),identityLock(different),'Independent unlicensed identities do not share an empty-number lock');
 const reversed=fixture();await reversed.run({data:{...unlicensed,swimmer:{...unlicensed.swimmer,firstName:unlicensed.swimmer.lastName,lastName:unlicensed.swimmer.firstName}}},true);assert.equal(identityLock(without),identityLock(reversed),'Inverted identities share the import identity lock');
 assert.equal(identityLock(without),identityLock(clean),'Licensed and unlicensed import creations protect the same identity');
 for(const tweak of [s=>s.busy=true,s=>s.badIdentityPlan=true]){const blocked=fixture();tweak(blocked);await assert.rejects(blocked.run({data:unlicensed},true));assert.equal(blocked.writes,0);}
 const partialLock=fixture();partialLock.failIdentityLock=true;await assert.rejects(partialLock.run({data:input},true));assert.equal(partialLock.writes,0);assert.equal(partialLock.statements.filter(s=>s.sql.includes('RELEASE_LOCK')).length,1,'Failure to acquire identity lock releases the licence lock');
 const uncertain=fixture();uncertain.lostResponse=true;await assert.rejects(uncertain.run({data:unlicensed},true),/response lost/);await assert.rejects(uncertain.run({data:unlicensed},true),/identifiant non confirme/);assert.equal(uncertain.writes,1);
 const completion=fixture();completion.failComplete=true;await assert.rejects(completion.run({data:unlicensed},true),/journal failure/);completion.failComplete=false;await completion.run({data:unlicensed},true);assert.equal(completion.writes,1);
 for(const club of ['106','107']){
  const exact=fixture();exact.exact=[{id:7,nom:'EXEMPLE',prenom:'Test',date:'1980-01-02',sexe:'M',club,number:'A-05-000002'}];
  const p=await exact.run({data:input});assert.equal(p.blocksCreation,true,'Existing identity blocks creation even with another licence or club');
  await assert.rejects(exact.run({data:{...input,confirmAlerts:true}},true),/identite existe/);assert.equal(exact.writes,0);
  await assert.rejects(exact.run({data:{...unlicensed,confirmAlerts:true}},true),/identite existe/);assert.equal(exact.writes,0);
 }
 const licence=fixture();licence.licence=[{id:7}];await assert.rejects(licence.run({data:input},true),/licence existe/);assert.equal(licence.writes,0);
 const many=fixture();many.exactLabel='ZZZ exact';many.exact=[{id:7,nom:'EXEMPLE',prenom:'Test',date:'1980-01-02',sexe:'M',club:'106'}];many.similar=Array.from({length:8},(_,i)=>({id:20+i,nom:'EXEMPLE',prenom:'Test'+i,date:'1980-04-03',sexe:'M',club:'106'}));
 const hiddenExact=await many.run({data:unlicensed});assert.equal(hiddenExact.alerts.length,8);assert.ok(hiddenExact.alerts.every(a=>a.type==='possible-duplicate'));assert.equal(hiddenExact.blocksCreation,true,'An exact identity still blocks when bounded displayed alerts omit it');
 const index=fs.readFileSync('functions/index.js','utf8');
 for(const name of ['previewEngagementClubSwimmerCreation','createEngagementClubSwimmer']){
  const body=index.slice(index.indexOf('exports.'+name+' ='),index.indexOf('exports.'+name+' =')+700);
  assert.ok(body.indexOf('importSwimmerCreation')<body.indexOf('engagementClubAccessContext'),'National import branch is authorized separately before the club-only context');
 }
 console.log('Import swimmer creation: optional licence in national import only, bounded identity checks/locks and indexed insert, exact duplicates refused, one-insert retry and uncertain-receipt refusal; offline only.');
})().catch(e=>{console.error(e);process.exitCode=1;});

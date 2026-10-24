"use strict";
// Compatibility of the retained service boundary, not equivalence of the new
// manual TXT renderer with automatic attachments. Automatic behaviour is retained.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const acorn=require('./firestore-rules/node_modules/acorn');
const contract=require('../.github/releases/evidence/20261024-grouped-backend-contract.json');
const {guardFixtures}=require('./release-home-retained-compatibility');
const clean=x=>JSON.parse(JSON.stringify(x));
function tree(code,omitAudit=false){
 const ast=acorn.parse(code,{ecmaVersion:'latest'});
 function walk(n){if(!n||typeof n!=='object')return;
  // Only the added pointer in an otherwise exact completion receipt is ignored.
  if(omitAudit&&n.type==='ObjectExpression'&&n.properties.length===2&&n.properties[0].type==='SpreadElement'&&n.properties[0].argument.name==='target'&&n.properties[1].key?.name==='auditPreparationId'){
   for(const k of Object.keys(n))delete n[k];Object.assign(n,{type:'Identifier',name:'target'});return;
  }
  for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);
 }walk(ast);
 return JSON.stringify(ast,(k,v)=>['start','end','raw'].includes(k)?undefined:v);
}
async function prove({base,candidate,rows,source,definitions,loader}){
 assert.equal(base,contract.productionCommit);assert.equal(candidate,contract.candidate);
 const expected=contract.retained.filter(r=>r.newVsApplicationBase).map(({name,commit})=>({name,commit})).sort((a,b)=>a.name.localeCompare(b.name));
 assert.deepEqual(rows,expected,'Exact four retained consumers and actual provenance required');
 // Request handlers, scheduler callbacks, transport, controls, selectors, worker
 // job states and data adapters remain exact, apart from optional audit pointers.
 const defsBefore=definitions(base),defsAfter=definitions(candidate);
 for(const name of [...expected.map(r=>r.name),'createClubFromEngagementAccessRequest','nativeNotificationAutomationServices',
  'sendEngagementMailJob','prepareEngagementTxtEmailJob','engagementClosureAutomationContext','reserveEngagementCompetitionClosure',
  'processEngagementCompetitionAutomaticClosure','buildEngagementCompetitionTxt','engagementCompetitionNotificationRecipients',
  'engagementCompetitionOpeningRecipients','engagementCompetitionDocumentRecipients']){
  assert.ok(defsBefore.has(name)&&defsAfter.has(name),'Missing retained declaration '+name);
  assert.equal(tree(defsBefore.get(name),true),tree(defsAfter.get(name),true),'Retained boundary changed: '+name);
 }
 for(const file of ['engagement-mail-control.js','nap-notification-automation.js','nap-notification-preview.js',
  'nap-swimmer-change-requests.js','nap-portal-swimmer-change.js','nap-club-access-request.js','nap-portal-competitions.js'])
  assert.equal(source(base,'functions/'+file),source(candidate,'functions/'+file),'Retained adapter changed '+file);
 // Exercise actual retained/candidate access and correction authority, replay,
 // stale-request refusal and preferences with no network-capable dependency.
 for(const [kind,origin] of [['access',expected.find(r=>r.name==='resolveEngagementAccessRequest').commit],
  ['identity',expected.find(r=>r.name==='resolveEngagementSwimmerChangeRequest').commit]]){
  const traces=[];for(const commit of [...new Set([base,candidate,origin])])traces.push(await guardFixtures({commit,definitions,loader,source,kind}));
  for(const t of traces)assert.deepEqual(t,traces[0]);
 }
 const journal=loader(candidate)('functions/activity-journal.js');
 for(const [action,prefix,complete,wrapped] of journal.RULES){
  const operation='a'.repeat(64),actorUid='fixture',prep={id:`${prefix}-${operation}-before`,action,actorUid,createdAt:'2026-10-24T10:00:00Z',target:{operation,before:{id:12,nom:'FIXTURE',actif:1},after:{id:12,nom:'FIXTURE',actif:0}}};
  const info=journal.preparation(prep);assert.ok(info);
  const event=wrapped?`${prefix}-${operation}-complete`:operation;
  assert.equal(info.receiptId,crypto.createHash('sha256').update(`${complete}|${event}`).digest('hex').slice(0,40));
  const receipt={id:info.receiptId,action:complete,actorUid,createdAt:'2026-10-24T10:01:00Z',target:{id:12}};
  const page=await journal.projectPage([prep],async ids=>{assert.deepEqual(clean(ids),[receipt.id]);return [receipt];});
  assert.equal(page.logs.length,1);assert.equal(page.logs[0].outcome,'completed');assert.equal(page.logs[0].target.before.active,true);
  const raw=await journal.projectPage([receipt],async()=>{throw Error('Legacy receipt must not scan');});
  assert.deepEqual(clean(raw.logs),[receipt]);
 }
 return {suite:'retained-calendar-consumers-v1',productionCommit:base,candidate,result:'success',networkCalls:0,
  passedFunctions:rows.map(r=>r.name).sort(),checks:['pinned-pair-and-origins','retained-boundary-ast','unchanged-automation-adapters',
   'authority-and-replay-fixtures','legacy-journal-receipts','automatic-txt-kept-at-production-version']};
}
module.exports={prove};

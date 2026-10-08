"use strict";
const assert=require('node:assert/strict');
const {relayPreview}=require('../functions/nap-qualification-relay-preview');
const {prepare}=require('../functions/nap-qualification-preview-store');
const rules={enabled:true,groups:[{categories:['S'],mode:'each',startDate:'2025-01-01',endDate:'2026-12-31',pools:['50'],competitionMode:'all'}],standards:{'S|M|50BI':2500,'S|F|50BI':2500}};
const input={national:true,competitionId:5162,cursor:'',enabled:true,rules,date:'2026-11-07',events:[{type:'individual',code:'50BI',categories:['S']}]};
function fixture({known=true,empty=false,approved=false,lookahead=false}={}){
 let queries=0,histories=0;
 const headers=Array.from({length:lookahead?3:2},(_,i)=>({id:i+1,compet:5162,categorie:1,club:106,course:10,tps:'000315'}));
 const connection={execute:async(statement,values)=>{queries++;assert.match(statement.sql,/^SELECT/);if(statement.sql.includes('FROM engagements_relais')){assert.match(statement.sql,/LIMIT 3$/);assert.deepEqual(values,[5162]);return [headers];}
 if(statement.sql.includes('FROM engagements_relayeurs'))return [empty?[]:[{id:11,relais:1,pos:1,nageur:912}]];
 if(statement.sql.includes('FROM nageurs n'))return [[{id:912,nom:'Test',prenom:'Nageur',date:'1990-01-01',sexe:'M',club:'00106',inscription_id:100}]];
 if(statement.sql.includes('FROM engagements '))return [[{id:44,engagement:100,course:'50BI',tps:'002400'}]];
 if(statement.sql.includes('FROM livepalmes_qualification_grants'))return [approved?[{competition_id:5162,swimmer_id:912,club_id:'00106',event_code:'50BI',status:'accepted',version:'1'}]:[]];
 throw Error('Unexpected query');}};
 const services={categoryFor:()=> 'S',readHistory:async()=>{histories++;return new Map([['912',known?[{competitionId:'5140',course:'50BI',timeValue:2400,date:'2026-01-01',pool:'50',chrono:'E'}]:[]]]);}};
 return {connection,services,counts:()=>({queries,histories})};
}
async function main(){
 const known=fixture();let page=await relayPreview(known.connection,input,known.services);assert.equal(page.items[0].remove,false,'INT relay club matches the VARCHAR swimmer club including leading zeros');assert.equal(page.items[1].remove,false,'An empty relay composition stays allowed');assert.deepEqual(known.counts(),{queries:5,histories:1});
 const absent=fixture({known:false});page=await relayPreview(absent.connection,input,absent.services);assert.equal(page.items[0].remove,true);
 const grant=fixture({known:false,approved:true});assert.equal((await relayPreview(grant.connection,input,grant.services)).items[0].remove,true,'A national exception alone is not a qualified relay anchor');
 const empty=fixture({empty:true});assert.equal((await relayPreview(empty.connection,input,empty.services)).items[0].remove,false);assert.equal(empty.counts().histories,0);
 const disabled=fixture({known:false});assert.equal((await relayPreview(disabled.connection,{...input,enabled:false},disabled.services)).items[0].remove,false);assert.equal(disabled.counts().histories,0);
 const next=fixture({lookahead:true});page=await relayPreview(next.connection,input,next.services);assert.equal(page.finished,false);assert.equal(page.items.length,2);assert.deepEqual(JSON.parse(page.cursor),{clubId:'106',relayId:2});
 const previous={id:'a'.repeat(64),competition_id:5162,state:'preview',version:'1',cursor:'',payload:{count:0,applyStarted:false}};
 const scope={jobId:previous.id,competitionId:5162,national:true,actorUid:'national',now:'2026-10-08 20:00:00.000000',previous,includeRelays:true};
 const individual=prepare(scope,{items:[],finished:true,cursor:''});assert.equal(individual.nextState,'preview');assert.equal(individual.nextPayload.phase,'relay','Do not ask for confirmation before checking relays');
 const relay=prepare({...scope,previous:{...previous,payload:individual.nextPayload}},await relayPreview(absent.connection,input,absent.services));assert.equal(relay.nextState,'ready');assert.equal(relay.nextPayload.count,1);assert.notEqual(relay.id,individual.id,'Individual and relay pages have distinct immutable ids');
 const denied=fixture();await assert.rejects(relayPreview(denied.connection,{...input,national:false},denied.services));assert.equal(denied.counts().queries,0);
 console.log('NAP relay qualifications: grouped fresh proofs, existing qualified-anchor rule, deferred compositions, numeric club linkage, pagination and confirmation only after both phases; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

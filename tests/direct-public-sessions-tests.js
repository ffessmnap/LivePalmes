'use strict';
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),courses=require('../functions/nap-direct-public-courses'),sessions=require('../assets/direct/sessions'),ui=require('../assets/direct/presentation');
const context={window:{LivePalmesDirectPresentation:ui}};require('node:vm').runInNewContext(require('node:fs').readFileSync(require.resolve('../assets/direct/event-view'),'utf8'),context);const view=context.window.LivePalmesDirectEventView;
context.window.LivePalmesDirectSessions=sessions;
require('node:vm').runInNewContext(require('node:fs').readFileSync(require.resolve('../assets/direct/public-club-view'),'utf8'),context);
const clubView=context.window.LivePalmesDirectClubView;
const {fixture}=require('./helpers/direct-console-sql-fixture'),{createStore}=require('./helpers/direct-test-clock').storeModule,{readPublic}=require('./helpers/direct-test-clock').publicModule;
function event(session,heat,extra={}){return {id:String(session).repeat(64),eventCode:'1500sf',eventLabel:'1500 m Surface',sex:'F',phase:'meilleure-serie',date:'2026-05-22',sessionKey:String(session),sessionLabel:'Session '+session,order:session,expectedSeries:2,heatSchedule:[{number:heat,scheduledAt:session===1?'10:40':'18:40'}],publication:{series:true,results:false},progress:{entries:1,seriesEntries:1,seriesCount:1,resultEntries:0,matchedResults:0,completeSeriesCount:0,unassignedResults:0},...extra};}
async function main(){
  const slow=event(1,1),fast=event(2,2),done=e=>({...e,publication:{series:true,results:true},progress:{...e.progress,resultEntries:1,matchedResults:1,completeSeriesCount:1}}),partial={...done(fast),progress:{...fast.progress,seriesEntries:2,resultEntries:1,matchedResults:1}};
  assert.deepEqual(courses.sourceEvents([fast,slow],slow).map(e=>e.id),[slow.id,fast.id]);
  assert.equal(courses.choose([fast,slow]).id,slow.id);assert.equal(courses.choose([done(slow),fast]).id,slow.id);assert.equal(courses.choose([done(slow),done(fast)]).id,fast.id);
  assert.equal(courses.choose([partial,done(slow)]).id,fast.id);assert.equal(courses.sessionState(done(slow)),'complete','La série lente est terminée dans son créneau');
  assert.equal(ui.status(courses.course(done(slow),[done(slow),fast])).key,'ongoing','Le classement commun attend toujours la série rapide');assert.equal(ui.status(courses.course(done(fast),[done(slow),done(fast)])).key,'complete');
  for(const changed of [event(2,1),event(2,2,{expectedSeries:3}),event(2,2,{phase:'finale-A'}),event(2,2,{sex:'M'}),event(2,2,{eventCode:'1500sf-mi'}),event(2,2,{heatSchedule:[]})])assert.equal(courses.sourceEvents([slow,changed],slow).length,1,'Aucun regroupement ambigu, finale, sexe ou catégorie d’épreuve différent');
  const independent=event(2,2,{heatSchedule:[{number:1},{number:2}]});assert.equal(courses.sourceEvents([slow,independent],slow).length,1,'Une course autonome complète reste séparée');
  for(const list of [[slow,fast],[done(slow),fast],[done(slow),done(fast)],[done(slow),partial]])assert.equal(sessions.choose(list.map(e=>({...e,sessionState:courses.sessionState(e)}))).id,courses.choose(list).id,'Choix navigateur et serveur cohérents');
  const pool=fixture(),id=910001,actor={uid:'fixture',national:true},store=createStore(pool,'test');await store.settings(id,actor,{consoles:['computer'],operationKey:randomUUID()});
  // Calendar fixture dates are November; keep the PDF’s session structure and times.
  async function add(kind,session,name,time){const meet={...event(session,session),date:'2026-11-07'},group={kind,seriesNumber:session,event:meet,rows:[{lastName:name,firstName:'Exemple',birthYear:2005,club:'TEST',category:'FSE',series:session,lane:1,entryTime:'595999',...(kind==='results'?{resultTime:time}:{})}],operationKey:randomUUID()},draft={groups:[group]},preview=await store.previewBatch(id,draft);await store.publishBatch(id,actor,{...draft,fingerprint:preview.fingerprint,confirmReplacement:true});}
  await add('series',1,'LENTE');await add('series',2,'RAPIDE');let result=await readPublic(pool,'test',{id});assert.equal(result.events.length,2);assert.equal(result.entries.length,2);assert.equal(result.course.heatSchedule[1].scheduledAt,'18:40');assert.equal(result.course.sourceEventIds.length,2);assert.equal(result.course.publication.results,false);
  await add('results',1,'LENTE','16:00.00');result=await readPublic(pool,'test',{id});assert.equal(result.events.find(e=>e.id===result.selectedEventId).sessionKey,'1');assert.equal(ui.status(result.course,result.entries).key,'ongoing');
  await add('results',2,'RAPIDE','15:00.00');const before=pool.calls.length;const requests=await Promise.all(Array.from({length:400},()=>readPublic(pool,'test',{id})));result=requests[0];assert.equal(result.events.find(e=>e.id===result.selectedEventId).sessionKey,'2');assert.equal(ui.status(result.course,result.entries).key,'complete');
  assert.equal(pool.calls.slice(before).filter(c=>c.sql.startsWith('SELECT * FROM livepalmes_direct_entries')).length,1,'400 ouvertures partagent une seule lecture de participations');const selection=pool.calls.slice(before).find(c=>c.sql.startsWith('SELECT * FROM livepalmes_direct_entries'));assert.match(selection.sql,/event_id IN \(\?,\?\)/);assert.match(selection.sql,/LIMIT 1001/);
  assert.deepEqual(view.rankings(result.entries).sort((a,b)=>a.rank-b.rank).map(row=>[row.lastName,row.rank]),[['RAPIDE',1],['LENTE',2]],'Classement calculé sur les deux sessions');
  for(const source of result.events){const selected=await readPublic(pool,'test',{id,eventId:source.id});assert.equal(selected.entries.length,2);assert.equal(selected.selectedEventId,source.id);}
  const programme=await readPublic(pool,'test',{id,view:'club'});assert.deepEqual(programme.rankingGroups,[result.course.sourceEventIds],'Fiche nageur : même classement commun, créneau de participation conservé');
  const clubProgram=clubView.program(programme,'TEST',sessions.key(programme.events.find(e=>e.sessionKey==='1')));
  assert.equal(clubProgram.swimmers.length,1);assert.equal(clubProgram.swimmers[0].rows[0].row.rank,2,'Filtrer la session conserve le classement commun');
  const e1={...event(1,1),publication:{series:true,results:true}},e2={...event(2,2),publication:{series:true,results:false}};
  const sample={events:[e1,e2],rankingGroups:[[e1.id],[e2.id]],entries:[
    {eventId:e1.id,key:'other',kind:'individual',club:'OTHER',lastName:'Autre',result:{cs:6500}},
    {eventId:e1.id,key:'one',kind:'individual',club:'TEST',lastName:'Nom',result:{cs:7000}},
    {eventId:e1.id,key:'two',kind:'individual',club:'TEST',lastName:'Nom',result:{status:'dsq'}},
    {eventId:e2.id,key:'one',kind:'individual',club:'TEST',lastName:'Nom',seed:{cs:7000},result:{}},
    {eventId:e2.id,key:'relay',kind:'relay',club:'TEST',lastName:'Équipe 1',members:[{lastName:'Nom'}],result:{}}
  ]};
  const compact=clubView.program(sample,'TEST');assert.equal(compact.swimmers.length,2,'Homonymes identifiés par leur clé');assert.equal(compact.relays.length,1);assert.equal(compact.swimmers.find(group=>group.person.key==='one').rows.length,2);assert.equal(compact.swimmers.find(group=>group.person.key==='one').rows[0].row.rank,2,'Place calculée avant le filtre club');
  const compactHtml=clubView.render(sample,'TEST','all');assert.ok(compactHtml.includes('En attente'));assert.ok(compactHtml.includes('Relayeurs'));assert.ok(compactHtml.includes('DSQ'));assert.ok(clubView.render(sample,'ABSENT','all').includes('Aucune participation'));
  const preserved=JSON.stringify(pool.inspect());await readPublic(pool,'test',{id});assert.equal(JSON.stringify(pool.inspect()),preserved,'Consultation sans écriture ni changement d’identifiant WinPalme');
  await add('series',2,'LENTE');const ambiguous=await readPublic(pool,'test',{id,eventId:result.events[0].id});assert.ok(ambiguous.course.groupingWarning);assert.equal(ambiguous.course.sourceEventIds,undefined);assert.ok(ambiguous.entries.every(row=>row.eventId===ambiguous.selectedEventId),'Pas de faux classement en cas de participant dupliqué');
  console.log('Sessions publiques : départ/avancement, séries lentes/rapides, horaires, finales distinctes, scratch commun, 400 ouvertures, fiches nageurs et repli sans écriture vérifiés.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

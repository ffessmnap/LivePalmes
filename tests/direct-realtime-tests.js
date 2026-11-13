'use strict';
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createRelay}=require('../functions/nap-direct-realtime');
function database(){
  const docs=new Map(),writes=[],reads=[];let fail=false,tail=Promise.resolve();
  return {docs,writes,reads,fail(value){fail=value;},doc:path=>({path}),runTransaction(fn){const job=tail.then(async()=>{if(fail)throw Error('Firestore coupé');const pending=[];const result=await fn({get:async ref=>{reads.push(ref.path);return {exists:docs.has(ref.path),data:()=>structuredClone(docs.get(ref.path))};},set:(ref,value)=>pending.push([ref.path,structuredClone(value)])});for(const [key,value] of pending){docs.set(key,value);writes.push({key,value});}return result;});tail=job.catch(()=>{});return job;}};
}
async function main(){
  let now=1000000;const db=database(),relay=createRelay({db,environment:'test',clock:()=>now}),head={configVersion:3,revision:1},id=900001;
  await relay.publish({id,head});assert.equal(db.writes.length,0,'Aucun document de signal sans console abonnée');
  const ticket=await relay.subscribe({id,uid:'user',head});assert.equal(ticket.path,'livepalmesDirectSignals/test-900001/signal/current');assert.ok(ticket.leaseExpiresAt>now);
  const path=ticket.path,first=db.writes.length;await relay.publish({id,head});assert.equal(db.writes.length,first,'Une version déjà livrée ne produit aucune écriture');
  await Promise.all([relay.publish({id,head:{configVersion:3,revision:5}}),relay.publish({id,head:{configVersion:3,revision:2}})]);assert.equal(db.docs.get(path).version.workflow,5,'Un signal tardif ne régresse pas');
  await relay.publish({id,head:{configVersion:4,revision:0}});assert.deepEqual(db.docs.get(path).version,{config:4,workflow:0},'La réinitialisation versionnée reste diffusable');assert.deepEqual(Object.keys(db.docs.get(path)).sort(),['updatedAt','version']);
  const second=await relay.subscribe({id:id+1,uid:'user',head});assert.notEqual(second.path,path);const otherBefore=structuredClone(db.docs.get(second.path));await relay.publish({id,head:{configVersion:4,revision:1}});assert.deepEqual(db.docs.get(second.path),otherBefore,'Compétitions isolées');
  const prod=createRelay({db,environment:'production',clock:()=>now});assert.notEqual((await prod.subscribe({id,uid:'user',head})).path,path,'Environnements isolés');
  await relay.subscribe({id,uid:'constructor',head:{configVersion:4,revision:1}});assert.ok(Object.hasOwn(db.docs.get('livepalmesDirectSignals/test-900001/private/access').members,'constructor'));
  await relay.revoke({id,uid:'user'});assert.equal(db.docs.get('livepalmesDirectSignals/test-900001/private/access').members.user,undefined);await relay.revoke({id});const beforeExpiry=db.writes.length;await relay.publish({id,head:{configVersion:4,revision:2}});assert.equal(db.writes.length,beforeExpiry,'Une compétition sans membre ne diffuse plus');
  await relay.subscribe({id,uid:'user',head:{configVersion:4,revision:2}});now+=300001;const before=db.writes.length;await relay.publish({id,head:{configVersion:4,revision:3}});assert.equal(db.writes.length,before,'Les autorisations expirées ne sont pas réveillées');
  await serviceChecks();
  console.log('Temps réel serveur : publication après commit, reprise depuis NAP, panne sans double décision, ordre/versions, expiration, révocation et séparation des compétitions/environnements vérifiés.');
}
async function serviceChecks(){
  const {fixture}=require('./helpers/direct-console-sql-fixture'),{createStore}=require('./helpers/direct-test-clock').storeModule,{createService}=require('./helpers/direct-test-clock').serviceModule;
  const pool=fixture(),store=createStore(pool,'test'),actor={uid:'root',national:true},id=900001;await store.settings(id,actor,{consoles:['computer','referee','speaker'],operationKey:randomUUID()});
  const group={kind:'series',event:{eventCode:'100sf',eventLabel:'100 m Surface',sex:'M',date:'2026-11-07',sessionKey:'1',expectedSeries:1},rows:[{lastName:'FICTIF',firstName:'Test',club:'CLUB',category:'HSE',birthYear:2000,series:1,lane:1,entryTime:'595999'}],operationKey:randomUUID()};const batch={groups:[group]},preview=await store.previewBatch(id,batch);await store.publishBatch(id,actor,{...batch,fingerprint:preview.fingerprint});
  const db=database(),relay=createRelay({db,environment:'test'});let signals=0,broken=false;
  const proxy={...relay,publish:async input=>{signals++;assert.ok(pool.inspect().logs.some(r=>r.action==='console-state')||input.head.revision===0,'Le journal NAP est déjà enregistré');if(broken)throw Error('Signal indisponible');return relay.publish(input);}};
  const service=createService({getPool:()=>pool,environment:'test',authorize:async req=>({uid:req.auth.uid,national:req.auth.uid==='root'}),matchRegion:()=>false,realtime:proxy,onRealtimeError:()=>{throw Error('Observabilité indisponible');}});
  const call=(action,data={},uid='root')=>service({auth:{uid},data:{action,competitionId:id,...data}});
  await assert.rejects(call('consoleSubscribe',{role:'referee'},'public'),e=>e.directCode==='permission-denied');assert.equal(db.writes.length,0);
  await call('consoleSubscribe',{role:'referee'});let state=await call('consoleSnapshot',{role:'referee'});const eventId=state.selectedEventId;
  const request={role:'referee',eventId,command:'progress',series:1,revision:state.revision,configVersion:state.configVersion,operationKey:randomUUID()};
  broken=true;const saved=await call('consoleCommand',request);assert.equal(saved.ok,true,'La décision validée reste un succès malgré la panne du signal/log');
  const replay=await call('consoleCommand',request);assert.equal(replay.replayed,true);assert.equal(replay.revision,saved.revision);
  broken=false;state=await call('consoleSnapshot',{role:'referee'});assert.equal(db.docs.get('livepalmesDirectSignals/test-900001/signal/current').version.workflow,state.revision,'Le contrôle autorisé rediffuse la version NAP manquée');
  const before=signals;pool.failJournal(true);await assert.rejects(call('consoleCommand',{...request,series:2,revision:state.revision,operationKey:randomUUID()}));pool.failJournal(false);assert.equal(signals,before,'Aucun signal pour une transaction annulée');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

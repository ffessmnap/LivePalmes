'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function main(){
  let uid='u1',serial=0,snapshotCallback,errorCallback,detached=0,calls=0,wakes=0,fail=false;
  const timers=new Map(),events=new Map(),docEvents=new Map(),modes=[];
  const document={hidden:false,addEventListener:(name,fn)=>docEvents.set(name,fn),removeEventListener:name=>docEvents.delete(name)};
  const window={navigator:{onLine:true},addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),firebase:{firestore:()=>({doc:path=>{assert.equal(path,'livepalmesDirectSignals/test-900001/signal/current');return {onSnapshot(options,next,error){assert.equal(options.includeMetadataChanges,true);snapshotCallback=next;errorCallback=error;return ()=>{detached++;};}};}})}};
  const context={window,document,Number,JSON,setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync('assets/direct/realtime.js','utf8'),context);
  const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  const call=async(action,input)=>{assert.equal(action,'consoleSubscribe');assert.equal(input.role,'referee');calls++;if(fail)throw Error('Réseau perdu');return {path:'livepalmesDirectSignals/test-900001/signal/current',renewAfterMs:180000};};
  const create=()=>window.LivePalmesDirectRealtime.create({competitionId:900001,role:'referee',getUser:()=>uid?{uid}:null,call,onWake:()=>wakes++,onMode:mode=>modes.push(mode)});
  const client=create();await flush();assert.equal(calls,1);assert.equal(timers.size,1);
  const emit=(config,workflow,fromCache=false)=>snapshotCallback({exists:true,metadata:{fromCache},data:()=>({version:{config,workflow}})});
  emit(1,1,true);assert.equal(wakes,0,'Le cache local ne confirme pas une réception distante');emit(1,1);assert.equal(wakes,1);assert.equal(modes.at(-1),'live');emit(1,1);emit(1,0);assert.equal(wakes,1,'Doublons et versions anciennes ignorés');emit(1,2);assert.equal(wakes,2);emit(2,0);assert.equal(wakes,3,'Reset de workflow accepté avec nouvelle configuration');
  const stale=snapshotCallback;document.hidden=true;docEvents.get('visibilitychange')();assert.equal(timers.size,0);assert.equal(detached,1);stale({exists:true,metadata:{fromCache:false},data:()=>({version:{config:2,workflow:4}})});assert.equal(wakes,3,'Un callback déjà en vol ne réactive pas un onglet masqué');
  document.hidden=false;docEvents.get('visibilitychange')();await flush();assert.equal(calls,2);assert.equal(wakes,4,'Retour visible relu immédiatement');
  window.navigator.onLine=false;events.get('offline')();assert.equal(timers.size,0);assert.equal(modes.at(-1),'poll');window.navigator.onLine=true;events.get('online')();await flush();assert.equal(calls,3);assert.equal(wakes,5);
  fail=true;errorCallback(Error('Permission indisponible'));assert.equal(modes.at(-1),'poll');const retry=[...timers.values()][0];assert.equal(retry.ms,1000);timers.clear();await retry.fn();await flush();assert.ok([...timers.values()].some(t=>t.ms===2000),'Reconnexion progressive, sans boucle rapide');
  fail=false;client.stop();assert.equal(timers.size,0);assert.equal(events.size,0);assert.equal(docEvents.size,0);const before=wakes;emit(5,5);assert.equal(wakes,before,'Aucun signal après fermeture');
  const other=create();await flush();const late=snapshotCallback;uid='u2';late({exists:true,metadata:{fromCache:false},data:()=>({version:{config:8,workflow:1}})});assert.equal(wakes,before,'Aucune donnée de l’ancien compte');other.stop();
  await integration();console.log('Temps réel client : un abonnement, versions ordonnées, repli, reconnexion, brouillon/action en cours, onglet masqué, changement de compte et destruction vérifiés.');
}
async function integration(){
  let wake,mode,uid='one',snapshots=0,resolver,live=false;const timers=new Map();let serial=0;
  const window={LivePalmesEnvironment:{},LivePalmesDirectRealtime:{create(options){wake=options.onWake;mode=options.onMode;return {stop(){live=false;}};}}};
  const context={window,document:{hidden:false},URL,AbortSignal,crypto:{randomUUID:()=>String(++serial)},setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync('assets/direct/console-client.js','utf8'),context);
  const response=revision=>({revision,configVersion:2,events:[],selectedEventId:null});
  const client=window.LivePalmesDirectConsoleClient.create({competitionId:900001,getUser:()=>({uid}),call:async action=>{if(action==='consoleSnapshot'){snapshots++;if(live)return new Promise(resolve=>resolver=resolve);return response(snapshots);}return {ok:true};}});
  await client.load();assert.equal(snapshots,1);mode('live');assert.ok([...timers.values()].some(t=>t.ms===60000),'Secours allégé en temps réel confirmé');wake({config:2,workflow:1});assert.equal(snapshots,1,'Le premier signal déjà chargé ne relit pas NAP');
  client.state.dirty=true;live=true;wake({config:2,workflow:2});assert.equal(snapshots,2,'Une saisie ne bloque pas la réception');wake({config:2,workflow:3});wake({config:2,workflow:4});assert.equal(snapshots,2,'Les signaux simultanés sont regroupés');
  live=false;resolver(response(4));for(let i=0;i<10;i++)await Promise.resolve();assert.ok(snapshots<=3);assert.equal(client.state.dirty,true,'Le brouillon est conservé');
  mode('poll');assert.ok([...timers.values()].some(t=>t.ms===15000));client.stop();assert.equal(timers.size,0);const old=snapshots;wake({config:3,workflow:1});assert.equal(snapshots,old);client.reset();uid='two';await client.load();client.stop();
}
main().catch(error=>{console.error(error);process.exitCode=1;});

"use strict";
const assert=require("node:assert/strict");
const reports=require("../functions/engagement-license-reports");
const season=require("../functions/nap-license-state").seasonInfo("2026-2027");
const batch={season,competitions:[{id:"1",name:"Coupe <test>"},{id:"2",name:"Meeting"}],people:[
  {livePalmesId:"10",firstName:"Camille",lastName:"EXEMPLE",birthDate:"2000-01-01",clubId:"6",clubName:"Club A",licenseNumber:"A-26-10",seasonStatus:"valid",validatedAt:"2026-10-01T12:00:00Z",competitionIds:["1","2"]},
  {livePalmesId:"11",firstName:"Léa",lastName:"EXPIREE",birthDate:"2001-01-01",clubId:"6",clubName:"Club A",licenseNumber:"A-26-11",seasonStatus:"to_check",competitionIds:["1"]},
  {livePalmesId:"12",firstName:"Hugo",lastName:"ABSENT",birthDate:"2002-01-01",clubId:"7",clubName:"Club B",licenseNumber:"A-26-12",seasonStatus:"to_check",competitionIds:["1"]}
]};
function database(){
  const data=new Map();let reads=0,writes=0;
  const snapshot=ref=>{reads++;return {data:()=>structuredClone(data.get(ref.path))};};
  const db={data,get reads(){return reads;},get writes(){return writes;},collection:name=>({doc:key=>{const ref={path:name+"/"+key,get:async()=>snapshot(ref)};return ref;}}),getAll:async(...refs)=>refs.map(snapshot),runTransaction:async fn=>{
    const changes=[];const tx={get:async ref=>snapshot(ref),getAll:async(...refs)=>refs.map(snapshot),set:(ref,value,options)=>changes.push([ref,value,options])};
    const result=await fn(tx);for(const [ref,value,options]of changes){data.set(ref.path,structuredClone(options?.merge?{...data.get(ref.path),...value}:value));writes++;}return result;
  }};return db;
}
const input={competitionId:"1",expectedMembership:reports.membership(batch,"1"),results:[{id:"11",status:"licence_expiree",licenseNumber:"A-26-11",validity:"2026-12-31"},{id:"12",status:"introuvable",licenseNumber:"A-26-12",validity:""}]};
(async()=>{
  const result=reports.build(batch,input,"national","2026-10-27T10:00:00Z");
  assert.equal(result.status,"issues");assert.deepEqual(result.counts,{total:3,valid:1,expired:1,notFound:1,other:0});
  const good=reports.build(batch,{competitionId:"2",expectedMembership:reports.membership(batch,"2"),results:[]},"national");assert.equal(good.status,"ok");assert.equal(good.people.length,1);
  for(const status of["timeout","erreur","to_check","valid","unknown"]){assert.throws(()=>reports.build(batch,{...input,results:[{...input.results[0],status},input.results[1]]},"national"),/résultat exploitable/);}
  assert.throws(()=>reports.build(batch,{...input,results:[input.results[0]]},"national"),/résultat exploitable/);
  assert.throws(()=>reports.build(batch,{...input,expectedMembership:"stale"},"national"),/changé/);
  assert.throws(()=>reports.build(batch,{...input,results:[...input.results,input.results[0]]},"national"),/dupliqué/);
  assert.throws(()=>reports.build(batch,{...input,results:[...input.results,{id:"99"}]},"national"),/appartient/);
  assert.throws(()=>reports.build(batch,{...input,results:[{...input.results[0],validity:"2027-12-31"},input.results[1]]},"national"),/expiration/);
  const directory=[{uid:"a",email:"ONE@example.org",regionId:"Centre",capabilities:["engagements.region.manage"]},{uid:"b",email:"two@example.org",regionId:"Centre",capabilities:["engagements.region.manage"]},{uid:"x",email:"other@example.org",regionId:"Sud",capabilities:["engagements.region.manage"]},{uid:"off",email:"off@example.org",regionId:"Centre",capabilities:["engagements.region.manage"],competitionNotificationsEnabled:false}];
  assert.equal(reports.recipients({regionId:"Centre",computerEmail:"one@example.org"},directory).length,2);
  assert.equal(reports.recipients({regionId:"Centre",computerEmail:"computer@example.org"},directory).length,3);
  assert.equal(reports.recipients({regionId:"",computerEmail:"computer@example.org"},directory).length,1);
  const body=reports.message(result);assert.match(body.text,/EXPIREE Léa/);assert.match(body.text,/ABSENT Hugo/);assert.doesNotMatch(body.text,/EXEMPLE Camille/);assert.match(body.text,/Compétiteurs contrôlés : 3/);
  const db=database();await reports.complete(db,batch,input,"national");assert.equal(db.writes,2);assert.equal(Object.keys((await reports.summaries(db,season.label)).reports).length,1);
  await assert.rejects(reports.complete(db,batch,input,"other"),/autre personne/);
  const attached=await reports.attach(db,structuredClone(batch));assert.equal(attached.controlReports[1].current,true);assert.equal(attached.controlReports[2],null);
  const changed=structuredClone(batch);changed.people[1].licenseNumber="CHANGED";assert.equal((await reports.attach(db,changed)).controlReports[1].current,false);await assert.rejects(reports.readCurrent(db,changed,"1"),/bilan à jour/);
  const added=structuredClone(batch);added.people.push({...batch.people[0],livePalmesId:"13"});assert.notEqual(reports.membership(added,"1"),reports.membership(batch,"1"));
  const services={projectId:"livepalmes-test",competition:async()=>({regionId:"Centre",computerEmail:"computer@example.org"}),directory:async()=>directory,setting:async()=>({enabled:true,scope:"all",revision:1}),send:()=>{throw Error("Real send forbidden");}};
  const before=db.writes;const preview=await reports.notify(db,batch,{action:"previewReport",competitionId:"1"},services);assert.equal(preview.disabled,true);assert.equal(preview.recipients.length,3);assert.equal(db.writes,before);
  const sent=await reports.notify(db,batch,{action:"sendReport",competitionId:"1",expectedFingerprint:preview.fingerprint},services);assert.equal(sent.reason,"test-emails-disabled");assert.equal(db.writes,before);assert.equal(sent.sentCount,0);
  await assert.rejects(reports.notify(db,batch,{action:"sendReport",competitionId:"1",expectedFingerprint:"old"},services),/changé/);
  const control=require("../functions/engagement-mail-control");assert.equal(control.audienceAllowed({scope:"idf"},{type:"license_control_report",source:"nap",competitionRegionId:"Ile de France"}),true);assert.equal(control.audienceAllowed({scope:"idf"},{type:"license_control_report",source:"nap",competitionRegionId:"Centre"}),false);
  // Fake transport only: deterministic claims prevent duplicate/retried SMTP.
  let sends=0;const live={...services,projectId:"livepalmes",send:async(ref,job)=>{sends++;db.data.set(ref.path,{...job,status:"sent"});return {status:"sent"};}};
  const livePreview=await reports.notify(db,batch,{action:"previewReport",competitionId:"1"},live);
  const sendInput={action:"sendReport",competitionId:"1",expectedFingerprint:livePreview.fingerprint};
  await reports.notify(db,batch,sendInput,live);assert.equal(sends,3);await reports.notify(db,batch,sendInput,live);assert.equal(sends,3,"No duplicate SMTP after successful retry");
  const uncertainDb=database();await reports.complete(uncertainDb,batch,input,"national");let attempts=0;
  const uncertain={...live,send:async()=>{attempts++;throw Error("Acknowledgement missing");}};
  const uncertainPreview=await reports.notify(uncertainDb,batch,{action:"previewReport",competitionId:"1"},uncertain);
  const uncertainInput={...sendInput,expectedFingerprint:uncertainPreview.fingerprint};
  await assert.rejects(reports.notify(uncertainDb,batch,uncertainInput,uncertain));await assert.rejects(reports.notify(uncertainDb,batch,uncertainInput,uncertain),/Aucun renvoi automatique/);assert.equal(attempts,1);
  console.log("Bilans licences : statuts, provenance, concurrence, ciblage, détails et zéro envoi/écriture mail TEST : OK");
})().catch(error=>{console.error(error);process.exitCode=1;});

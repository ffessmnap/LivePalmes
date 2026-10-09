"use strict";
const assert=require('node:assert/strict'),delivery=require('../functions/nap-mail-delivery');
async function main(){
  const store=new Map(),references=new Map();
  const ref=path=>{if(!references.has(path))references.set(path,{id:path.split('/').at(-1),path});return references.get(path);};
  const snapshot=reference=>({data:()=>store.get(reference.path)});
  const db={collection:name=>({doc:id=>ref(`${name}/${id}`)}),runTransaction:async callback=>callback({
    get:async reference=>snapshot(reference),getAll:async(...items)=>items.map(snapshot),
    update:(reference,patch)=>store.set(reference.path,{...store.get(reference.path),...patch})})};
  const jobRef=ref('engagementMailJobs/job'),settingRef=ref('engagementConfigurations/notificationDelivery');
  const pointerRef=ref('engagementClosureQueue/nap-state-5162');
  const job={source:'nap',status:'ready',competitionId:'5162',toEmail:'real-club@example.org',createdAt:'2026-10-09T11:00:00.000Z',
    notificationEvent:{kind:'opening',cycleKey:'current'},notificationDueAt:'2026-10-09T11:00:00.000Z'};
  const enabled={enabled:true,enabledSince:'2026-10-09T10:00:00.000Z',discardThrough:''};
  store.set(settingRef.path,enabled);store.set(pointerRef.path,{cycleKey:'current',lifecycle:'open'});
  let sends=0;
  const services={projectId:'livepalmes-test',send:async document=>{
    sends++;assert.equal(document.data().toEmail,'livepalmes@nap-ffessm.fr');
    store.set(document.ref.path,{...document.data(),status:'sent'});return {status:'sent'};
  }};
  store.set(jobRef.path,{...job});assert.equal((await delivery.deliver(db,jobRef,services)).status,'sent');
  await delivery.deliver(db,jobRef,services);assert.equal(sends,1,'A sent mail is not sent again.');
  for(const setting of [{...enabled,enabled:false},{...enabled,enabledSince:'2026-10-09T12:00:00.000Z'},{...enabled,discardThrough:'2026-10-09T11:30:00.000Z'}]){
    store.set(settingRef.path,setting);store.set(jobRef.path,{...job});
    await delivery.deliver(db,jobRef,services);assert.equal(store.get(jobRef.path).status,'cancelled');assert.equal(sends,1);
  }
  store.set(settingRef.path,enabled);store.set(jobRef.path,{...job});store.set(pointerRef.path,{cycleKey:'reopened',lifecycle:'open'});
  await delivery.deliver(db,jobRef,services);assert.equal(sends,1,'An old lifecycle cannot send.');
  store.set(pointerRef.path,{cycleKey:'current',lifecycle:'open'});store.set(jobRef.path,{...job,status:'sending'});
  await delivery.deliver(db,jobRef,services);assert.equal(sends,1,'A claimed SMTP attempt is never blindly replayed.');
  console.log('NAP mail delivery: TEST recipient, kill switch, no catch-up, lifecycle and duplicate protection verified.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

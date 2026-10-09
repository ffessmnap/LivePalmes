"use strict";
const assert=require('node:assert/strict'),control=require('../functions/engagement-mail-control');
async function main(){
  let saved;
  const reference={get:async()=>({data:()=>saved})};
  const db={collection:name=>{assert.equal(name,'engagementConfigurations');return {doc:id=>{assert.equal(id,'notificationDelivery');return reference;}};},runTransaction:async callback=>callback({get:async()=>({data:()=>saved}),set:(_ref,value)=>{saved=value;}})};
  assert.equal((await control.read(db)).enabled,false);
  await assert.rejects(()=>control.update(db,{enabled:true,expectedRevision:0},{national:false,uid:'regional'}),/nationale/);
  assert.equal(saved,undefined);
  const enabled=await control.update(db,{enabled:true,expectedRevision:0},{national:true,uid:'national'},'2026-10-09T10:00:00.000Z');
  assert.equal(enabled.revision,1);
  assert.deepEqual(control.decision(enabled,{createdAt:'2026-10-09T10:01:00.000Z',toEmail:'club@example.org'},'livepalmes-test'),{allowed:true,to:'livepalmes@nap-ffessm.fr',test:true});
  assert.equal(control.decision(enabled,{createdAt:'2026-10-09T09:59:00.000Z'},'livepalmes-test').allowed,false);
  const disabled=await control.update(db,{enabled:false,expectedRevision:1},{national:true,uid:'national'},'2026-10-09T10:02:00.000Z');
  assert.equal(control.decision(disabled,{createdAt:'2026-10-09T10:01:00.000Z'},'livepalmes-test').allowed,false);
  await assert.rejects(()=>control.update(db,{enabled:true,expectedRevision:1},{national:true,uid:'national'}),/changé/);
  const resumed=await control.update(db,{enabled:true,expectedRevision:2},{national:true,uid:'national'},'2026-10-09T10:04:00.000Z');
  for(const createdAt of ['2026-10-09T10:01:00.000Z','2026-10-09T10:03:00.000Z'])assert.equal(control.decision(resumed,{createdAt},'livepalmes-test').allowed,false);
  assert.equal(control.decision(resumed,{createdAt:'2026-10-09T10:05:00.000Z',toEmail:'club@example.org'},'livepalmes').to,'club@example.org');
  assert.equal(control.decision(resumed,{createdAt:'2026-10-09T09:00:00.000Z',notificationDueAt:'2026-11-05T22:59:00.000Z'},'livepalmes-test').allowed,true);
  console.log('National mail control: authorization, stale updates, TEST recipient and no catch-up verified.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

"use strict";
const assert=require("node:assert/strict"),{fixture,review}=require("../tools/club-merge-projections");
global.fetch=async()=>{throw Error("NETWORK_FORBIDDEN");};
async function main(){
  assert.equal((await review()).readyForCorbie,true);
  const f=fixture(),current=f.profile("126");f.put("users/"+f.uid,current);
  f.put("engagementClubAdminDirectories/default",{status:"ready",admins:{unrelated:{clubId:"999"}}});
  await f.trigger(f.event("518","126"));assert.equal(f.stats.reads,3,"One current-profile read, two admin-transaction reads; private snapshot tested separately");
  await f.trigger(f.event("518","518"));await f.trigger(f.event("518","518"));
  assert.equal(f.admin().clubId,"126");assert.equal(f.recipient().clubId,"126");assert.equal(f.recipient().competitionNotificationsEnabled,false);
  assert.deepEqual(f.data.get("users/"+f.uid),current);assert.deepEqual(f.data.get("engagementClubAdminDirectories/default").admins.unrelated,{clubId:"999"});
  // Concurrent profile updates invalidate both transactions, not just their
  // event payload. The real helper is also exercised through its canonical wiring.
  for(const target of ["recipient","admin"]){
    const c=fixture();c.put("users/"+c.uid,c.profile("518"));let injected=false;
    c.hooks.beforeCommit=({reads,put})=>{if(!injected && (target==="admin" ? reads.has("engagementClubAdminDirectories/default") : reads.size===1)){injected=true;put("users/"+c.uid,c.profile("126"));}};
    await c.trigger(c.event("518","518"));
    if(target==="admin")await c.trigger(c.event("518","518"));
    assert(injected);assert.equal(c.admin().clubId,"126");assert.equal(c.recipient().clubId,"126");assert(c.stats.attempts>=3);
  }
  const changedDirectory=fixture();changedDirectory.put("users/"+changedDirectory.uid,changedDirectory.profile("126"));let once=false;
  changedDirectory.hooks.beforeCommit=({reads,put,data})=>{if(!once&&reads.has("engagementClubAdminDirectories/default")){once=true;put("engagementClubAdminDirectories/default",{...data.get("engagementClubAdminDirectories/default"),admins:{newOther:{clubId:"888"}}});}};
  await changedDirectory.trigger(changedDirectory.event("518","126"));assert.equal(changedDirectory.admin().clubId,"126");assert(changedDirectory.data.get("engagementClubAdminDirectories/default").admins.newOther);
  const failing=fixture();failing.put("users/"+failing.uid,failing.profile("126"));failing.hooks.readFailure="engagementClubAdminDirectories/default";
  await assert.rejects(()=>failing.trigger(failing.event("518","126")),/READ_FAILURE/);assert.equal(failing.recipient().clubId,"126");
  failing.hooks.readFailure=null;await failing.trigger(failing.event("518","518"));assert.equal(failing.admin().clubId,"126");
  const bounded=fixture();bounded.put("users/"+bounded.uid,bounded.profile("126"));
  bounded.hooks.beforeCommit=({put})=>put("users/"+bounded.uid,bounded.profile("126"));
  await assert.rejects(()=>bounded.trigger(bounded.event("518","126")),/RETRY_LIMIT/);assert.equal(bounded.stats.reads,5);assert.equal(bounded.stats.writes,0);
  const noRebuild=fixture();noRebuild.put("users/"+noRebuild.uid,noRebuild.profile("126"));noRebuild.put("engagementClubAdminDirectories/default",null);
  await noRebuild.trigger(noRebuild.event("518","126"));assert(!noRebuild.data.has("engagementClubAdminDirectories/default"));assert.equal(noRebuild.recipient().clubId,"126");
  const removal=fixture();removal.put("users/"+removal.uid,removal.profile("126"));await removal.trigger(removal.event("518","126"));
  for(const inactive of [{...removal.profile("126"),status:"inactive"},null]){
    removal.put("users/"+removal.uid,inactive);await removal.trigger(removal.event("518","518"));assert(!removal.admin());assert(!removal.recipient());
  }
  const role=fixture();role.put("users/"+role.uid,role.profile("126"));await role.trigger(role.event("518","126"));
  role.put("users/"+role.uid,{...role.profile("126"),capabilities:{"engagements.region.manage":true}});
  await role.trigger(role.event("518","518"));assert(!role.admin());assert(!role.recipient());assert.equal(role.recipient("engagements.region.manage").clubId,"126");
  // Direct calls (e.g. a delayed preference update) cannot reintroduce an old
  // administrator entry either; no grants/preferences are copied from events.
  const direct=fixture();direct.put("users/"+direct.uid,direct.profile("126"));
  const obsolete=direct.mail.engagementMailRecipientFromUserDoc({id:direct.uid,data:()=>direct.profile("518")});
  await direct.mail.updateEngagementClubAdminDirectory(direct.db,obsolete,obsolete);assert.equal(direct.admin().clubId,"126");assert.equal(direct.stats.reads,2);
  console.log("Corbie projection replay: actual trigger/helpers, stale/duplicate events, rollback, concurrent profile/directory, bounded retries, partial failure/resume, inactive/deleted/changed role, preferences and unrelated users; offline only.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

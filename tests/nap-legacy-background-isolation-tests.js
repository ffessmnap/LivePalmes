"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const acorn=require("./firestore-rules/node_modules/acorn");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
const ast=acorn.parse(source,{ecmaVersion:"latest"});
const handler=name=>{
  const node=ast.body.find(node=>node.type==="ExpressionStatement" && node.expression.type==="AssignmentExpression" && node.expression.left.object?.name==="exports" && node.expression.left.property?.name===name);
  assert.ok(node,name);
  const callback=node.expression.right.arguments.at(-1);
  return source.slice(callback.start,callback.end);
};
const triggers={
  syncEngagementCompetitionToCalendar:["syncEngagementCompetitionCalendarFromChange","publishPublicCalendarChange"],
  syncEngagementCalendarEventToCalendar:["syncEngagementCalendarEventFromChange","publishPublicCalendarChange"],
  syncEngagementClubEntryToCompetitionSummary:["syncEngagementCompetitionEntrySummaryFromChange"],
  syncEngagementClubPersonToRoster:["syncEngagementClubPeopleRosterFromChange"],
  syncPerformanceSwimmerToEngagementClubRoster:["syncEngagementClubRosterFromSwimmerChange"],
  syncEngagementClubSwimmerToRoster:["syncEngagementClubRosterFromSwimmerChange"]
};
const blocked=["rebuildEngagementCompetitionCalendars","rebuildEngagementClubAggregates","deleteEngagementCalendarEvent","requestEngagementCompetitionDeletion","resolveEngagementCompetitionDeletionRequest"];
(async()=>{
  for(const [name,helpers] of Object.entries(triggers)){
    const calls=[];
    const context={ENVIRONMENT:{sportingDataSource:"nap"}};
    for(const helper of helpers)context[helper]=async event=>{calls.push(helper);return event;};
    const callback=vm.runInNewContext(`(${handler(name)})`,context);
    const event={data:{before:{exists:true},after:{exists:true}},params:{competitionId:"old",swimmerId:"old"}};
    assert.equal(await callback(event),null,name);
    assert.deepEqual(calls,[],"No legacy reads, writes or file publication in NAP mode");
    context.ENVIRONMENT.sportingDataSource="legacy";
    await callback(event);
    assert.deepEqual(calls,helpers,"Preserve former behavior outside NAP mode");
  }
  for(const name of blocked){
    let accessCalls=0;
    const marker=new Error("legacy authorization reached");
    const context={ENVIRONMENT:{sportingDataSource:"nap"},Date,HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}},engagementAccessContext:async()=>{accessCalls++;throw marker;}};
    const callback=vm.runInNewContext(`(${handler(name)})`,context);
    await assert.rejects(callback({data:{}}),e=>e.code==="failed-precondition",name);
    assert.equal(accessCalls,0);
    context.ENVIRONMENT.sportingDataSource="legacy";
    await assert.rejects(callback({data:{}}),e=>e===marker);
    assert.equal(accessCalls,1);
  }
  let national=true,reads=0;
  const list=vm.runInNewContext(`(${handler("listEngagementCompetitionDeletionRequests")})`,{
    ENVIRONMENT:{sportingDataSource:"nap"},engagementAccessContext:async()=>({national}),cleanText:v=>String(v||""),
    HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}},db:{collection(){reads++;throw Error("Legacy sport read forbidden");}}
  });
  assert.equal((await list({data:{status:"approved"}})).requests.length,0);
  national=false;await assert.rejects(list({data:{}}),e=>e.code==="permission-denied");assert.equal(reads,0);
  const countsNode=ast.body.find(n=>n.type==="FunctionDeclaration"&&n.id.name==="engagementNationalAdministrationPendingCounts");
  const collections=[];
  const counts=vm.runInNewContext(`(${source.slice(countsNode.start,countsNode.end)})`,{
    ENVIRONMENT:{sportingDataSource:"nap"},ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION:"identityRequests",
    db:{collection(name){collections.push(name);assert.ok(["identityRequests","accessUserDeletionRequests"].includes(name));return {where:()=>({count:()=>({get:async()=>({data:()=>({count:name==="identityRequests"?2:3})})})})};}}
  });
  assert.equal(JSON.stringify(await counts()),JSON.stringify({swimmerChanges:2,dataDeletions:0,accountDeletions:3,total:5}));
  assert.equal(collections.length,2);
  console.log("NAP legacy isolation: six dormant sporting triggers, five former mutations, empty native legacy-deletion list and two bounded technical counters verified without a database.");
})().catch(error=>{console.error(error);process.exitCode=1;});

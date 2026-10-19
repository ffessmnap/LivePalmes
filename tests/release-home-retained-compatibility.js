"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm");
const acorn=require("./firestore-rules/node_modules/acorn");
const ORIGINS=Object.freeze({
  "closeDueEngagementCompetitions": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "disableCompetitionEmailNotifications": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "listEngagementCompetitionMailJobs": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "notifyEngagementCompetitionDocuments": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "prepareEngagementClubRecapEmails": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "prepareEngagementOpeningNotificationEmails": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "processNapCompetitionNotifications": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "resolveEngagementAccessRequest": "812bad64681a232e6cc3868ba7ec112bcdac7ca2",
  "resolveEngagementSwimmerChangeRequest": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "sendEngagementPreparedEmails": "1df545a62de67a24ff32ca4d1046cce4be6d499f",
  "submitEngagementAccessRequest": "812bad64681a232e6cc3868ba7ec112bcdac7ca2",
  "updateCurrentEmailNotificationPreferences": "1df545a62de67a24ff32ca4d1046cce4be6d499f"
});
const clean=x=>JSON.parse(JSON.stringify(x));
function moduleTree(source,commit,file,omit=[]){
 const ast=acorn.parse(source(commit,file),{ecmaVersion:"latest"});
 ast.body=ast.body.filter(n=>!(n.type==="FunctionDeclaration"&&omit.includes(n.id.name)));
 return JSON.stringify(ast,(key,value)=>["start","end","raw"].includes(key)?undefined:value);
}
function callback(definitions,commit,name,extras={}){
 const code=definitions(commit).get(name);assert.ok(code,name);
 const ast=acorn.parse(code,{ecmaVersion:"latest"});
 const node=ast.body[0].expression.right.arguments.findLast(n=>n.type==="ArrowFunctionExpression"||n.type==="FunctionExpression");assert.ok(node);
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const sandbox={Date:class extends Date{constructor(...args){super(...(args.length?args:["2026-10-19T12:00:00.000Z"]));}},
  HttpsError,cleanText:x=>String(x??"").trim(),ENVIRONMENT:{sportingDataSource:"nap",name:"production"},
  require:name=>{throw Error("Unexpected fixture import: "+name);},...extras};
 return {sandbox,handler:vm.runInNewContext('('+code.slice(node.start,node.end)+')',sandbox,{timeout:3000})};
}
async function guardFixtures({commit,definitions,loader,source,kind}){
 if(kind==="preferences"){
 let preferences=0;
 const pref=callback(definitions,commit,"updateCurrentEmailNotificationPreferences",{
  assertLivePalmesAccess:async()=>{throw Error("denied");},
  setCompetitionEmailNotificationPreference:async(uid,enabled,via)=>{preferences++;assert.equal(uid,"fixture-user");assert.equal(via,"portal");return {enabled,updatedAt:"fixture"};}});
 await assert.rejects(pref.handler({auth:{uid:"fixture-user"},data:{competitionNotifications:true}}),/denied/);assert.equal(preferences,0);
 pref.sandbox.assertLivePalmesAccess=async()=>{};
 for(const enabled of [false,true])assert.equal((await pref.handler({auth:{uid:"fixture-user"},data:{competitionNotifications:enabled}})).competitionNotificationsEnabled,enabled);
 assert.equal(preferences,2);
 let disabled=0;
 const unsub=callback(definitions,commit,"disableCompetitionEmailNotifications",{
  validCompetitionNotificationPreferenceToken:(uid,token)=>uid==="fixture-user"&&token==="valid-fixture-token",
  setCompetitionEmailNotificationPreference:async(uid,enabled,via)=>{disabled++;assert.equal(uid,"fixture-user");assert.equal(enabled,false);assert.equal(via,"email_link");return {enabled:false,updatedAt:"fixture"};}});
 await assert.rejects(unsub.handler({data:{uid:"fixture-user",token:"invalid"}}),e=>e.code==="permission-denied");assert.equal(disabled,0);
 assert.equal((await unsub.handler({data:{uid:"fixture-user",token:"valid-fixture-token"}})).competitionNotificationsEnabled,false);assert.equal(disabled,1);
 return {preferences,disabled};
 }
 if(kind==="access"){
 const trace=[];
 const submission=callback(definitions,commit,"submitEngagementAccessRequest",{
  cleanEngagementAccessRequestPayload:data=>data,
  consumePublicAccessRequestRateLimit:async()=>{trace.push("rate-limit");},
  resolveExistingClubForAccessRequest:async()=>{trace.push("native-club");throw Error("native-unavailable");},
  engagementExistingAccessAccount:async()=>{throw Error("Should not read account after unavailable club");}});
 await assert.rejects(submission.handler({data:{website:"honeypot"}}),e=>e.code==="invalid-argument");assert.deepEqual(trace,[]);
 await assert.rejects(submission.handler({data:{email:"fixture@example.invalid"}}),e=>e.code==="unavailable"||e.message==="native-unavailable");assert.deepEqual(trace,["rate-limit","native-club"]);
 let data={status:"pending",email:"fixture@example.invalid",clubId:"fixture-club",regionId:"fixture-region"},sets=0,audits=0,notices=0,reads=0;
 const ref={get:async()=>{reads++;return {exists:true,id:"fixture-request",data:()=>data};},set:async patch=>{sets++;data={...data,...clean(patch)};}};
 const resolver=callback(definitions,commit,"resolveEngagementAccessRequest",{
  engagementAccessContext:async()=>({uid:"fixture-actor",national:false,region:false}),
  db:{collection:name=>{assert.equal(name,"engagementAccessRequests");return {doc:id=>{assert.equal(id,"fixture-request");return ref;}};}},
  writeAuditLog:async()=>{audits++;},sendEngagementAccessRejection:async()=>{notices++;return {status:"disabled"};},
  engagementAccessRequestItem:s=>({status:s.data().status})});
 vm.runInNewContext(definitions(commit).get("assertEngagementAccessRequestScope"),resolver.sandbox);
 const input={data:{requestId:"fixture-request",decision:"rejected",resolutionReason:"fixture-reason"}};
 await assert.rejects(resolver.handler(input),e=>e.code==="permission-denied");assert.equal(reads,1);assert.equal(sets,0);assert.equal(notices,0);
 resolver.sandbox.engagementAccessContext=async()=>({uid:"fixture-actor",region:true,regionId:"other-region"});
 await assert.rejects(resolver.handler(input),e=>e.code==="permission-denied");assert.equal(sets,0);
 resolver.sandbox.engagementAccessContext=async()=>({uid:"fixture-actor",national:true});
 const rejected=await resolver.handler(input);assert.equal(rejected.request.status,"rejected");assert.equal(sets,2);assert.equal(audits,1);assert.equal(notices,1);assert.equal(data.resolutionNotification.status,"disabled");
 await assert.rejects(resolver.handler(input),e=>e.code==="failed-precondition");assert.equal(sets,2);assert.equal(notices,1);
 return {sets,audits,notices};
 }
 assert.equal(kind,"identity");
 // The identity endpoint must refuse before reading a request unless national.
 let identityReads=0;
 const identity=callback(definitions,commit,"resolveEngagementSwimmerChangeRequest",{
  engagementAccessContext:async()=>({uid:"fixture-actor",national:false}),
  ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION:"fixture-corrections",
  db:{collection:name=>{assert.equal(name,"fixture-corrections");return {doc:()=>({get:async()=>{identityReads++;return {exists:true,data:()=>identityData};}})};}},
  engagementSwimmerChangeRequestItem:s=>({status:s.data().status})});
 await assert.rejects(identity.handler({data:{requestId:"fixture",decision:"rejected"}}),e=>e.code==="permission-denied");assert.equal(identityReads,0);
 identity.sandbox.engagementAccessContext=async()=>({uid:"fixture-actor",national:true});
 await assert.rejects(identity.handler({data:{requestId:"fixture",decision:"unknown"}}),e=>e.code==="invalid-argument");assert.equal(identityReads,0);
 const load=loader(commit,(sha,file)=>file==="functions/nap-mysql.js" ? 'module.exports={createNapPool:()=>{throw Error("Fixture forbids SQL pool creation");}};' : source(sha,file)),helper=load("functions/nap-swimmer-change-requests.js");
 const before={id:912,nom:"FIXTURE",prenom:"Person",date:"2000-01-01",sexe:"M",number:"fixture",club:106};
 const identityData={napSource:true,nativeBefore:before,expectedFingerprint:load("functions/nap-portal-swimmer-change.js").fingerprint(before),clubId:"106",requestedSwimmerId:"912",targetSwimmerId:"912",status:"rejected",result:{fixture:true}};
 const resolution={decision:"rejected",resolutionNote:"fixture-note"};
 identityData.nativeResolution={key:helper.prepareResolution(identityData,resolution,"fixture-actor").key};
 identity.sandbox.require=name=>{assert.equal(name,"./nap-swimmer-change-requests");return helper;};
 const replay=await identity.handler({data:{requestId:"fixture",...resolution}});assert.equal(replay.ok,true);assert.equal(replay.result.fixture,true);assert.equal(identityReads,1);
 identityData.expectedFingerprint="f".repeat(64);
 await assert.rejects(identity.handler({data:{requestId:"fixture",...resolution}}));assert.equal(identityReads,2);
 return {identityReads};
}
async function prove({base,candidate,rows,source,loader,definitions}){
 assert.equal(base,"ac78b50759ca209cddaa15d374eb5e01dd926268");assert.equal(candidate,"25ac21b69c8fd09c44399f1f65b3bd4e6a0e58bd");
 assert.deepEqual(rows.map(r=>r.name).sort(),Object.keys(ORIGINS).sort());
 for(const row of rows){assert.equal(row.commit,ORIGINS[row.name]);assert.deepEqual(Object.keys(row).sort(),["commit","name"]);}
 // Changes in this shared module are limited to the displayed team-leader
 // declaration. Competition projection, pack fingerprints and all other code stay exact.
 assert.equal(moduleTree(source,base,"functions/nap-portal-workspaces.js",["entryItem"]),moduleTree(source,candidate,"functions/nap-portal-workspaces.js",["entryItem"]));
 for(const file of ["nap-swimmer-change-requests.js","nap-portal-swimmer-change.js","nap-portal-swimmers.js","nap-club-access-request.js","engagement-mail-control.js","nap-mysql.js"])
  assert.equal(source(base,"functions/"+file),source(candidate,"functions/"+file),"Changed retained service dependency: "+file);
 const oldLoad=loader(base),newLoad=loader(candidate),oldView=oldLoad("functions/nap-portal-workspaces.js"),newView=newLoad("functions/nap-portal-workspaces.js");
 const pack={source:"nap",readAt:"fixture",competitionId:"5140",clubId:"106",swimmers:[],inscriptions:[],individual:[],relays:[],members:[],officials:[],options:null};
 for(const leaders of [[],[{id:1,nom:"Fixture",prenom:"Person",club:"106",pourclub:"106"}],[{id:2,nom:"-1",prenom:"-1",date:"0000-00-00",club:"106",pourclub:"106"}]]){
  const input={...pack,leaders};const previous=oldView.entryItem(input,{},()=>""),current=newView.entryItem(input,{},()=>"");
  assert.equal(previous.napFingerprint,current.napFingerprint);
  for(const key of ["swimmers","relays","officials","nativeOptions","documents","clubId","competitionId"])assert.deepEqual(clean(previous[key]),clean(current[key]));
  if(leaders[0]?.nom==="-1"){assert.equal(current.teamLeader.mode,"renounced");assert.equal(current.teamLeaderComplete,true);}
  if(!leaders.length)assert.equal(current.teamLeaderComplete,false);
 }
 const prior=oldLoad("functions/nap-approved-index.js").SPECS,next=newLoad("functions/nap-approved-index.js").SPECS;
 for(const key of Object.keys(prior))assert.deepEqual(clean(next[key]),clean(prior[key]));
 assert.deepEqual(Object.keys(next).filter(key=>!Object.hasOwn(prior,key)).sort(),["documentThemes","homeEndDate"]);
 for(const [kind,origin] of [["preferences",ORIGINS.disableCompetitionEmailNotifications],["access",ORIGINS.submitEngagementAccessRequest],["identity",ORIGINS.resolveEngagementSwimmerChangeRequest]]){
  const results=[];
  for(const commit of [...new Set([base,candidate,origin])])results.push(await guardFixtures({commit,definitions,loader,source,kind}));
  for(const result of results)assert.deepEqual(result,results[0]);
 }
}
module.exports={ORIGINS,prove};

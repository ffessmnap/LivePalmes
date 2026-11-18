"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {initializeTestEnvironment,assertFails,assertSucceeds}=require("@firebase/rules-unit-testing"),{doc,getDoc,setDoc,updateDoc,Timestamp}=require("firebase/firestore");
const proof={sign_in_second_factor:"totp",second_factor_identifier:"fixture-totp"};
for(const project of ["livepalmes-test","livepalmes"])test("admin.full MFA Rules: "+project,async()=>{
 const endpoint=process.env.FIRESTORE_EMULATOR_HOST||"";assert.match(endpoint,/^(127\.0\.0\.1|localhost):[0-9]+$/,"A local emulator is mandatory; never contact a Firebase project");
 const [host,port]=endpoint.split(":"),rules=fs.readFileSync(path.resolve(__dirname,project==="livepalmes-test"?"../../firestore.rules":"../../.github/releases/evidence/20261118-admin-mfa-production-after.rules"),"utf8");
 const env=await initializeTestEnvironment({projectId:project,firestore:{host,port:Number(port),rules}});
 const secret="competitions/livepalmes-active/secrets/mfa-fixture",result="competitions/livepalmes-active/results/mfa-fixture",publicDoc="competitions/livepalmes-active/public/resultsIndex",channel=(project==="livepalmes"?"production":"test")+"-900001",signal="livepalmesDirectSignals/"+channel+"/signal/current";
 const adminClaims=firebase=>({livepalmesAccess:true,livepalmesCapabilities:{"admin.full":true},...(firebase?{firebase}:{})});
 const roleClaims={livepalmesAccess:true,livepalmesCapabilities:{"consoles.access":true},livepalmesRole:"computer",livepalmesConsoleAccess:true,livepalmesConsole:true,livepalmesCompetition:"livepalmes-active"};
 const client=(uid,claims)=>env.authenticatedContext(uid,claims).firestore();
 try{
  await env.clearFirestore();await env.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();for(const uid of ["fixture-admin","AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"])await setDoc(doc(db,"users/"+uid),{status:"active",capabilities:{"admin.full":true}});
   await setDoc(doc(db,"users/fixture-console"),{status:"active",capabilities:{"consoles.access":true}});
   for(const uid of ["fixture-admin","fixture-console"])await setDoc(doc(db,"competitions/livepalmes-active/consoleGrants/"+uid),{role:"computer",competitionId:"livepalmes-active",expiresAt:Timestamp.fromMillis(Date.now()+300000)});
   for(const name of [secret,result,publicDoc,signal])await setDoc(doc(db,name),{fixtureOnly:true});
   await setDoc(doc(db,"livepalmesDirectSignals/"+channel+"/private/access"),{members:{"fixture-admin":{until:Timestamp.fromMillis(Date.now()+300000)},"fixture-console":{until:Timestamp.fromMillis(Date.now()+300000)}}});
  });
  for(const factor of [undefined,{}, {sign_in_second_factor:"phone",second_factor_identifier:"fixture-totp"}]){
   const db=client("fixture-admin",adminClaims(factor));await assertFails(getDoc(doc(db,secret)));await assertFails(setDoc(doc(db,secret),{clientClaimsMfa:true}));await assertFails(getDoc(doc(db,signal)));
  }
  const verified=client("fixture-admin",adminClaims({sign_in_second_factor:"totp"}));await assertSucceeds(getDoc(doc(verified,secret)));await assertSucceeds(getDoc(doc(verified,signal)));
  await assertFails(getDoc(doc(client("AgvWJjvLOfe3uB0lz0Xr3wwJxzT2",{aud:"livepalmes"}),secret)),"Historical identity never exempts MFA");
  await assertFails(getDoc(doc(client("fixture-admin",roleClaims),result)),"An admin cannot evade MFA through another console capability");
  await assertSucceeds(getDoc(doc(client("fixture-admin",{...roleClaims,firebase:proof}),result)));
  await assertSucceeds(getDoc(doc(client("fixture-console",roleClaims),result)));await assertSucceeds(getDoc(doc(client("fixture-console",{}),signal)),"No new MFA obligation for ordinary console users");
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),publicDoc)));
  await env.withSecurityRulesDisabled(async context=>updateDoc(doc(context.firestore(),"users/fixture-admin"),{capabilities:{}}));
  await assertFails(getDoc(doc(verified,secret)),"An old admin claim plus MFA never replaces the current role");
  await env.withSecurityRulesDisabled(async context=>updateDoc(doc(context.firestore(),"users/fixture-admin"),{status:"inactive",capabilities:{"admin.full":true}}));
  await assertFails(getDoc(doc(verified,secret)));
 }finally{await env.cleanup();}
});

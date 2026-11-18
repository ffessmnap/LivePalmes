'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {eligible,secretParameters,createEnrollment,version,diagnostic,environmentFor}=require('../assets/livepalmes-mfa-enrollment');
assert.equal(diagnostic('secret',{code:'auth/requires-recent-login'}),'secret / auth/requires-recent-login');
assert.equal(diagnostic('SECRET-SEED-PASSWORD',{code:'PRIVATE TOKEN',message:'PRIVATE KEY'}),'unknown / unavailable');
const now=Date.now(),secret={secretKey:'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',codeLength:6,codeIntervalSeconds:30,hashingAlgorithm:'SHA1',enrollmentCompletionDeadline:new Date(now+600000).toISOString()};
const auth={app:{options:{projectId:'livepalmes-test'}},currentUser:{uid:'fixture',email:'fixture@example.invalid',emailVerified:true,isAnonymous:false}};
assert(eligible(auth,()=>true));assert(!eligible(auth,()=>false));
const prod={...auth,app:{options:{projectId:'livepalmes'}}};assert(eligible(prod,()=>true));assert(!eligible(prod,()=>false));assert.equal(environmentFor(prod).issuer,'LivePalmes');assert.equal(environmentFor(auth).issuer,'LivePalmes TEST');assert(Object.isFrozen(environmentFor(prod)));
for(const id of ['unknown','toString','__proto__'])assert.equal(environmentFor({...auth,app:{options:{projectId:id}}}),null);
for(const bad of [{...auth,app:{options:{projectId:'unknown'}}},{...auth,currentUser:null},{...auth,currentUser:{...auth.currentUser,isAnonymous:true}}])assert(!eligible(bad,()=>true));
assert.equal(secretParameters(secret,now),now+600000);
for(const value of [{...secret,secretKey:'https://example.invalid'},{...secret,codeLength:7},{...secret,codeIntervalSeconds:60},{...secret,hashingAlgorithm:'SHA256'},{...secret,enrollmentCompletionDeadline:new Date(now).toISOString()},{...secret,enrollmentCompletionDeadline:new Date(now+3600001).toISOString()}])assert.throws(()=>secretParameters(value,now));
const doc=scripts=>({baseURI:'https://example.invalid/portail.html',querySelectorAll:()=>scripts.map(src=>({src}))});
assert.equal(version(doc(['https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js'])),'10.12.5');
for(const scripts of [[],['https://evil.invalid/firebasejs/10.12.5/firebase-auth-compat.js'],['https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js']])assert.throws(()=>version(doc(scripts)));
async function verifyEmailChangePolicy(){
 const vm=require('node:vm'),source=fs.readFileSync(path.resolve(__dirname,'../assets/portal/deferred/account-and-access.js'),'utf8');
 for(const mode of ['configured','ordinary','race']){
  const counts={reauth:0,rpc:0,mail:0},user={email:'current@example.invalid',multiFactor:{enrolledFactors:mode==='configured'?[{factorId:'totp'}]:[]},reload:async()=>{},getIdToken:async()=>{},sendEmailVerification:async()=>counts.mail++};let create,message='';
  const elements={accountEmail:{value:'new@example.invalid'},accountEmailPassword:{value:'PRIVATE-PASSWORD'},accountEmailMessage:{},accountEmailForm:{querySelector:()=>({disabled:false})}};
  const actions={setAccountMessage:(_target,text)=>message=text,reauthenticateCurrentUser:async()=>{counts.reauth++;if(mode==='race')user.multiFactor.enrolledFactors=[{factorId:'totp'}];return user;},callFunction:async(name)=>{assert.equal(name,'updateCurrentAccountEmail');counts.rpc++;return {};},renderCurrentUser(){},ensureAdminAuth:()=>({status:()=>({profile:{}})}),firebaseAccountError:error=>error.message};
  vm.runInNewContext(source,{window:{firebase:{auth:()=>({currentUser:user})},LivePalmesPortalDeferred:{register:(_name,factory)=>create=factory}}});
  await create({state:{},actions,config:{},elements},{loadCurrentUser:async()=>{}}).updateAccountEmail({preventDefault(){}});
  assert.equal(elements.accountEmailPassword.value,'');assert(!message.includes('PRIVATE-PASSWORD'));
  if(mode==='ordinary')assert.deepEqual(counts,{reauth:1,rpc:1,mail:1});else{assert.equal(counts.rpc,0);assert.equal(counts.mail,0);assert.equal(counts.reauth,mode==='race'?1:0);assert(message.includes('contactez le responsable LivePalmes'));}
 }
}
async function main(){
 let loads=0;const api=createEnrollment({document:{},sdkLoader:()=>{loads++;throw Error('must not load');}});
 await assert.rejects(api.open({auth,isAdmin:()=>false,reauthenticate(){}}),{code:'mfa/forbidden'});assert.equal(loads,0);
 await verifyEmailChangePolicy();
 const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'assets/livepalmes-mfa-enrollment.js'),'utf8');
 assert(!/localStorage|sessionStorage|clipboard|console\.|sendBeacon/.test(source),'No persistence, clipboard or logging for seed/password/code');
 assert(!/api\.qrserver|chart\.googleapis/.test(source),'QR stays local');
 for(const file of ['assets/portal/account-and-access.js','assets/portal/competition-settings.js']){const text=fs.readFileSync(path.join(root,file),'utf8');assert(text.includes('livepalmes-test')&&text.includes('admin.full'));}
 const html=fs.readFileSync(path.join(root,'portail.html'),'utf8');assert.match(html,/<section id="adminAccountMfaCard"[^>]+hidden>/);
 console.log('MFA enrollment boundaries: exact TEST+PROD projects/admin.full, secret expiry/parameters, official SDK discovery and no secret persistence.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

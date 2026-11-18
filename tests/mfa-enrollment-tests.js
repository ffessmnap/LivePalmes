'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {eligible,secretParameters,createEnrollment,version}=require('../assets/livepalmes-mfa-enrollment');
const now=Date.now(),secret={secretKey:'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',codeLength:6,codeIntervalSeconds:30,hashingAlgorithm:'SHA1',enrollmentCompletionDeadline:new Date(now+600000).toISOString()};
const auth={app:{options:{projectId:'livepalmes-test'}},currentUser:{uid:'fixture',email:'fixture@example.invalid',emailVerified:true,isAnonymous:false}};
assert(eligible(auth,()=>true));assert(!eligible(auth,()=>false));
for(const bad of [{...auth,app:{options:{projectId:'livepalmes'}}},{...auth,currentUser:null},{...auth,currentUser:{...auth.currentUser,isAnonymous:true}}])assert(!eligible(bad,()=>true));
assert.equal(secretParameters(secret,now),now+600000);
for(const value of [{...secret,secretKey:'https://example.invalid'},{...secret,codeLength:7},{...secret,codeIntervalSeconds:60},{...secret,hashingAlgorithm:'SHA256'},{...secret,enrollmentCompletionDeadline:new Date(now).toISOString()},{...secret,enrollmentCompletionDeadline:new Date(now+3600001).toISOString()}])assert.throws(()=>secretParameters(value,now));
const doc=scripts=>({baseURI:'https://example.invalid/portail.html',querySelectorAll:()=>scripts.map(src=>({src}))});
assert.equal(version(doc(['https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js'])),'10.12.5');
for(const scripts of [[],['https://evil.invalid/firebasejs/10.12.5/firebase-auth-compat.js'],['https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js']])assert.throws(()=>version(doc(scripts)));
async function main(){
 let loads=0;const api=createEnrollment({document:{},sdkLoader:()=>{loads++;throw Error('must not load');}});
 await assert.rejects(api.open({auth,isAdmin:()=>false,reauthenticate(){}}),{code:'mfa/forbidden'});assert.equal(loads,0);
 const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'assets/livepalmes-mfa-enrollment.js'),'utf8');
 assert(!/localStorage|sessionStorage|clipboard|console\.|sendBeacon/.test(source),'No persistence, clipboard or logging for seed/password/code');
 assert(!/api\.qrserver|chart\.googleapis/.test(source),'QR stays local');
 for(const file of ['assets/portal/account-and-access.js','assets/portal/competition-settings.js']){const text=fs.readFileSync(path.join(root,file),'utf8');assert(text.includes('livepalmes-test')&&text.includes('admin.full'));}
 const html=fs.readFileSync(path.join(root,'portail.html'),'utf8');assert.match(html,/<section id="adminAccountMfaCard"[^>]+hidden>/);
 console.log('MFA enrollment boundaries: TEST/admin.full, secret expiry/parameters, official SDK discovery and no secret persistence.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

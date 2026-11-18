"use strict";
const assert=require("node:assert/strict"),{start,otp,FIRST}=require("./helpers/firebase-mfa-enrollment-fixture"),{launchBrowser,evaluate,waitFor}=require("../tools/capture-portal-design");
async function main(){
 const {server,baseUrl}=await start();let browser;
 try{
  browser=await launchBrowser();const {client}=browser,js=source=>evaluate(client,source);
  await client.send("Network.enable");await client.send("Network.setBlockedURLs",{urls:["https://*"]});
  const wait=async expression=>{if(!await waitFor(client,expression,10000))throw Error(expression+" "+JSON.stringify(await js("return {outcome:window.__sessionOutcome,message:document.querySelector('[data-enroll-message]')?.textContent,sessionMessage:document.getElementById('adminPortalSessionMessage')?.textContent,calls:window.__portalCalls};")));};
  async function ready(width,project){
   await client.send("Emulation.setDeviceMetricsOverride",{width,height:850,deviceScaleFactor:1,mobile:width<700});
   await client.send("Page.navigate",{url:baseUrl+"/?version=10.12.5&project="+project});await wait("window.__ready");
   await js(`document.body.classList.add('admin-portal-page');window.LivePalmesEnvironment={portalSessionEnabled:true};window.LivePalmesMfaAuth=__challenge;window.__portalCalls=[];window.__business=0;
    const script=document.createElement('script');script.src='/assets/livepalmes-portal-session.js';document.head.append(script);`);await wait("window.LivePalmesPortalSession");
   await js(`window.__portalService={httpsCallable:name=>async data=>{__portalCalls.push({name,action:data?._portalSessionAction});const claims=(await __auth.currentUser.getIdTokenResult()).claims,verified=claims.firebase?.sign_in_second_factor==='totp';
    if(name==='getCurrentAccessUser'){const profile={uid:__auth.currentUser.uid,status:'active',capabilities:verified?['admin.full']:[],adminMfaRequired:!verified};return {data:verified?{ok:true,profile,serverTime:Date.now(),expiresAt:Date.now()+86400000}:{ok:false,adminMfaRequired:true,profile}};}
    if(!verified)throw Object.assign(new Error('MFA required'),{details:{adminMfaRequired:true}});__business++;return {data:{ok:true}};}};
    LivePalmesPortalSession.wrap(__portalService);window.LivePalmesPortalAuth={status:()=>({}),refreshProfile:async()=>true,signOut:()=>__auth.signOut()};
    window.__run=()=>{__sessionOutcome=null;__portalService.httpsCallable('fixtureBusiness')({}).then(()=>__sessionOutcome='accepted',()=>__sessionOutcome='refused');};`);
  }
  for(const project of ["livepalmes-test","livepalmes"])for(const width of [1280,320]){
   await ready(width,project);await js("__run();");await wait("document.querySelector('[data-enroll-prepare]')&&!document.querySelector('[data-enroll-prepare]').hidden");
   assert.equal(await js("return __business"),0);assert.equal(await js("return document.documentElement.scrollWidth<=innerWidth+1"),true);
   await js("document.querySelector('[data-enroll-password]').value='FAKE-PASSWORD';document.querySelector('[data-enroll-prepare]').requestSubmit();");await wait("document.querySelector('[data-enroll-secret]')?.textContent.length>0");
   await js("document.querySelector('[data-enroll-saved]').checked=true;document.querySelector('[data-enroll-code]').value="+JSON.stringify(otp(FIRST))+";document.querySelector('[data-enroll-confirm]').requestSubmit();");await wait("!document.querySelector('[data-enroll-step=success]').hidden");
   await js("document.querySelector('[data-enroll-close]').click();");await wait("__sessionOutcome==='refused'&&!__auth.currentUser");assert.equal(await js("return __business"),0,"Enrollment never replays the waiting operation");
   // A previously issued first-factor token with a now-enrolled TOTP must reconnect.
   await ready(width,project);await js("__factors=[{mfaEnrollmentId:'FAKE-1',displayName:'TOTP fixture only',totpInfo:{}}];__run();");await wait("document.getElementById('adminPortalSessionLock')?.open");
   assert.equal(await js("return __business"),0);assert.equal(await js("return document.querySelectorAll('[data-enroll-prepare]').length"),0,"Never generate a new secret for an existing factor");
   await new Promise(resolve=>setTimeout(resolve,1100));await js("document.getElementById('adminPortalSessionPassword').value='FAKE-PASSWORD';document.getElementById('adminPortalSessionUnlockForm').requestSubmit();");await wait("document.querySelector('[data-mfa-code]')&&!document.querySelector('[data-mfa-code]').disabled");
   await js("document.querySelector('[data-mfa-code]').value="+JSON.stringify(otp(FIRST))+";document.querySelector('.livepalmes-mfa-dialog form').requestSubmit();");await wait("!document.getElementById('adminPortalSessionLock').open");assert.equal(await js("return __business"),0,"Reauthentication never replays the waiting operation");
   await js("__run();");await wait("__sessionOutcome==='accepted'");assert.equal(await js("return __business"),1);assert.deepEqual(await js("return __cspViolations"),[]);
  }
  console.log("Mandatory admin MFA: actual session client + both SDK layers, own enrollment, old token reauthentication, preserved no-replay, TEST/PROD and desktop/mobile with HTTPS blocked verified.");
 }finally{if(browser)browser.cleanup();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

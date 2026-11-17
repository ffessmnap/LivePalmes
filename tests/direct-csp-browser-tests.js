'use strict';
const assert=require('node:assert/strict');
const {startStaticServer,launchBrowser,evaluate,waitFor}=require('../tools/capture-portal-design');
const probe=`window.__cspProbe={};
try{eval('window.__cspEvalExecuted=true');}catch(error){window.__cspProbe.evalDenied=error.name==='EvalError';}
const inline=document.createElement('script');inline.textContent='window.__cspInlineExecuted=true';document.body.append(inline);
const button=document.createElement('button');button.setAttribute('onclick','window.__cspHandlerExecuted=true');document.body.append(button);button.click();
const external=document.createElement('script');external.src='https://untrusted.invalid/csp-test.js';document.head.append(external);
const base=document.createElement('base');base.href='https://untrusted.invalid/';document.head.append(base);
window.__cspProbe.baseDenied=new URL(document.baseURI).origin===location.origin;
window.__cspProbe.ready=true;`;
async function main(){
 const home=require('../functions/nap-home-page').render({events:Array.from({length:5},(_,index)=>({id:String(900010+index),name:'Rendez-vous CSP '+index,date:'2026-11-22',endDate:'2026-11-22',eventType:'pool',level:'regional',city:'Dijon'})),documents:[{title:'Document CSP',url:'https://nap.ffessm.fr/fixture.pdf',publishedAt:'2026-11-16T10:00:00Z'}]},Date.parse('2026-11-17T10:00:00Z'));
 const {server,baseUrl}=await startStaticServer(new Map([['/__direct-csp-probe.js',probe],['/index.html',home]]),{rootPage:'/index.html'});let browser;
 try{
  browser=await launchBrowser();const {client}=browser;
  await client.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>__cspViolations.push({directive:event.effectiveDirective,blocked:event.blockedURI}));
  const auth={currentUser:null,onAuthStateChanged:callback=>{queueMicrotask(()=>callback(null));return ()=>{};},signOut:async()=>{}};
  window.firebase={apps:[{}],auth:()=>auth,app:()=>({functions:()=>({httpsCallable:()=>async()=>({data:{items:[]}})})})};`});
  for(const width of [1280,390])for(const page of ['','index.html','direct.html','direct-admin.html','direct-consoles.html']){
   const response=await fetch(baseUrl+'/'+page);assert.equal(response.status,200);const policy=response.headers.get('content-security-policy');
   assert(policy?.includes("object-src 'none'"));assert(!policy.split(';').find(value=>value.trim().startsWith('script-src')).includes("'unsafe-inline'"));
   await client.send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<700});
   await client.send('Page.navigate',{url:baseUrl+'/'+page+'?id=900001&role=referee'});
   const isHome=page===''||page==='index.html';
   assert(await waitFor(client,isHome?"document.readyState==='complete' && document.querySelector('#publicSiteHeader')":"document.readyState==='complete' && window.LivePalmesDirectPresentation",10000),'Les modules locaux restent executes : '+page);
   if(isHome){
    assert(await waitFor(client,"document.querySelector('.public-home-events-toggle') && document.querySelector('#publicHomeDocuments')?.textContent.includes('Document CSP')",5000),'Accueil prepare par le vrai moteur, documents et rendez-vous fictifs');
    assert.equal(await evaluate(client,"const toggle=document.querySelector('.public-home-events-toggle');toggle.click();return toggle.getAttribute('aria-expanded');"),'true','Le script accueil et son controle local fonctionnent sous CSP');
   }
   if(page==='direct-consoles.html')assert.equal(await evaluate(client,"return window.LIVEPALMES_ENVIRONMENT"),'test','Bootstrap inline exact autorise par son empreinte');
   assert.deepEqual(await evaluate(client,'return __cspViolations;'),[],'Initialisation et ressources legitimes sans refus CSP : '+page);
   await evaluate(client,"const script=document.createElement('script');script.src='/__direct-csp-probe.js';document.head.append(script);");
   assert(await waitFor(client,'window.__cspProbe?.ready && __cspViolations.length>=4',5000),'Refus CSP effectivement observes : '+page);
   const result=await evaluate(client,"return {probe:__cspProbe,inline:!!window.__cspInlineExecuted,handler:!!window.__cspHandlerExecuted,eval:!!window.__cspEvalExecuted,violations:__cspViolations};");
   assert.equal(result.probe.evalDenied,true);assert.equal(result.probe.baseDenied,true);
   assert.equal(result.inline,false);assert.equal(result.handler,false);assert.equal(result.eval,false);
   assert(result.violations.some(value=>value.blocked==='inline'));
   assert(result.violations.some(value=>value.blocked==='eval'));
   assert(result.violations.some(value=>value.blocked.startsWith('https://untrusted.invalid')));
  }
  console.log('CSP accueil/Direct : cinq URL,1280/390 px, accueil du vrai moteur sur fixtures et controle local fonctionnels, scripts locaux et bootstrap exact autorises ; inline, gestionnaire injecte, eval, script externe et base externe refuses. Services fictifs, HTTPS externe bloque.');
 }finally{if(browser){await browser.client.send('Browser.close').catch(()=>{});browser.cleanup();}server.closeAllConnections();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

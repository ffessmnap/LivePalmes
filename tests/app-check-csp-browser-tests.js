"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const {launchBrowser,evaluate,waitFor}=require("../tools/capture-portal-design");
const root=path.resolve(__dirname,"..");
const policy=JSON.parse(fs.readFileSync(path.join(root,"firebase.json"),"utf8")).hosting.headers.find(row=>row.source==="/portail.html").headers.find(row=>row.key==="Content-Security-Policy").value;
const cases=[
 ['script','https://www.google.com/untrusted/fixture.js',true],
 ['script','https://www.google.com/recaptcha/fixture.js',false],
 ['frame','https://www.google.com/recaptcha/fixture-frame',false],
 ['frame','https://recaptcha.google.com/recaptcha/fixture-frame',false],
 ['frame','https://www.google.com/untrusted/frame',true],
 ['connect','https://www.google.com/recaptcha/fixture-request',false],
 ['connect','https://www.google.com/untrusted/request',true],
 ['inline','',true],['eval','',true]
];
const probe=(mappedCases)=>`window.__violations=[];document.addEventListener('securitypolicyviolation',event=>__violations.push(event.effectiveDirective));
window.__localReady=true;
window.__probe=async(kind,url)=>{window.__probeDone=false;const count=__violations.length;
 if(kind==='script'){const el=document.createElement('script');el.src=url;document.body.append(el);}
 if(kind==='frame'){const el=document.createElement('iframe');el.src=url;document.body.append(el);}
 if(kind==='connect')fetch(url).catch(()=>{});
 if(kind==='inline'){const el=document.createElement('script');el.textContent='window.__inlineExecuted=true';document.body.append(el);}
 if(kind==='eval'){try{eval('window.__evalExecuted=true')}catch{}}
 await new Promise(resolve=>setTimeout(resolve,220));window.__probeResult=__violations.slice(count);window.__probeDone=true;
};
(async()=>{window.__results=[];for(const [kind,url,denied] of ${JSON.stringify(mappedCases)}){await __probe(kind,url);__results.push({kind,url,denied,violations:__probeResult});}window.__done=true;})();`;
async function main(){
 // The existing HTTPS blocker runs before script CSP. Keep that boundary intact
 // and map only the documented Google origins onto separate local fixture ports.
 // The renderer then evaluates the same path restrictions against real resources.
 const resourceRequests=[];
 const resource=()=>http.createServer((req,res)=>{resourceRequests.push(req.url);res.setHeader('Access-Control-Allow-Origin','*');if(req.url.endsWith('.js')){res.setHeader('Content-Type','application/javascript');res.end(req.url.startsWith('/recaptcha/')?'window.__allowedExternalExecuted=true;':'window.__untrustedExternalExecuted=true;');}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local provider fixture</title>');}});
 const www=resource(),recaptcha=resource();
 await Promise.all([new Promise(resolve=>www.listen(0,'127.0.0.1',resolve)),new Promise(resolve=>recaptcha.listen(0,'127.0.0.1',resolve))]);
 const wwwOrigin='http://127.0.0.1:'+www.address().port,recaptchaOrigin='http://127.0.0.1:'+recaptcha.address().port;
 const fixturePolicy=policy.replaceAll('https://www.google.com/recaptcha/',wwwOrigin+'/recaptcha/').replaceAll('https://recaptcha.google.com/recaptcha/',recaptchaOrigin+'/recaptcha/');
 const mappedCases=cases.map(([kind,url,denied])=>[kind,url.replace('https://www.google.com',wwwOrigin).replace('https://recaptcha.google.com',recaptchaOrigin),denied]);
 assert(!policy.split(';').find(d=>d.trim().startsWith('script-src')).split(/\s+/).includes('https://www.google.com'));
 const server=http.createServer((req,res)=>{
  res.setHeader('Content-Security-Policy',fixturePolicy);
  if(req.url==='/probe.js'){res.setHeader('Content-Type','application/javascript');res.end(probe(mappedCases));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fixture CSP App Check</title><body><button id="local">Action locale</button><script src="/probe.js"></script></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await launchBrowser();const {client}=browser;
  for(const width of [1280,390]){
   await client.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<700});
   await client.send('Page.navigate',{url:base});assert(await waitFor(client,'window.__localReady',5000));
   assert(await waitFor(client,'window.__done',10000));
   const results=await evaluate(client,'return window.__results;');assert.equal(results.length,cases.length);
   for(const {kind,url,denied,violations} of results){
    assert.equal(violations.length>0,denied,width+' '+kind+' '+url+' '+JSON.stringify(violations));
   }
   assert.deepEqual(await evaluate(client,'return {inline:!!window.__inlineExecuted,eval:!!window.__evalExecuted,local:!!document.getElementById("local"),allowedExternal:!!window.__allowedExternalExecuted,untrustedExternal:!!window.__untrustedExternalExecuted};'),{inline:false,eval:false,local:true,allowedExternal:true,untrustedExternal:false});
  }
  assert(resourceRequests.some(url=>url==='/recaptcha/fixture.js'));assert(!resourceRequests.some(url=>url.startsWith('/untrusted/')));
  console.log('Prepared portal CSP,1280/390: documented origins mapped to separate local ports, real allowed script executes, other paths/inline/eval refused; original HTTPS boundary unchanged, no real provider or account.');
 }finally{if(browser){await browser.client.send('Browser.close').catch(()=>{});browser.cleanup();}for(const owned of [server,www,recaptcha])owned.closeAllConnections();await Promise.all([server,www,recaptcha].map(owned=>new Promise(resolve=>owned.close(resolve))));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{start}=require('./helpers/firebase-mfa-sdk-fixture'),{launchBrowser,evaluate,waitFor}=require('../tools/capture-portal-design');
async function main(){
 const {server,baseUrl}=await start();let browser;
 try{
  browser=await launchBrowser();const {client}=browser;
  async function ready(version,width,policy='/portail.html'){
   await client.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<700});
   await client.send('Page.navigate',{url:baseUrl+'/?version='+version+'&policy='+encodeURIComponent(policy)});assert(await waitFor(client,'window.__ready',10000));
  }
  async function challenge(reauth=false,custom=''){
   await evaluate(client,'__start('+reauth+(custom?','+custom:'')+');');
   assert(await waitFor(client,"document.querySelector('[data-mfa-code]')&&!document.querySelector('[data-mfa-code]').disabled&&document.getElementById('livepalmesMfaStyles')?.sheet",10000));
  }
  async function submit(code){await evaluate(client,"document.querySelector('[data-mfa-code]').value="+JSON.stringify(code)+";document.querySelector('.livepalmes-mfa-dialog form').requestSubmit();");}
  for(const policy of ['/portail.html','/direct-admin.html'])for(const version of ['10.12.2','10.12.5'])for(const width of [1280,390,320]){
   await ready(version,width,policy);await challenge();
   assert.equal(await evaluate(client,'return __auth.currentUser'),null,'Pas de compte avant le facteur');
   const layout=await evaluate(client,"const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth,touch:[...d.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44),focus:document.activeElement===d.querySelector('[data-mfa-code]')};");
   assert(layout.inside&&layout.touch&&layout.focus,'Dialogue accessible sans debordement');
   if(version==='10.12.5'){const output=path.resolve('tmp/mfa-client-browser');fs.mkdirSync(output,{recursive:true});const capture=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'challenge-'+width+'.png'),Buffer.from(capture.data,'base64'));}
   const calls=await evaluate(client,'return __authCalls.length');await submit('bad');assert.equal(await evaluate(client,'return __authCalls.length'),calls,'Code mal forme refuse avant requete');
   await evaluate(client,'__badCode=true');await submit('000000');
   assert(await waitFor(client,"document.querySelector('[data-mfa-message]')?.textContent.includes('n’a pas pu')",5000));
   assert.equal(await evaluate(client,'return __auth.currentUser'),null);assert.equal(await evaluate(client,'return __business'),0);
   await evaluate(client,'__badCode=false');await submit('123456');assert(await waitFor(client,'__outcome?.status===\'accepted\'',5000));
   assert.deepEqual(await evaluate(client,'return __outcome'),{status:'accepted',uid:'mfa-fixture',compatUser:true});
   assert.deepEqual(await evaluate(client,'return __cspViolations'),[],policy+' : SDK et dialogue sans violation CSP');
   assert.equal(await evaluate(client,'return document.querySelectorAll("dialog").length'),0);
   await challenge(true);await submit('123456');assert(await waitFor(client,'__outcome?.status===\'accepted\'',5000));
   assert.equal(await evaluate(client,'return __auth.currentUser.uid'),'mfa-fixture');assert.equal(await evaluate(client,"return __authCalls.includes('/v1/token')"),true,'Token actualise apres MFA de reconnexion');
   await challenge(true);await evaluate(client,'__auth.signOut();');assert(await waitFor(client,"__outcome?.code==='auth/mfa-context-changed'",5000));
   assert.equal(await evaluate(client,'return document.querySelectorAll("dialog").length'),0);
   await challenge();await evaluate(client,"document.querySelector('[data-mfa-cancel]').click();");assert(await waitFor(client,"__outcome?.code==='auth/mfa-cancelled'",1000));
   assert.equal(await evaluate(client,'return __auth.currentUser'),null);
  }
  // Loading, competing requests and late completions never resume the caller.
  await ready('10.12.5',390);
  await evaluate(client,"__start(false,__factory.createMfaAuth({document,sdkLoader:async()=>{throw Error('Fixture SDK unavailable');},versionReader:()=>__version}));");
  assert(await waitFor(client,"__outcome?.code==='auth/mfa-unavailable'",5000));
  assert.equal(await evaluate(client,'return __auth.currentUser'),null);assert.equal(await evaluate(client,'return document.querySelectorAll("dialog").length'),0);
  await evaluate(client,"window.__deferredSdk=new Promise(resolve=>window.__finishSdk=resolve);__start(false,__factory.createMfaAuth({document,sdkLoader:()=>__deferredSdk,versionReader:()=>__version}));");
  assert(await waitFor(client,'document.querySelector("dialog")',5000));
  await evaluate(client,"document.querySelector('[data-mfa-cancel]').click();__sdkModule.then(__finishSdk);");assert(await waitFor(client,"__outcome?.code==='auth/mfa-cancelled'",1000));
  assert.equal(await evaluate(client,'return __authCalls.filter(p=>p.endsWith("mfaSignIn:finalize")).length'),0);
  await challenge();await evaluate(client,'__pauseFinalize=true');await submit('123456');assert(await waitFor(client,'window.__releaseFinalize',1000));
  assert.equal(await evaluate(client,"return document.querySelector('[data-mfa-cancel]').disabled"),true,'Pas d annulation ambigue apres envoi au fournisseur');
  await evaluate(client,"__mfa.resolve(__auth,__challenge).catch(e=>window.__concurrent=e.code);document.querySelector('dialog').dispatchEvent(new Event('cancel',{cancelable:true}));");
  assert(await waitFor(client,"__concurrent==='auth/mfa-in-progress'",1000));assert.equal(await evaluate(client,'return document.querySelectorAll("dialog[open]").length'),1);
  await evaluate(client,"document.querySelector('dialog').close();");assert(await waitFor(client,"__outcome?.code==='auth/mfa-context-changed'",1000));
  await evaluate(client,'__releaseFinalize();');assert(await waitFor(client,"__auth.currentUser?.uid==='mfa-fixture'",5000));
  assert.equal(await evaluate(client,'return __business'),0,'Reponse Auth tardive ne reprend aucune action cliente');
  await evaluate(client,'__auth.signOut().then(()=>{__pauseFinalize=false;__factorMode="phone";__start();});');assert(await waitFor(client,"__outcome?.code==='auth/mfa-unsupported'",5000));
  assert.equal(await evaluate(client,'return document.querySelectorAll("dialog").length'),0);
  await evaluate(client,'__factorMode="multiple";');await challenge();
  assert.equal(await evaluate(client,"return document.querySelector('[data-mfa-factor-label]').hidden"),false);assert.equal(await evaluate(client,"return document.querySelector('dialog img')"),null,'Nom du facteur rendu comme texte');
  await evaluate(client,"document.querySelector('[data-mfa-factor]').value='1';");await submit('123456');assert(await waitFor(client,"__outcome?.status==='accepted'",5000));
  assert.equal(await evaluate(client,'return __selectedFactor'),'FAKE-SECOND');
  console.log('MFA client : vrais SDK10.12.2/10.12.5 sous les CSP exactes portail et Direct avec API Auth fictives, 1280/390/320px ; code invalide, connexion, reauth+token, annulation, changement de compte, concurrence, reponse tardive, facteur non pris en charge et selection sure. Aucun compte/facteur reel, HTTPS navigateur bloque.');
 }finally{if(browser){await browser.client.send('Browser.close').catch(()=>{});browser.cleanup();}server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

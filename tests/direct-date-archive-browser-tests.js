'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{start}=require('./helpers/direct-console-http-fixture'),{launchBrowser,evaluate,waitFor}=require('../tools/capture-portal-design');
async function main(){
  let now=Date.parse('2026-11-08T22:59:59Z');const setup=await start({clock:()=>now}),{server,baseUrl,pool}=setup;let browser;
  const output=path.resolve('tmp/direct-date-archive-browser');fs.mkdirSync(output,{recursive:true});
  const bootstrap=`window.__errors=[];window.addEventListener('error',e=>__errors.push(e.message));window.addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));window.__calls=[];const user={uid:'root'};window.firebase={apps:[{}],auth:()=>({currentUser:user,onAuthStateChanged:fn=>queueMicrotask(()=>fn(user)),signOut:async()=>{}}),app:()=>({functions:()=>({httpsCallable:()=>async input=>{__calls.push(input);const response=await fetch('/fixture-rpc',{method:'POST',body:JSON.stringify(input)}),data=await response.json();if(!response.ok)throw Object.assign(Error(data.message),{code:data.code,details:data.details});return {data};}})})};const nativeTimeout=setTimeout;window.setTimeout=(fn,delay,...args)=>nativeTimeout(fn,delay===15000?200:delay===30000?50:delay,...args);window.showDirectoryPicker=async()=>({async *values(){yield {kind:'file',name:'TEST_AS_01_01_01_100SF.txt',getFile:async()=>new File(['1;011000;000000;000000;000000;000000;000000\\n2;011100;000000;000000;000000;000000;000000\\n3;011200;000000;000000;000000;000000;000000\\n4;011300;000000;000000;000000;000000;000000\\n5;011400;000000;000000;000000;000000;000000\\n6;011500;000000;000000;000000;000000;000000\\n7;011600;000000;000000;000000;000000;000000\\n8;011700;000000;000000;000000;000000;000000'],'TEST_AS_01_01_01_100SF.txt')};}});`;
  try{
    browser=await launchBrowser();const client=browser.client;await client.send('Page.addScriptToEvaluateOnNewDocument',{source:bootstrap});
    await client.send('Page.navigate',{url:baseUrl+'/direct-admin.html?id=900001'});assert.ok(await waitFor(client,"LivePalmesDirectBureau?.instance?.state.data",10000));
    assert.equal(await evaluate(client,"return LivePalmesDirectAdmin.state.data.config.state"),'active');
    now=Date.parse('2026-11-08T23:00:00Z');assert.ok(await waitFor(client,"document.querySelector('#archiveCorrection')",5000),'Une console ouverte traverse minuit puis ferme son interface');
    assert.equal(await evaluate(client,"return Boolean(document.querySelector('#bureauOperations'))"),false);
    assert.equal(await evaluate(client,"return LivePalmesDirectAdmin.watcher.active"),false);
    for(const width of [1440,1024,390]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<700});
      await client.send('Page.navigate',{url:baseUrl+'/direct-admin.html?id=900001'});assert.ok(await waitFor(client,"document.querySelector('#archiveCorrection')",5000));
      assert.equal(await evaluate(client,"return document.querySelector('#directState').value"),'active','Un archivage automatique ne devient pas manuel au prochain enregistrement');
      assert.ok(await evaluate(client,"return document.querySelector('.direct-archive-note').textContent==='Archivé automatiquement selon les dates'"));
      assert.equal(await evaluate(client,"return Boolean(document.querySelector('.direct-watch,#publishDocument,#bureauOperations'))"),false,'Pas de publication automatique ni consoles en archive');
      assert.ok(await evaluate(client,"return document.querySelector('#directPdfImports').hidden&&document.querySelector('#openSeriesImport').disabled"));
      assert.equal(await evaluate(client,"return [...document.querySelectorAll('[data-direct-console]')].some(node=>node.hasAttribute('href'))"),false);
      await evaluate(client,"document.querySelector('#archiveCorrection').click()");assert.ok(await waitFor(client,"document.querySelector('[data-watch-folder]')",5000));
      assert.equal(await evaluate(client,"return __calls.filter(c=>c.action==='settings').length"),0,'L’action ne modifie ni état ni accès');
      await evaluate(client,"document.querySelector('[data-watch-folder]').click()");assert.ok(await waitFor(client,"document.querySelector('[data-watch-start]')",5000));
      assert.ok(await evaluate(client,"return __calls.find(c=>c.action==='watchContext').archiveCorrection"));
      assert.equal(await evaluate(client,"return document.querySelector('[data-watch-authorize]').checked||document.querySelector('[data-watch-grid]').checked"),false,'Les confirmations restent obligatoires');
      await evaluate(client,"document.querySelector('[data-watch-start]').click()");assert.equal(await evaluate(client,"return LivePalmesDirectAdmin.watcher.active"),false);
      assert.ok(await evaluate(client,"return document.documentElement.scrollWidth<=innerWidth"),'Pas de débordement '+width);
      const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'archive-'+width+'.png'),Buffer.from(shot.data,'base64'));
      if(width===1440){await evaluate(client,"document.querySelector('[data-watch-grid]').checked=true;document.querySelector('[data-watch-existing]').checked=true;document.querySelector('[data-watch-authorize]').checked=true;document.querySelector('[data-watch-start]').click()");assert.ok(await waitFor(client,"__calls.some(c=>c.action==='publishBatch')&&document.querySelector('[data-watch-last-publication]').textContent!=='—'",5000),'Correction WinPalme publiée dans le vrai service isolé');assert.ok(await evaluate(client,"return __calls.filter(c=>['previewBatch','publishBatch'].includes(c.action)).every(c=>c.archiveCorrection===true)"));assert.equal(await evaluate(client,"return LivePalmesDirectAdmin.state.data.config.state"),'archived');}
      await evaluate(client,"document.querySelector('#archiveCorrection').click()");assert.equal(await evaluate(client,"return Boolean(document.querySelector('.direct-watch'))"),false);
      assert.deepEqual(await evaluate(client,'return __errors'),[]);
    }
    assert.equal(pool.inspect().configs[0].state,'active');assert.equal(pool.inspect().entries.length,14);
    await client.send('Page.navigate',{url:baseUrl+'/direct-consoles.html?id=900001&role=referee'});assert.ok(await waitFor(client,"document.querySelector('#consoleStatus')?.textContent||document.querySelector('#terrainNotice')?.textContent||__calls.some(c=>c.action==='consoleSnapshot')",5000));
    assert.ok(await evaluate(client,"return !LivePalmesDirectConsole.state.data"),'Une adresse de console ne rouvre pas l’archive');
    console.log('Archive navigateur isolé : fermeture à minuit, correction WinPalme explicite, confirmations conservées, réglage enregistré distinct et desktop/tablette/mobile vérifiés, sans accès réel.');
  }finally{if(browser){await browser.client.send('Browser.close').catch(()=>{});browser.cleanup();}server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {start}=require('./helpers/direct-console-http-fixture');
const {launchBrowser,evaluate,waitFor}=require('../tools/capture-portal-design');

async function main(){
  const {server,baseUrl,id}=await start(),output=path.resolve('tmp/direct-search-keyboard');
  fs.mkdirSync(output,{recursive:true});let browser;
  const bootstrap=`window.__publicCalls=[];window.__errors=[];
    addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
    const nativeFetch=fetch;window.fetch=(url,options)=>{const u=new URL(url,location.href);
      if(u.searchParams.get('action')==='records')return Promise.resolve({ok:true,json:async()=>({data:{records:[],franceRecords:[]}})});
      if(u.searchParams.get('action')==='direct'){__publicCalls.push(String(url));return nativeFetch('/fixture-public?'+u.searchParams,options);}return nativeFetch(url,options);};
    // The layout viewport stays unchanged when this keyboard viewport shrinks.
    const visible=new EventTarget();Object.assign(visible,{width:innerWidth,height:innerHeight,offsetTop:0,offsetLeft:0});
    Object.defineProperty(window,'visualViewport',{configurable:true,value:visible});
    window.__keyboard=(height,top=0)=>{Object.assign(visible,{width:innerWidth,height,offsetTop:top});visible.dispatchEvent(new Event('resize'));visible.dispatchEvent(new Event('scroll'));};`;
  try{
    browser=await launchBrowser();const client=browser.client;
    await client.send('Page.addScriptToEvaluateOnNewDocument',{source:bootstrap});
    const reports=[];
    for(const width of [320,390,430,1440]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
      await client.send('Page.navigate',{url:baseUrl+'/direct.html?id='+id});
      assert.ok(await waitFor(client,'LivePalmesDirectPublic.state.data&&!document.querySelector("#directFind").disabled',5000));
      const before=await evaluate(client,`__keyboard(innerHeight);scrollTo(0,250);return {calls:__publicCalls.length,selection:[LivePalmesDirectPublic.state.session,LivePalmesDirectPublic.state.data.selectedEventId],y:scrollY,style:document.body.getAttribute('style')}`);
      await evaluate(client,'document.querySelector("#directFind").click()');
      assert.ok(await waitFor(client,"document.querySelector('[data-search-status]').textContent.includes('toute la compétition')",5000));
      await evaluate(client,"const input=document.querySelector('#directFindInput');input.value='nageur';input.dispatchEvent(new Event('input'))");
      assert.equal(await evaluate(client,"return document.querySelectorAll('[data-search-person]').length"),14);
      assert.equal(await evaluate(client,'return __publicCalls.length'),before.calls+1,'One grouped read, none per keystroke');
      const mobile=width<700;
      assert.equal(await evaluate(client,"return document.querySelector('#directSearchPanel').matches(':modal')"),mobile);
      assert.equal(await evaluate(client,"return document.body.style.position==='fixed'"),mobile);
      if(mobile){
        await evaluate(client,'__keyboard(325,31)');
        const geometry=await evaluate(client,`const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right};};return {layoutHeight:innerHeight,panel:rect('#directSearchPanel'),input:rect('#directFindInput'),close:rect('[data-search-close]'),results:rect('#directSearchResults'),scrollable:document.querySelector('#directSearchResults').scrollHeight>document.querySelector('#directSearchResults').clientHeight};`);
        assert.equal(geometry.layoutHeight,844,'Keyboard must not shrink the layout viewport in this regression');
        assert.equal(geometry.panel.top,31);assert.equal(geometry.panel.bottom,356);
        for(const key of ['input','close','results'])assert.ok(geometry[key].top>=31&&geometry[key].bottom<=356&&geometry[key].left>=0&&geometry[key].right<=width,JSON.stringify(geometry));
        assert.ok(geometry.results.height>=90&&geometry.scrollable,'Results remain visible and scrollable above the keyboard');
        await evaluate(client,"document.querySelector('#directSearchResults li:last-child button').scrollIntoView({block:'nearest'})");
        const last=await evaluate(client,"const r=document.querySelector('#directSearchResults li:last-child button').getBoundingClientRect();return {top:r.top,bottom:r.bottom}");
        assert.ok(last.top>=geometry.results.top&&last.bottom<=geometry.results.bottom+1);
        const screenshot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'keyboard-'+width+'.png'),Buffer.from(screenshot.data,'base64'));
        reports.push({width,geometry});
      }else{
        const rect=await evaluate(client,"const r=document.querySelector('#directSearchPanel').getBoundingClientRect();return {width:r.width,right:r.right,height:r.height}");
        assert.equal(rect.width,360);assert.ok(rect.height<600&&rect.right<=width);
      }
      await evaluate(client,"document.querySelector('#directSearchResults li:last-child button').click()");
      assert.ok(await waitFor(client,"document.querySelector('.direct-dialog[open] h2')?.textContent.includes('NAGEUR')",5000));
      assert.equal(await evaluate(client,"return document.querySelector('#directSearchPanel').hidden&&document.activeElement.id!=='directFindInput'"),true,'Search closes and keyboard loses focus before profile');
      assert.equal(await evaluate(client,'return document.body.style.position'),'', 'Body unlocked');
      assert.equal(await evaluate(client,'return scrollY'),before.y,'Page position restored');
      assert.deepEqual(await evaluate(client,'return [LivePalmesDirectPublic.state.session,LivePalmesDirectPublic.state.data.selectedEventId]'),before.selection);
      assert.equal(await evaluate(client,'return __publicCalls.length'),before.calls+1,'Profile reuses the grouped cache');
      await evaluate(client,"document.querySelector('.direct-dialog[open]').close();__keyboard(844);document.querySelector('#directFind').click()");
      assert.ok(await waitFor(client,"document.querySelector('[data-search-person]')",5000));
      await evaluate(client,"document.querySelector('#directFindInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");
      assert.ok(await evaluate(client,"return document.activeElement.matches('[data-search-person]')"),'Search keyboard action focuses a result: '+JSON.stringify(await evaluate(client,"return {width:innerWidth,hidden:document.querySelector('#directSearchPanel').hidden,open:document.querySelector('#directSearchPanel').open,active:document.activeElement.outerHTML,results:document.querySelectorAll('[data-search-person]').length}")));
      await evaluate(client,"document.querySelector('#directSearchPanel').dispatchEvent(new Event('cancel',{cancelable:true}))");
      assert.equal(await evaluate(client,"return document.querySelector('#directSearchPanel').hidden&&document.body.style.position===''"),true);
      const saved=await evaluate(client,"return document.querySelector('#directSearchPanel').style.cssText");
      await evaluate(client,'__keyboard(250,50)');
      assert.equal(await evaluate(client,"return document.querySelector('#directSearchPanel').style.cssText"),saved,'Closed search has no live viewport listeners');
      await evaluate(client,"__keyboard(844);document.querySelector('#directFind').click();document.querySelector('[data-search-clear]').click()");
      assert.equal(await evaluate(client,"return document.querySelectorAll('[data-search-person]').length"),0);
      await evaluate(client,"document.querySelector('[data-search-close]').click()");
      assert.equal(await evaluate(client,"return document.querySelector('#directSearchPanel').hidden&&document.activeElement.id==='directFind'"),true);
      await evaluate(client,"document.querySelector('#directFind').click();document.querySelector('[data-search-close]').click();document.querySelector('#directFind').click();document.querySelector('#directSearchPanel').dispatchEvent(new Event('close'))");
      assert.equal(await evaluate(client,"return document.querySelector('#directSearchPanel').open&&!document.querySelector('#directSearchPanel').hidden"),true,'An old queued close event cannot close a reopened search');
      await evaluate(client,"document.querySelector('[data-search-close]').click()");
      // Existing body styles and the no-VisualViewport fallback must also survive a cycle.
      await evaluate(client,"delete window.visualViewport;document.body.style.overflow='auto';document.querySelector('#directFind').click()");
      if(mobile)assert.equal(await evaluate(client,"return document.querySelector('#directSearchPanel').getBoundingClientRect().height"),844);
      await evaluate(client,"document.querySelector('#directSearchPanel').close()");
      assert.ok(await waitFor(client,"document.querySelector('#directSearchPanel').hidden",1000));
      assert.equal(await evaluate(client,"return document.body.style.overflow"),'auto');
      assert.deepEqual(await evaluate(client,'return __errors'),[]);
    }
    fs.writeFileSync(path.join(output,'proof.json'),JSON.stringify({keyboardViewportSimulated:true,realDataWrites:0,reports},null,2));
    console.log('Recherche Direct : clavier simulé sans réduire la page, résultats défilants 320/390/430, fiche et filtres conservés, restauration du scroll/focus/styles, fermeture et repli sans VisualViewport, panneau ordinateur 1440.');
  }finally{browser?.cleanup();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

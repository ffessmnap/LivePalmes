"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {startStaticServer,launchBrowser,evaluate,waitFor,presentationScript}=require("../tools/capture-portal-design");
async function reopen(client,setup="",swimmer="nsSwimmer"){
  await client.send("Runtime.evaluate",{expression:"(async()=>{const dialog=document.querySelector('#adminEngagementsSwimmerCorrectionDialog');if(dialog.open){const closed=new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));nsActions.closeEngagementSwimmerCorrectionDialog();await closed;}"+setup+";nsActions.openEngagementSwimmerCorrectionDialog("+swimmer+",'request');})()",awaitPromise:true});
}
async function main(){
  const {server,baseUrl}=await startStaticServer(),browser=await launchBrowser(),client=browser.client;
  try{for(const width of [1280,390,320])for(const theme of ["light","dark"]){
    await client.send("Emulation.setDeviceMetricsOverride",{width,height:950,deviceScaleFactor:1,mobile:width!==1280});
    await client.send("Page.navigate",{url:baseUrl+"/portail.html"});assert.ok(await waitFor(client,"document.readyState === 'complete'",12000));
    await evaluate(client,presentationScript({authenticated:true,hash:"mes-nageurs",selector:'[data-admin-view="club-swimmers"]',pinned:true}));
    await client.send("Runtime.evaluate",{expression:fs.readFileSync("assets/livepalmes-club-identity.js","utf8")});
    await evaluate(client,`
      document.documentElement.dataset.portalTheme=${JSON.stringify(theme)};
      window.nsCalls=[];window.nsAvailable=true;window.nsRequest=null;window.nsDelay=null;window.nsFail=false;window.nsFailIdentity=false;
      window.nsSwimmer={id:'42',swimmerIndexId:'42',clubId:'106',napSource:true,source:'reference',firstName:'Test',lastName:'FICTIF',birthDate:'2000-01-01',sex:'F',licenseNumber:'A-01-123',napFingerprint:'a'.repeat(64),nonSelectable:false,nsAvailable:true,nsVersion:0,napNsFingerprint:'b'.repeat(64)};
      const elements={};for(const el of document.querySelectorAll('[id^="adminEngagementsSwimmerCorrection"]')){const name=el.id.replace(/^admin/,'');elements[name[0].toLowerCase()+name.slice(1)]=el;}
      window.nsState={engagementClubSwimmers:[nsSwimmer],engagementClubPeopleRequestVersion:0,engagementSwimmerChangeRequests:[]};
      const actions={setFormPending:LivePalmesPortalNavigation.create({state:nsState,actions:{},config:{},elements}).setFormPending,
        engagementSwimmerDisplayName:s=>s.firstName+' '+s.lastName,clubDisplayLabel:()=> 'Club fictif',writeEngagementClubSwimmersCache:()=>{},renderEngagementClubSwimmersDirectory:()=>{},
        callFunction:async(name,data)=>{nsCalls.push({name,data});if(nsDelay)await nsDelay;if(nsFail||(!data.nsAction&&nsFailIdentity))throw Error('Erreur fictive sans réseau');
          if(data.nsAction==='save'){if(data.nonSelectable)nsSwimmer={...nsSwimmer,nonSelectable:true,nsVersion:1};else nsRequest={status:'pending'};}
          return {swimmer:{...nsSwimmer,nsAvailable},nsRequest};}};
      window.nsActions=LivePalmesPortalNationalRequests.create({state:nsState,actions,config:{},elements});
      nsActions.openEngagementSwimmerCorrectionDialog(nsSwimmer,'request');
    `);
    assert.ok(await waitFor(client,"!document.querySelector('[data-swimmer-ns-checkbox]').disabled"));
    const layout=await evaluate(client,`const ns=document.querySelector('[data-swimmer-ns]'),license=document.querySelector('.admin-engagements-swimmer-correction-license');return {
      insideIdentity:ns.closest('fieldset')===license.closest('fieldset'),
      beside:ns.getBoundingClientRect().left>license.getBoundingClientRect().left&&Math.abs(ns.getBoundingClientRect().top-license.getBoundingClientRect().top)<2,
      noButton:!document.querySelector('[data-swimmer-ns-save]'),quiet:document.querySelector('[data-swimmer-ns-status]').hidden,
      overflow:ns.closest('fieldset').scrollWidth>ns.closest('fieldset').clientWidth+1};`);
    assert.deepEqual(layout,{insideIdentity:true,beside:true,noButton:true,quiet:true,overflow:false});
    // Real pending component, delayed automatic RPC, no second request or identity submit.
    await evaluate(client,"nsDelay=new Promise(resolve=>window.nsRelease=resolve);document.querySelector('[data-swimmer-ns-checkbox]').click();");
    const adding=await evaluate(client,"return {disabled:document.querySelector('[data-swimmer-ns-checkbox]').disabled,animated:document.querySelector('[data-swimmer-ns-status]').classList.contains('is-loading'),button:document.querySelector('#adminEngagementsSwimmerCorrectionSubmit').classList.contains('admin-portal-submit-pending'),calls:nsCalls.length};");
    assert.deepEqual(adding,{disabled:true,animated:true,button:true,calls:2});
    await evaluate(client,"document.querySelector('[data-swimmer-ns-checkbox]').dispatchEvent(new Event('change',{bubbles:true}));nsActions.submitEngagementSwimmerCorrection();");
    assert.equal(await evaluate(client,"return nsCalls.length;"),2);
    await evaluate(client,"nsDelay=null;nsRelease();");assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('enregistré')"));
    assert.equal(await evaluate(client,"return nsState.engagementClubSwimmers[0].nonSelectable;"),true);
    await evaluate(client,"nsDelay=new Promise(resolve=>window.nsRelease=resolve);document.querySelector('[data-swimmer-ns-checkbox]').click();");
    const sending=await evaluate(client,`const msg=document.querySelector('[data-swimmer-ns-status]'),button=document.querySelector('#adminEngagementsSwimmerCorrectionSubmit');msg.scrollIntoView({block:'center'});return {
      message:msg.textContent,visible:!msg.hidden,animated:msg.classList.contains('is-loading'),dot:getComputedStyle(msg,'::before').content,
      busy:document.querySelector('#adminEngagementsSwimmerCorrectionForm').getAttribute('aria-busy'),button:button.textContent,
      spinner:button.classList.contains('admin-portal-submit-pending'),checkboxDisabled:document.querySelector('[data-swimmer-ns-checkbox]').disabled,
      nsMaintained:nsState.engagementClubSwimmers[0].nonSelectable,calls:nsCalls.length};`);
    assert.match(sending.message,/Envoi.*en cours/);assert.equal(sending.visible,true);assert.equal(sending.animated,true);assert.notEqual(sending.dot,"none");
    assert.equal(sending.busy,"true");assert.match(sending.button,/Envoi en cours/);assert.equal(sending.spinner,true);assert.equal(sending.checkboxDisabled,true);assert.equal(sending.nsMaintained,true);assert.equal(sending.calls,3);
    fs.mkdirSync('tmp/swimmer-ns-compact',{recursive:true});const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('tmp/swimmer-ns-compact/'+width+'-'+theme+'-sending.png',Buffer.from(shot.data,'base64'));
    await evaluate(client,"nsDelay=null;nsRelease();");assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('en attente de validation')"));
    const pending=await evaluate(client,"return {checked:document.querySelector('[data-swimmer-ns-checkbox]').checked,disabled:document.querySelector('[data-swimmer-ns-checkbox]').disabled,loading:document.querySelector('[data-swimmer-ns-status]').classList.contains('is-loading'),mainEnabled:!document.querySelector('#adminEngagementsSwimmerCorrectionSubmit').disabled};");
    assert.deepEqual(pending,{checked:true,disabled:true,loading:false,mainEnabled:true});
    assert.equal(await evaluate(client,"return Object.hasOwn(document.querySelector('#adminEngagementsSwimmerCorrectionSubmit').dataset,'idleLabel');"),false);
    // The identity correction keeps the same real spinner and in-flight text.
    await evaluate(client,"document.querySelector('#adminEngagementsSwimmerCorrectionLastName').value='CORRIGE';document.querySelector('#adminEngagementsSwimmerCorrectionReason').value='Correction fictive';nsDelay=new Promise(resolve=>window.nsRelease=resolve);nsFailIdentity=true;nsActions.submitEngagementSwimmerCorrection();");
    assert.equal(await evaluate(client,"return document.querySelector('#adminEngagementsSwimmerCorrectionSubmit').classList.contains('admin-portal-submit-pending');"),true);
    assert.match(await evaluate(client,"return document.querySelector('#adminEngagementsSwimmerCorrectionMessage').textContent;"),/Envoi de la demande/);
    await evaluate(client,"nsDelay=null;nsRelease();");assert.ok(await waitFor(client,"document.querySelector('#adminEngagementsSwimmerCorrectionMessage').textContent.includes('Erreur fictive')"));
    await reopen(client,"nsFailIdentity=false;nsRequest={status:'rejected',resolutionNote:'Vérification nationale nécessaire <script>fictif</script>'}");
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('refusé')"));
    assert.equal(await evaluate(client,"return !!document.querySelector('[data-swimmer-ns-status] script');"),false);
    await reopen(client,"nsAvailable=false");
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('indisponible')"));
    assert.equal(await evaluate(client,"return document.querySelector('[data-swimmer-ns-checkbox]').disabled;"),true);
    assert.equal(await evaluate(client,"return document.querySelector('#adminEngagementsSwimmerCorrectionLastName').disabled;"),false);
    // Uncertain save: restore the confirmed flag, stop animation, require an explicit reopen.
    await reopen(client,"nsAvailable=true;nsRequest=null");
    assert.ok(await waitFor(client,"!document.querySelector('[data-swimmer-ns-checkbox]').disabled"));
    await evaluate(client,"nsFail=true;document.querySelector('[data-swimmer-ns-checkbox]').click();");
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').dataset.tone==='error'"));
    assert.equal(await evaluate(client,"return document.querySelector('[data-swimmer-ns-status]').classList.contains('is-loading');"),false);
    assert.equal(await evaluate(client,"return document.querySelector('[data-swimmer-ns-checkbox]').checked;"),true);
    await reopen(client,"nsFail=false;nsDelay=new Promise(resolve=>window.nsRelease=resolve)");
    await reopen(client,"nsState.engagementClubPeopleRequestVersion++;nsRelease();nsDelay=null","{...nsSwimmer,nativePersonKind:'officials'}");
    assert.equal(await evaluate(client,"return document.querySelector('[data-swimmer-ns]').hidden;"),true);
    console.log(width+'px '+theme+': compact NS, automatic check/uncheck, delayed-RPC feedback, duplicate guard, identity sending, pending/error/schema absence and stale response passed');
  }}finally{browser.cleanup();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

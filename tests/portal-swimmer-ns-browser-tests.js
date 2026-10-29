"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {startStaticServer,launchBrowser,evaluate,waitFor,presentationScript}=require("../tools/capture-portal-design");
async function main(){
  const {server,baseUrl}=await startStaticServer(),browser=await launchBrowser(),client=browser.client;
  try{for(const width of [1280,390])for(const theme of ["light","dark"]){
    await client.send("Emulation.setDeviceMetricsOverride",{width,height:950,deviceScaleFactor:1,mobile:width===390});
    await client.send("Page.navigate",{url:baseUrl+"/portail.html"});assert.ok(await waitFor(client,"document.readyState === 'complete'",12000));
    await evaluate(client,presentationScript({authenticated:true,hash:"mes-nageurs",selector:'[data-admin-view="club-swimmers"]',pinned:true}));
    await evaluate(client,`
      document.documentElement.dataset.portalTheme=${JSON.stringify(theme)};
      window.nsCalls=[];window.nsAvailable=true;window.nsRequest=null;window.nsDelay=null;
      window.nsSwimmer={id:'42',swimmerIndexId:'42',clubId:'106',napSource:true,source:'reference',firstName:'Test',lastName:'FICTIF',birthDate:'2000-01-01',sex:'F',licenseNumber:'A-01-123',napFingerprint:'a'.repeat(64),nonSelectable:false,nsAvailable:true,nsVersion:0,napNsFingerprint:'b'.repeat(64)};
      const elements={};for(const el of document.querySelectorAll('[id^="adminEngagementsSwimmerCorrection"]')){const name=el.id.replace(/^admin/,'');elements[name[0].toLowerCase()+name.slice(1)]=el;}
      window.nsState={engagementClubSwimmers:[nsSwimmer],engagementClubPeopleRequestVersion:0,engagementSwimmerChangeRequests:[]};
      const actions={setFormPending:()=>{},engagementSwimmerDisplayName:s=>s.firstName+' '+s.lastName,clubDisplayLabel:()=> 'Club fictif',writeEngagementClubSwimmersCache:()=>{},renderEngagementClubSwimmersDirectory:()=>{},
        callFunction:async(name,data)=>{nsCalls.push({name,data});if(nsDelay)await nsDelay;if(data.nsAction==='save'){if(data.nonSelectable)nsSwimmer={...nsSwimmer,nonSelectable:true,nsVersion:1};else nsRequest={status:'pending'};}
          return {swimmer:{...nsSwimmer,nsAvailable},nsRequest};}};
      window.nsActions=LivePalmesPortalNationalRequests.create({state:nsState,actions,config:{},elements});
      nsActions.openEngagementSwimmerCorrectionDialog(nsSwimmer,'request');
    `);
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('sans validation')"));
    assert.equal(await evaluate(client,"return document.querySelector('[data-swimmer-ns-checkbox]').checked;"),false);
    await evaluate(client,"document.querySelector('[data-swimmer-ns-checkbox]').click();document.querySelector('[data-swimmer-ns-save]').click();");
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('enregistré')"));
    assert.equal(await evaluate(client,"return nsState.engagementClubSwimmers[0].nonSelectable;"),true);
    await evaluate(client,"document.querySelector('[data-swimmer-ns-checkbox]').click();document.querySelector('[data-swimmer-ns-save]').click();");
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('en attente de validation')"));
    const pending=await evaluate(client,`const section=document.querySelector('[data-swimmer-ns]'),button=section.querySelector('button');section.scrollIntoView({block:'center'});return {checked:section.querySelector('input').checked,disabled:button.disabled,nonSelectable:nsState.engagementClubSwimmers[0].nonSelectable,overflow:section.scrollWidth>section.clientWidth+1,buttonHeight:button.getBoundingClientRect().height,calls:nsCalls.length};`);
    assert.equal(pending.checked,true);assert.equal(pending.disabled,true);assert.equal(pending.nonSelectable,true);assert.equal(pending.overflow,false);assert.ok(pending.buttonHeight>=40);assert.equal(pending.calls,3);
    fs.mkdirSync('tmp/swimmer-ns',{recursive:true});const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('tmp/swimmer-ns/'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
    await evaluate(client,"nsActions.closeEngagementSwimmerCorrectionDialog();nsRequest={status:'rejected',resolutionNote:'Vérification nationale nécessaire <script>fictif</script>'};nsActions.openEngagementSwimmerCorrectionDialog(nsSwimmer,'request');");
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('refusé')"));
    assert.equal(await evaluate(client,"return !!document.querySelector('[data-swimmer-ns-status] script');"),false);
    await evaluate(client,"nsActions.closeEngagementSwimmerCorrectionDialog();nsAvailable=false;nsActions.openEngagementSwimmerCorrectionDialog(nsSwimmer,'request');");
    assert.ok(await waitFor(client,"document.querySelector('[data-swimmer-ns-status]').textContent.includes('activation')"));
    const unavailable=await evaluate(client,"return {ns:document.querySelector('[data-swimmer-ns-checkbox]').disabled,identity:document.querySelector('#adminEngagementsSwimmerCorrectionLastName').disabled};");
    assert.equal(unavailable.ns,true);assert.equal(unavailable.identity,false);
    // A delayed response from the previous club must not replace the next club's state.
    await evaluate(client,"nsActions.closeEngagementSwimmerCorrectionDialog();nsAvailable=true;nsDelay=new Promise(resolve=>window.nsRelease=resolve);nsActions.openEngagementSwimmerCorrectionDialog(nsSwimmer,'request');nsState.engagementClubPeopleRequestVersion++;nsActions.closeEngagementSwimmerCorrectionDialog();nsRelease();");
    await evaluate(client,"nsDelay=null;nsActions.openEngagementSwimmerCorrectionDialog({...nsSwimmer,nativePersonKind:'officials'},'request');");
    assert.equal(await evaluate(client,"return document.querySelector('[data-swimmer-ns]').hidden;"),true);
    console.log(width+'px '+theme+': NS check, pending withdrawal, rejection, escaped comment, missing schema, unchanged identity controls and stale club response passed');
  }}finally{browser.cleanup();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

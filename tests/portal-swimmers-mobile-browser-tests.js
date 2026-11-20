'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {startStaticServer,launchBrowser,evaluate,waitFor}=require('../tools/capture-portal-design');
async function main(){
  const output=path.resolve('tmp/portal-swimmers-mobile');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'fixture.html'),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/livepalmes-admin-portal.css"><link rel="stylesheet" href="/assets/livepalmes-portal-appearance.css"><body class="admin-portal-page" data-admin-auth="unlocked"><main id="adminPortalDashboard"><section id="adminEngagementsClubSwimmersPanel"><div id="swimmers"></div></section></main><script src="/assets/portal/deferred/club-entry-views.js"></script>');
  const events=fs.readFileSync('assets/portal/deferred/workspace-events.js','utf8');
  const handler=events.slice(events.indexOf('        portalContext.elements.engagementsClubSwimmersDirectoryList?.addEventListener'),events.indexOf('        portalContext.elements.engagementsSwimmerCorrectionForm?.addEventListener'));
  assert.ok(handler.includes('data-engagement-club-swimmer-directory-toggle'));
  const browser=await launchBrowser(),client=browser.client,{server,baseUrl}=await startStaticServer();
  try{
    await client.send('Page.addScriptToEvaluateOnNewDocument',{source:'window.LivePalmesPortalDeferred={register:(key,factory)=>window.directoryFactory=factory};window.__actions=[];'});
    for(const width of [1280,768,430,390,320]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:940,deviceScaleFactor:1,mobile:width<700});
      await client.send('Page.navigate',{url:baseUrl+'/tmp/portal-swimmers-mobile/fixture.html'});
      assert.ok(await waitFor(client,'window.directoryFactory',5000));
      await evaluate(client,`const state={engagementClubSwimmersLoaded:true,engagementClubSwimmersDirectorySexFilter:'all',engagementClubInactiveSwimmersDirectoryExpanded:true,engagementClubSwimmers:[{id:'one',source:'reference',napSource:true,lastName:'DE LA FONTAINE',firstName:'Marie Éléonore',sex:'F',clubActivityStatus:'active'},{id:'two',source:'reference',napSource:true,lastName:'EXEMPLE',firstName:'Camille',sex:'M',clubActivityStatus:'inactive'}]};
      const actions={escapeHtml:value=>String(value??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])),clubDisplayLabel:()=> 'Club fictif',normalizedEngagementClubSearch:()=>'',engagementClubSwimmerIsActive:row=>row.clubActivityStatus!=='inactive',engagementSwimmerDisplayName:row=>row.lastName+' '+row.firstName,engagementSwimmerCategory:()=> 'M60+',engagementCategoryLabel:()=> 'Master 60+',engagementPublicSwimmerProfileUrl:()=> '#',engagementSwimmerLicenseStatusIndicator:()=>'',setEngagementClubSwimmerActivityStatus:(...args)=>__actions.push(['activity',...args]),openEngagementSwimmerCorrectionDialog:(row,mode)=>__actions.push([mode,row.id])};
      window.context={state,actions,config:{},elements:{engagementsClubSwimmersDirectoryList:document.getElementById('swimmers')}};
      directoryFactory(context,{}).renderEngagementClubSwimmersDirectory();`);
      await evaluate(client,`new Function('portalContext','portalActions','portalState','global',${JSON.stringify(handler)})(context,context.actions,context.state,window)`);
      if(width<700){
        assert.ok(await evaluate(client,"return [...document.querySelectorAll('.admin-engagements-club-swimmers-directory-mobile-actions')].every(node=>!node.querySelector('[data-engagement-club-swimmer-duplicate]')&&getComputedStyle(node.querySelector('.admin-engagements-club-swimmers-directory-activity-button span')).display==='none')"));
        assert.ok(await evaluate(client,"const name=document.querySelector('.admin-engagements-club-swimmers-directory-toggle strong');return getComputedStyle(name).whiteSpace==='normal'&&getComputedStyle(name).webkitLineClamp==='2'"),'Nom long sur deux lignes');
        await evaluate(client,"document.querySelector('[data-engagement-club-swimmer-directory-toggle]').click()");
        assert.ok(await evaluate(client,"const button=document.querySelector('.admin-engagements-club-swimmers-directory-mobile-duplicate button');return button.checkVisibility()&&button.textContent.includes('Signaler un doublon')"));
        await evaluate(client,"document.querySelector('.admin-engagements-club-swimmers-directory-mobile-duplicate button').click();document.querySelector('.admin-engagements-club-swimmers-directory-mobile-actions [data-engagement-club-swimmer-activity]').click()");
        assert.deepEqual(await evaluate(client,'return __actions.map(action=>action.slice(0,2))'),[['duplicate','one'],['activity','one']],'Actions existantes conservées');
      }else{
        assert.ok(await evaluate(client,"return !document.querySelector('.admin-engagements-club-swimmers-directory-mobile-duplicate').checkVisibility()"));
        assert.ok(await evaluate(client,"return document.querySelector('.admin-engagements-club-swimmers-directory-actions [data-engagement-club-swimmer-duplicate]').checkVisibility()"));
      }
      for(const theme of ['light','dark']){
        await evaluate(client,`document.documentElement.dataset.portalTheme=${JSON.stringify(theme)}`);
        await client.send("Runtime.evaluate",{expression:"new Promise(resolve=>setTimeout(resolve,200))",awaitPromise:true});
        assert.equal(await evaluate(client,"return document.documentElement.dataset.portalTheme"),theme);
        if(theme==='dark')assert.equal(await evaluate(client,"return getComputedStyle(document.querySelector('.admin-engagements-club-swimmers-directory-row[data-sex=F]')).backgroundColor"),'rgb(50, 41, 56)');
        assert.ok(await evaluate(client,'return document.documentElement.scrollWidth<=innerWidth'),'Pas de débordement global');
        const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,`${width}-${theme}.png`),Buffer.from(shot.data,'base64'));
      }
    }
    console.log('Mes nageurs : vrai rendu et vrais gestionnaires, noms sur deux lignes, statut par icône, doublon dans le détail, ordinateur/mobile et thèmes clair/sombre vérifiés sur fixtures.');
  }finally{browser.cleanup();server.closeAllConnections();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

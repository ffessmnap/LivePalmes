'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {startStaticServer,launchBrowser,waitFor}=require('../tools/capture-portal-design'),{evaluate}=require('./helpers/portal-browser-evaluate');
function install(){
  document.body.dataset.adminAuth='unlocked';document.querySelector('#adminPortalDashboard').hidden=false;document.querySelector('#adminPortalLoginPanel').hidden=true;document.querySelector('#adminPortalNavToggle').hidden=false;
  window.testCaps=[];window.testCalls=[];
  const state={adminAuth:{hasCapability:cap=>testCaps.includes(cap)},currentAccessProfile:{},portalPendingOverviewLoaded:true,activeEngagementsNavEntry:'',activeEngagementsTab:'calendar',activeEngagementNationalTab:'deletions',activeEngagementsDetailTab:'general',dirtyEngagementDetailTabs:new Set(),engagementClubPersistedSwimmerIds:new Set(),engagementClubRecapEntries:[],engagementClubSelectionChanges:new Map(),engagementCompetitions:[],engagementOpenWaterCourses:[],selectedEngagementCompetitionId:'',selectedEngagementCompetition:null,selectedEngagementClubEntry:null};
  const actions=new Proxy({}, {get:(object,key)=>object[key]||(()=>{if(String(key).startsWith('load')||String(key).startsWith('callFunction'))testCalls.push(key);})});
  const elements={navigation:document.querySelector('#adminPortalNavigation'),sidebar:document.querySelector('.admin-portal-sidebar'),navToggle:document.querySelector('#adminPortalNavToggle'),engagementsView:document.querySelector('#adminEngagementsView'),engagementsViewTitle:document.querySelector('#adminEngagementsViewTitle'),engagementsTabPanels:document.querySelectorAll('[data-engagements-tab-panel]'),engagementsNationalPanels:document.querySelectorAll('[data-engagements-national-panel]')};
  const config={ENGAGEMENT_ROUTE_BY_HASH:{},ENGAGEMENT_DETAIL_TAB_GROUPS:{information:['general']},engagementClubSelectionChanges:new Map(),engagementClubEntriesAutosaveSwimmers:new Set()};
  window.testNav=LivePalmesPortalNavigation.create({state,actions,elements,config});Object.assign(actions,testNav);
  for(const link of document.querySelectorAll('link[data-portal-style-src]'))link.href=link.dataset.portalStyleSrc;
}
async function main(){
  const html=fs.readFileSync('portail.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),overrides=new Map([['/portail.html',html]]),{server,baseUrl}=await startStaticServer(overrides);let browser;
  try{
    browser=await launchBrowser();const client=browser.client,output=path.resolve('tmp/portal-direct-guide');fs.mkdirSync(output,{recursive:true});
    for(const width of [1440,1024,390,320]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:width<700});await client.send('Page.navigate',{url:baseUrl+'/portail.html#accueil'});assert.ok(await waitFor(client,"document.readyState==='complete'",5000));
      await evaluate(client,fs.readFileSync('assets/portal/navigation.js','utf8')+';('+install.toString()+')()');
      for(const [caps,visible] of [[['engagements.region.manage'],true],[['engagements.national.manage'],true],[['admin.full'],true],[['engagements.club.manage'],false],[['consoles.access'],false],[['consoles.manage'],false],[['records.manage'],false],[[],false]]){
        await evaluate(client,'window.testCaps='+JSON.stringify(caps)+';testNav.updateCapabilityView();testNav.setMobilePortalNavigationOpen(true)');
        const links=await evaluate(client,"return [...document.querySelectorAll('[data-livepalmes-direct]')].map(node=>({hidden:node.hidden,href:(node.matches('a')?node:node.querySelector('a')).getAttribute('href'),title:node.textContent}))");assert.equal(links.length,2);assert.ok(links.every(link=>link.hidden===!visible&&link.href==='direct-admin.html'&&link.title.includes('LivePalmes Direct')),'Visibilité '+caps+' '+width);
        assert.equal(await evaluate(client,"return document.querySelectorAll('a[href=\"pilotage-livepalmes.html\"]').length"),0,'Aucun ancien lien dans le portail');
      }
      await evaluate(client,"testCaps=['engagements.region.manage'];testNav.updateCapabilityView();testNav.setMobilePortalNavigationOpen(true)");const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'regional-'+width+'.png'),Buffer.from(shot.data,'base64'));
      await client.send('Page.navigate',{url:baseUrl+'/direct-guide.html'});assert.ok(await waitFor(client,"document.querySelectorAll('.guide-page').length===5&&document.readyState==='complete'",5000));assert.equal(await evaluate(client,'return document.documentElement.scrollWidth<=innerWidth'),true,'Guide sans débordement '+width);assert.equal(await evaluate(client,"return document.querySelectorAll('.guide-logo').length===5&&document.querySelectorAll('.screenshot img').length===3&&document.querySelectorAll('.diagram img').length===3&&[...document.images].every(image=>image.complete&&image.naturalWidth>0)"),true,'Illustrations et logo chargés');assert.ok(await evaluate(client,"return document.querySelector('.folder').textContent.includes('renc')&&document.querySelector('.path').textContent.includes('ResultatsSeries')"));
      const guide=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'guide-'+width+'.png'),Buffer.from(guide.data,'base64'));
      await client.send('Page.navigate',{url:baseUrl+'/direct-admin.html'});assert.ok(await waitFor(client,"document.readyState==='complete'",5000));await evaluate(client,"document.querySelector('#signOut').hidden=false");assert.equal(await evaluate(client,'return document.documentElement.scrollWidth<=innerWidth'),true,'Bureau avec aide et compte '+width);assert.equal(await evaluate(client,"return document.querySelector('.direct-header-actions a').getAttribute('href')"),'direct-guide.html');
    }
    assert.equal((await fetch(baseUrl+'/pilotage-livepalmes.html')).status,200,'Ancienne adresse préservée');console.log('Portail Direct : deux liens, rôles région/national/admin, révocation et exclusions club/consoles seules ; bureau avec aide et guide sur 1440/1024/390/320 px ; ancienne URL préservée. Aucun service réel.');
  }finally{if(browser){await browser.client.send('Browser.close').catch(()=>{});browser.cleanup();}server.closeAllConnections();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

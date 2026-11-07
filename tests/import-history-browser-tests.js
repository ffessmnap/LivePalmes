"use strict";
const assert=require('node:assert/strict'),fs=require('./helpers/source-files'),{chromium}=require('playwright');
const html=fs.readFileSync('portail.html','utf8'),importId='a'.repeat(64);
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try{for(const width of [1440,390,320]){
  const calls=[],errors=[],dialogs=[],page=await browser.newPage({viewport:{width,height:950}});let national=true,deleted=false,lost=true,accept=false;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await (accept?d.accept():d.dismiss());});
  await page.exposeFunction('fixtureCall',async(name,payload)=>{
   calls.push({name,payload:structuredClone(payload)});
   if(name==='listCompetitionImports')return {source:'nap',national,imports:[{source:'nap',importId,competitionId:5162,status:deleted?'deleted':'completed',fileName:'Résultats <test>.zip',metadata:{competitionName:'Compétition <test> très longue pour vérifier le retour à la ligne',date:'2026-11-07'},importedAt:'2026-11-07T10:00:00Z',metrics:{performances:1100,swimmers:125,clubs:22,relays:30,statuses:3},canDelete:!deleted,current:true}]};
   assert.equal(name,'deleteCompetitionImport');
   if(payload.action==='preview')return {competition:{libelle:'Compétition courante',date:'2026-11-07'},summary:{performances:1102,swimmers:126,clubs:23,relays:31,statuses:4},expectedFingerprint:'f'.repeat(64)};
   if(lost){lost=false;throw Error('Réponse perdue simulée');}
   deleted=true;return {deleted:true,summary:{performances:1102,relays:31,statuses:4}};
  });
  await page.route('**/*',r=>r.abort());await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body class="admin-portal-page"></body></html>'}));await page.goto('https://fixture.test/portail.html#import-competitions');
  await page.evaluate(html=>{const doc=new DOMParser().parseFromString(html,'text/html');document.body.append(doc.querySelector('#adminImportView'));document.querySelector('#adminImportView').hidden=false;window.LivePalmesEnvironment={sportingDataSource:'nap'};window.LivePalmesAppConfig={firebaseConfig:{}};window.LivePalmesPortalAuth={onChange:()=>{},status:()=>({signedIn:true,available:true}),isAdminAuthenticated:()=>true};const service={httpsCallable:name=>async payload=>({data:await fixtureCall(name,payload)})};window.firebase={initializeApp:()=>{},apps:[{}],app:()=>({functions:()=>service}),functions:()=>service};},html);
  for(const file of ['styles.css','assets/livepalmes-admin-portal.css','performances/public/import-competitions.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.addScriptTag({path:'assets/livepalmes-portal-ux.js'});await page.addScriptTag({path:'performances/public/import-competitions.js'});
  const button=page.locator('[data-delete-native-results]'),row=page.locator('.competition-import-native');await button.waitFor({state:'attached'});
  assert.match(await row.locator('summary').innerText(),/1\s*100 performances · 125 nageurs · 22 clubs/);assert.match(await row.locator('summary').innerText(),/<test>/);assert.equal(await row.locator('test').count(),0,'All source labels are escaped');
  await row.locator('summary').click();const reads=calls.length;await row.locator('summary').click();await row.locator('summary').click();assert.equal(calls.length,reads,'Expanding history is local');
  await button.click();assert.equal(calls.filter(c=>c.payload.action==='delete').length,0,'Cancel never writes');assert.match(dialogs[0],/1102 performances/,'Confirmation uses current server counts, not historical counts');assert.match(dialogs[0],/Aucune nouvelle sauvegarde/);assert.match(dialogs[0],/Records\/MPF officiels/);
  if(process.env.LIVEPALMES_IMPORT_HISTORY_SCREENSHOTS){fs.mkdirSync('outputs/import-history',{recursive:true});await page.screenshot({path:`outputs/import-history/history-${width}.png`,fullPage:true});}
  assert.equal(await row.evaluate(el=>el.scrollWidth>el.clientWidth+1),false,'No overflow at '+width);
  accept=true;await button.click();await page.locator('#competitionImportsProgress strong').filter({hasText:'Suppression à vérifier'}).waitFor();await button.click();await page.locator('#competitionImportsProgress strong').filter({hasText:'Résultats supprimés'}).waitFor();await page.waitForFunction(()=>!document.querySelector('[data-delete-native-results]'));
  const writes=calls.filter(c=>c.payload.action==='delete');assert.equal(writes.length,2);assert.deepEqual(writes[0].payload,writes[1].payload,'Lost-response retry keeps the same operation and consent');
  national=false;deleted=false;await page.locator('#competitionImportsRefreshButton').click();await page.waitForFunction(()=>document.querySelector('.competition-import-native summary')?.textContent.includes('Enregistré dans NAP'));assert.equal(await button.count(),0,'Regional UI cannot offer deletion');
  assert.deepEqual(errors,[]);await page.close();
 }console.log('Import history UI: actual script, current counters, no read on expand, cancel, stable retry, national-only action, source escaping and 1440/390/320 px layout; all requests simulated and external network blocked.');}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

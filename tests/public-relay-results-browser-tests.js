"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const html=fs.readFileSync('competition.html','utf8'),{membersFor}=require('../functions/nap-public-relay-members');
const relay={nageur1:168,nageur2:169,nageur3:170,nageur4:171,tps1:'010000',tps2:'020250',tps3:'030400',tps4:'040500'};
const members=membersFor(relay,new Map([168,169,170].map(id=>[id,{id:String(id),name:`Personne TEST ${id}`}])));
const event={id:'legacy-nap-5162',name:'Compétition test',date:'2026-10-11',city:'Ville',eventType:'pool',level:'regional',results:{dataPath:'results/nap-5162.json',pdfUrl:'https://fixture.test/protocole.pdf'},documents:[]};
const data={groups:[{eventLabel:'100 m Surface',sexLabel:'Hommes',performances:[{id:'10',swimmer:'Course individuelle',swimmerId:'168',club:'TEST',category:'SE',time:'1:00.00'}]},{eventLabel:'4X100SF · Relais',sexLabel:'Mixte',performances:[{id:'relay:21',swimmer:'Équipe TEST',isRelay:true,club:'TEST',category:'XSE',time:'4:05.00',members}]}]};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());await page.route('https://fixture.test/competition.html*',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('https://fixture.test/competition.html?id=legacy-nap-5162');
  for(const match of html.matchAll(/href="([^"?]+\.css)(?:\?[^"]*)?"/g)){const path=match[1].replace(/^\//,'');if(fs.existsSync(path))await page.addStyleTag({path});}
  await page.addScriptTag({path:'assets/public/livepalmes-public-calendar.js'});
  await page.evaluate(({event,data})=>{window.LivePalmesPublicCalendar={...window.LivePalmesPublicCalendar,json:async path=>path.startsWith('events/')?event:data};},{event,data});await page.addScriptTag({path:'assets/pages/competition.js'});
  await page.locator('#calendarResultGroup').waitFor();assert.equal(await page.locator('.calendar-result-row:not(.calendar-result-header)').count(),1);assert.equal(await page.locator('.calendar-relay-members').count(),0);await page.locator('#calendarResultGroup').selectOption('1');
  const details=page.locator('.calendar-relay-members');await details.locator('summary').click();assert.equal(await details.locator('li').count(),4);assert.match(await details.innerText(),/Fraction : 1:02\.50/);assert.match(await details.innerText(),/Passage cumulé : 2:02\.50/);assert.match(await details.innerText(),/Nageur non renseigné/);assert.equal(await details.locator('a').count(),3);assert.match(await details.locator('a').first().getAttribute('href'),/id=168/);assert.equal(await details.locator('a').first().getAttribute('target'),'_blank');
  let confirmed=false;page.once('dialog',async dialog=>{confirmed=true;assert.match(dialog.message(),/Personne TEST 168/);await dialog.dismiss();});await details.locator('a').first().click();assert.equal(confirmed,true);
  if(process.env.LIVEPALMES_ZIP_SCREENSHOTS){fs.mkdirSync('outputs/public-relay-results',{recursive:true});await details.scrollIntoViewIfNeeded();await page.screenshot({path:`outputs/public-relay-results/relay-${width}.png`});}
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.calendar-structured-results,.calendar-structured-results *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>el.className).slice(0,12));assert.deepEqual(overflow,[]);assert.deepEqual(errors,[]);await page.close();
 }console.log('Public relay UI: real competition page/controller, individual and relay groups, four ordered members, computed/cumulative times, missing identity, existing profile confirmation, keyboard/native details and no overflow at 1440/390/320 px; network blocked.');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

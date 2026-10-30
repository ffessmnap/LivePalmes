"use strict";
// Real portal markup/styles/modules; synthetic in-memory services, HTTPS blocked.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {startStaticServer,launchBrowser,evaluate,waitFor}=require('../tools/capture-portal-design');
const html=fs.readFileSync('portail.html','utf8');
const form=html.slice(html.indexOf('<form id="adminEngagementsEventsForm"'),html.indexOf('</form>',html.indexOf('<form id="adminEngagementsEventsForm"'))+7);
const source=fs.readFileSync('assets/livepalmes-admin-portal.js','utf8');
const literals=['ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS','ENGAGEMENT_OPEN_WATER_RELAY_EVENT','ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES'];
// Copy only the literal sporting definitions already shipped by the portal.
const literal=name=>{const start=source.indexOf('  const '+name+' = ');if(start<0)return null;return source.slice(start,source.indexOf(';',start)+1).trim();};
const categoryLiteral=literal(literals[0]),relayLiteral=literal(literals[1]);
const defaultsStart=source.indexOf('{ id: "150-elimination-SF"'),defaultsEnd=source.indexOf('\n  ];',defaultsStart);
const waterDefaults='['+source.slice(defaultsStart,defaultsEnd)+']';
const fixture='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/livepalmes-admin-portal.css"></head><body class="admin-portal-page"><section id="adminEngagementsDetail">'+form+'</section><script src="/assets/portal/navigation.js"></script><script src="/assets/portal/documents-and-program.js"></script></body></html>';
async function main(){
 const server=await startStaticServer(new Map([['/water-fixture.html',fixture]]));let browser;
 try{browser=await launchBrowser();const c=browser.client,ev=x=>evaluate(c,x),click=sel=>ev('document.querySelector('+JSON.stringify(sel)+').click();return true;');
 for(const width of [1280,390,320]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});await c.send('Emulation.setTouchEmulationEnabled',{enabled:width<500});await c.send('Page.navigate',{url:server.baseUrl+'/water-fixture.html'});assert(await waitFor(c,'document.readyState==="complete"&&!!window.LivePalmesPortalDocumentsAndProgram'));
  await ev(`
   ${categoryLiteral} ${relayLiteral}
   window.waterCalls=[];window.waterDirty=0;
   const state=window.waterState={selectedEngagementCompetition:{id:'fixture',napSource:true,competitionType:'openWater',date:'2027-01-17',events:[],nativeRules:{courses:[]}},engagementDetailEditing:true,engagementOpenWaterCourses:[...${waterDefaults},{id:'500-SF',distance:500,discipline:'SF',label:'500 m Surface',format:'standard',active:true}],engagementOpenWaterCoursesLoaded:true};
   const elements={};for(const el of document.querySelectorAll('[id^="adminEngagements"]')){const name=el.id.replace(/^admin/,'');elements[name[0].toLowerCase()+name.slice(1)]=el;}
   elements.engagementsSectionToggles=[];
   const config={ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS,ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS:[],ENGAGEMENT_OPEN_WATER_RELAY_EVENT,ENGAGEMENT_OPEN_WATER_DISCIPLINES:[['SF','Surface'],['BI','Bi-palmes'],['SUP','Support']],ENGAGEMENT_EVENT_BY_CODE:new Map(),ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES:{},ENGAGEMENT_PROGRAM_GENDER_MODES:[['female','Femmes'],['male','Hommes'],['mixed','F/H ensemble']],ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS:{female:'Femmes',male:'Hommes',mixed:'F/H ensemble'},ENGAGEMENT_PROGRAM_PHASE_LABELS:{direct:'Course directe',heats:'Séries',final:'Finale(s)'},ENGAGEMENT_PROGRAM_FORMAT_LABELS:{direct:'Course directe',heatsFinal:'Séries + finale(s)'},ENGAGEMENT_OPEN_WATER_ELIMINATION_PROGRAM_FORMATS:[['direct','Course directe'],['heatsFinal','Séries + finale(s)']]};
   const actions={escapeHtml:s=>String(s),isEngagementAdminMode:()=>true,canEditEngagementCompetition:()=>true,canUse:()=>false,markEngagementDetailTabDirty:()=>waterDirty++,callFunction:async(name,input)=>{waterCalls.push({name,input});const extra=['SF','BI','SUP'].map(discipline=>({id:input.distance+'-'+discipline,distance:input.distance,discipline,label:input.distance+' m '+discipline,format:'standard',active:true}));return {courses:[...state.engagementOpenWaterCourses,...extra]};}};
   const fakeCall=actions.callFunction;const context={state,actions,config,elements};Object.assign(actions,LivePalmesPortalNavigation.create(context));actions.callFunction=fakeCall;actions.canEditEngagementCompetition=()=>true;actions.isEngagementAdminMode=()=>true;actions.canUse=()=>false;actions.markEngagementDetailTabDirty=()=>waterDirty++;Object.assign(actions,LivePalmesPortalDocumentsAndProgram.create(context));window.waterActions=actions;
   // Wire the same controls as events.js to this isolated module instance.
   elements.engagementsOpenWaterCourseList.addEventListener('click',e=>{const input=e.target.closest('[data-open-water-course-select]');if(input)actions.addEngagementOpenWaterCourseToProgram(input.dataset.openWaterCourseSelect);});
   elements.engagementsOpenWaterCourseAdd.addEventListener('click',actions.addEngagementOpenWaterCourse);
   elements.engagementsEventsForm.addEventListener('change',e=>{const col=e.target.closest('[data-engagement-category-column]');if(col)actions.applyEngagementCategoryColumnControl(col);actions.updateEngagementEventsSummaryFromForm(e);});
   elements.engagementsProgramAddSession.addEventListener('click',actions.addEngagementProgramSession);elements.engagementsProgramSessions.addEventListener('click',actions.handleEngagementProgramAction);
   actions.renderEngagementEvents(state.selectedEngagementCompetition);document.querySelectorAll('details').forEach(el=>el.open=true);return true;
  `);
  assert.equal(await ev('return document.querySelectorAll("[data-open-water-course-select]").length;'),20);
  assert.deepEqual(await ev('return Array.from(document.querySelectorAll("#adminEngagementsOpenWaterCourseList tbody th")).map(el=>el.textContent.trim());'),['150 m élimination','1000 m','2000 m','3000 m','4000 m','5000 m','6000 m']);
  await click('[data-open-water-course-select="3000-SF"]');assert.equal(await ev('return waterActions.selectedEngagementEventsFromForm().length;'),1);
  await click('[data-open-water-course-select="3000-SF"]');assert.equal(await ev('return waterActions.selectedEngagementEventsFromForm().length;'),0,'New choice can be unchecked');
  await ev('document.querySelector("#adminEngagementsOpenWaterDistance").value="1200";');await click('#adminEngagementsOpenWaterCourseAdd');assert(await waitFor(c,'waterCalls.length===1&&!document.querySelector("#adminEngagementsOpenWaterCourseAdd").disabled'));assert.equal(await ev('return waterActions.selectedEngagementEventsFromForm().length;'),0,'Adding a distance never checks specialties');
  assert.equal(await ev('return document.querySelectorAll("[data-open-water-course-select^=\\"1200-\\"]").length;'),3,'New distance exposes all three specialties');
  await click('[data-open-water-course-select="2000-BI"]');await click('#adminEngagementsProgramAddSession');
  assert.equal(await ev('return document.querySelectorAll("[data-engagement-program-action=add-slot]").length;'),3,'Native pending courses have F/H/combined controls');
  await click('[data-engagement-program-gender="female"]');assert.match(await ev('return document.querySelector("#adminEngagementsProgramSessions").textContent;'),/Femmes/);
  await ev('waterActions.callFunction=()=>new Promise(resolve=>window.resolveWaterLibrary=resolve);waterActions.loadEngagementOpenWaterCourses({force:true});return true;');
  await click('[data-open-water-course-select="2000-SUP"]');
  await ev('resolveWaterLibrary({courses:waterState.engagementOpenWaterCourses});return true;');
  assert(await waitFor(c,'!waterState.engagementOpenWaterCoursesLoading'));
  assert.equal(await ev('return waterActions.selectedEngagementEventsFromForm().length;'),2,'A delayed library read preserves current choices');
  assert.equal(await ev('return document.querySelectorAll("[data-engagement-program-row]").length;'),1,'A delayed library read preserves the programme');
  assert.equal(await ev('return document.querySelector("#adminEngagementsOpenWaterCourseMessage").dataset.tone||"";'),'','Loading state ends when the read succeeds');
  await click('[data-engagement-program-action="remove-row"]');
  assert.equal(await ev('return document.querySelectorAll("[data-engagement-program-row]").length;'),0,'Removing the last programme line takes effect immediately');
  await click('[data-engagement-program-action="remove-session"]');
  assert.equal(await ev('return document.querySelectorAll("[data-engagement-program-session]").length;'),0,'Removing the last session takes effect immediately');
  await ev('waterState.engagementOpenWaterCourses.find(course=>course.id==="500-SF").active=false;waterState.selectedEngagementCompetition.events=[{code:"OW500SF",type:"individual",distance:500,discipline:"SF",openWaterCourseId:"500-SF"}];waterActions.renderEngagementEvents(waterState.selectedEngagementCompetition);return true;');
  assert.equal(await ev('return document.querySelectorAll("[data-open-water-course-select=\\"500-SF\\"]").length;'),1,'An existing nonstandard course stays visible');
  await click('[data-open-water-course-select="500-SF"]');
  assert.equal(await ev('return waterActions.selectedEngagementEventsFromForm().length;'),0,'An existing inactive course can still be unchecked locally');
  const geometry=await ev('return {w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};');assert(geometry.scroll<=geometry.w,JSON.stringify({width,...geometry}));
  assert.notEqual(await ev('return getComputedStyle(document.querySelector("#adminEngagementsOpenWaterCourseAdd")).display;'),'none');
 }
 assert.equal(c.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0,JSON.stringify(c.events.filter(e=>e.method==='Runtime.exceptionThrown')));
 console.log('Vrai composant portail eau libre : sélection réversible, distance sans spécialité automatique, catégories et F/H, 1280/390/320 px, services fictifs.');
 }finally{browser?.cleanup();await new Promise(r=>server.server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

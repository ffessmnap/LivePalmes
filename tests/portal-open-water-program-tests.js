"use strict";
const assert=require('node:assert/strict');
const {portalModule,deferred}=require('./helpers/portal-module-runtime');
const courses=['SF','BI','SUP'].map(discipline=>({id:'2000-'+discipline,distance:2000,discipline,label:'2000 m '+discipline,active:true}));
const state={selectedEngagementCompetition:{competitionType:'openWater',napSource:true,events:[]},engagementDetailEditing:true,engagementOpenWaterCourses:[],engagementOpenWaterCoursesLoaded:true};
const elements={engagementsOpenWaterDistance:{value:'2000'},engagementsOpenWaterCourseAdd:{disabled:false},engagementsOpenWaterCourseList:{innerHTML:''},engagementsOpenWaterCourseMessage:{textContent:'',dataset:{}}};
const calls=[],pending=deferred();let dirty=0;
const actions={engagementCompetitionType:c=>c?.competitionType||state.selectedEngagementCompetition.competitionType,canEditEngagementCompetition:()=>true,isEngagementAdminMode:()=>true,canUse:()=>false,escapeHtml:s=>String(s),engagementOpenWaterEventCode:c=>'OW'+c.distance+c.discipline,engagementEventDefinition:code=>({code,type:'individual'}),markEngagementDetailTabDirty:()=>dirty++,callFunction:async(name,input)=>{calls.push({name,input});return pending.promise;}};
const config={ENGAGEMENT_PROGRAM_GENDER_MODES:[['female','Femmes'],['male','Hommes'],['mixed','F/H ensemble']],ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS:{female:'Femmes',male:'Hommes',mixed:'F/H ensemble'},ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES:{}};
const moduleApi=portalModule('documents-and-program.js','LivePalmesPortalDocumentsAndProgram',{state,actions,config,elements});
async function run(){
 assert.equal(moduleApi.engagementProgramGenderModesForEvent('OW2000SF').length,3,'New native water selections offer F/H/combined before first save');
 const first=moduleApi.addEngagementOpenWaterCourse();await Promise.resolve();assert.equal(elements.engagementsOpenWaterCourseAdd.disabled,true);await moduleApi.addEngagementOpenWaterCourse();assert.equal(calls.length,1,'Double click does not produce multiple writes');assert.equal(elements.engagementsOpenWaterCourseAdd.disabled,true);
 pending.resolve({courses});await first;
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{name:'addEngagementOpenWaterCourse',input:{distance:2000}});assert.equal(dirty,0,'Adding a distance does not select a competition course');assert.equal(elements.engagementsOpenWaterCourseAdd.disabled,false);assert.equal(elements.engagementsOpenWaterDistance.value,'');assert(!/checked/.test(elements.engagementsOpenWaterCourseList.innerHTML));
 elements.engagementsOpenWaterDistance.value='2.5';await moduleApi.addEngagementOpenWaterCourse();assert.equal(calls.length,1);assert.equal(elements.engagementsOpenWaterCourseMessage.dataset.tone,'error');
 const loading=deferred();actions.callFunction=async()=>loading.promise;state.engagementOpenWaterCoursesLoaded=false;state.selectedEngagementCompetition.competitionType='pool';const read=moduleApi.loadEngagementOpenWaterCourses();loading.resolve({courses});await read;assert.equal(elements.engagementsOpenWaterCourseMessage.dataset.tone,undefined,'Successful load clears animated loading tone');
 console.log('Parcours eau libre : ajout distance sans sélection, double clic, validation et chargement, modes F/H avant enregistrement vérifiés avec le module réel hors réseau.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

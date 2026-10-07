"use strict";
const assert=require("node:assert/strict");
const {previewNativeTimes:preview}=require("../functions/nap-entry-time-preview");
(async()=>{
  let calls=0,allowed=false;
  const input={competitionId:5140,clubId:"106",swimmerIds:[1,2],enrolledOnly:true};
  const competition={event:{eventType:"pool"},nativeParameters:{qualif:0},options:null};
  const pack={leaders:[{nom:"TEST",prenom:"Exemple"}],swimmers:[{id:"1",clubId:"106"},{id:"2",clubId:"106"}],inscriptions:[{nageur:1},{nageur:2}]};
  const services={authorize:async()=>{allowed=true;},preview:(person,rows)=>rows,readers:{competition:async()=>{assert.equal(allowed,true);return competition;},entry:async()=>pack,history:async(connection,people)=>{calls++;assert.equal(people.length,2);return new Map([["1",[{eventCode:"100SF",entryTime:"1:42.00"}]]]);}}};
  const result=await preview({},input,services);assert.equal(calls,1);assert.equal(result.source,"nap");assert.equal(result.swimmers[0].individualEntries[0].entryTime,"1:42.00");assert.deepEqual(result.swimmers[1].individualEntries,[]);
  await assert.rejects(()=>preview({}, {...input,swimmerIds:[3]},services));
  await assert.rejects(()=>preview({}, {...input,swimmerIds:[1,1]},services));
  pack.inscriptions=[];await assert.rejects(()=>preview({},input,services));pack.inscriptions=[{nageur:1},{nageur:2}];
  competition.nativeParameters.qualif=1;await assert.rejects(()=>preview({},input,services),/qualifications/);competition.nativeParameters.qualif=0;
  competition.event.eventType="openWater";const water=await preview({},input,services);assert.equal(calls,1);assert.equal(water.sqlBudget.historyQueries,0);
  allowed=false;await assert.rejects(()=>preview({},input,{...services,authorize:async()=>{throw new Error("Denied");}}),/Denied/);assert.equal(allowed,false);
  console.log("NAP time preview: trusted club, enrolment and one grouped native history query passed");
})().catch(error=>{console.error(error);process.exitCode=1;});

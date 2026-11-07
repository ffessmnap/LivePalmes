"use strict";
// Candidate detection only. Eligibility/homologation remains a human decision.
const {cleanText,normalizeIdentityText}=require("./nap-performance-identity");
const {normalizePerformanceCategory,categoryCode}=require("./nap-performance-categories");
const {parseCompactTime,formatTime}=require("./nap-duration");
const {CURRENT_POOL_COURSES}=require("./nap-performance-courses");
const {hash,sourceReference}=require("./nap-import-lifecycle");
const sameName=(a,b)=>normalizeIdentityText(a).split(/\s+/).sort().join(" ")===normalizeIdentityText(b).split(/\s+/).sort().join(" ");
const scope=row=>row.recordType==="RFJ"?"RFJ":"RF";
const recordKey=(type,row)=>[type,row.sex,type==="MPF"?row.category:"",row.course].join("|");
function references(data){
  const groups=new Map();
  const rows=[...(data.franceRecords||[]).map(row=>({...row,type:scope(row)})),...(data.records||[]).map(row=>({...row,type:"MPF"}))];
  for(const row of rows){
    if(!row.key||!CURRENT_POOL_COURSES.includes(row.course)||!["F","M"].includes(row.sex)||!Number.isFinite(Number(row.value))||Number(row.value)<=0||!row.time||row.placeholderRecord||/tablir/i.test(row.time))continue;
    const key=recordKey(row.type,row),group=groups.get(key)||[];
    group.push(row);groups.set(key,group);
  }
  for(const [key,rows] of groups){const best=Math.min(...rows.map(row=>Number(row.value)));groups.set(key,rows.filter(row=>Number(row.value)===best).sort((a,b)=>a.key.localeCompare(b.key)));}
  return groups;
}
function detect(importId,saved,official){
  const groups=references(official.data),people=new Map(saved.people.map(row=>[Number(row.id),row])),clubs=new Map(saved.clubs.map(row=>[String(row.num_club),row]));
  const sources=new Map(saved.plan.perfs.sources.map(source=>[Number(source.performanceId),source])),candidates=[];
  for(const row of saved.plan.perfs.after){
    const person=people.get(Number(row.nageur)),source=sources.get(Number(row.id)),value=parseCompactTime(row.tps);
    if(!person||!source||!value||!CURRENT_POOL_COURSES.includes(row.course))continue;
    const sex=String(person.sexe).toUpperCase()==="H"?"M":String(person.sexe).toUpperCase();
    if(!["F","M"].includes(sex))continue;
    const category=normalizePerformanceCategory(row.cat,{birthDate:person.date},saved.competition);
    if(!category)continue;
    const swimmer=cleanText([person.prenom,person.nom].join(" "));
    for(const type of ["RF",...(["P","B","M","C","J"].includes(category)?["RFJ"]:[]),"MPF"]){
      const key=recordKey(type,{sex,category,course:row.course}),refs=groups.get(key);
      if(!refs||value>Number(refs[0].value)||value===Number(refs[0].value)&&refs.some(ref=>sameName(swimmer,ref.swimmer)))continue;
      const ref=refs[0],origin=sourceReference(importId,source);
      candidates.push({id:hash([origin.key,key]),source:origin,recordKey:key,referenceRevision:official.revision,referenceFingerprint:hash(refs),referenceKey:ref.key,
        referenceTime:ref.time,referenceSwimmer:refs.map(ref=>ref.swimmer).join(" / "),referenceDate:ref.date||"",type,sex,category,categoryCode:categoryCode(category,sex),
        targetCategory:ref.category,course:row.course,time:formatTime(value),timeValue:value,swimmer,swimmerId:String(row.nageur),birthDate:person.date||"",
        competitionId:Number(saved.competition.id),competition:saved.competition.libelle,date:saved.competition.date,location:saved.competition.lieu,
        clubId:String(row.club),club:clubs.get(String(row.club))?.nom_club||String(row.club),bassin:String(saved.competition.bassin),chrono:saved.competition.chrono,
        status:value<Number(ref.value)?"improved":"equal",state:"pending"});
    }
  }
  if(candidates.length>10000)throw new RangeError("Plus de 10 000 candidatures : détection indisponible pour ce lot, sans troncature.");
  return candidates.sort((a,b)=>["RF","RFJ","MPF"].indexOf(a.type)-["RF","RFJ","MPF"].indexOf(b.type)||a.recordKey.localeCompare(b.recordKey)||a.timeValue-b.timeValue||a.id.localeCompare(b.id));
}
module.exports={detect,references,recordKey,sameName};

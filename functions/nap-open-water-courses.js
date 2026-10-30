"use strict";
// Presentation aliases only. Writes retain the original IntraNAP course code.
// A bare native distance means Surface, confirmed by the administrator.
function definition(value) {
  const native=String(value??"").trim().toUpperCase().replace(/\s+/g,"");
  const elimination=native.match(/^150(SF|BI)EL$/);
  if(elimination){const discipline=elimination[1],label=`150 m élimination ${{SF:"Surface",BI:"Bi-palmes"}[discipline]}`;return {code:`OW150ELIM${discipline}`,type:"individual",label,shortLabel:label,discipline,distance:150,openWaterCourseId:`150-elimination-${discipline}`,openWaterFormat:"elimination"};}
  const match=native.replace(/SUPPORT$/,'SUP').match(/^(\d{1,6})(?:[.,](\d{1,3}))?(KM|M)?(SF|BI|SUP)?$/);
  if(!match) return null;
  if(match[2]&&match[3]!=="KM")return null;
  const distance=match[3]==="KM"?Number(match[1])*1000+Number((match[2]||'').padEnd(3,'0')):Number(match[1]),discipline=match[4]||"SF";
  // Native 150 m does not identify an elimination format: do not invent one.
  if(distance<1 || distance>100000 || distance===150) return null;
  const label=`${distance} m ${{SF:"Surface",BI:"Bi-palmes",SUP:"Support"}[discipline]}`;
  return {code:`OW${distance}${discipline}`,type:"individual",label,shortLabel:label,discipline,distance,openWaterCourseId:`${distance}-${discipline}`,openWaterFormat:"standard"};
}
function displayCode(value,type) {return type==="openWater" ? definition(value)?.code || String(value??"").trim().toUpperCase().replace(/\s+/g,"") : String(value??"").trim().toUpperCase().replace(/\s+/g,"");}
function fromCode(value){const match=String(value||'').match(/^OW(\d{1,6})(ELIM)?(SF|BI|SUP)$/);if(!match)return null;const resolved=definition(match[2]?`${match[1]}${match[3]}EL`:`${match[1]}${match[3]}`);return resolved?.code===value?resolved:null;}
module.exports={definition,displayCode,fromCode};

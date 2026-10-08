"use strict";
// Presentation aliases only. Writes retain the original IntraNAP course code.
// A bare native distance means Surface, confirmed by the administrator.
function definition(value) {
  const native=String(value??"").trim().toUpperCase().replace(/\s+/g,"");
  const match=native.match(/^(\d{1,6})(SF|BI|SUP)?$/);
  if(!match) return null;
  const distance=Number(match[1]),discipline=match[2]||"SF";
  // Native 150 m does not identify an elimination format: do not invent one.
  if(distance<1 || distance>100000 || distance===150) return null;
  const label=`${distance} m ${{SF:"Surface",BI:"Bi-palmes",SUP:"Support"}[discipline]}`;
  return {code:`OW${distance}${discipline}`,type:"individual",label,shortLabel:label,discipline,distance,openWaterCourseId:`${distance}-${discipline}`,openWaterFormat:"standard"};
}
function displayCode(value,type) {return type==="openWater" ? definition(value)?.code || String(value??"").trim().toUpperCase().replace(/\s+/g,"") : String(value??"").trim().toUpperCase().replace(/\s+/g,"");}
module.exports={definition,displayCode};

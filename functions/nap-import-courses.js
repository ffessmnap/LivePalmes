"use strict";
// ZIP preview only. One ordered primary-index catalog read (<=301 rows), never
// derive a sporting equivalence from a WinPalme LD code or alter source times.
const supported=row=>row.kind==="REL"?/^4X\d+(SF|BI|IS|AP)$/.test(row.course):/^\d+(SF|BI|IS|AP)$/.test(row.course);
async function prepareCourses(pool,decoded,input) {
  const bindings=input.courseBindings||[];
  if(!Array.isArray(bindings)||bindings.length>300)throw new TypeError("Choix d’epreuves hors limite.");
  if(input.sourceType!=="winpalme-zip-preview"){
    if(bindings.length)throw new TypeError("Le choix d’epreuves est reserve a l’aperçu ZIP.");
    return null;
  }
  if(!bindings.length&&decoded.rows.every(supported))return null;
  if(new Set(decoded.rows.map(r=>r.course)).size>300)throw new RangeError("Plus de 300 epreuves sources : reduisez le lot avant rapprochement.");
  const [rows]=await pool.execute({sql:"SELECT id,course,wplabel,sexe,relais,ld,actif FROM course_dispo FORCE INDEX (PRIMARY) WHERE id>0 ORDER BY id LIMIT 301",timeout:10000});
  if(rows.length>300)throw new RangeError("Catalogue NAP trop volumineux : choix d’epreuves refuse.");
  const groups=new Map();
  for(const r of rows){
    if(!Number.isSafeInteger(Number(r.id))||Number(r.id)<1||typeof r.course!=="string"||!r.course.trim()||r.course.length>80)throw new TypeError("Catalogue d’epreuves NAP incoherent.");
    const kind=Number(r.relais)?"REL":"NAG",longDistance=Number(r.ld)!==0;
    // The programme uses e.g. 2000; perfs.course uses its declared WinPalme
    // result code, e.g. LD02KM. Never manufacture an LD alias from a distance.
    const code=longDistance&&kind==="NAG"?String(r.wplabel||"").trim():r.course,key=JSON.stringify([code,kind,longDistance]);
    // Existing performance columns/plans accept ten characters; mixed relay
    // catalog suffixes are not native result codes and must not be guessed.
    if(!code||code.length>10||kind==="REL"&&!/^4X\d{2,4}(SF|BI|IS|AP)$/.test(code))continue;
    if(!groups.has(key))groups.set(key,{id:String(r.id),code,catalogCode:r.course,kind,longDistance,sexes:[],active:false,label:longDistance?require("./nap-open-water-courses").definition(r.course)?.label||r.course:code});
    const g=groups.get(key);if(!g.sexes.includes(String(r.sexe)))g.sexes.push(String(r.sexe));g.active=g.active||Number(r.actif)===1;
  }
  const courses=[...groups.values()],chosen=new Map();
  for(const b of bindings){
    if(typeof b?.sourceCode!=="string"||chosen.has(b.sourceCode)||!decoded.rows.some(r=>r.course===b.sourceCode))throw new TypeError("Epreuve source choisie invalide.");
    const target=courses.find(c=>c.id===b.courseId),source=decoded.rows.filter(r=>r.course===b.sourceCode);
    if(!target||source.some(r=>r.kind!==target.kind||r.kind==="NAG"&&!target.sexes.includes(r.sex)))throw new TypeError("Epreuve NAP incompatible avec le type ou le sexe des resultats sources.");
    chosen.set(b.sourceCode,target);
  }
  const sources=[],sourceGroups=new Map();
  for(const row of decoded.rows){if(!sourceGroups.has(row.course))sourceGroups.set(row.course,[]);sourceGroups.get(row.course).push(row);}
  for(const [sourceCode,sourceRows] of sourceGroups){
    if(sourceRows.every(supported)&&!chosen.has(sourceCode))continue;
    const target=chosen.get(sourceCode);
    const candidateIds=courses.filter(c=>sourceRows.every(r=>r.kind===c.kind&&(r.kind==="REL"||c.sexes.includes(r.sex)))).map(c=>c.id);
    sources.push({sourceCode,count:sourceRows.length,sourceLines:sourceRows.map(r=>r.sourceLine),candidateIds,selectedId:target?.id||null,targetCode:target?.code||null});
    if(!target)decoded.issues.push({sourceLine:sourceRows[0].sourceLine,code:"unmapped-course",context:{sourceCode,count:sourceRows.length}});
    else for(const row of sourceRows){row.sourceCourse=sourceCode;row.course=target.code;row.courseMapping={id:target.id,longDistance:target.longDistance};}
  }
  decoded.confirmable=decoded.rows.length>0&&decoded.issues.length===0;
  decoded.summary.issues=decoded.issues.length;
  return {courses,sources};
}
module.exports={prepareCourses};

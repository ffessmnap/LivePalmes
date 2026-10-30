"use strict";
// Pure preparation. No connection, SQL execution, migration or native writes.
const {definition}=require('./nap-open-water-courses');
const FIELDS=Object.freeze(['course','sexe','final','relais','categorie','p','ld','bi','_order','mixte','style','type_','longueur','nbnageur','validation','actif','wplabel']);
const TEMPLATES=Object.freeze({SF:[98,99],BI:[273,274],SUP:[405,406]});
const project=row=>Object.fromEntries(FIELDS.map(key=>[key,row[key]]));
function planDistanceReferences(distance,catalog){
  if(!Number.isInteger(distance)||distance<1||distance>100000||distance===150)throw new TypeError('Distance standard entière requise ; le 150 m élimination utilise ses références existantes.');
  if(!Array.isArray(catalog)||catalog.length>300||catalog.some(row=>!Number.isSafeInteger(Number(row.id))||Number(row.id)<1)||new Set(catalog.map(row=>Number(row.id))).size!==catalog.length)throw new TypeError('Catalogue natif absent, ambigu ou hors limites.');
  const additions=[],references=[];
  for(const discipline of ['SF','BI','SUP']){
    const code=`OW${distance}${discipline}`;
    const candidates=catalog.filter(row=>definition(row.course)?.code===code&&Number(row.ld)===1&&Number(row.final)===0&&Number(row.relais)===0&&Number(row.categorie)===0&&Number(row.mixte)===0&&Number(row.actif)===1);
    if(candidates.some(row=>!['F','M'].includes(row.sexe)))throw new TypeError(`Référence native ambiguë : ${code}.`);
    const names={SF:String(distance),BI:`${distance}BI`,SUP:`${distance} SUPPORT`};
    const label=`LD${distance}${discipline==='SF'?'':discipline}`;
    for(const sexe of ['F','M']){
      const existing=candidates.filter(row=>row.sexe===sexe);
      if(existing.length>1)throw new TypeError(`Référence native ambiguë : ${code} ${sexe}.`);
      if(existing.length){if(Number(existing[0].longueur)!==distance)throw new TypeError(`Distance native incohérente : ${code} ${sexe}.`);references.push({code,sexe,id:Number(existing[0].id)});continue;}
      const counterpart=candidates.find(row=>['F','M'].includes(row.sexe)&&row.sexe!==sexe);
      const template=counterpart||catalog.find(row=>TEMPLATES[discipline].includes(Number(row.id))&&row.sexe===sexe);
      const templateCode=counterpart?code:`OW5000${discipline}`;
      if(!template||definition(template.course)?.code!==templateCode||Number(template.ld)!==1||Number(template.final)!==0||Number(template.relais)!==0||Number(template.categorie)!==0||Number(template.mixte)!==0||Number(template.actif)!==1||Number(template.p)!==0||Number(template.bi)!==(discipline==='BI'?1:0)||template.style!=='SF'||Number(template.type_)!==1||Number(template.nbnageur)!==1||Number(template.validation)!==1||FIELDS.some(key=>!Object.hasOwn(template,key)))throw new TypeError(`Modèle natif incomplet : ${discipline} ${sexe}.`);
      const proposed={...project(template),course:counterpart?template.course:names[discipline],sexe,longueur:String(distance),wplabel:counterpart?template.wplabel:label,_order:null};
      if(catalog.some(row=>(row.sexe===sexe&&definition(row.course)?.code===code)||(row.sexe===sexe&&String(row.course).trim().toUpperCase()===proposed.course.toUpperCase())||(String(row.wplabel).trim().toUpperCase()===String(proposed.wplabel).trim().toUpperCase()&&definition(row.course)?.code!==code)))throw new TypeError(`Code natif déjà utilisé ou désactivé : ${code} ${sexe}.`);
      additions.push({code,sexe,templateId:Number(template.id),row:proposed});
    }
  }
  if(catalog.length+additions.length>300)throw new RangeError('Limite du catalogue natif atteinte.');
  return {kind:'open-water-distance-reference-plan',distance,maxNewReferences:6,additions,references,updates:0,deletes:0,competitionWrites:0,entryWrites:0};
}
module.exports={planDistanceReferences,FIELDS,TEMPLATES};

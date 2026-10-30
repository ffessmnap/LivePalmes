"use strict";
// Preparation only. This module has no database client, credentials, network
// request, SQL executor or apply mode. It cannot change the common NAP database.
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const water=require('../functions/nap-open-water-courses');
const fields=['course','sexe','final','relais','categorie','p','ld','bi','_order','wplabel','mixte','style','type_','longueur','nbnageur','validation','actif'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function prepareSupportReference(catalog,templates){
 if(!Array.isArray(catalog)||catalog.length>300||!Array.isArray(templates)||templates.length!==2)throw new TypeError('Catalogue borne et deux modeles Support requis.');
 if(catalog.some(row=>!Number.isSafeInteger(Number(row.id))||Number(row.id)<=0||fields.some(key=>!Object.hasOwn(row,key)))||new Set(catalog.map(row=>Number(row.id))).size!==catalog.length)throw new TypeError('Lecture complete du catalogue technique requise.');
 if(templates.some(row=>!isDeepStrictEqual(catalog.find(item=>Number(item.id)===Number(row.id)),row)))throw new TypeError('Modeles absents du catalogue actuel.');
 const proposals=[];
 for(const sex of ['F','M']){
  const source=templates.find(row=>row.sexe===sex);
  if(!source||fields.some(key=>!Object.hasOwn(source,key))||source.course!=='5000 SUPPORT'||source.wplabel!=='LD5000SUP'||Number(source.longueur)!==5000||source.style!=='SF'||[source.final,source.relais,source.categorie,source.p,source.bi,source.mixte].some(v=>Number(v)!==0)||[source.ld,source.type_,source.nbnageur,source.validation,source.actif].some(v=>Number(v)!==1)||source._order!==null)throw new TypeError('Modele Support incompatible.');
  const row=Object.fromEntries(fields.map(key=>[key,source[key]]));Object.assign(row,{course:'1000 SUPPORT',wplabel:'LD1000SUP',longueur:'1000'});
  const existing=catalog.filter(item=>water.definition(item.course)?.code==='OW1000SUP'&&item.sexe===sex);
  if(existing.length>1)throw new TypeError('Correspondance Support ambigue.');
  if(existing.length){if(!isDeepStrictEqual(Object.fromEntries(fields.map(key=>[key,existing[0][key]])),row))throw new TypeError('Reference Support existante differente du plan.');continue;}
  if(catalog.some(item=>item.wplabel===row.wplabel||item.course===row.course&&item.sexe===sex))throw new TypeError('Collision du code technique Support.');
  proposals.push({sourceId:source.id,row});
 }
 if(catalog.length+proposals.length>300)throw new RangeError('Plafond de 300 references depasse.');
 return {kind:'prepare-only-open-water-1000-support',previewOnly:true,writesExecuted:false,expectedCatalogFingerprint:hash(catalog),templateFingerprint:hash(templates),table:'course_dispo',existingRowsPreserved:catalog.length,newReferences:proposals,approvalRequired:true,scope:'1000 m Support Femmes/Hommes uniquement ; aucun autre ajout, aucune competition, aucun engagement, aucune migration.'};
}
module.exports={prepareSupportReference,fields};

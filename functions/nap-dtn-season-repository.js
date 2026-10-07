"use strict";
const engine=require("./dtn-season-engine");
const {createHash}=require("node:crypto");
const MAX_CONFIG_BYTES=900000;
const validId=id=>typeof id==="string" && /^\d{4}-\d{4}$/.test(id) && Number(id.slice(5))===Number(id.slice(0,4))+1 && Number(id.slice(5))>=2001 && Number(id.slice(5))<=2100;
function checkId(id) {if(!validId(id)) throw new TypeError("Saison DTN invalide.");return id;}
const query=async(executor,sql,values=[]) => (await executor.execute({sql,timeout:10000},values))[0];
async function readCatalog(executor,{lock=false}={}) {
  const rows=await query(executor,`SELECT revision,saison_active,saison_precedente,saison_brouillon FROM livepalmes_dtn_catalogue WHERE id=1 LIMIT 1${lock?" FOR UPDATE":""}`);
  if(rows.length!==1) throw new TypeError("Parametres DTN NAP non repris.");
  const r=rows[0],catalog={revision:Number(r.revision),current:r.saison_active,previous:r.saison_precedente,draft:r.saison_brouillon};
  const ids=[catalog.current,catalog.previous,catalog.draft].filter(Boolean);
  if(!Number.isSafeInteger(catalog.revision) || catalog.revision<0 || !validId(catalog.current) || ids.some(id=>!validId(id)) || new Set(ids).size!==ids.length) throw new TypeError("Catalogue DTN NAP incompatible.");
  return catalog;
}
async function readSeasons(executor,ids,{lock=false}={}) {
  if(!Array.isArray(ids) || !ids.length || ids.length>3 || ids.some(id=>!validId(id)) || new Set(ids).size!==ids.length) throw new TypeError("Liste de saisons invalide.");
  const rows=await query(executor,`SELECT id,revision,configuration FROM livepalmes_dtn_saisons WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id LIMIT 3${lock?" FOR UPDATE":""}`,ids);
  if(rows.length!==ids.length) throw new TypeError("Configuration DTN NAP manquante.");
  return ids.map(id=>{
    const r=rows.find(r=>r.id===id);
    if(!r || typeof r.configuration!=="string" || Buffer.byteLength(r.configuration)>=MAX_CONFIG_BYTES) throw new TypeError("Configuration DTN incompatible.");
    let season;try {season=JSON.parse(r.configuration);}catch {throw new TypeError("Configuration DTN illisible.");}
    if(season.id!==id || season.revision!==Number(r.revision)) throw new TypeError("Revision DTN incompatible.");
    engine.validateSeason(season,{incomplete:true});return season;
  });
}
async function readViews(executor,ids,{lock=false}={}) {
  if(!Array.isArray(ids) || !ids.length || ids.length>2 || ids.some(id=>!validId(id))) throw new TypeError("Vues DTN invalides.");
  const rows=await query(executor,`SELECT saison,dispositif,revision,empreinte,contenu FROM livepalmes_dtn_resultats WHERE saison IN (${ids.map(()=>"?").join(",")}) LIMIT 6${lock?" FOR UPDATE":""}`,ids);
  return rows.map(r=>{
    if(!engine.DEVICES.includes(r.dispositif) || !ids.includes(r.saison) || typeof r.contenu!=="string" || Buffer.byteLength(r.contenu)>=900000) throw new TypeError("Vue DTN NAP incompatible.");
    const value=JSON.parse(r.contenu);
    if(value.source!=="nap" || value.revision!==Number(r.revision) || value.fingerprint!==r.empreinte || !Array.isArray(value.profiles)) throw new TypeError("Vue DTN NAP incoherente.");
    return {id:r.saison,device:r.dispositif,value};
  });
}
const fingerprint=(season,sourceVersion)=>createHash("sha256").update(JSON.stringify({engine:1,season:engine.validateSeason(season,{incomplete:true}),sourceVersion})).digest("hex");
function nextDraft(source,duplicate=true) {
  const season=JSON.parse(JSON.stringify(source));season.year++;season.id=`${season.year-1}-${season.year}`;season.revision=1;
  for(const device of engine.DEVICES) for(const p of season[device]) {
    for(const key of ["startDate","endDate"]) {
      const year=Number(p[key].slice(0,4))+1,suffix=p[key].slice(4)==="-02-29" && new Date(`${year}-02-29`).getUTCMonth()!==1?"-02-28":p[key].slice(4);
      p[key]=`${year}${suffix}`;
    }
    p.pools=["50"];p.electronicOnly=true;p.allowIntermediate=true;delete p.legacyUnrestricted;delete p.legacyFranceNames;p.competitions=[];
    if(!duplicate) {p.grid={};p.enabled=false;}
  }
  return engine.validateSeason(season,{incomplete:true});
}
module.exports={MAX_CONFIG_BYTES,checkId,query,readCatalog,readSeasons,readViews,fingerprint,nextDraft};

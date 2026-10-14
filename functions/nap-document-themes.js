"use strict";
const CACHE_MS=5*60*1000;
// The native Documents menu is elements.name='publications'. Its target links
// define the available sections; document membership remains live in SQL.
async function readThemes(pool){
 const queries=[
  ["targets","SELECT id,label,pos FROM cibles FORCE INDEX (PRIMARY) WHERE id>=0 ORDER BY id LIMIT 101",100],
  ["elements","SELECT id,name FROM elements FORCE INDEX (PRIMARY) WHERE id>=0 ORDER BY id LIMIT 201",200],
  ["links","SELECT id,cible,element FROM elements_cibles FORCE INDEX (PRIMARY) WHERE id>=0 ORDER BY id LIMIT 1001",1000]
 ];
 const source={};
 for(const [key,sql,max]of queries){const [rows]=await pool.execute({sql,timeout:5000});if(rows.length>max)throw new RangeError("Thèmes documentaires à vérifier.");source[key]=rows;}
 const menus=new Set(source.elements.filter(item=>item.name==="publications").map(item=>Number(item.id)));
 const ids=new Set(source.links.filter(item=>menus.has(Number(item.element))).map(item=>Number(item.cible)));
 return source.targets.filter(item=>ids.has(Number(item.id))).sort((a,b)=>Number(a.pos)-Number(b.pos)||Number(a.id)-Number(b.id)).map(item=>({id:Number(item.id),label:String(item.label||"").trim()}));
}
function createReader(load,clock=()=>Date.now()){
 let value=null,error=null,loadedAt=0,pending=null;
 return async()=>{
  if(!pending&&(value||error)&&clock()-loadedAt<CACHE_MS){if(error)throw error;return value;}
  if(!pending)pending=Promise.resolve().then(load).then(result=>{value=result;error=null;}).catch(cause=>{error=cause;throw cause;}).finally(()=>{loadedAt=clock();pending=null;});
  await pending;return value;
 };
}
const readers=new WeakMap();
async function themesFor(pool){if(!readers.has(pool))readers.set(pool,createReader(()=>readThemes(pool)));return readers.get(pool)();}
module.exports={CACHE_MS,readThemes,createReader,themesFor};

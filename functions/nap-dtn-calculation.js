"use strict";
// Unregistered preparation. The season must come from a trusted configuration
// repository; no browser-provided grid is authorized by this calculation.
const engine=require("./dtn-season-engine");
const source=require("./nap-dtn-source");
const {dtnNativeRow}=require("./nap-dtn-source-associations");
const MAX_VIEW_BYTES=900000,MAX_DURATION_MS=450000;
async function calculateSeason(pool,seasonInput,services) {
  if(typeof services?.authorize!=="function") throw new TypeError("Autorisation de calcul DTN requise.");
  const season=engine.validateSeason(seasonInput);
  await services.authorize(season);
  const competitionIds=await (services.readCompetitionIds||source.readCompetitionIds)(pool,season.year,()=>{});
  const accumulators=Object.fromEntries(engine.DEVICES.map(device=>[device,engine.createAccumulator(season,device)]));
  const read=services.readPage||source.readPage,started=Date.now();
  let cursor=null,scannedRows=0,excludedRows=0,pages=0;
  while(competitionIds.length) {
    if(++pages>source.MAX_ROWS/source.PAGE_SIZE || Date.now()-started>MAX_DURATION_MS) throw new RangeError("Calcul DTN interrompu : aucun resultat partiel publie.");
    const page=await read(pool,{year:season.year,competitionIds,cursor},()=>{});
    if(page.source!=="nap" || !Array.isArray(page.rows) || page.rows.length>source.PAGE_SIZE || !Number.isSafeInteger(page.scannedRows) || !Number.isSafeInteger(page.excludedRows) || page.excludedRows<0 || page.rows.length+page.excludedRows!==page.scannedRows-scannedRows || page.scannedRows<scannedRows || page.scannedRows-scannedRows>source.PAGE_SIZE || page.hasMore && (!page.cursor || page.scannedRows===scannedRows) || page.scannedRows>source.MAX_ROWS) throw new TypeError("Lot DTN NAP incomplet ou incompatible.");
    scannedRows=page.scannedRows;
    excludedRows+=page.excludedRows;
    for(const raw of page.rows) {
      const row=dtnNativeRow(raw);
      for(const device of engine.DEVICES) engine.consume(accumulators[device],season,row);
    }
    if(!page.hasMore) break;
    cursor=page.cursor;
  }
  const views=Object.fromEntries(engine.DEVICES.map(device=>[device,{profiles:engine.finish(accumulators[device],season,device),revision:season.revision,scannedRows,source:"nap"}]));
  if(Object.values(views).some(view=>Buffer.byteLength(JSON.stringify(view))>=MAX_VIEW_BYTES)) throw new RangeError("Resultats DTN trop volumineux : aucun resultat partiel publie.");
  return {source:"nap",seasonId:season.id,views,scannedRows,excludedRows,pages,generatedAt:new Date().toISOString(),sqlBudget:{queriesMax:2+pages*2,writesExecuted:0}};
}
module.exports={MAX_VIEW_BYTES,MAX_DURATION_MS,calculateSeason};

"use strict";
// Pure preparation for an explicit national merge. No database access.
const {isDeepStrictEqual:equal}=require("node:util");
const {number,seasonInfo}=require("./nap-license-state");
const COLUMNS=["swimmer_id","season","license_number","status","source","federal_validity_end_date","validated_at","validated_by","version"];
function planLicenseTransfer(source,target,rows){
  if(!source || !target || !Number.isSafeInteger(Number(source.id)) || !Number.isSafeInteger(Number(target.id)) || Number(source.id)<=0 || Number(target.id)<=0 || Number(source.id)===Number(target.id))throw new TypeError("Deux fiches distinctes requises.");
  if(!Array.isArray(rows) || rows.length>100)throw new RangeError("Historique des licences trop volumineux.");
  const keys=new Set();
  for(const row of rows){
    if(Object.keys(row).length!==COLUMNS.length || COLUMNS.some(column=>!Object.hasOwn(row,column)) || ![Number(source.id),Number(target.id)].includes(Number(row.swimmer_id)))throw new TypeError("Historique des licences incomplet.");
    seasonInfo(row.season);
    const key=JSON.stringify([String(row.swimmer_id),row.season]);
    if(keys.has(key))throw new TypeError("Saison de licence dupliquee.");keys.add(key);
  }
  const before=rows.map(row=>({...row}));
  const adopted=Boolean(!number(target.number) && number(source.number));
  const licenseNumber=adopted?source.number:target.number;
  // Carry the entire existing season record: provenance, date, validator,
  // validity end date and version. Possession alone never becomes validation.
  const transfers=adopted?before.filter(row=>Number(row.swimmer_id)===Number(source.id) && number(row.license_number)===number(source.number)).map(row=>({before:row,after:{...row,swimmer_id:target.id}})):[];
  const seasons=new Set(transfers.map(item=>item.before.season));
  const replacements=before.filter(row=>Number(row.swimmer_id)===Number(target.id) && seasons.has(row.season));
  const after=before.filter(row=>!transfers.some(item=>equal(item.before,row)) && !replacements.some(item=>equal(item,row))).concat(transfers.map(item=>item.after));
  const sort=(a,b)=>Number(a.swimmer_id)-Number(b.swimmer_id)||a.season.localeCompare(b.season);
  before.sort(sort);after.sort(sort);
  return {licenseNumber,adopted,before,after,transfers,replacements};
}
module.exports={COLUMNS,planLicenseTransfer};

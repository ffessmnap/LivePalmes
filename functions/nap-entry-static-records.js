"use strict";
// RF/MPF are the authorised exception to NAP: read the existing public static
// file once per grouped action. Never evaluate its JavaScript or fall back to
// the former sports database. No generated file is changed here.
const {publicRecordsPayload}=require("./public-records-data");
const MAX_BYTES=2000000;
const URLS=Object.freeze({
  "livepalmes-test":"https://livepalmes-test.web.app/performances/public/data/records-data.js",
  "livepalmes":"https://livepalmes.web.app/performances/public/data/records-data.js"
});
function parseStaticRecords(source) {
  if(typeof source!=="string" || Buffer.byteLength(source)>MAX_BYTES) throw new RangeError("References Records/MPF trop volumineuses.");
  const text=source.trim(),prefix="window.LIVEPALMES_RECORDS = ";
  if(!text.startsWith(prefix) || !text.endsWith(";")) throw new TypeError("References Records/MPF statiques invalides.");
  let data;
  try {data=JSON.parse(text.slice(prefix.length,-1));} catch {throw new TypeError("References Records/MPF statiques invalides.");}
  if(!Array.isArray(data?.records) || !Array.isArray(data?.franceRecords) || data.records.length>20000 || data.franceRecords.length>20000) throw new TypeError("References Records/MPF statiques incompletes.");
  return publicRecordsPayload(data);
}
async function loadStaticRecords(projectId,fetchImpl=fetch) {
  const url=URLS[projectId];
  if(!url || typeof fetchImpl!=="function") throw new TypeError("Source Records/MPF autorisee requise.");
  const response=await fetchImpl(url,{redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!response.ok || !response.body?.getReader) throw new TypeError("References Records/MPF momentanement indisponibles.");
  const length=Number(response.headers.get("content-length") || 0);
  if(!Number.isFinite(length) || length>MAX_BYTES) throw new RangeError("References Records/MPF trop volumineuses.");
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try {
    while(true) {
      const part=await reader.read();
      if(part.done) break;
      bytes+=part.value.byteLength;
      if(bytes>MAX_BYTES) throw new RangeError("References Records/MPF trop volumineuses.");
      chunks.push(Buffer.from(part.value));
    }
    return parseStaticRecords(Buffer.concat(chunks).toString("utf8"));
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
module.exports={MAX_BYTES,parseStaticRecords,loadStaticRecords};

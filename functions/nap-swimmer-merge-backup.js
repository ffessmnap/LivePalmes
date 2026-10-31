"use strict";
const {gzipSync,gunzipSync}=require("node:zlib"),{createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const MAX_STORED=500000,MAX_RAW=8000000,ENCODING="swimmer-merge-gzip-v1";
const digest=value=>createHash("sha256").update(value).digest("hex");
function encode(plan){
  const raw=Buffer.from(JSON.stringify(plan));
  if(raw.length>MAX_RAW)throw new RangeError("Sauvegarde de fusion superieure a 8 Mo avant compression.");
  if(raw.length<=MAX_STORED)return plan;
  // Keep identities readable by the existing activity journal. No extra document.
  const saved={encoding:ENCODING,bytes:raw.length,sha256:digest(raw),operation:plan.operation,source:plan.source,target:plan.target,targetAfter:plan.targetAfter,data:gzipSync(raw).toString("base64")};
  if(Buffer.byteLength(JSON.stringify(saved))>MAX_STORED)throw new RangeError("Sauvegarde de fusion encore superieure a 500 Ko apres compression. Reprise specifique requise.");
  decode(saved); // Verify the exact representation before any native write.
  return saved;
}
function decode(saved){
  if(!saved?.encoding)return saved; // Existing journals remain readable unchanged.
  if(saved.encoding!==ENCODING||!Number.isSafeInteger(saved.bytes)||saved.bytes<=MAX_STORED||saved.bytes>MAX_RAW||!/^[a-f0-9]{64}$/.test(saved.sha256||"")||typeof saved.data!=="string"||Buffer.byteLength(JSON.stringify(saved))>MAX_STORED)throw new TypeError("Sauvegarde de fusion compressee invalide.");
  try{
    const raw=gunzipSync(Buffer.from(saved.data,"base64"),{maxOutputLength:MAX_RAW});
    if(raw.length!==saved.bytes||digest(raw)!==saved.sha256)throw Error("integrity");
    const plan=JSON.parse(raw.toString("utf8"));
    if(plan.kind!=="native-swimmer-merge"||["operation","source","target","targetAfter"].some(key=>!equal(plan[key],saved[key])))throw Error("identity");
    return plan;
  }catch{throw new TypeError("Sauvegarde de fusion compressee illisible ou alteree. Aucune reprise autorisee.");}
}
module.exports={encode,decode,MAX_STORED,MAX_RAW};

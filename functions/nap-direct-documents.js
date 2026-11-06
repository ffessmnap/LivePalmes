"use strict";
const {createHash}=require("node:crypto"),model=require('./nap-direct-model');
function decode(input) {
  if(!['series','results'].includes(input.documentKind)||!/^data:application\/pdf;base64,[A-Za-z0-9+/=\r\n]+$/.test(input.pdfDataUrl||''))throw new TypeError("PDF complet de séries ou résultats requis.");
  const encoded=input.pdfDataUrl.slice(input.pdfDataUrl.indexOf(',')+1).replace(/[\r\n]/g,'');
  if(encoded.length>14*1024*1024)throw new TypeError("PDF limité à 10 Mo.");
  const buffer=Buffer.from(encoded,'base64');
  if(buffer.length>10*1024*1024||buffer.subarray(0,5).toString()!=='%PDF-'||buffer.toString('base64')!==encoded)throw new TypeError("PDF invalide.");
  return buffer;
}
async function store(storage,environment,input,id) {
  const buffer=decode(input),hash=createHash('sha256').update(buffer).digest('hex'),session=model.clean(input.sessionKey||'all',64);
  const title=model.clean(input.title||`${input.documentKind==='series'?'Séries':'Résultats'} complets`,160);
  const path=`competition-pdfs/direct/${environment.name}/${model.competitionId(id)}/${hash}.pdf`;
  const bucket=storage.bucket(environment.publicBucket);
  try{await bucket.file(path).save(buffer,{resumable:false,preconditionOpts:{ifGenerationMatch:0},contentType:'application/pdf',metadata:{cacheControl:'public, max-age=31536000, immutable',contentDisposition:'inline; filename="competition.pdf"'}});}catch(error){if(Number(error.code)!==412)throw error;}
  return {id:`${input.documentKind}:${session}`,title,kind:input.documentKind,session,hash,url:`https://storage.googleapis.com/${environment.publicBucket}/${path}`,size:buffer.length};
}
module.exports={decode,store};

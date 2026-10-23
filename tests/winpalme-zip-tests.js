"use strict";
const assert=require("node:assert/strict"),{deflateRawSync}=require("node:zlib");
const {read,inventory,select,crc32}=require("../performances/public/winpalme-zip");
function archive(items) {
  const locals=[],central=[];let offset=0;
  for(const item of items) {
    const name=Buffer.from(item.name),data=Buffer.from(item.data||""),packed=item.store?data:deflateRawSync(data),crc=crc32(data);
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(item.flags||0,6);local.writeUInt16LE(item.store?0:8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
    locals.push(local,name,packed);
    const header=Buffer.alloc(46);header.writeUInt32LE(0x02014b50);header.writeUInt16LE(item.flags||0,8);header.writeUInt16LE(item.store?0:8,10);header.writeUInt32LE(item.badCrc?(crc^1)>>>0:crc,16);header.writeUInt32LE(packed.length,20);header.writeUInt32LE(item.size??data.length,24);header.writeUInt16LE(name.length,28);header.writeUInt32LE(offset,42);
    central.push(header,name);offset+=local.length+name.length+packed.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(items.length,8);end.writeUInt16LE(items.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,directory,end]);
}
const text="REN;11/10/2026;Compétition;Ville\nBAS;25;M\nWID;TEST5172\nCLU;ABC;Club;01020304\nNAG;TEST;Personne;01/01/2000;F;ABC;;50SF;;FSE;NAG;;;;;32.45\n";
const txt={name:"ExportTxt/27TEST_Export.txt",data:text};
const pdf={name:"Protocoles/27TEST_ProtocoleComplet_20261014_06553360.pdf",data:"%PDF-1.4\nfixture\n%%EOF"};
const file=items=>new File([archive(items)],"fixture.zip");
async function run(){
 let result=await read(file([txt,pdf,{...pdf,name:pdf.name.replace("20261014","20261012")},{name:"HelloAsso/ignored.pdf",data:"not a PDF"}]));
 assert.equal(result.rawText,text);assert.equal(result.manifest.protocolVersions,2);assert.equal(result.manifest.pdfPath,pdf.name);assert.equal(result.manifest.name,"Compétition");assert.equal(result.manifest.counts.swimmers,1);assert.equal(result.manifest.counts.timed,1);assert.match(result.manifest.textHash,/^[a-f0-9]{64}$/);assert.equal(result.pdf.type,"application/pdf");
 result=await read(file([txt,pdf].map(e=>({...e,name:"dossier/"+e.name,store:true}))));assert.match(result.manifest.textPath,/^dossier\//);
 for(const items of [[txt],[txt,pdf,{...txt,name:"ExportTxt/other_Export.txt"}],[txt,pdf,{name:"../unsafe",data:"x"}],[{...txt,flags:1},pdf],[{...txt,badCrc:true},pdf],[{...txt,size:10000000},pdf],[txt,{...pdf,data:"%PDF-1.4"}],[txt,{...pdf,name:pdf.name.replace("20261014","20260231")}],[txt,pdf,{...pdf}]]) await assert.rejects(()=>read(file(items)));
 assert.throws(()=>inventory(new Uint8Array(22)));assert.throws(()=>select([{name:"ExportTxt/27TEST_Export.txt"},{name:"Protocoles/other_ProtocoleComplet_20261014_06553360.pdf"}]));
 await assert.rejects(()=>read(file([{...txt,data:Buffer.from([0xff,0xfe])},pdf])));
 console.log("WinPalme ZIP: bounded selective extraction, latest matching protocol, CRC, UTF-8, paths, ambiguity, encrypted/oversize/truncated inputs and local PDF verified.");
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={archive};

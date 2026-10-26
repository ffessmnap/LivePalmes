"use strict";
const {competitionDocumentDownloadUrl}=require("./engagement-competition-documents");
const {digest}=require("./nap-import-protocol");
function createProtocolStorage(bucket){
  return {
    downloadUrl:(path,token)=>competitionDocumentDownloadUrl(bucket.name,path,token),
    ensure:async(plan,buffer)=>{
      if(!/^competition-documents\/nap\/[a-f0-9-]{36}\.pdf$/.test(plan.upload.path))throw new TypeError("Chemin du protocole invalide.");
      const file=bucket.file(plan.upload.path);
      if(buffer){
        if(buffer.length!==plan.manifest.size||digest(buffer)!==plan.manifest.hash)throw new TypeError("Contenu du protocole modifié.");
        try{
          await file.save(buffer,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:"application/pdf",cacheControl:"public, max-age=300, must-revalidate",metadata:{firebaseStorageDownloadTokens:plan.upload.token}}});
          return;
        }catch(error){if(![409,412].includes(Number(error.code)))throw error;}
      }
      const [stored]=await file.download({validation:"crc32c"});
      if(stored.length!==plan.manifest.size||digest(stored)!==plan.manifest.hash)throw new TypeError("PDF sauvegardé absent ou différent. Conservez le fichier source pour la reprise.");
    }
  };
}
module.exports={createProtocolStorage};

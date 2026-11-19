"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),{startStaticServer}=require("../tools/livepalmes-browser-smoke"),scope=require("../tools/a5-legacy-direct-scope.json");
(async()=>{
 const {server,baseUrl}=await startStaticServer();
 try{
  for(const name of [...scope.retiredPages,"series","resultats",...scope.retiredPaths.filter(name=>name.endsWith(".js")&&!name.startsWith("tools/"))]){
   for(const query of ["","?archive=ancienne-competition&type=archive-result&id=ancien-pdf"]){
    const response=await fetch(baseUrl+"/"+name+query,{redirect:"manual"});
    assert.equal(response.status,404,name+query);assert.equal(response.headers.get("location"),null,"Aucune redirection historique");
   }
  }
  for(const name of ["direct-admin.html","direct-consoles.html","direct.html","direct-guide.html","performances/mpf.html"]){
   const response=await fetch(baseUrl+"/"+name);assert.equal(response.status,200,name);assert.match(await response.text(),/<!doctype html>/i);
  }
  console.log("A5 HTTP: retired pages/aliases/entry scripts return 404 with or without archive identifiers; new Direct, guide and MPF stay available offline.");
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});

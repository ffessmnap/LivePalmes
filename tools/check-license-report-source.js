"use strict";
// Read one bounded official collection; never migrate, save or send.
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const {source}=require("./migrate-nap-license-reports");
const {hash}=require("../functions/nap-license-reports");
async function verify(db,expected){
  const reports=await source(db);
  if(reports.length!==10||hash(reports)!==expected)throw Error("Les bilans officiels ont changé depuis leur reprise NAP ; aucune bascule autorisée.");
  return {schema:1,sourceHash:expected,count:reports.length,readOnly:true};
}
async function main(){
  const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
  if(credentials.project_id!=="livepalmes")throw Error("Compte PROD requis");
  const load=require("node:module").createRequire(path.join(root,"functions/package.json"));
  const {initializeApp,cert,deleteApp}=load("firebase-admin/app"),{getFirestore}=load("firebase-admin/firestore");
  const app=initializeApp({credential:cert(credentials),projectId:"livepalmes"});
  try{console.log(JSON.stringify(await verify(getFirestore(app),process.argv[2])));}finally{await deleteApp(app);}
}
if(require.main===module)main().catch(()=>{console.error("Bilans PROD non conformes à la reprise NAP ; arrêt sans écriture.");process.exitCode=1;});
module.exports={verify};

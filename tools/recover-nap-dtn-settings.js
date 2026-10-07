"use strict";
const fs=require("node:fs"),{execFileSync}=require("node:child_process");
async function main() {
  const phase=process.env.NAP_DTN_SETTINGS_PHASE,confirmation=process.env.NAP_DTN_SETTINGS_CONFIRMATION;
  if(!["prepare","apply"].includes(phase) || confirmation!=="nap-recover-dtn-settings" || process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test") throw new Error("Confirmation incorrecte.");
  const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
  if(credentials.project_id!=="livepalmes-test" || credentials.client_email!=="github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte incorrect.");
  const options={encoding:"utf8",stdio:["ignore","pipe","pipe"]};
  const uri=execFileSync("gcloud",["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=value(serviceConfig.uri)"],options).trim();
  const url=new URL(uri);
  if(url.protocol!=="https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint incorrect.");
  const token=execFileSync("gcloud",["auth","print-identity-token",`--audiences=${uri}`],options).trim();
  const input={phase,confirmation};
  if(phase==="apply") {
    const backup=JSON.parse(fs.readFileSync("outputs/nap-dtn-settings-before.json","utf8"));
    if(backup.source!=="nap" || backup.mode!=="approved-dtn-settings-migration" || backup.performanceRowsCopied!==0 || !/^[a-f0-9]{64}$/.test(backup.sourceHash) || !/^[a-f0-9]{64}$/.test(backup.beforeHash) || !backup.settingsBackup) throw new Error("Sauvegarde incorrecte.");
    input.sourceHash=backup.sourceHash;input.beforeHash=backup.beforeHash;
  }
  url.searchParams.set("action","approved-dtn-settings");
  const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(170000)});
  if(!response.ok) throw new Error("Reprise privee indisponible.");
  const result=await response.json();
  if(result.source!=="nap" || result.mode!=="approved-dtn-settings-migration" || result.performanceRowsCopied!==0 || phase==="apply" && result.verified!==true) throw new Error("Resultat incorrect.");
  fs.mkdirSync("outputs",{recursive:true});
  fs.writeFileSync(`outputs/nap-dtn-settings-${phase==="prepare"?"before":"result"}.json`,JSON.stringify(result,null,2)+"\n");
  console.log(phase==="prepare"?"Parametres DTN sauvegardes avant reprise. Aucune ecriture.":"Reprise des parametres DTN verifiee. Aucune performance copiee.");
}
main().catch(()=>{console.error("Reprise DTN arretee ; consulter la preuve avant reprise. Aucun secret affiche.");process.exitCode=1;});

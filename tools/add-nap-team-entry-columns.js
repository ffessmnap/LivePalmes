"use strict";
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {planHash,definitions}=require('../functions/nap-approved-team-entry-schema');
async function main(){
  const phase=process.env.NAP_TEAM_SCHEMA_PHASE,confirmation=process.env.NAP_TEAM_SCHEMA_CONFIRMATION;
  if(!['prepare','apply'].includes(phase)||confirmation!=='nap-add-team-entry-columns'||process.env.TARGET_FIREBASE_PROJECT!=='livepalmes-test')throw new Error('Cible ou confirmation incorrecte.');
  const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));if(credentials.project_id!=='livepalmes-test'||credentials.client_email!=='github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com')throw new Error('Compte incorrect.');
  const options={encoding:'utf8',stdio:['ignore','pipe','pipe']},uri=execFileSync('gcloud',['functions','describe','exportNapPublicPage','--gen2','--region=europe-west1','--project=livepalmes-test','--format=value(serviceConfig.uri)'],options).trim(),url=new URL(uri);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.run.app')||url.username||url.password||url.search)throw new Error('Endpoint incorrect.');
  const token=execFileSync('gcloud',['auth','print-identity-token',`--audiences=${uri}`],options).trim(),input={phase,confirmation};
  if(phase==='apply'){const backup=JSON.parse(fs.readFileSync('outputs/nap-team-entry-schema-before.json','utf8'));if(backup.planHash!==planHash||JSON.stringify(backup.definitions)!==JSON.stringify(definitions)||!/^[a-f0-9]{64}$/.test(backup.schemaHash))throw new Error('Sauvegarde incompatible.');input.planHash=planHash;input.schemaHash=backup.schemaHash;}
  url.searchParams.set('action','approved-team-entry-schema');const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(170000)});if(!response.ok)throw new Error('Opération privée indisponible.');const result=await response.json();
  if(result.source!=='nap'||result.mode!=='approved-team-entry-schema'||result.planHash!==planHash||JSON.stringify(result.definitions)!==JSON.stringify(definitions)||result.dataRowsWritten!==false||phase==='apply'&&result.verified!==true)throw new Error('Résultat incorrect.');
  fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync(`outputs/nap-team-entry-schema-${phase==='prepare'?'before':'result'}.json`,JSON.stringify(result,null,2)+'\n');console.log(phase==='prepare'?'Structure et plan de trois colonnes sauvegardés, sans écriture.':'Trois colonnes vérifiées ; aucune table ni donnée sportive créée.');
}
main().catch(()=>{console.error('Opération de structure arrêtée. Consulter la preuve avant reprise ; aucun secret affiché.');process.exitCode=1;});

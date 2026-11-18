'use strict';
// Fixed production project, configuration/permissions only. No account endpoint.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),common=require('./a3-mfa-test-config');
const ROOT=path.resolve(__dirname,'..'),PROJECT='livepalmes',ACCOUNT='github-actions-livepalmes@livepalmes.iam.gserviceaccount.com';
const WORKFLOW='ffessmnap/LivePalmes/.github/workflows/a3-mfa-production-inspect.yml@refs/heads/main';
const GET='https://identitytoolkit.googleapis.com/admin/v2/projects/livepalmes/config?fields=name,subtype,mfa';
const IAM='https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions',PERMISSIONS=['firebaseauth.configs.get','firebaseauth.configs.update'];
function need(value){if(!value)throw Error('Inspection MFA PROD refusee');}
function context(env){
 need(env.GITHUB_REPOSITORY==='ffessmnap/LivePalmes'&&env.GITHUB_REPOSITORY_ID==='1240638222'&&env.GITHUB_REPOSITORY_OWNER_ID==='284726282'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1'&&env.GITHUB_WORKFLOW_REF===WORKFLOW&&env.VERIFIED_MAIN_CI==='true'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')&&env.EXPECTED_COMMIT===env.GITHUB_SHA&&/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||'')&&Number.isSafeInteger(Number(env.GITHUB_RUN_ID)));
 return {project:PROJECT,repository:'ffessmnap/LivePalmes',candidate:env.GITHUB_SHA,run:Number(env.GITHUB_RUN_ID),workflow:WORKFLOW,operation:'inspect'};
}
function allowed(url,method,body){return url===GET&&method==='GET'&&body===undefined||url===IAM&&method==='POST'&&JSON.stringify(body)===JSON.stringify({permissions:PERMISSIONS});}
function configuration(value){need(value&&Object.keys(value).every(key=>['name','subtype','mfa'].includes(key))&&['projects/livepalmes/config','projects/718081132564/config'].includes(value.name)&&value.subtype==='IDENTITY_PLATFORM');return common.mfa(value.mfa||{});}
async function exercise(read){
 const result=await read(IAM,'POST',{permissions:PERMISSIONS});need(result&&Object.keys(result).every(key=>key==='permissions'));
 const permissions=result.permissions||[];need(Array.isArray(permissions)&&permissions.every(key=>PERMISSIONS.includes(key))&&new Set(permissions).size===permissions.length);
 const base={permissions:[...permissions].sort(),missingPermissions:PERMISSIONS.filter(key=>!permissions.includes(key)),configurationWrites:0,usersRead:0,usersWritten:0,emailsSent:0,factorsEnrolled:0,publicationInvocations:0,credentialsExported:false,tokensExported:false};
 if(!permissions.includes(PERMISSIONS[0]))return {...base,state:'blocked',canEnable:false};
 const before=configuration(await read(GET,'GET'));let desired=null;try{desired=common.next(before);}catch{}
 return {...base,state:'inspected',before,beforeSha256:common.hash(before),desired,compatibleConfiguration:desired!==null,canEnable:desired!==null&&permissions.includes(PERMISSIONS[1])};
}
function credentialRecord(env){
 context(env);const file=path.resolve(env.GOOGLE_APPLICATION_CREDENTIALS||'');need(path.dirname(file)===path.resolve(env.GITHUB_WORKSPACE||'')&&/^gha-creds-[A-Za-z0-9_-]{8,80}\.json$/.test(path.basename(file)));
 const info=fs.lstatSync(file);need(info.isFile()&&!info.isSymbolicLink()&&info.size<=65536);const record=JSON.parse(fs.readFileSync(file,'utf8'));
 need(record.type==='service_account'&&record.project_id===PROJECT&&record.client_email===ACCOUNT&&typeof record.private_key==='string'&&record.private_key.length>0);return record;
}
async function reader(credential,url,method='GET',body){
 need(allowed(url,method,body));const token=await credential.getAccessToken();need(typeof token?.access_token==='string'&&token.access_token);
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json','X-Goog-User-Project':PROJECT},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(30000)});need(response.status===200);
 const stream=response.body.getReader(),chunks=[];let size=0;for(;;){const {done,value}=await stream.read();if(done)break;size+=value.byteLength;if(size>16384){await stream.cancel();need(false);}chunks.push(Buffer.from(value));}return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function main(argv,env=process.env){
 need(argv.length===1);const ctx=context(env),destination=path.resolve(argv[0]);need(!fs.existsSync(destination)&&path.dirname(destination)===path.resolve(env.RUNNER_TEMP||'')&&path.basename(destination)==='a3-mfa-production-inspect');
 need(process.version==='v22.23.5'&&JSON.parse(fs.readFileSync(path.join(ROOT,'functions/node_modules/firebase-admin/package.json'))).version==='14.2.0');
 const record=credentialRecord(env),{cert}=require(require.resolve('firebase-admin/app',{paths:[path.join(ROOT,'functions')]})),credential=cert(record),result=await exercise((...args)=>reader(credential,...args));
 const files=['tools/a3-mfa-production-inspect.js','tools/a3-mfa-test-config.js','.github/workflows/a3-mfa-production-inspect.yml','functions/package-lock.json'];
 const receipt={schema:1,context:ctx,identity:ACCOUNT,nodeVersion:process.version,firebaseAdminVersion:'14.2.0',sourceHashes:Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex')])),...result};
 fs.mkdirSync(destination,{mode:0o700});fs.writeFileSync(path.join(destination,'production-mfa-inspection.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});if(result.state==='blocked')process.exitCode=1;
 console.log('Inspection MFA PROD : '+result.state+' ; aucune ecriture, compte ou facteur traite.');
}
module.exports={context,allowed,configuration,exercise,credentialRecord,reader,PROJECT,ACCOUNT,WORKFLOW,GET,IAM,PERMISSIONS};
if(require.main===module)main(process.argv.slice(2)).catch(()=>{console.error('Inspection MFA PROD refusee ; aucun contenu credential, compte ou jeton affiche.');process.exitCode=1;});

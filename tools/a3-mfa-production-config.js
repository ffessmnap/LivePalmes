"use strict";
// Only the existing PROD project and its TOTP provider. No user/account endpoint.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),PROJECT='livepalmes',ACCOUNT='github-actions-livepalmes@livepalmes.iam.gserviceaccount.com';
const WORKFLOW='ffessmnap/LivePalmes/.github/workflows/a3-mfa-production-config.yml@refs/heads/main';
const BASE='https://identitytoolkit.googleapis.com/admin/v2/projects/'+PROJECT+'/config';
const GET=BASE+'?fields=name,subtype,mfa',PATCH=BASE+'?updateMask=mfa.providerConfigs&fields=name,subtype,mfa';
const IAM='https://cloudresourcemanager.googleapis.com/v1/projects/'+PROJECT+':testIamPermissions';
const PERMISSIONS=['firebaseauth.configs.get','firebaseauth.configs.update'];
const DESIRED={state:'ENABLED',totpProviderConfig:{adjacentIntervals:5}};
const fail=()=>{throw Error('Configuration TOTP PROD refusee');};
function need(value){if(!value)fail();}
function exact(value,keys){need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===[...keys].sort().join('|'));}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function context(env,operation){
 need(operation==='enable-totp'&&env.GITHUB_REPOSITORY==='ffessmnap/LivePalmes'&&env.GITHUB_REPOSITORY_ID==='1240638222'&&env.GITHUB_REPOSITORY_OWNER_ID==='284726282'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1'&&env.GITHUB_WORKFLOW_REF===WORKFLOW&&env.VERIFIED_MAIN_CI==='true'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')&&env.EXPECTED_COMMIT===env.GITHUB_SHA&&/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||'')&&Number.isSafeInteger(Number(env.GITHUB_RUN_ID)));
 need(operation==='inspect'?env.EXPECTED_MFA_SHA256==='':/^[a-f0-9]{64}$/.test(env.EXPECTED_MFA_SHA256||''));
 need(env.VERIFIED_COMMON_TEST==='true'&&/^[1-9][0-9]*$/.test(env.TEST_RUN||'')&&Number.isSafeInteger(Number(env.TEST_RUN)));
 return {project:PROJECT,repository:'ffessmnap/LivePalmes',candidate:env.GITHUB_SHA,run:Number(env.GITHUB_RUN_ID),workflow:WORKFLOW,operation,testRun:Number(env.TEST_RUN)};
}
function mfa(value){
 need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['state','enabledProviders','providerConfigs'].includes(k)));
 const state=value.state||'DISABLED',enabledProviders=value.enabledProviders||[],providerConfigs=value.providerConfigs||[];
 need(['DISABLED','ENABLED'].includes(state)&&Array.isArray(enabledProviders)&&enabledProviders.length<=1&&enabledProviders.every(x=>x==='PHONE_SMS')&&Array.isArray(providerConfigs)&&providerConfigs.length<=1);
 const providers=providerConfigs.map(item=>{exact(item,['state','totpProviderConfig']);exact(item.totpProviderConfig,['adjacentIntervals']);need(['DISABLED','ENABLED'].includes(item.state)&&Number.isSafeInteger(item.totpProviderConfig.adjacentIntervals)&&item.totpProviderConfig.adjacentIntervals>=0&&item.totpProviderConfig.adjacentIntervals<=10);return {state:item.state,totpProviderConfig:{adjacentIntervals:item.totpProviderConfig.adjacentIntervals}};});
 return {state,enabledProviders:[...enabledProviders],providerConfigs:providers};
}
function configuration(value){
 need(value&&Object.keys(value).every(k=>['name','subtype','mfa'].includes(k))&&['projects/'+PROJECT+'/config','projects/718081132564/config'].includes(value.name)&&value.subtype==='IDENTITY_PLATFORM');return mfa(value.mfa||{});
}
function next(before){
 const value=mfa(before);need(value.state==='DISABLED'&&value.enabledProviders.length===0);
 if(value.providerConfigs.length){need(value.providerConfigs[0].totpProviderConfig.adjacentIntervals===5);}
 return {...value,providerConfigs:[structuredClone(DESIRED)]};
}
function allowed(url,method,body){
 if(url===GET&&method==='GET'&&body===undefined)return true;
 if(url===IAM&&method==='POST'&&JSON.stringify(body)===JSON.stringify({permissions:PERMISSIONS}))return true;
 if(url!==PATCH||method!=='PATCH')return false;
 try{exact(body,['mfa']);exact(body.mfa,['providerConfigs']);return JSON.stringify(body.mfa.providerConfigs)===JSON.stringify([DESIRED]);}catch{return false;}
}
async function reader(credential,url,method='GET',body){
 need(allowed(url,method,body));const token=await credential.getAccessToken();need(typeof token?.access_token==='string'&&token.access_token);
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json','X-Goog-User-Project':PROJECT},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(30000)});
 need(response.status===200);const stream=response.body.getReader(),chunks=[];let length=0;
 for(;;){const {done,value}=await stream.read();if(done)break;length+=value.byteLength;if(length>16384){await stream.cancel();fail();}chunks.push(Buffer.from(value));}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function exercise({operation,expectedHash,read,backup}){
 const permission=await read(IAM,'POST',{permissions:PERMISSIONS});exact(permission,Object.keys(permission).includes('permissions')?['permissions']:[]);
 const permissions=permission.permissions||[];need(Array.isArray(permissions)&&permissions.every(x=>PERMISSIONS.includes(x))&&new Set(permissions).size===permissions.length);
 const missingPermissions=PERMISSIONS.filter(x=>!permissions.includes(x));
 if(!permissions.includes(PERMISSIONS[0])){need(operation==='inspect');return {state:'blocked',permissions,missingPermissions,canEnable:false,configurationWrites:0,usersRead:0,usersWritten:0,emailsSent:0,factorsEnrolled:0};}
 const before=configuration(await read(GET)),beforeSha256=hash(before),afterExpected=next(before);
 const report={before,beforeSha256,missingPermissions,permissions:[...permissions].sort(),configurationWrites:0,usersRead:0,usersWritten:0,emailsSent:0,factorsEnrolled:0,mandatoryMfaActivated:false,smsStatePreserved:true,otherProjectSettingsSelected:false};
 if(operation==='inspect')return {...report,state:'inspected',canEnable:permissions.includes(PERMISSIONS[1]),desired:afterExpected};
 need(operation==='enable-totp'&&permissions.includes(PERMISSIONS[1])&&expectedHash===beforeSha256);
 await backup({project:PROJECT,before,beforeSha256});
 if(JSON.stringify(before)!==JSON.stringify(afterExpected)){await read(PATCH,'PATCH',{mfa:{providerConfigs:[structuredClone(DESIRED)]}});report.configurationWrites=1;}
 const after=configuration(await read(GET));need(JSON.stringify(after)===JSON.stringify(afterExpected));
 return {...report,state:'verified',after,afterSha256:hash(after),totpEnabled:true};
}
function credentialRecord(env,operation){
 context(env,operation);const file=path.resolve(env.GOOGLE_APPLICATION_CREDENTIALS||'');
 need(path.dirname(file)===path.resolve(env.GITHUB_WORKSPACE||'')&&/^gha-creds-[A-Za-z0-9_-]{8,80}\.json$/.test(path.basename(file)));
 const info=fs.lstatSync(file);need(info.isFile()&&!info.isSymbolicLink()&&info.size<=65536);
 const record=JSON.parse(fs.readFileSync(file,'utf8'));need(record.type==='service_account'&&record.project_id===PROJECT&&record.client_email===ACCOUNT&&typeof record.private_key==='string'&&record.private_key.length>0);return record;
}
async function main(argv,env=process.env){
 need(argv.length===2);const [operation,directory]=argv,ctx=context(env,operation);
 const destination=path.resolve(directory);need(!fs.existsSync(destination)&&path.dirname(destination)===path.resolve(env.RUNNER_TEMP||'')&&path.basename(destination)==='a3-mfa-production-config');
 need(process.version==='v22.23.5'&&JSON.parse(fs.readFileSync(path.join(ROOT,'functions/node_modules/firebase-admin/package.json'))).version==='14.2.0');
 const record=credentialRecord(env,operation),{cert}=require(require.resolve('firebase-admin/app',{paths:[path.join(ROOT,'functions')]})),credential=cert(record);
 fs.mkdirSync(destination,{mode:0o700});
 const result=await exercise({operation,expectedHash:env.EXPECTED_MFA_SHA256,read:(...args)=>reader(credential,...args),backup:async value=>fs.writeFileSync(path.join(destination,'mfa-before.json'),JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'})});
 const receipt={schema:1,context:ctx,identity:ACCOUNT,nodeVersion:process.version,firebaseAdminVersion:'14.2.0',sourceHashes:Object.fromEntries(['tools/a3-mfa-production-config.js','.github/workflows/a3-mfa-production-config.yml','functions/package-lock.json'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex')])),...result};
 fs.writeFileSync(path.join(destination,'mfa-production-config-proof.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});
 if(result.state==='blocked')process.exitCode=1;
 console.log('Configuration TOTP PROD : '+result.state+' ; aucun compte, facteur utilisateur ou message traite.');
}
module.exports={context,mfa,configuration,next,allowed,exercise,credentialRecord,hash,PROJECT,ACCOUNT,WORKFLOW,GET,PATCH,IAM,PERMISSIONS,DESIRED};
if(require.main===module)main(process.argv.slice(2)).catch(()=>{console.error('Configuration TOTP PROD refusee ; aucun credential ou detail prive affiche. Ne pas relancer une ecriture sans observer la configuration.');process.exitCode=1;});

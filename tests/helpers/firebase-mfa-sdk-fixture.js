'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),pins=require('../fixtures/firebase-mfa-sdk.json');
async function sdkFiles(){
 assert.equal(pins.length,8);const files=new Map();
 for(const pin of pins){
  const match=/^https:\/\/www\.gstatic\.com\/firebasejs\/(10\.12\.[25])\/(firebase-(?:app|auth)(?:-compat)?\.js)$/.exec(pin.url);
  assert(match&&/^[a-f0-9]{64}$/.test(pin.sha256)&&pin.bytes>0&&pin.bytes<=2000000,'SDK provenance outside existing versions');
  const file=path.join(root,'tmp/firebase-mfa-sdk',match[1],match[2]);let data;
  try{data=fs.readFileSync(file);if(data.length!==pin.bytes||crypto.createHash('sha256').update(data).digest('hex')!==pin.sha256)data=null;}catch{}
  if(!data){
   const response=await fetch(pin.url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);
   const reader=response.body.getReader(),chunks=[];let length=0;
   for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>pin.bytes){await reader.cancel();throw Error('SDK fixture response exceeded sealed size');}chunks.push(Buffer.from(value));}
   data=Buffer.concat(chunks);assert.equal(data.length,pin.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),pin.sha256);
   fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);
  }
  const fixturePath='/sdk/'+match[1]+'/'+match[2];assert(!files.has(fixturePath));
  // Only relocate official ESM imports into this isolated local fixture.
  files.set(fixturePath,data.toString().replaceAll('https://www.gstatic.com/firebasejs/'+match[1]+'/','/sdk/'+match[1]+'/'));
 }
 return files;
}
const fakeNetwork=`
window.__cspViolations=[];window.addEventListener('securitypolicyviolation',event=>window.__cspViolations.push(event.effectiveDirective));
window.__authCalls=[];window.__badCode=false;window.__factorMode='totp';window.__pauseFinalize=false;const realFetch=window.fetch.bind(window);
const encoded=value=>btoa(JSON.stringify(value)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const token=()=>encoded({alg:'RS256',typ:'JWT'})+'.'+encoded({iss:'https://securetoken.google.com/demo-livepalmes-fixture',aud:'demo-livepalmes-fixture',sub:'mfa-fixture',user_id:'mfa-fixture',iat:Math.floor(Date.now()/1000),auth_time:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,email:'mfa@example.invalid',email_verified:true,firebase:{identities:{email:['mfa@example.invalid']},sign_in_provider:'password',sign_in_second_factor:'totp'}})+'.FAKE-SIGNATURE';
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.href);if(url.origin===location.origin)return realFetch(input,options);
 if(!['identitytoolkit.googleapis.com','securetoken.googleapis.com'].includes(url.hostname))throw Error('Outbound Auth fixture refused');
 window.__authCalls.push(url.pathname);const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 if(url.hostname==='securetoken.googleapis.com'&&url.pathname==='/v1/token')return response({access_token:token(),id_token:token(),refresh_token:'FAKE-REFRESH',expires_in:'3600',user_id:'mfa-fixture',project_id:'demo-livepalmes-fixture',token_type:'Bearer'});
 if(url.pathname.endsWith('/accounts:signInWithPassword')){
  const factor=__factorMode==='phone'?{phoneInfo:'+16505550000'}:{totpInfo:{}};
  const hints=[{mfaEnrollmentId:'FAKE-FACTOR',displayName:'Application fictive',enrolledAt:'2026-01-01T00:00:00Z',...factor}];
  if(__factorMode==='multiple')hints.push({...hints[0],mfaEnrollmentId:'FAKE-SECOND',displayName:'<img src=x onerror=alert(1)>'});
  return response({localId:'mfa-fixture',email:'mfa@example.invalid',registered:true,mfaPendingCredential:'FAKE-PENDING-CREDENTIAL',mfaInfo:hints});
 }
 if(url.pathname.endsWith('/accounts/mfaSignIn:finalize')){
  const body=JSON.parse(options.body||'{}');window.__selectedFactor=body.mfaEnrollmentId;
  const data=()=>__badCode?response({error:{code:400,message:'INVALID_VERIFICATION_CODE'}},400):response({idToken:token(),refreshToken:'FAKE-REFRESH',expiresIn:'3600'});
  if(__pauseFinalize)return new Promise(resolve=>{window.__releaseFinalize=()=>resolve(data());});return data();
 }
 if(url.pathname.endsWith('/accounts:lookup'))return response({users:[{localId:'mfa-fixture',email:'mfa@example.invalid',emailVerified:true,providerUserInfo:[{providerId:'password',federatedId:'mfa@example.invalid',email:'mfa@example.invalid'}]}]});
 throw Error('Unknown fake Auth endpoint');
};`;
function bootstrap(version){return `
const factory=window.module.exports;delete window.module;
window.__sdkModule=import('/sdk/${version}/firebase-auth.js');window.__version='${version}';window.__factory=factory;
firebase.initializeApp({apiKey:'FAKE-OFFLINE-KEY',authDomain:'demo-livepalmes-fixture.firebaseapp.com',projectId:'demo-livepalmes-fixture',appId:'1:123:web:fixture'});
window.__auth=firebase.auth();window.__ready=false;window.__business=0;window.__outcome=null;
__auth.setPersistence(firebase.auth.Auth.Persistence.NONE).then(()=>{window.__mfa=factory.createMfaAuth({document,sdkLoader:()=>__sdkModule,versionReader:()=>__version});window.__ready=true;});
window.__start=async function(reauth=false,custom){
 window.__outcome=null;window.__credential=null;const api=custom||__mfa;
 try{
  let credential;try{credential=reauth?await __auth.currentUser.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential('mfa@example.invalid','FAKE-PASSWORD')):await __auth.signInWithEmailAndPassword('mfa@example.invalid','FAKE-PASSWORD');}catch(error){window.__challenge=error;credential=await api.resolve(__auth,error);}
  if(reauth)await __auth.currentUser.getIdToken(true);
  window.__business++;window.__credential=credential;window.__outcome={status:'accepted',uid:credential.user.uid,compatUser:typeof credential.user.reauthenticateWithCredential==='function'};
 }catch(error){window.__outcome={status:'refused',code:error.code,message:error.message};}
};`;}
async function start(){
 const files=await sdkFiles();
 const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));
 const policies=new Map(['/portail.html','/direct-admin.html'].map(source=>[source,config.hosting.headers.find(row=>row.source===source).headers.find(row=>row.key==='Content-Security-Policy').value]));
 const assets=new Set(['/assets/livepalmes-mfa-auth.js','/assets/livepalmes-mfa-auth.css']);
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),version=url.searchParams.get('version');let content,type='text/javascript';
  if(files.has(url.pathname))content=files.get(url.pathname);
  else if(url.pathname==='/network.js')content=fakeNetwork;
  else if(url.pathname==='/module-export.js')content='window.module={exports:{}};';
  else if(url.pathname==='/bootstrap.js'&&['10.12.2','10.12.5'].includes(version))content=bootstrap(version);
  else if(assets.has(url.pathname)){content=fs.readFileSync(path.join(root,url.pathname.slice(1)));if(url.pathname.endsWith('.css'))type='text/css';}
  else if(url.pathname==='/'&&['10.12.2','10.12.5'].includes(version)&&policies.has(url.searchParams.get('policy')||'/portail.html')){
   type='text/html';res.setHeader('Content-Security-Policy',policies.get(url.searchParams.get('policy')||'/portail.html'));
   content='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/network.js"></script><script src="/sdk/'+version+'/firebase-app-compat.js"></script><script src="/sdk/'+version+'/firebase-auth-compat.js"></script><script src="/module-export.js"></script><script src="/assets/livepalmes-mfa-auth.js"></script><script src="/bootstrap.js?version='+version+'"></script>';
  }else{res.writeHead(404);res.end('Unknown fixture');return;}
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(content);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,baseUrl:'http://127.0.0.1:'+server.address().port};
}
module.exports={start,sdkFiles};

'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {sdkFiles}=require('./firebase-mfa-sdk-fixture'),root=path.resolve(__dirname,'../..');
// Public RFC 6238 seed. These keys/credentials belong only to this isolated fixture.
const FIRST='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',SECOND='JBSWY3DPEHPK3PXP';
function otp(seed,time=59){let bits='';for(const c of seed)bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5,'0');const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(time/30)));const hash=crypto.createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
function network(project){return `
window.__cspViolations=[];addEventListener('securitypolicyviolation',event=>__cspViolations.push(event.effectiveDirective));
window.__fixtureProject=${JSON.stringify(project)};window.__authCalls=[];window.__factors=[];window.__verified=true;window.__allowed=true;window.__badCode=false;window.__pauseFinalize=false;window.__expiry=600000;window.__nextSeed=${JSON.stringify(FIRST)};window.__expectedCode=${JSON.stringify(otp(FIRST))};window.__expectedSecond=${JSON.stringify(otp(SECOND))};
const realFetch=fetch.bind(window),encoded=value=>btoa(JSON.stringify(value)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const token=()=>encoded({alg:'RS256',typ:'JWT'})+'.'+encoded({iss:'https://securetoken.google.com/'+__fixtureProject,aud:__fixtureProject,sub:'mfa-enrollment-fixture',user_id:'mfa-enrollment-fixture',iat:Math.floor(Date.now()/1000),auth_time:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,email:'mfa@example.invalid',email_verified:__verified,firebase:{identities:{email:['mfa@example.invalid']},sign_in_provider:'password',...(__factors.length?{sign_in_second_factor:'totp'}:{})}})+'.FAKE-SIGNATURE';
const tokens=()=>({localId:'mfa-enrollment-fixture',email:'mfa@example.invalid',idToken:token(),refreshToken:'FAKE-REFRESH',expiresIn:'3600'});
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.href);if(url.origin===location.origin)return realFetch(input,options);
 if(!['identitytoolkit.googleapis.com','securetoken.googleapis.com'].includes(url.hostname))throw Error('Outbound fixture refused');
 __authCalls.push(url.pathname);const body=url.pathname==='/v1/token'?{}:JSON.parse(options.body||'{}'),response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}),invalid=()=>response({error:{code:400,message:'INVALID_VERIFICATION_CODE'}},400);
 if(url.pathname==='/v1/token')return response({access_token:token(),id_token:token(),refresh_token:'FAKE-REFRESH',expires_in:'3600',user_id:'mfa-enrollment-fixture',project_id:__fixtureProject,token_type:'Bearer'});
 if(url.pathname.endsWith('/accounts:signInWithPassword'))return response(__factors.length?{localId:'mfa-enrollment-fixture',email:'mfa@example.invalid',registered:true,mfaPendingCredential:'FAKE-PENDING',mfaInfo:__factors}:tokens());
 if(url.pathname.endsWith('/accounts:lookup'))return response({users:[{localId:'mfa-enrollment-fixture',email:'mfa@example.invalid',emailVerified:__verified,mfaInfo:__factors,providerUserInfo:[{providerId:'password',federatedId:'mfa@example.invalid',email:'mfa@example.invalid'}]}]});
 if(url.pathname.endsWith('/accounts:sendOobCode'))return response({email:'mfa@example.invalid'});
 if(url.pathname.endsWith('/accounts/mfaEnrollment:start')&&__factors.length)return response({error:{code:400,message:'MAXIMUM_SECOND_FACTOR_COUNT_EXCEEDED'}},400);
 if(url.pathname.endsWith('/accounts/mfaEnrollment:start'))return response({totpSessionInfo:{sharedSecretKey:__nextSeed,verificationCodeLength:6,hashingAlgorithm:'SHA1',periodSec:30,sessionInfo:'FAKE-SESSION',finalizeEnrollmentTime:new Date(Date.now()+__expiry).toISOString()}});
 if(url.pathname.endsWith('/accounts/mfaEnrollment:finalize')){
  const finalize=()=>{if(__badCode||body.totpVerificationInfo?.verificationCode!==__expectedCode)return invalid();__factors.push({mfaEnrollmentId:'FAKE-'+(__factors.length+1),displayName:body.displayName,enrolledAt:'2026-01-01T00:00:00Z',totpInfo:{}});return response(tokens());};
  if(__pauseFinalize)return new Promise(resolve=>window.__releaseFinalize=()=>resolve(finalize()));return finalize();
 }
 if(url.pathname.endsWith('/accounts/mfaEnrollment:withdraw')){__factors=__factors.filter(f=>f.mfaEnrollmentId!==body.mfaEnrollmentId);return response(tokens());}
 if(url.pathname.endsWith('/accounts/mfaSignIn:finalize')){const expected=body.mfaEnrollmentId==='FAKE-1'?${JSON.stringify(otp(FIRST))}:__expectedSecond;if(!__factors.some(f=>f.mfaEnrollmentId===body.mfaEnrollmentId)||__badCode||body.totpVerificationInfo?.verificationCode!==expected)return invalid();return response(tokens());}
 throw Error('Unknown fixture endpoint '+url.pathname);
};`;}
function bootstrap(version,project){return `
window.__enrollmentFactory=module.exports;delete window.module;window.__sdkModule=import('/sdk/${version}/firebase-auth.js');window.__version='${version}';
firebase.initializeApp({apiKey:'FAKE-OFFLINE-KEY',authDomain:'${project}.firebaseapp.com',projectId:'${project}',appId:'1:123:web:fixture'});window.__auth=firebase.auth();window.__ready=false;window.__business=0;window.__printCount=0;
__auth.setPersistence(firebase.auth.Auth.Persistence.NONE).then(async()=>{await __auth.signInWithEmailAndPassword('mfa@example.invalid','FAKE-PASSWORD');window.__challenge=__challengeFactory.createMfaAuth({document,sdkLoader:()=>__sdkModule,versionReader:()=>__version});window.__enrollment=__make();window.__ready=true;});
window.__reauth=LivePalmesPortalNavigation.create({state:{},actions:{},config:{}}).reauthenticateCurrentUser;
window.__make=(extra={})=>__enrollmentFactory.createEnrollment({document,sdkLoader:()=>__sdkModule,versionReader:()=>__version,print:()=>{__printCount++;},qrLoader:()=>Promise.resolve({toCanvas:(canvas,uri,opts)=>{window.__qrUri=uri;return QRCode.toCanvas(canvas,uri,opts);}}),...extra});
window.__open=async function(custom,auth=__auth){window.__outcome=null;try{window.__outcome={status:'done',...await(custom||__enrollment).open({auth,isAdmin:()=>__allowed,reauthenticate:__reauth})};}catch(error){window.__outcome={status:'refused',code:error.code};}};
window.__login=async function(){window.__loginOutcome=null;try{await __auth.signOut();try{await __auth.signInWithEmailAndPassword('mfa@example.invalid','FAKE-PASSWORD');}catch(error){await __challenge.resolve(__auth,error);}window.__loginOutcome='accepted';}catch{window.__loginOutcome='refused';}};
`;}
async function start(){
 const files=await sdkFiles(),config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')),policy=config.hosting.headers.find(row=>row.source==='/portail.html').headers.find(row=>row.key==='Content-Security-Policy').value;
 const assets=new Set(['/assets/livepalmes-mfa-auth.js','/assets/livepalmes-mfa-auth.css','/assets/livepalmes-mfa-enrollment.js','/assets/livepalmes-mfa-enrollment.css','/assets/portal/navigation.js','/assets/vendor/qrcode.min.js']);
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),version=url.searchParams.get('version'),project=url.searchParams.get('project')||'livepalmes-test';if(!['livepalmes-test','livepalmes'].includes(project)){res.writeHead(404);res.end('Unknown fixture project');return;}let content,type='text/javascript';
  if(files.has(url.pathname))content=files.get(url.pathname);
  else if(url.pathname==='/network.js')content=network(project);
  else if(url.pathname==='/exports.js')content='window.module={exports:{}};';
  else if(url.pathname==='/save-challenge.js')content='window.__challengeFactory=module.exports;window.module={exports:{}};';
  else if(url.pathname==='/bootstrap.js'&&['10.12.2','10.12.5'].includes(version))content=bootstrap(version,project);
  else if(assets.has(url.pathname)){content=fs.readFileSync(path.join(root,url.pathname.slice(1)));if(url.pathname.endsWith('.css'))type='text/css';if(url.pathname==='/assets/livepalmes-mfa-auth.js'&&url.searchParams.has('v'))content=content.toString()+';window.LivePalmesMfaAuth=window.__challenge;';}
  else if(url.pathname==='/'&&['10.12.2','10.12.5'].includes(version)){type='text/html';res.setHeader('Content-Security-Policy',policy);content='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/network.js?project='+project+'"></script><script src="/sdk/'+version+'/firebase-app-compat.js"></script><script src="/sdk/'+version+'/firebase-auth-compat.js"></script><script src="/assets/vendor/qrcode.min.js"></script><script src="/exports.js"></script><script src="/assets/livepalmes-mfa-auth.js"></script><script src="/save-challenge.js"></script><script src="/assets/portal/navigation.js"></script><script src="/assets/livepalmes-mfa-enrollment.js"></script><script src="/bootstrap.js?version='+version+'&project='+project+'"></script>';}
  else{res.writeHead(404);res.end('Unknown fixture');return;}
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(content);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,baseUrl:'http://127.0.0.1:'+server.address().port};
}
module.exports={start,otp,FIRST,SECOND};

"use strict";
const fs=require("node:fs"),crypto=require("node:crypto"),zlib=require("node:zlib");
function fail(code){throw Object.assign(new Error(code),{safeCode:code});}
function hash(data){return crypto.createHash("sha256").update(data).digest("hex");}
function canonical(value){
 if(value===null||typeof value!=="object")return JSON.stringify(typeof value==="number"&&Object.is(value,-0)?"-0":value);
 if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
 return "{"+Object.keys(value).filter(key=>value[key]!==undefined).sort().map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}
async function bytes(response,maxBytes){
 if(!response.ok)fail("SOURCE_HTTP_"+response.status);
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)fail("RESPONSE_BUDGET_EXCEEDED");chunks.push(Buffer.from(chunk));}return Buffer.concat(chunks);
}
async function tokenFromAccount(account,expected,request=fetch){
 if(account.type!=="service_account"||account.project_id!=="livepalmes-test"||account.client_email!==expected||!account.private_key)fail("DEDICATED_ACCOUNT_REQUIRED");
 const now=Math.floor(Date.now()/1000),header=Buffer.from(JSON.stringify({alg:"RS256",typ:"JWT"})).toString("base64url"),payload=Buffer.from(JSON.stringify({iss:account.client_email,scope:"https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/drive",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})).toString("base64url"),message=header+"."+payload;
 const assertion=message+"."+crypto.sign("RSA-SHA256",Buffer.from(message),account.private_key).toString("base64url");
 const data=JSON.parse((await bytes(await request("https://oauth2.googleapis.com/token",{method:"POST",body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}),signal:AbortSignal.timeout(30000)}),65536)).toString("utf8"));
 if(!data.access_token)fail("TOKEN_MISSING");return data.access_token;
}
function sourceClient(token,settings,request=fetch){
 const projects=new Set(settings.projects),buckets=new Set(Object.values(settings.buckets).flat());
 return async(url,body,media=false)=>{
  const target=new URL(url),project=target.pathname.match(/\/projects\/([^/]+)/)?.[1];
  if(target.protocol!=="https:"||target.username||target.password)fail("SOURCE_URL_REFUSED");
  if(target.hostname==="storage.googleapis.com"){
   const bucket=decodeURIComponent(target.pathname.match(/^\/storage\/v1\/b\/([^/]+)/)?.[1]||"");if(!buckets.has(bucket)||body!==undefined)fail("SOURCE_BUCKET_REFUSED");
  }else if(!["firestore.googleapis.com","identitytoolkit.googleapis.com","firebaserules.googleapis.com"].includes(target.hostname)||!projects.has(project))fail("SOURCE_PROJECT_REFUSED");
  if(body!==undefined&&!/^\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents:(runQuery|runAggregationQuery)$/.test(target.pathname))fail("SOURCE_WRITE_REFUSED");
  const response=await request(target.href,{method:body===undefined?"GET":"POST",headers:{Authorization:"Bearer "+token,...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});
  const raw=await bytes(response,media?settings.maxFileBytes:settings.maxResponseBytes);return media?raw:JSON.parse(raw.toString("utf8"));
 };
}
function pack(value,key,maxBytes){const plain=Buffer.from(JSON.stringify(value,(_key,v)=>typeof v==="number"&&Object.is(v,-0)?"-0":v));if(plain.length>maxBytes)fail("ARCHIVE_BUDGET_EXCEEDED");return {plainBytes:plain.length,sha256:hash(plain),encrypted:require("./production-backup-crypto").seal(zlib.gzipSync(plain),key)};}
function unpack(encrypted,key,maxBytes){return JSON.parse(zlib.gunzipSync(require("./production-backup-crypto").open(encrypted,key),{maxOutputLength:maxBytes}).toString("utf8"));}
function keyFromEnvironment(env){const value=env.A2_BACKUP_ENCRYPTION_KEY||"";if(!/^[A-Za-z0-9+/]{43}=$/.test(value)||Buffer.from(value,"base64").length!==32)fail("BACKUP_KEY_REQUIRED");return Buffer.from(value,"base64");}
module.exports={fail,hash,canonical,bytes,tokenFromAccount,sourceClient,pack,unpack,keyFromEnvironment};

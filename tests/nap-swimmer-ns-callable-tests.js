"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("./helpers/source-files"),{createHash}=require("node:crypto");
const ns=require("../functions/nap-swimmer-ns"),callables=require("../functions/nap-swimmer-ns-callables"),native=require("../functions/nap-portal-swimmers");
const stableHash=value=>createHash("sha256").update(value).digest("hex");
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
async function main(){
  const row={id:42,club:"106",nom:"EXEMPLE",prenom:"Fictif",date:"2000-01-01",sexe:"F",number:"",actif:1,livepalmes_ns:null,livepalmes_ns_version:null};
  const stores={requests:new Map(),auditLogs:new Map()};let writes=0,locked=false,failComplete=false,national=true,clubId="106",sql=0;
  const ref=(name,id)=>({id,get:async()=>({id,exists:stores[name].has(id),data:()=>structuredClone(stores[name].get(id))}),
    create:async data=>{if(stores[name].has(id))throw Error("already exists");stores[name].set(id,structuredClone(data));},
    set:async(data,options)=>{if(name==="requests"&&data.status==="approved"&&failComplete){failComplete=false;throw Error("interrupted after SQL");}stores[name].set(id,structuredClone(options?.merge?{...stores[name].get(id),...data}:data));}});
  const db={collection:name=>({doc:id=>ref(name,id)}),runTransaction:async fn=>fn({get:ref=>ref.get(),set:(ref,data,options)=>ref.set(data,options)})};
  const connection={execute:async({sql:query},values)=>{
    sql++;
    if(query.includes("GET_LOCK")){if(locked)return [[{acquired:0}]];locked=true;return [[{acquired:1}]];}
    if(query.includes("RELEASE_LOCK")){locked=false;return [[{released:1}]];}
    if(query.includes("information_schema.TRIGGERS"))return [[]];
    if(query.startsWith("SELECT *"))return [[{...row}]];
    assert.match(query,/UPDATE nageurs SET livepalmes_ns=/);assert.ok(stores.auditLogs.size);writes++;row.livepalmes_ns=values[0];row.livepalmes_ns_version=values[1];return [{affectedRows:1}];
  },release(){},destroy(){locked=false;}};
  const pool={execute:connection.execute,getConnection:async()=>connection};
  native.portalPool=()=>pool;
  require("../functions/nap-portal-pool").portalPool=()=>pool;
  const backend={db,stableHash,HttpsError,cleanFirestoreValue:value=>value,cleanText:value=>String(value||""),writeAuditLogOnce:async()=>{},
    ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION:"requests",engagementSwimmerChangeRequestItem:doc=>({id:doc.id,...doc.data()}),ENVIRONMENT:{sportingDataSource:"nap"},
    engagementClubAccessContext:async()=>({uid:"club-test",clubId}),engagementAccessContext:async()=>({uid:"national-test",national})};
  const handler=require("../functions/portal-national-handlers").createNationalHandlers(backend).requestEngagementClubSwimmerChange;
  const source=fs.readFileSync("functions/index.js","utf8"),code=source.slice(source.indexOf("exports.resolveEngagementSwimmerChangeRequest ="),source.indexOf("exports.updateEngagementNationalSwimmerIdentity ="));
  const sandbox={...backend,exports:{},process:{env:{}},onCall:(_options,fn)=>fn,ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS:{},ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS:{},defineSecret:x=>x,TypeError,RangeError,
    require:name=>{if(name==="./nap-swimmer-ns")return ns;if(name==="./nap-swimmer-ns-callables")return callables;if(name==="./nap-portal-swimmers")return native;throw Error("Forbidden dependency "+name);}};
  vm.runInNewContext(code,sandbox);
  const resolve=(id,decision)=>sandbox.exports.resolveEngagementSwimmerChangeRequest({data:{requestId:id,decision,resolutionNote:"Décision fictive"}});
  const submit=data=>handler({data:{swimmerId:"42",...data}});
  assert.equal((await submit({nsAction:"read"})).swimmer.nonSelectable,false);
  await submit({nsAction:"save",nonSelectable:true,expectedNsFingerprint:ns.fingerprint(row)});assert.equal(writes,1);
  const request=await submit({nsAction:"save",nonSelectable:false,expectedNsFingerprint:ns.fingerprint(row)});assert.equal(writes,1);assert.equal(row.livepalmes_ns,1);
  await assert.rejects(submit({nsAction:"save",nonSelectable:false,expectedNsFingerprint:ns.fingerprint(row)}),error=>error.code==="already-exists");
  assert.equal((await submit({nsAction:"read"})).nsRequest.status,"pending");
  national=false;await assert.rejects(resolve(request.nsRequest.id,"approved"),error=>error.code==="permission-denied");assert.equal(writes,1);national=true;
  await resolve(request.nsRequest.id,"rejected");assert.equal(writes,1);assert.equal(row.livepalmes_ns,1);assert.equal((await submit({nsAction:"read"})).nsRequest.status,"rejected");
  await submit({nsAction:"save",nonSelectable:false,expectedNsFingerprint:ns.fingerprint(row)});
  failComplete=true;await assert.rejects(resolve(request.nsRequest.id,"approved"),error=>error.code==="unavailable");assert.equal(row.livepalmes_ns,0);assert.equal(writes,2);
  await resolve(request.nsRequest.id,"approved");assert.equal(writes,2,"retry after SQL must not apply again");await resolve(request.nsRequest.id,"approved");assert.equal(writes,2);
  const previous=sql;clubId="999";await assert.rejects(submit({nsAction:"read"}),/club/);assert.equal(sql-previous,1);assert.equal(writes,2);
  console.log("NS callables: actual club handler and national resolver, duplicate request, rejection, approval, denied scopes and interrupted SQL retry passed without network, migration or mail.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

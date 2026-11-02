"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {createPortalSessions,DAY,INTERVAL}=require("../functions/portal-session");
class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
function environment(){
  const clock={value:1793600000000},documents=new Map(),calls=[],storage=new Map();let writes=0;
  const snapshot=id=>({exists:documents.has(id),data:()=>documents.get(id)});
  const db={collection:name=>{assert.equal(name,"portalSessions");return{doc:id=>({id,get:async()=>snapshot(id)})};},runTransaction:async fn=>fn({get:async ref=>snapshot(ref.id),set:(ref,data)=>{writes++;documents.set(ref.id,{...data});},update:(ref,data)=>{writes++;documents.set(ref.id,{...documents.get(ref.id),...data});}})};
  const account={uid:"client-user",email:"fixture@example.test",authTime:Math.floor(clock.value/1000),getIdTokenResult:async function(){return{claims:{auth_time:this.authTime}};},getIdToken:async()=>"token",reauthenticateWithCredential:async function(password){if(password!=="correct")throw Object.assign(new Error("wrong-password"),{code:"auth/wrong-password"});this.authTime=Math.floor(clock.value/1000);}};
  const auth={currentUser:account,signOut:async()=>{auth.currentUser=null;}};
  const profile=()=>({uid:auth.currentUser?.uid,status:"active",capabilities:["engagements.club.manage"],clubId:"106",accessScopes:{}});
  const server=createPortalSessions({getDb:()=>db,HttpsError,now:()=>clock.value,readProfile:async()=>profile()});
  function tab({store=storage,seed=10}={}){
    const listeners={},documentListeners={},timers=new Map(),nodes=new Map();let timerId=0;
    const make=tag=>({tagName:tag.toUpperCase(),value:"",disabled:false,hidden:false,open:false,children:new Map(),setAttribute(){},addEventListener(name,fn){this[name]=fn;},querySelector(selector){if(!this.children.has(selector))this.children.set(selector,make(selector.includes("button")?"button":"input"));return this.children.get(selector);},showModal(){this.open=true;},close(){this.open=false;},focus(){}});
    const main={inert:false,draft:"Saisie à conserver"},body={dataset:{},classList:{contains:()=>true},appendChild:node=>nodes.set(node.id,node)};
    const document={body,visibilityState:"visible",querySelector:selector=>selector==="main"?main:null,createElement:make,addEventListener:(name,fn)=>documentListeners[name]=fn,dispatchEvent:event=>{documentListeners[event.type]?.(event);}};
    const service={httpsCallable:name=>async input=>{
      if (name === "getCurrentAccessUser" && input._portalSessionAction) name = {open:"openPortalSession",touch:"touchPortalSession",close:"closePortalSession",profile:"getPortalAccessUser"}[input._portalSessionAction];
      calls.push(name);const request={auth:{uid:auth.currentUser?.uid,token:{auth_time:auth.currentUser?.authTime}},data:input};
      if(name==="openPortalSession")return{data:await server.open(request)};
      if(name==="touchPortalSession")return{data:await server.touch(request)};
      if(name==="closePortalSession")return{data:await server.close(request)};
      await server.assertSession(request);return{data:name==="getPortalAccessUser"?profile():{ok:true}};
    }};
    const authFactory=()=>auth;authFactory.EmailAuthProvider={credential:(_email,password)=>password};
    const window={LivePalmesEnvironment:{isTest:true},firebase:{auth:authFactory},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},crypto:{getRandomValues:bytes=>bytes.fill(seed)},location:{reload(){}},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,at:clock.value+ms});return timerId;},clearTimeout:id=>timers.delete(id),addEventListener:(name,fn)=>listeners[name]=fn};
    class FakeDate extends Date{static now(){return clock.value;}}
    const sandbox={window,document,Date:FakeDate,Uint8Array,CustomEvent:class{constructor(type,input){this.type=type;this.detail=input?.detail;}}};
    vm.runInNewContext(fs.readFileSync("assets/livepalmes-portal-session.js","utf8"),sandbox);
    const session=window.LivePalmesPortalSession;session.wrap(service);let resumed=0,notifications=[];
    window.LivePalmesPortalAuth={status:()=>({profile:profile()}),refreshProfile:async options=>{notifications.push(options.notify);await service.httpsCallable("getCurrentAccessUser")({});return true;},signOut:async()=>{await session.end();await auth.signOut();}};
    documentListeners["livepalmes:portal-session-resumed"]=()=>resumed++;
    async function due(){for(let n=0;n<10;n++){const entry=[...timers].find(([,value])=>value.at<=clock.value);if(!entry)break;timers.delete(entry[0]);await entry[1].fn();}await Promise.resolve();}
    return{session,service,document,main,timers,notifications,get resumed(){return resumed;},activity:()=>listeners.pointerdown({isTrusted:true}),storage:()=>listeners.storage({key:"livepalmes.portal.session.v2."+account.uid}),visibility:()=>documentListeners.visibilitychange(),due,lock:()=>nodes.get("adminPortalSessionLock"),unlock:async password=>{const dialog=nodes.get("adminPortalSessionLock");dialog.querySelector("#adminPortalSessionPassword").value=password;await dialog.querySelector("form").submit({preventDefault(){}});}};
  }
  return{clock,documents,calls,account,auth,storage,server,tab,advance:ms=>clock.value+=ms,get writes(){return writes;}};
}
async function main(){
  const e=environment(),a=e.tab();
  await Promise.all([a.service.httpsCallable("getCurrentAccessUser")({}),a.service.httpsCallable("getCurrentAccessUser")({})]);assert.deepEqual(e.calls,["openPortalSession"],"Simultaneous initial profile requests share session/profile verification");
  const initial=e.writes;e.advance(1000);a.activity();e.advance(INTERVAL);await a.due();assert.equal(e.calls.filter(x=>x==="touchPortalSession").length,1);assert.equal(e.writes,initial+1);
  e.advance(INTERVAL);await a.due();assert.equal(e.calls.filter(x=>x==="touchPortalSession").length,1,"No periodic idle heartbeat");
  const b=e.tab();await b.session.prepare();const priorCalls=e.calls.length;e.advance(DAY);await a.due();assert.equal(a.document.body.dataset.portalSession,"locked");assert.equal(a.main.inert,true);assert.equal(a.main.draft,"Saisie à conserver");
  b.storage();assert.equal(b.document.body.dataset.portalSession,"locked");
  await assert.rejects(a.service.httpsCallable("saveEngagementClubPerson")({}),x=>x.details?.portalSessionExpired);assert.equal(e.calls.length,priorCalls,"Expired operation never reaches business RPC");
  await e.account.getIdToken(true);await assert.rejects(a.session.prepare(),x=>x.details?.portalSessionExpired,"Token refresh is not reauthentication");
  await a.unlock("wrong");assert.equal(a.lock().open,true);assert.match(a.lock().querySelector("#adminPortalSessionMessage").textContent,/incorrect/);
  await a.unlock("correct");assert.equal(a.lock().open,false);assert.equal(a.document.body.dataset.portalSession,"active");assert.equal(a.main.draft,"Saisie à conserver");assert.equal(a.resumed,1);assert.deepEqual(a.notifications,[false]);assert.equal(e.calls.filter(x=>x==="saveEngagementClubPerson").length,0,"No write replay on resume");
  b.storage();for(let n=0;n<30;n++)await Promise.resolve();assert.equal(b.document.body.dataset.portalSession,"active");assert.equal(b.lock().open,false,"Reauthentication in another tab is verified and shared");
  const device=e.tab({store:new Map(),seed:11});await device.session.prepare();await a.session.end();await device.service.httpsCallable("getEngagementCompetition")({});
  await assert.rejects(a.session.prepare(),x=>x.details?.portalSessionExpired,"Logout cannot be undone with the same Firebase token");
  const old=environment(),oldTab=old.tab({seed:12});old.advance(DAY);await assert.rejects(oldTab.session.prepare(),x=>x.details?.portalSessionExpired);assert.equal(old.writes,0,"Old sessions with no local history require a real login");
  const future=environment(),futureTab=future.tab();await futureTab.session.prepare();const key=[...future.storage.keys()][0],state=JSON.parse(future.storage.get(key));state.lastActivityAt=future.clock.value+DAY;future.storage.set(key,JSON.stringify(state));const reload=future.tab();await assert.rejects(reload.session.prepare());assert.equal(reload.document.body.dataset.portalSession,"locked");
  assert.match(fs.readFileSync("portail.html","utf8"),/livepalmes-portal-session\.js\?v=/);
  {
  const {portalModule}=require("./helpers/portal-module-runtime");
  const state={activeAuthUid:"same-user",currentAccessProfile:{clubId:"106",regionId:"IDF",capabilities:["engagements.region.manage"],accessScopes:{}},accessUsers:[{uid:"previous-region"}],accessUsersLoaded:true,accessDirectorySnapshotMode:true};
  let resets=0;
  const actions=new Proxy({resetEngagementClubData:()=>resets++,renderCurrentUser:value=>{state.currentAccessProfile=value;}},{get:(target,key)=>target[key]||(()=>{})});
  const module=portalModule("account-and-access.js","LivePalmesPortalAccountAndAccess",{state,actions,config:{},elements:{}},{window:{firebase:{auth:()=>({currentUser:{uid:"same-user"}})}},document:{body:{dataset:{},setAttribute(){}}}});
  const status={ready:true,signedIn:true,available:true,configured:true,profile:state.currentAccessProfile};
  module.updateView(status);assert.equal(resets,0,"Same context preserves drafts");
  module.updateView({...status,profile:{...status.profile,regionId:"HDF"}});assert.equal(resets,1);assert.equal(state.accessUsers.length,0);assert.equal(state.accessUsersLoaded,false);assert.equal(state.accessDirectorySnapshotMode,false,"Changed scope clears private data before rendering");
  }
  console.log("Actual client + server: one initial RPC, batched trusted activity, no idle heartbeat, 24h/sleep lock, old token, wrong password, shared tabs, independent device, preserved draft, no replay, logout and absent/future history passed offline.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});

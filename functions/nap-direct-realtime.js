'use strict';
// A private wake-up channel only. NAP remains authoritative, including retries.
const {randomUUID}=require('node:crypto');
const instances=new WeakMap(),LEASE_MS=300000,RENEW_MS=120000,MAX_MEMBERS=64;
function version(head){
  const config=Number(head.configVersion),workflow=Number(head.revision);
  if(!Number.isSafeInteger(config)||config<0||!Number.isSafeInteger(workflow)||workflow<0)throw TypeError('Version de signal invalide.');
  return {config,workflow};
}
const newer=(a,b)=>!b||a.config>b.config||a.config===b.config&&a.workflow>b.workflow;
const millis=value=>value?.toMillis?.()??(value instanceof Date?value.getTime():0);
function createRelay({db,environment,clock=Date.now}){
  if(!['test','production'].includes(environment))throw TypeError('Environnement du signal invalide.');
  const delivered=new Map();
  function refs(id){
    if(!Number.isSafeInteger(Number(id))||Number(id)<1)throw TypeError('Compétition du signal invalide.');
    const base=`livepalmesDirectSignals/${environment}-${Number(id)}`;
    return {access:db.doc(base+'/private/access'),signal:db.doc(base+'/signal/current')};
  }
  async function subscribe({id,uid,head}){
    if(typeof uid!=='string'||!uid||uid.length>128||uid.includes('/'))throw TypeError('Compte du signal invalide.');
    version(head);const {access,signal}=refs(id),now=clock();let expires;
    await db.runTransaction(async tx=>{
      const snapshot=await tx.get(access),before=snapshot.exists?snapshot.data().members||{}:{};
      const members=Object.fromEntries(Object.entries(before).filter(([,entry])=>millis(entry.until)>now));
      const prior=Object.hasOwn(members,uid)?members[uid]:null;
      if(!prior&&Object.keys(members).length>=MAX_MEMBERS)throw Error('Trop de comptes connectés au signal de cette compétition.');
      expires=millis(prior?.until);
      if(expires>now+RENEW_MS)return;
      expires=now+LEASE_MS;
      tx.set(access,{members:{...members,[uid]:{until:new Date(expires)}}});
    });
    delivered.delete(String(id));
    await publish({id,head});
    return {path:signal.path,leaseExpiresAt:expires,renewAfterMs:Math.max(1000,expires-now-RENEW_MS)};
  }
  async function publish({id,head}){
    const next=version(head),key=String(id),cached=delivered.get(key),now=clock();
    if(cached&&now-cached.at<LEASE_MS&&!newer(next,cached.version))return;
    const {access,signal}=refs(id);let sent=false;
    await db.runTransaction(async tx=>{
      const leases=await tx.get(access);
      if(!leases.exists||!Object.values(leases.data().members||{}).some(entry=>millis(entry.until)>now))return;
      const current=await tx.get(signal),previous=current.exists?current.data().version:null;
      if(newer(next,previous))tx.set(signal,{version:next,updatedAt:new Date(now)});
      sent=true;
    });
    if(sent){if(delivered.size>=100)delivered.delete(delivered.keys().next().value);const last=delivered.get(key);if(!last||newer(next,last.version))delivered.set(key,{version:next,at:now});}
  }
  async function revoke({id,uid}){
    const {access,signal}=refs(id);delivered.delete(String(id));
    await db.runTransaction(async tx=>{const [snapshot,current]=await Promise.all([tx.get(access),tx.get(signal)]);if(!snapshot.exists)return;const members={...snapshot.data().members};if(uid)delete members[uid];tx.set(access,{members:uid?members:{}});if(current.exists)tx.set(signal,{...current.data(),accessEpoch:randomUUID(),updatedAt:new Date(clock())});});
  }
  return {subscribe,publish,revoke};
}
function relayFor(options){let environments=instances.get(options.db);if(!environments){environments=new Map();instances.set(options.db,environments);}if(!environments.has(options.environment))environments.set(options.environment,createRelay(options));return environments.get(options.environment);}
module.exports={createRelay,relayFor,version,newer,LEASE_MS,MAX_MEMBERS};

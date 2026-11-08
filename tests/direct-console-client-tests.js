'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function main(){
  let uid='user',serial=0,rendered=0,denied=0,mode='ok',resolveCommand,resolveData;const calls=[],timers=new Map(),retries=[];
  const document={hidden:false},window={LivePalmesEnvironment:{napReaderUrl:'https://fixture.invalid/read'}};
  const context={window,document,URL,AbortSignal,crypto:{randomUUID:()=>String(++serial)},setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),fetch:async()=>({ok:true,json:async()=>({data:{records:[]}})})};
  vm.runInNewContext(fs.readFileSync('assets/direct/console-client.js','utf8'),context);
  const call=async(action,input)=>{calls.push({action,input});if(action==='consoleSnapshot'){if(mode==='denied')throw Object.assign(Error('Retiré'),{code:'functions/permission-denied'});return mode==='unchanged'?{unchanged:true}:{selectedEventId:'course',revision:1,configVersion:2};}if(action==='consoleAllData')return mode==='wait-data'?new Promise(resolve=>resolveData=resolve):{entries:[]};if(action==='consoleCommand'){if(mode==='network')throw Error('Réseau perdu');if(mode==='wait-command')return new Promise(resolve=>resolveCommand=resolve);return {};}};
  let poll=true;const client=window.LivePalmesDirectConsoleClient.create({role:'referee',competitionId:900001,getUser:()=>uid?{uid}:null,call,onRender:()=>rendered++,onAccessError:()=>denied++,onRetry:value=>retries.push(value),canPoll:()=>poll});
  await client.load();assert.equal(rendered,1);assert.equal(timers.size,1);mode='unchanged';await client.load();assert.equal(rendered,1);assert.equal(timers.size,1);
  async function tick(){const [id,fn]=timers.entries().next().value;timers.delete(id);await fn();await Promise.resolve();}
  const before=calls.length;document.hidden=true;await tick();assert.equal(calls.length,before);document.hidden=false;poll=false;await tick();assert.equal(calls.length,before);poll=true;client.state.dirty=true;await tick();assert.equal(calls.length,before);client.state.dirty=false;
  mode='network';await assert.rejects(client.send('progress',{series:1}));const first=client.state.pending.operationKey;assert.equal(retries.at(-1),true);await assert.rejects(client.send('progress',{series:2}),/envoi reste/);mode='ok';await client.deliver();assert.equal(calls.filter(c=>c.action==='consoleCommand').at(-1).input.operationKey,first);assert.equal(client.state.pending,null);
  mode='wait-data';const a=client.allData(),b=client.allData();resolveData({entries:[1]});assert.equal(await a,await b);await client.allData();assert.equal(calls.filter(c=>c.action==='consoleAllData').length,1);client.state.data.configVersion++;mode='ok';await client.allData();assert.equal(calls.filter(c=>c.action==='consoleAllData').length,2);
  mode='wait-command';const pending=client.send('progress',{series:2});client.reset();uid='other';resolveCommand({});assert.equal(await pending,false,'Une ancienne réponse ne modifie pas la nouvelle connexion');assert.equal(client.state.pending,null);assert.equal(client.state.data,null);
  mode='ok';await client.load();mode='denied';await client.load();assert.equal(denied,1);assert.equal(client.state.data,null);client.stop();assert.equal(timers.size,0);await client.load();assert.equal(timers.size,0);
  console.log('Client commun consoles : un minuteur, pause masqué/dialogue/saisie, reprise idempotente, cache groupé, changement de compte et révocation vérifiés hors réseau.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

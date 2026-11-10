'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {fixture}=require('./direct-console-sql-fixture'),{createStore}=require('../../functions/nap-direct-store'),{createService}=require('../../functions/nap-direct-service'),flow=require('../../functions/nap-direct-console-model');
async function start({empty=false,id=900001}={}){
  const pool=fixture(),store=createStore(pool,'test'),actor={uid:'root',national:true};await store.settings(id,actor,{consoles:flow.roles,operationKey:randomUUID()});
  const event={eventCode:'100sf',eventLabel:'100 m Surface',sex:'M',date:'2026-11-07',sessionKey:'1',sessionLabel:'Samedi matin',expectedSeries:2,scheduledAt:'09:00'},people=Array.from({length:14},(_,i)=>({lastName:'NAGEUR',firstName:String(i+1),club:'CLUB',birthYear:2005,category:'HSE',series:i<8?1:2,lane:i%8+1,entryTime:'595999'}));
  async function publish(kind,rows){const group={kind,event,rows,operationKey:randomUUID()},batch={groups:[group]},preview=await store.previewBatch(id,batch);return store.publishBatch(id,actor,{...batch,fingerprint:preview.fingerprint,confirmReplacement:true});}
  if(!empty){await publish('series',people);await publish('results',people.map((p,i)=>({...p,resultTime:'01:'+String(10+i).padStart(2,'0')+'.00'})));}
  const service=createService({getPool:()=>pool,environment:'test',authorize:async req=>({uid:req.auth.uid,national:req.auth.uid==='root'}),lookupUser:async email=>({uid:email,active:true}),matchRegion:()=>false});
  const root=path.resolve(__dirname,'../..');let tail=Promise.resolve();
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');
    try{
      if(url.pathname==='/fixture-public'){
        const data=await require('../../functions/nap-direct-public').readPublic(pool,'test',{id,eventId:url.searchParams.get('eventId')||undefined,view:url.searchParams.get('view')||undefined});res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));return;
      }
      if(url.pathname==='/fixture-rpc'){
        let text='';for await(const chunk of req)text+=chunk;const input=JSON.parse(text),job=tail.then(async()=>input.action==='list'?{items:[{...(await store.native(id)),id:'legacy-nap-'+id,direct:(await store.detail(id)).config}]}:service({auth:{uid:'root'},data:input}));tail=job.catch(()=>{});let value;
        try{value=await job;}catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({message:error.message,code:error.directCode?'functions/'+error.directCode:'functions/invalid-argument'}));return;}
        res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));return;
      }
      const file=path.resolve(root,'.'+url.pathname);if(path.relative(root,file).startsWith('..'))throw Error('Path');
      let content=fs.readFileSync(file);if(file.endsWith('.html'))content=content.toString().replace(/<script src="https:[^"]+"><\/script>/g,'');
      res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});res.end(content);
    }catch(error){res.writeHead(404);res.end(error.message);}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,baseUrl:'http://127.0.0.1:'+server.address().port,pool,store,id,event,people,publish};
}
module.exports={start};

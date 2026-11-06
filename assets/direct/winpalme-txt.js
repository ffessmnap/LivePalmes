(function(global){
  'use strict';
  const fail=message=>{throw Error(message);};
  const ui=global.LivePalmesDirectPresentation||(typeof module==='object'?require('./presentation'):null);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const code=value=>normalize(value).replace(/bix$/,'bi');
  async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
  function decode(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return new TextDecoder('windows-1252').decode(bytes);}}
  function fileInfo(name){
    const match=String(name).match(/^(.+)_AS_(\d{1,3})_(\d{1,3})_(\d{1,3})_([a-z0-9]+)\.txt$/i);
    if(!match||name.length>200||match.slice(2,5).some(n=>Number(n)<1))fail('Nom TXT WinPalme non reconnu : '+name);
    return {prefix:match[1],session:Number(match[2]),event:Number(match[3]),series:Number(match[4]),eventCode:code(match[5]),key:Number(match[2])+'|'+Number(match[3])};
  }
  function time(value){
    if(!/^\d{6}$/.test(value)||Number(value.slice(2,4))>59||value==='000000')fail('Temps TXT incomplet ou non reconnu : '+value);
    return {raw:value.slice(0,2)+':'+value.slice(2,4)+'.'+value.slice(4),cs:(Number(value.slice(0,2))*60+Number(value.slice(2,4)))*100+Number(value.slice(4))};
  }
  function parse(name,text){
    const info=fileInfo(name),lines=String(text).replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(line=>line.trim()),seen=new Set();
    if(!lines.length||lines.length>21)fail('Série TXT vide ou trop volumineuse : '+name);
    const rows=lines.map(line=>{
      const fields=line.trim().split(/[;:]/).map(s=>s.trim()),lane=Number(fields[0]);
      if(fields.length!==7||!/^\d+$/.test(fields[0])||lane<0||lane>20||seen.has(lane))fail('Ligne d’eau invalide ou dupliquée : '+name);
      seen.add(lane);const token=normalize(fields[1]);let status='';
      if(/^(forfait|absent|absence|abs|dns)$/.test(token))status='dns';
      else if(/^(abandon|abd|ab|dnf)$/.test(token))status='ab';
      else if(/^(disqualification|disqualifiee?|disqual|disq|dsq|dq)$/.test(token))status='dsq';
      const final=status?null:time(fields[1]),splits=[];let previous=0;
      fields.slice(2).forEach((value,index)=>{
        if(!value||value==='000000')return;
        const split=time(value),distance=ui.distance(info.eventCode,index),total=ui.length(info.eventCode);
        if(final&&split.cs===final.cs&&(distance===total||total===50))return;
        if(split.cs<=previous||final&&split.cs>=final.cs||distance&&total&&distance>=total)fail('Passages TXT incohérents : '+name);
        previous=split.cs;splits.push({distance:distance?distance+' m':'Passage '+(index+1),time:split.raw});
      });return {lane,resultTime:final?.raw||'',resultStatus:status,splits};
    });return {...info,rows};
  }
  async function readDirectory(directory){
    const files=[];let total=0;
    for await(const handle of directory.values()){
      if(handle.kind!=='file'||!/\.txt$/i.test(handle.name))continue;
      if(files.length>=2000)fail('Dossier limité à 2 000 TXT.');
      const file=await handle.getFile();total+=file.size;
      if(file.size>65536||total>4*1024*1024)fail('TXT trop volumineux (64 Ko par fichier, 4 Mo par dossier).');
      const text=decode(await file.arrayBuffer());files.push({name:file.name,text,hash:await digest(text),info:fileInfo(file.name)});
    }
    files.sort((a,b)=>a.name.localeCompare(b.name));
    if(new Set(files.map(f=>f.info.prefix)).size>1)fail('Ce dossier contient plusieurs compétitions WinPalme. Sélectionner un dossier dédié.');
    return files;
  }
  function associations(files){
    const groups=new Map();for(const f of files){const key=f.info.key,old=groups.get(key);if(old&&old.eventCode!==f.info.eventCode)fail('Épreuve TXT ambiguë : '+f.name);if(!old)groups.set(key,{...f.info,count:0});groups.get(key).count++;}return [...groups.values()];
  }
  function laneMapping({txtFirstLane=0,seriesFirstLane=0}={}){
    const values=[txtFirstLane,seriesFirstLane].map(value=>value===''?NaN:Number(value));
    if(values.some(value=>!Number.isInteger(value)||value<0||value>20))fail('Premières lignes invalides : choisir des numéros entiers entre 0 et 20.');
    return {txtFirstLane:values[0],seriesFirstLane:values[1],offset:values[1]-values[0]};
  }
  function buildGroup(file,snapshot,eventId,lanes){
    const parsed=parse(file.name,file.text),event=snapshot.events.find(e=>e.id===eventId);
    const mapping=laneMapping(lanes);
    parsed.rows=parsed.rows.map(row=>{
      const lane=row.lane+mapping.offset;
      if(row.lane<mapping.txtFirstLane||lane<0||lane>20)fail('Décalage de lignes incompatible : '+file.name+'. Contrôler les premières lignes TXT et séries.');
      return {...row,lane};
    });
    if(!event||code(event.eventCode)!==parsed.eventCode||Number(event.sessionKey)!==parsed.session)fail('Association TXT / épreuve à contrôler : '+file.name);
    const entries=snapshot.entries.filter(row=>row.eventId===event.id&&Number(row.series)===parsed.series),fingerprint=snapshot.seriesFingerprints[event.id+':'+parsed.series];
    if(!fingerprint||entries.length!==parsed.rows.length||new Set(entries.map(row=>row.lane)).size!==entries.length||parsed.rows.some(row=>!entries.some(entry=>entry.lane===row.lane)))fail('Répartition différente des séries importées : '+file.name+'. Réimporter les séries à jour.');
    const eventInput={...event};delete eventInput.heatSchedule;
    return {kind:'results',event:eventInput,seriesNumber:parsed.series,seriesFingerprint:fingerprint,operationKey:crypto.randomUUID(),source:{type:'winpalme-txt',name:file.name,hash:file.hash},rows:parsed.rows.map(result=>{
      const entry=entries.find(row=>row.lane===result.lane);
      return {...result,series:parsed.series,lastName:entry.lastName,firstName:entry.firstName,birthYear:entry.birthYear,club:entry.club,category:entry.category,relay:entry.kind==='relay',sourceEntryId:entry.sourceEntryId||null,entryTime:entry.seed?.raw||'',relayMembers:entry.members||[]};
    })};
  }
  function createRunner({read,build,publish,onState=()=>{},now=Date.now,interval=30000,schedule=setTimeout,cancel=clearTimeout}){
    const acknowledged=new Map(),observed=new Map();let active=false,busy=false,timer=null,generation=0,pending=null,lastCheck=null,lastMessage='',lastError=false;
    const emit=(message=lastMessage,error=lastError)=>{lastMessage=message;lastError=error;onState({active,busy,pending:Boolean(pending),lastCheck,message,error});};
    function stop(){active=false;generation++;if(timer!=null)cancel(timer);timer=null;emit(busy?'Arrêt demandé · le lot déjà envoyé peut terminer.':'Surveillance arrêtée.',false);}
    async function check(){
      if(!active||busy)return;busy=true;const version=generation;
      const saveReceipt=receipt=>{if(version!==generation)return false;if(pending)pending.receipt=receipt;return true;};
      try{
        if(pending){await publish(pending.groups,pending.receipt,saveReceipt);if(version!==generation)return;pending.files.forEach(f=>acknowledged.set(f.name,f.hash));pending=null;}
        const files=await read();if(version!==generation)return;
        lastCheck=now();const changed=[];
        for(const f of files){
          if(acknowledged.get(f.name)===f.hash)continue;
          const previous=observed.get(f.name);
          if(previous?.hash===f.hash&&now()-previous.at>=1000)changed.push(f);
          else if(previous?.hash!==f.hash)observed.set(f.name,{hash:f.hash,at:now()});
        }
        const batch=changed.slice(0,100);
        if(batch.length){
          const groups=batch.map(build);if(version!==generation)return;
          pending={groups,files:batch,receipt:null};await publish(groups,null,saveReceipt);
          if(version!==generation)return;batch.forEach(f=>acknowledged.set(f.name,f.hash));pending=null;
          emit(batch.length+' fichier(s) publié(s). Le public peut actualiser.',false);
        }else emit('Dossier contrôlé · aucun nouveau résultat stable à publier.',false);
      }catch(error){if(version===generation){active=false;emit(error.message||'Connexion interrompue. Reprendre la surveillance pour réessayer.',true);}}
      finally{busy=false;emit();if(version===generation&&active)timer=schedule(check,interval);}
    }
    function start(){if(active||busy)return;active=true;generation++;emit('Surveillance active · contrôle toutes les 30 secondes.',false);void check();}
    function ignore(files){if(active||busy||pending)fail('Arrêter la surveillance avant de choisir les fichiers à ignorer.');files.forEach(f=>acknowledged.set(f.name,f.hash));}
    return {start,stop,check,ignore,get active(){return active;},get busy(){return busy;},get pending(){return Boolean(pending);}};
  }
  const api={digest,decode,fileInfo,time,parse,readDirectory,associations,buildGroup,createRunner,code,laneMapping};
  if(typeof module==='object'&&module.exports)module.exports=api;else global.LivePalmesDirectTxt=api;
})(typeof window==='undefined'?globalThis:window);

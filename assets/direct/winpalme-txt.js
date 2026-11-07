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
    const info=fileInfo(name),rawLines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim()),seen=new Map();
    const lines=rawLines.filter(line=>/^[1-8];/.test(line));
    if(!rawLines.length||lines.length>1000)fail('Série TXT vide ou trop volumineuse : '+name);
    const rows=lines.map(line=>{
      const fields=line.trim().split(/[;:]/).map(s=>s.trim()),lane=Number(fields[0]);
      if(fields.length!==7||!/^\d+$/.test(fields[0])||lane<0||lane>20)fail('Ligne d’eau invalide : '+name);
      const signature=fields.join(';');
      if(seen.has(lane)){if(seen.get(lane)===signature)return null;fail('Deux contenus différents pour la ligne '+lane+' : '+name);}
      seen.set(lane,signature);const token=normalize(fields[1]);let status='';
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
    }).filter(Boolean);return {...info,rows};
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
    const parsed=parse(file.name,file.text);if(!parsed.rows.length)return null;
    const event=snapshot.events.find(e=>e.id===eventId);
    const mapping=laneMapping(lanes);
    parsed.rows=parsed.rows.map(row=>{
      const lane=row.lane+mapping.offset;
      if(row.lane<mapping.txtFirstLane||lane<0||lane>20)fail('Décalage de lignes incompatible : '+file.name+'. Contrôler les premières lignes TXT et séries.');
      return {...row,lane};
    });
    if(!event||code(event.eventCode)!==parsed.eventCode||Number(event.sessionKey)!==parsed.session)fail('Association à vérifier : '+file.name+' · session '+parsed.session+', épreuve '+parsed.event+'. Choisir l’épreuve correspondante dans les réglages.');
    const entries=snapshot.entries.filter(row=>row.eventId===event.id&&Number(row.series)===parsed.series),fingerprint=snapshot.seriesFingerprints[event.id+':'+parsed.series];
    if(!fingerprint||!entries.length)fail(file.name+' · série '+parsed.series+' absente des séries publiées. Vérifier l’association ou importer cette série.');
    if(entries.length!==parsed.rows.length||new Set(entries.map(row=>row.lane)).size!==entries.length||parsed.rows.some(row=>!entries.some(entry=>entry.lane===row.lane))){
      const numbers=rows=>rows.map(row=>row.lane).sort((a,b)=>a-b).join(', ');
      const original=parsed.rows.map(row=>({...row,lane:row.lane-mapping.offset}));
      fail(file.name+' · série '+parsed.series+' : lignes TXT ['+numbers(original)+'], après décalage ['+numbers(parsed.rows)+'], séries importées ['+numbers(entries)+']. Vérifier les premières lignes et l’association ; réimporter le PDF seulement si la répartition a changé.');
    }
    const eventInput={...event};delete eventInput.heatSchedule;
    return {kind:'results',event:eventInput,seriesNumber:parsed.series,seriesFingerprint:fingerprint,operationKey:crypto.randomUUID(),source:{type:'winpalme-txt',name:file.name,hash:file.hash},rows:parsed.rows.map(result=>{
      const entry=entries.find(row=>row.lane===result.lane);
      return {...result,series:parsed.series,lastName:entry.lastName,firstName:entry.firstName,birthYear:entry.birthYear,club:entry.club,category:entry.category,relay:entry.kind==='relay',sourceEntryId:entry.sourceEntryId||null,entryTime:entry.seed?.raw||'',relayMembers:entry.members||[]};
    })};
  }
  function createRunner({read,build,publish,onState=()=>{},now=Date.now,interval=30000,schedule=setTimeout,cancel=clearTimeout}){
    const acknowledged=new Map(),observed=new Map(),blocked=new Map();let active=false,busy=false,timer=null,generation=0,pending=null,lastCheck=null,lastMessage='',lastError=false;
    const emit=(message=lastMessage,error=lastError)=>{lastMessage=message;lastError=error;onState({active,busy,pending:Boolean(pending),lastCheck,message,error,issues:[...blocked.values()]});};
    function stop(){active=false;generation++;if(timer!=null)cancel(timer);timer=null;emit(busy?'Arrêt demandé · le lot déjà envoyé peut terminer.':'Surveillance arrêtée.',false);}
    async function check(){
      if(!active||busy)return;busy=true;const version=generation;
      const saveReceipt=receipt=>{if(version!==generation)return false;if(pending)pending.receipt=receipt;return true;};
      try{
        if(pending){await publish(pending.groups,pending.receipt,saveReceipt);if(version!==generation)return;pending.files.forEach(f=>acknowledged.set(f.name,f.hash));pending=null;}
        const files=await read();if(version!==generation)return;
        lastCheck=now();const changed=[],present=new Set(files.map(file=>file.name));
        for(const name of blocked.keys())if(!present.has(name))blocked.delete(name);
        for(const f of files){
          if(acknowledged.get(f.name)===f.hash){blocked.delete(f.name);continue;}
          const previous=observed.get(f.name);
          if(previous?.hash===f.hash&&now()-previous.at>=1000)changed.push(f);
          else if(previous?.hash!==f.hash)observed.set(f.name,{hash:f.hash,at:now()});
        }
        const batch=[],groups=[];
        for(const file of changed){
          try{const group=build(file);blocked.delete(file.name);if(!group){acknowledged.set(file.name,file.hash);continue;}batch.push(file);groups.push(group);if(batch.length===100)break;}
          catch(error){const message=error.message||'TXT non reconnu';blocked.set(file.name,{name:file.name,message:message.includes(file.name)?message:file.name+' · '+message});}
        }
        if(batch.length){
          if(version!==generation)return;
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

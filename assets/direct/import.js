(function(global){
  'use strict';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const isRelay=(eventCode,row={})=>row.relay===true||/^relay\|/i.test(row.swimmerId||'')||/^\d+\s*[x×]\s*\d+/i.test(eventCode||'');
  function options(){const pdf=global.LivePalmesPdfImport;return {...pdf,includeCategoryProvenance:true,data:{events:[],entrants:[],series:[],program:[]},sampleData:{entrants:[]},importedSeriesTime:global.LivePalmesTime.importedSeriesTime,normalizePersonName:normalize,formatDisplayName:r=>[r.lastName,r.firstName].filter(Boolean).join(' '),eventSignature:normalize};}
  function parseSeries(lines,name,fallback){
    const parsed=global.LivePalmesSeriesImport.parseImportedSeriesLines(lines,name,options());
    return parsed.program.map(program=>{
      const event=parsed.events.find(e=>e.id===program.eventId),matching=parsed.series.filter(r=>r.eventId===program.eventId&&r.sex===program.sex&&String(r.session||'')===String(program.session||'')&&(r.stage||'series')===(program.stage||'series')),rows=matching.map(r=>{
        const entry=parsed.entrants.find(e=>e.swimmerId===r.swimmerId&&e.eventId===r.eventId&&e.sex===r.sex&&String(e.session||'')===String(r.session||''));
        if(!entry)return null;
        const relay=isRelay(r.eventId,entry);
        return {lastName:entry.lastName,firstName:entry.firstName,birthYear:entry.birthDate,club:entry.clubCode||entry.club,category:entry.categoryInferred?'':entry.categoryCode||entry.category,series:r.series,lane:r.line,entryTime:entry.seedTime,relay,...(relay?{sourceEntryId:`relay-slot|${r.eventId}|${r.sex}|${r.session||''}|${r.series}|${r.line}`} : {}),resultStatus:''};
      }).filter(Boolean);
      const relayNames=new Map();
      rows.filter(row=>row.relay).forEach(row=>{const key=JSON.stringify([normalize(row.lastName),normalize(row.firstName),String(row.club).toLowerCase()]);relayNames.set(key,(relayNames.get(key)||0)+1);});
      const heatNumbers=[...new Set(rows.map(row=>row.series))],partial=heatNumbers.length===1&&matching.some(r=>Number(r.seriesCount)>1),times=new Map();
      if(!partial)rows.filter(row=>row.relay).forEach(row=>{if(relayNames.get(JSON.stringify([normalize(row.lastName),normalize(row.firstName),String(row.club).toLowerCase()]))===1)delete row.sourceEntryId;});
      matching.forEach(row=>{if(row.startTime&&!times.has(row.series))times.set(row.series,row.startTime);});
      const heatSchedule=heatNumbers.map(number=>({number,scheduledAt:times.get(number)||''})).sort((a,b)=>a.number-b.number);
      return {kind:'series',seriesNumber:partial?heatNumbers[0]:null,event:{...fallback,eventCode:program.eventId,eventLabel:event?.label||program.label,sex:program.sex,phase:program.stage||'series',sessionKey:String(program.session||fallback.sessionKey||'1'),sessionLabel:program.sessionLabel||fallback.sessionLabel,order:program.order,scheduledAt:program.startTime||times.get(1)||'',heatSchedule},rows};
    }).filter(group=>group.rows.length);
  }
  function resultHeader(line){
    const match=String(line).match(/^(.+?)\s*[-–]\s*(?:(?:Minimes|Seniors|Masters)\s+)?(Femmes|Hommes|Mixte)(.*)$/i);
    if(!match)return null;const code=global.LivePalmesPdfImport.importedEventId(match[1]);if(!code)return null;
    const phase=match[3].match(/finale\s*([AB])?/i);
    return {eventCode:code,eventLabel:match[1].trim(),sex:/femmes/i.test(match[2])?'F':/hommes/i.test(match[2])?'M':'X',phase:phase?`finale-${(phase[1]||'A').toUpperCase()}`:'series'};
  }
  function parseResults(lines,name,fallback){
    const chunks=[];let current={event:{...fallback},lines:[]};
    for(const line of lines){const header=resultHeader(line),heat=String(line).match(/\bs[ée]rie\s*:?\s*(\d+)(?:\s*\/\s*\d+)?/i);if(header){if(current.lines.length)chunks.push(current);current={event:{...fallback,...header},lines:[]};}else if(heat){if(current.lines.length)chunks.push(current);current={event:{...current.event},seriesNumber:Number(heat[1]),lines:[]};}current.lines.push(line);}if(current.lines.length)chunks.push(current);
    const groups=new Map();
    for(const chunk of chunks){const ranking=global.LivePalmesResultParser.parseFinalistsFromResultLines(chunk.lines,options()).ranking||[];if(!ranking.length)continue;
      const key=JSON.stringify([chunk.event,chunk.seriesNumber]),existing=groups.get(key)||{kind:'results',seriesNumber:chunk.seriesNumber||null,event:chunk.event,rows:[]};
      existing.rows.push(...ranking.map(row=>({lastName:row.lastName,firstName:row.firstName,birthYear:row.birthYear,club:row.club,category:row.categoryCode||row.category||'',series:chunk.seriesNumber||null,resultTime:row.time||'',resultStatus:row.resultStatus||'',rank:row.rank||null,relay:isRelay(chunk.event.eventCode,row),relayMembers:row.relayLegs||[],splits:row.splitTimes||[]})));groups.set(key,existing);
    }
    return [...groups.values()];
  }
  async function files(files,kind,fallback){
    if(files.length>20)throw Error('Sélectionner au maximum 20 PDF à la fois.');
    const groups=[];
    for(const file of files){
      if(file.size>10*1024*1024||!file.name.toLowerCase().endsWith('.pdf')){groups.push({error:`${file.name} : PDF requis, 10 Mo maximum.`});continue;}
      try{const bytes=await file.arrayBuffer();if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Signature PDF absente.');
        const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
        const lines=await global.LivePalmesSeriesImport.extractPdfLines(file,options());
        const parsed=kind==='series'?parseSeries(lines,file.name,fallback):parseResults(lines,file.name,fallback);
        if(!parsed.length)throw Error('Aucune participation reconnue. Le document n’a pas été publié.');
        for(const group of parsed){group.source={type:'pdf',name:file.name,hash};group.selected=true;group.operationKey=crypto.randomUUID();group.rows=group.rows.map(row=>({...row,selected:Boolean(row.lastName&&row.club&&(row.relay||Number(row.birthYear)))}));groups.push(group);}
      }catch(error){groups.push({error:`${file.name} : ${error.message}`});}
    }
    return groups;
  }
  global.LivePalmesDirectImport={files,parseSeries,parseResults,resultHeader,isRelay};
})(window);

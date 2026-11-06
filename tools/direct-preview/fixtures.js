(function (global) {
  'use strict';
  const storageKey = 'livepalmes-direct-local-preview-v1';
  const competition = {id:'legacy-nap-900001', name:'Compétition de démonstration · Paris', date:'2026-11-07', endDate:'2026-11-08', city:'Paris', location:'Piscine de démonstration', poolLength:'50'};
  const names = [['MARTIN','Alice'],['BERNARD','Léa'],['DUBOIS','Emma'],['THOMAS','Camille'],['ROBERT','Jade'],['RICHARD','Chloé'],['PETIT','Louise'],['DURAND','Manon'],['LEROY','Inès'],['MOREAU','Zoé'],['SIMON','Sarah'],['LAURENT','Clara']];
  const clubs = ['PP','CDL','NP'];
  const specs = [['100sf','100 m Surface','F',1],['100sf','100 m Surface','M',1],['200bi','200 m Bi-palmes','F',1],['200bi','200 m Bi-palmes','M',1],['4x100sf','4 × 100 m Surface','X',1],['50sf','50 m Surface','F',2]];
  const groups = specs.map(([eventCode,eventLabel,sex,day], index) => {
    const relay = eventCode.startsWith('4x'), n = relay ? 4 : 12;
    const rows = Array.from({length:n}, (_, i) => ({lastName:relay ? clubs[i % 3] + ' ' + (Math.floor(i / 3) + 1) : names[i][0],firstName:relay ? '' : sex === 'M' ? ['Louis','Arthur','Jules','Adam','Hugo','Paul','Gabriel','Lucas','Noé','Raphaël','Nathan','Léo'][i] : names[i][1],birthYear:relay ? '' : 2008 - i % 5,club:clubs[i % 3],category:relay ? 'XSE' : sex + ['JU','SE','CA'][i % 3],series:Math.floor(i / 6) + 1,lane:i % 6 + 1,entryTime:relay ? `04:${10 + i * 3}.00` : i === 2 ? '59:59.99' : `0${eventCode.startsWith('200') ? 2 : 1}:${String(3 + (11 - i) * 2).padStart(2,'0')}.${String((i * 13) % 100).padStart(2,'0')}`,relay,selected:true}));
    const start=`09:${String(index * 8).padStart(2,'0')}`,heatSchedule=Array.from({length:relay?1:2},(_,heat)=>({number:heat+1,scheduledAt:`09:${String(index*8+heat*3).padStart(2,'0')}`}));
    return {selected:true, kind:'series', seriesNumber:null, event:{eventCode,eventLabel,sex,phase:'series',date:`2026-11-0${6 + day}`,sessionKey:String(day),sessionLabel:day === 1 ? 'Samedi matin' : 'Dimanche matin',order:index + 1,scheduledAt:start,heatSchedule},rows,source:{type:'pdf',name:'series-demonstration.pdf',hash:'f'.repeat(64)},operationKey:'local-preview-' + index};
  });
  function time(raw) {
    if (!raw) return {raw:'',cs:null,status:'missing'};
    if (['595999','59:59.99'].includes(raw)) return {raw,cs:null,status:'no_reference'};
    const parts = String(raw).split(/[:.]/).map(Number);
    const cs = parts.length === 3 ? (parts[0] * 60 + parts[1]) * 100 + parts[2] : parts.length === 2 ? parts[0] * 100 + parts[1] : null;
    return {raw,cs,status:cs == null ? 'invalid' : 'known'};
  }
  function eventId(event) {return [event.eventCode,event.sex,event.phase,event.sessionKey].join('-');}
  function published() {try {return JSON.parse(localStorage.getItem(storageKey) || '[]');} catch {return [];}}
  const identity = row => [row.lastName,row.firstName,row.birthYear || '',row.club].join('|');
  function data(event, view) {
    const drafts = published(), source = groups.map((group,index) => ({...group, publication:{series:true,results:index === 0}, rows:group.rows.map((row,i) => ({...row,resultTime:index === 0 && i !== 2 ? `01:${String(9 + i).padStart(2,'0')}.00` : '',rank:index === 0 && i !== 2 ? i + 1 : null}))}));
    drafts.forEach(draft => {
      let group = source.find(group => eventId(group.event) === eventId(draft.event));
      if (!group) {group = {...draft,publication:{series:false,results:false},rows:[]}; source.push(group);}
      group.event = draft.event; group.publication[draft.kind] = true;
      const incoming = new Set(draft.rows.map(identity));
      group.rows = group.rows.filter(row => (draft.seriesNumber && Number(row.series) !== Number(draft.seriesNumber)) || incoming.has(identity(row)) || (draft.kind === 'series' ? row.resultTime : row.entryTime));
      draft.rows.forEach(row => {
        const previous = group.rows.find(old => identity(old) === identity(row));
        if (previous) {
          if (draft.kind === 'series') Object.assign(previous,{...row,resultTime:previous.resultTime,rank:previous.rank});
          else Object.assign(previous,{...row,entryTime:previous.entryTime,series:row.series || previous.series,lane:row.lane ?? previous.lane});
        } else group.rows.push({...row});
      });
    });
    const events = source.map(group => ({...group.event,id:eventId(group.event),publication:group.publication,progress:global.LivePalmesDirectPresentation.stats(group.event,group.rows.map(row=>({series:row.series,seed:time(row.entryTime),result:{cs:time(row.resultTime).cs,status:row.resultStatus||''}})))}));
    const selectedEventId = events.some(e => e.id === event) ? event : events[0].id;
    const entries = source.flatMap((group,index) => (view === 'club' || eventId(group.event) === selectedEventId) ? group.rows.map((row,i) => {
      const seed = time(row.entryTime), parsed = time(row.resultTime), result = {raw:parsed.raw,cs:parsed.cs,status:row.resultStatus || ''};
      return {key:identity(row),eventId:eventId(group.event),firstName:row.firstName,lastName:row.lastName,birthYear:Number(row.birthYear) || null,club:row.club,category:row.category,series:row.series,lane:row.lane,kind:row.relay ? 'relay' : 'individual',seed,result,rank:row.rank || null,delta:seed.status === 'known' && result.cs ? result.cs - seed.cs : null,members:row.relayMembers || [],splits:row.splits || []};
    }) : []);
    return {source:'nap',competition,config:{state:'active',documents:[]},events,selectedEventId,entries};
  }
  function save(drafts) {
    const previous = published();
    drafts.forEach(draft => {const i = previous.findIndex(group => eventId(group.event) === eventId(draft.event) && group.kind === draft.kind && group.seriesNumber === draft.seriesNumber); if (i >= 0) previous[i] = draft; else previous.push(draft);});
    localStorage.setItem(storageKey, JSON.stringify(previous));
  }
  global.DirectPreview = {groups,competition,time,eventId,data,save,reset:() => localStorage.removeItem(storageKey)};
})(window);

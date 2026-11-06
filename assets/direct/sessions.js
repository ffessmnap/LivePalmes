(function(global){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key=event=>JSON.stringify([event.date||'',String(event.sessionKey||'1')]);
  function options(events){
    const days=new Set(events.map(event=>event.date)),found=new Map();
    for(const event of events){const id=key(event);if(found.has(id))continue;const date=days.size>1&&/^\d{4}-\d{2}-\d{2}$/.test(event.date||'')?new Date(event.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' · ':'';found.set(id,{key:id,label:date+(event.sessionLabel||'Session '+(event.sessionKey||'1')),date:event.date||'',session:String(event.sessionKey||'1')});}
    return [...found.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.session.localeCompare(b.session,'fr',{numeric:true}));
  }
  const matches=(event,selected)=>!selected||selected==='all'||key(event)===selected;
  function filter(events,value,attribute){const list=options(events);return list.length<2?'':`<label class="direct-session-filter">Session<select ${attribute}><option value="all">Toutes les sessions</option>${list.map(session=>`<option value="${esc(session.key)}" ${session.key===value?'selected':''}>${esc(session.label)}</option>`).join('')}</select></label>`;}
  const api={key,options,matches,filter};global.LivePalmesDirectSessions=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);

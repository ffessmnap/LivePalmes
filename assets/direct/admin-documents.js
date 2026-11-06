(function(global){
  'use strict';
  const esc=global.LivePalmesDirectPresentation.esc,sessions=global.LivePalmesDirectSessions;
  function create({getGroups,getConfig,call,current,onVersion,onChange=()=>{}}){
    let documents=[],owner=null,generation=0;
    function clear(){generation++;documents=[];owner=null;}
    async function register(files,groups){
      const token=++generation,identity=current(),pending=[];
      for(const file of files){if(file.size>10*1024*1024||!groups.some(group=>!group.error&&group.source?.name===file.name))continue;const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(value=>value.toString(16).padStart(2,'0')).join('');if(token!==generation)return;current(identity);const related=groups.filter(group=>!group.error&&group.source?.hash===hash);if(!related.length||pending.some(doc=>doc.hash===hash))continue;pending.push({file,hash,name:file.name,publish:false,done:false,error:''});}
      if(token===generation){documents=pending;owner=identity;}
    }
    function sync(){const stored=getConfig()?.documents||[];for(const document of documents)if(stored.some(value=>value.hash===document.hash&&value.kind==='series')){document.done=true;document.error='';}}
    function ready(document){const groups=getGroups().filter(group=>!group.error&&group.source?.hash===document.hash);return groups.length>0&&groups.every(group=>group.published);}
    function render(host){
      if(!host)return;sync();
      host.innerHTML=documents.length?`<div class="direct-import-pdf-choice"><strong>Publier aussi les PDF complets ?</strong><p class="direct-note">Les PDF contiennent tout le document. Publication après celle de toutes ses épreuves, même si vous les traitez par session.</p>${documents.map((document,index)=>`<label class="direct-check-label"><input type="checkbox" data-series-pdf="${index}" ${document.publish?'checked':''} ${document.done?'disabled':''}>${esc(document.name)}${document.done?' · PDF publié':document.publish&&!ready(document)?' · en attente des autres épreuves':''}</label>${document.error?`<p class="direct-status error">${esc(document.error)}</p>`:''}`).join('')}${documents.some(document=>document.publish&&!document.done&&ready(document))?'<button type="button" class="secondary" data-series-pdf-retry>Publier les PDF en attente</button>':''}</div>`:'';
      host.querySelectorAll('[data-series-pdf]').forEach(input=>input.onchange=()=>{documents[Number(input.dataset.seriesPdf)].publish=input.checked;render(host);});
      host.querySelector('[data-series-pdf-retry]')?.addEventListener('click',()=>onChange());
    }
    async function publishReady(){
      const identity=owner;sync();for(const document of documents.filter(value=>value.publish&&!value.done&&ready(value))){
        try{
          current(identity);const groups=getGroups().filter(group=>!group.error&&group.source?.hash===document.hash),keys=sessions.options(groups.map(group=>group.event)),session=keys.length===1?keys[0].key:'all';
          const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(document.file.slice(0,document.file.size,'application/pdf'));});current(identity);
          const result=await call('document',{version:getConfig().version,documentKind:'series',title:document.name,sessionKey:session,pdfDataUrl:data,fromSeriesImport:true,operationKey:crypto.randomUUID()});current(identity);onVersion(result.version);document.done=true;document.error='';
        }catch(error){document.error='Les séries sont publiées, mais le PDF reste à publier : '+(error.message||'réessayer après actualisation.');break;}
      }
    }
    return {clear,register,render,sync,publishReady,get documents(){return documents;}};
  }
  global.LivePalmesDirectAdminDocuments={create};
})(window);

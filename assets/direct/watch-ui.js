(function(global){
  'use strict';
  const txt=global.LivePalmesDirectTxt,esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const settingsKey=identity=>'livepalmes-direct-watch-v1:'+encodeURIComponent(identity.uid)+':'+encodeURIComponent(identity.id);
  function loadSettings(identity){try{const value=JSON.parse(global.localStorage.getItem(settingsKey(identity)));txt.laneMapping(value);return value&&Array.isArray(value.associations)&&value.associations.length<=300?value:null;}catch{return null;}}
  function saveSettings(identity,value){try{global.localStorage.setItem(settingsKey(identity),JSON.stringify(value));return true;}catch{return false;}}
  function create({getIdentity,call,onPublished=()=>{},onAlert=()=>{}}){
    let host=null,runner=null,directory=null,snapshot=null,initial=[],identity=null,request=0;
    function current(token=request){const value=getIdentity();if(token!==request||!identity||identity.id!==value.id||identity.uid!==value.uid)throw Error('La compétition ou la connexion a changé. Reconfigurer la surveillance.');}
    function reset(){request++;runner?.stop();runner=null;directory=null;snapshot=null;initial=[];identity=null;onAlert('');}
    function stop(){runner?.stop();}
    function message(text,error=false,warning=false){const node=host?.querySelector('[data-watch-status]');if(node){node.textContent=text;node.classList.toggle('error',error);node.classList.toggle('direct-warning',warning);}host?.classList.toggle('direct-watch-error',error);if(error){const phase=host?.querySelector('[data-watch-phase]');if(phase){phase.textContent='En pause';phase.dataset.state='error';}}onAlert(error||warning?text:'',error?'error':'warning');}
    function mount(target){
      reset();host=target;if(!host)return;
      host.innerHTML=`<div class="direct-watch-head"><h2>Publication des résultats</h2><span class="direct-watch-phase" data-watch-phase data-state="stopped">Arrêtée</span></div><div class="direct-actions"><button type="button" data-watch-folder>Choisir le dossier</button><button type="button" class="secondary" data-watch-stop disabled>Arrêter</button><button type="button" data-watch-resume hidden>Reprendre</button></div><p data-watch-status class="direct-status" role="status" aria-live="polite"></p><details data-watch-issues hidden><summary></summary><ul></ul></details><details class="direct-watch-help"><summary>Mode d’emploi</summary><p class="direct-note">Choisir ResultatsSeries sur le poste WinPalme et garder cette page ouverte. Contrôle toutes les 30 secondes, publication après deux lectures identiques.</p><p class="direct-note">Une correction de temps ne demande pas de réimporter les séries. Après un regroupement ou changement de nageur/ligne, importer le PDF à jour. Si seuls les numéros des lignes diffèrent, régler leur décalage.</p></details><dl class="bureau-watch-stamps"><div><dt>Dernier contrôle</dt><dd data-watch-last-check>—</dd></div><div><dt>Dernière publication</dt><dd data-watch-last-publication>—</dd></div></dl><p class="bureau-watch-file" data-watch-last-file></p><div data-watch-setup></div>`;
      if(typeof global.showDirectoryPicker!=='function'){host.querySelector('[data-watch-folder]').disabled=true;message('Surveillance disponible dans Chrome ou Edge sur ordinateur. L’import PDF reste disponible.');return;}
      host.querySelector('[data-watch-stop]').onclick=()=>stop();
      host.querySelector('[data-watch-resume]').onclick=()=>{try{current();runner?.start();}catch(error){message(error.message,true);}};
      host.querySelector('[data-watch-folder]').onclick=async()=>{
        stop();runner=null;host.querySelector('[data-watch-resume]').hidden=true;host.querySelector('[data-watch-issues]').hidden=true;host.querySelector('[data-watch-setup]').innerHTML='';host.querySelector('[data-watch-setup]').hidden=false;const token=++request;identity={...getIdentity()};
        try{
          directory=await global.showDirectoryPicker({mode:'read',id:'livepalmes-direct-results'});current(token);
          snapshot=await call('watchContext',{competitionId:identity.id});current(token);
          initial=await txt.readDirectory(directory);current(token);
          if(!snapshot.events.length)throw Error('Importer et publier les séries avant de configurer la surveillance.');
          setup();message(initial.length+' fichier(s) présent(s) · aucune publication effectuée.');
        }catch(error){if(token===request&&error.name!=='AbortError')message(error.message,true);}
      };
    }
    function setup(){
      const saved=loadSettings(identity),prefix=initial[0]?.info.prefix;
      const restored=saved&&(!prefix||saved.prefix===prefix)?saved:null;
      const associations=new Map((restored?.associations||[]).filter(pair=>Array.isArray(pair)&&pair.length===2&&typeof pair[0]==='string'&&typeof pair[1]==='string'));
      const counts=new Map(),proposals=new Map();
      for(const event of snapshot.events){
        const session=Number(event.sessionKey);if(!Number.isInteger(session)||session<1)continue;
        const number=Number(event.eventNumber)||((counts.get(session)||0)+1);counts.set(session,number);
        const key=session+'|'+number;if(proposals.has(key))proposals.set(key,{...proposals.get(key),candidate:null});
        else proposals.set(key,{key,session,event:number,eventCode:txt.code(event.eventCode),candidate:event.id,count:0});
      }
      for(const group of txt.associations(initial)){const previous=proposals.get(group.key);proposals.set(group.key,{...group,candidate:previous?.eventCode===group.eventCode?previous.candidate:null});}
      const list=[...proposals.values()].sort((a,b)=>a.session-b.session||a.event-b.event);
      for(const group of list){const candidate=snapshot.events.find(event=>event.id===associations.get(group.key)&&Number(event.sessionKey)===group.session&&txt.code(event.eventCode)===group.eventCode);if(candidate)group.candidate=candidate.id;}
      host.querySelector('[data-watch-setup]').innerHTML=`<p class="direct-note">Fichiers de résultats reconnus automatiquement après AS · session / épreuve / série / course.${restored?' Réglages de ce compte et de cette compétition retrouvés sur cet appareil.':''}</p><div class="direct-watch-lanes"><label>Première ligne du fichier de résultats<input data-watch-txt-first type="number" min="0" max="20" step="1" required value="${esc(restored?.txtFirstLane??1)}"></label><label>Première ligne des séries<input data-watch-series-first type="number" min="0" max="20" step="1" required value="${esc(restored?.seriesFirstLane??1)}"></label></div><p class="direct-note" data-watch-lane-summary></p><details><summary>Associations des épreuves · ${list.length}</summary><p class="direct-note">Vérifier les propositions, en particulier le sexe, la phase et le numéro d’épreuve dans chaque session.</p><div class="direct-table-wrap"><table><thead><tr><th>WinPalme</th><th>Épreuve du Direct</th></tr></thead><tbody>${list.map(group=>`<tr><td>Session ${group.session} · n° ${group.event}<span class="direct-person-meta">${esc(group.eventCode)}${group.count?' · '+group.count+' fichiers':''}</span></td><td><select data-watch-map="${esc(group.key)}" aria-label="Session ${group.session}, épreuve ${group.event}"><option value="">À associer</option>${snapshot.events.filter(event=>Number(event.sessionKey)===group.session).map(event=>`<option value="${esc(event.id)}" ${event.id===group.candidate?'selected':''}>${esc(event.date)} · ${esc(event.eventLabel)} · ${{F:'Femmes',M:'Hommes',X:'Mixte'}[event.sex]} · ${esc(event.phase)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></details><label class="direct-check-label"><input type="checkbox" data-watch-grid>Je confirme que les séries importées sont à jour et que les associations sont correctes.</label><label class="direct-check-label"><input type="checkbox" data-watch-existing>Publier aussi les ${initial.length} fichier(s) déjà présent(s).</label><label class="direct-check-label"><input type="checkbox" data-watch-authorize>Publier automatiquement les nouveaux résultats et leurs corrections pour cette compétition.</label><div class="direct-actions"><button type="button" data-watch-start>Démarrer la surveillance</button></div>`;
      const updateLanes=()=>{const output=host.querySelector('[data-watch-lane-summary]');try{const lanes=txt.laneMapping({txtFirstLane:host.querySelector('[data-watch-txt-first]').value,seriesFirstLane:host.querySelector('[data-watch-series-first]').value});output.textContent='Fichier '+lanes.txtFirstLane+' → séries '+lanes.seriesFirstLane+' · décalage '+(lanes.offset>0?'+':'')+lanes.offset;output.classList.remove('error');}catch(error){output.textContent=error.message;output.classList.add('error');}};
      host.querySelectorAll('[data-watch-txt-first],[data-watch-series-first]').forEach(input=>input.addEventListener('input',updateLanes));updateLanes();
      host.querySelector('[data-watch-start]').onclick=async()=>{
        const token=request;
        try{
          current(token);
          if(!host.querySelector('[data-watch-grid]').checked||!host.querySelector('[data-watch-authorize]').checked)throw Error('Confirmer les séries, les associations et la publication automatique avant de démarrer.');
          let prefix=initial[0]?.info.prefix||null;
          const mapping=new Map([...host.querySelectorAll('[data-watch-map]')].filter(n=>n.value).map(n=>[n.dataset.watchMap,n.value]));
          if(!mapping.size)throw Error('Associer au moins une épreuve avant de démarrer.');
          if(new Set(mapping.values()).size!==mapping.size)throw Error('Une épreuve du Direct est associée à plusieurs numéros WinPalme.');
          const lanes=txt.laneMapping({txtFirstLane:host.querySelector('[data-watch-txt-first]').value,seriesFirstLane:host.querySelector('[data-watch-series-first]').value});
          const build=file=>{if(file.info.prefix!==prefix)throw Error('Code compétition du fichier de résultats différent : '+file.name);return txt.buildGroup(file,snapshot,mapping.get(file.info.key),lanes);};
          const files=await txt.readDirectory(directory);current(token);
          prefix=prefix||files[0]?.info.prefix||null;
          if(files.some(file=>file.info.prefix!==prefix))throw Error('Le dossier a changé de compétition. Choisir de nouveau le dossier.');
          const includeExisting=host.querySelector('[data-watch-existing]').checked;
          let stored=saveSettings(identity,{...lanes,prefix,associations:[...mapping]});
          runner=txt.createRunner({read:async()=>{const next=await txt.readDirectory(directory);if(!prefix&&next.length){prefix=next[0].info.prefix;stored=saveSettings(identity,{...lanes,prefix,associations:[...mapping]});}if(next.some(file=>file.info.prefix!==prefix))throw Error('Le dossier a changé de compétition. Choisir de nouveau le dossier.');return next;},build,publish:async(groups,receipt,onReceipt=()=>true)=>{
            current(token);
            if(!receipt){receipt=await call('previewBatch',{competitionId:identity.id,groups});current(token);if(onReceipt(receipt)===false)return;}
            current(token);if(!runner.active)throw Error('Surveillance arrêtée avant publication.');
            const result=await call('publishBatch',{competitionId:identity.id,groups,fingerprint:receipt.fingerprint,confirmReplacement:true});current(token);const stamp=host.querySelector('[data-watch-last-publication]');if(stamp)stamp.textContent=new Date().toLocaleTimeString('fr-FR');const file=host.querySelector('[data-watch-last-file]');if(file)file.textContent='Dernier résultat reçu : '+(groups.at(-1)?.source?.name||'Publication confirmée');onPublished(result);
          },onState:state=>{
            if(token!==request)return;
            const stamp=host.querySelector('[data-watch-last-check]');if(stamp&&state.lastCheck)stamp.textContent=new Date(state.lastCheck).toLocaleTimeString('fr-FR');const time='';
            const issues=state.issues||[],warning=issues.length>0;
            message(state.message+(warning?' · '+issues.length+' résultats en attente de vérification'+(state.active?' ; les autres continuent.':'.'):'')+time+(!stored?' · Réglages non mémorisés : stockage du navigateur indisponible.':'')+(document.hidden?' · Onglet en arrière-plan : les contrôles peuvent être retardés.':''),state.error,warning);
            const details=host.querySelector('[data-watch-issues]');details.hidden=!warning;details.querySelector('summary').textContent=issues.length+' résultats à vérifier';details.querySelector('ul').innerHTML=issues.slice(0,10).map(issue=>'<li>'+esc(issue.message)+'</li>').join('')+(issues.length>10?'<li>Et '+(issues.length-10)+' autre(s) fichier(s).</li>':'');
            const phase=host.querySelector('[data-watch-phase]');phase.textContent=state.error?'En pause':state.active?warning?'Active · à vérifier':'Active':'Arrêtée';phase.dataset.state=state.error?'error':state.active?warning?'warning':'active':'stopped';
            host.querySelector('[data-watch-stop]').disabled=!state.active;
            host.querySelector('[data-watch-resume]').hidden=state.active||state.busy;
          }});
          if(!includeExisting)runner.ignore(initial);
          host.querySelectorAll('[data-watch-setup] input,[data-watch-setup] select,[data-watch-start]').forEach(node=>node.disabled=true);
          host.querySelector('[data-watch-setup]').hidden=true;
          runner.start();
        }catch(error){if(token===request)message(error.message,true);}
      };
    }
    global.addEventListener?.('beforeunload',event=>{if(runner?.active||runner?.busy){event.preventDefault();event.returnValue='';}});
    return {mount,reset,stop,get active(){return Boolean(runner?.active);}};
  }
  global.LivePalmesDirectWatchUI={create};
})(window);

(function(global){
  'use strict';
  const txt=global.LivePalmesDirectTxt,esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function create({getIdentity,call,onPublished=()=>{},onAlert=()=>{}}){
    let host=null,runner=null,directory=null,snapshot=null,initial=[],identity=null,request=0;
    function current(token=request){const value=getIdentity();if(token!==request||!identity||identity.id!==value.id||identity.uid!==value.uid)throw Error('La compétition ou la connexion a changé. Reconfigurer la surveillance.');}
    function reset(){request++;runner?.stop();runner=null;directory=null;snapshot=null;initial=[];identity=null;onAlert('');}
    function stop(){runner?.stop();}
    function message(text,error=false){const node=host?.querySelector('[data-watch-status]');if(node){node.textContent=text;node.classList.toggle('error',error);}host?.classList.toggle('direct-watch-error',error);if(error){const phase=host?.querySelector('[data-watch-phase]');if(phase){phase.textContent='En pause';phase.dataset.state='error';}}onAlert(error?text:'');}
    function mount(target){
      reset();host=target;if(!host)return;
      host.innerHTML=`<div class="direct-watch-head"><h2>Résultats WinPalme · surveillance TXT</h2><span class="direct-watch-phase" data-watch-phase data-state="stopped">Arrêtée</span></div><div class="direct-actions"><button type="button" data-watch-folder>Choisir le dossier</button><button type="button" class="secondary" data-watch-stop disabled>Arrêter</button><button type="button" data-watch-resume hidden>Reprendre</button></div><p data-watch-status class="direct-status" role="status" aria-live="polite"></p><details class="direct-watch-help"><summary>Mode d’emploi</summary><p class="direct-note">Choisir RésultatsSéries sur le poste WinPalme et garder cette page ouverte. Contrôle toutes les 30 secondes, publication après deux lectures identiques.</p><p class="direct-note">Les TXT ne contiennent aucun nom : réimporter les séries après un changement de répartition ou regroupement. Régler explicitement le décalage si seuls les numéros des lignes diffèrent.</p></details><div data-watch-setup></div>`;
      if(typeof global.showDirectoryPicker!=='function'){host.querySelector('[data-watch-folder]').disabled=true;message('Surveillance disponible dans Chrome ou Edge sur ordinateur. L’import PDF reste disponible.');return;}
      host.querySelector('[data-watch-stop]').onclick=()=>stop();
      host.querySelector('[data-watch-resume]').onclick=()=>{try{current();runner?.start();}catch(error){message(error.message,true);}};
      host.querySelector('[data-watch-folder]').onclick=async()=>{
        stop();runner=null;host.querySelector('[data-watch-resume]').hidden=true;host.querySelector('[data-watch-setup]').innerHTML='';host.querySelector('[data-watch-setup]').hidden=false;const token=++request;identity={...getIdentity()};
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
      const counts=new Map(),proposals=new Map();
      for(const event of snapshot.events){
        const session=Number(event.sessionKey);if(!Number.isInteger(session)||session<1)continue;
        const number=Number(event.eventNumber)||((counts.get(session)||0)+1);counts.set(session,number);
        const key=session+'|'+number;if(proposals.has(key))proposals.set(key,{...proposals.get(key),candidate:null});
        else proposals.set(key,{key,session,event:number,eventCode:txt.code(event.eventCode),candidate:event.id,count:0});
      }
      for(const group of txt.associations(initial)){const previous=proposals.get(group.key);proposals.set(group.key,{...group,candidate:previous?.eventCode===group.eventCode?previous.candidate:null});}
      const list=[...proposals.values()].sort((a,b)=>a.session-b.session||a.event-b.event);
      host.querySelector('[data-watch-setup]').innerHTML=`<label>Code compétition dans les noms TXT<input data-watch-prefix maxlength="160" value="${esc(initial[0]?.info.prefix||'')}" placeholder="Ex. 27CHAURAY"></label><div class="direct-watch-lanes"><label>Première ligne du TXT<input data-watch-txt-first type="number" min="0" max="20" step="1" required value="1"></label><label>Première ligne des séries<input data-watch-series-first type="number" min="0" max="20" step="1" required value="1"></label></div><p class="direct-note" data-watch-lane-summary></p><details><summary>Associations des épreuves · ${list.length}</summary><p class="direct-note">Vérifier les propositions, en particulier le sexe, la phase et le numéro d’épreuve dans chaque session.</p><div class="direct-table-wrap"><table><thead><tr><th>WinPalme</th><th>Épreuve du Direct</th></tr></thead><tbody>${list.map(group=>`<tr><td>Session ${group.session} · n° ${group.event}<span class="direct-person-meta">${esc(group.eventCode)}${group.count?' · '+group.count+' TXT':''}</span></td><td><select data-watch-map="${esc(group.key)}" aria-label="Session ${group.session}, épreuve ${group.event}"><option value="">À associer</option>${snapshot.events.filter(event=>Number(event.sessionKey)===group.session).map(event=>`<option value="${esc(event.id)}" ${event.id===group.candidate?'selected':''}>${esc(event.date)} · ${esc(event.eventLabel)} · ${{F:'Femmes',M:'Hommes',X:'Mixte'}[event.sex]} · ${esc(event.phase)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></details><label class="direct-check-label"><input type="checkbox" data-watch-grid>Je confirme que les séries importées sont à jour et que les associations sont correctes.</label><label class="direct-check-label"><input type="checkbox" data-watch-existing>Publier aussi les ${initial.length} fichier(s) déjà présent(s).</label><label class="direct-check-label"><input type="checkbox" data-watch-authorize>Publier automatiquement les nouveaux TXT et leurs corrections pour cette compétition.</label><div class="direct-actions"><button type="button" data-watch-start>Démarrer la surveillance</button></div>`;
      const updateLanes=()=>{const output=host.querySelector('[data-watch-lane-summary]');try{const lanes=txt.laneMapping({txtFirstLane:host.querySelector('[data-watch-txt-first]').value,seriesFirstLane:host.querySelector('[data-watch-series-first]').value});output.textContent='TXT '+lanes.txtFirstLane+' → séries '+lanes.seriesFirstLane+' · décalage '+(lanes.offset>0?'+':'')+lanes.offset;output.classList.remove('error');}catch(error){output.textContent=error.message;output.classList.add('error');}};
      host.querySelectorAll('[data-watch-txt-first],[data-watch-series-first]').forEach(input=>input.addEventListener('input',updateLanes));updateLanes();
      host.querySelector('[data-watch-start]').onclick=async()=>{
        const token=request;
        try{
          current(token);
          if(!host.querySelector('[data-watch-grid]').checked||!host.querySelector('[data-watch-authorize]').checked)throw Error('Confirmer les séries, les associations et la publication automatique avant de démarrer.');
          const prefix=host.querySelector('[data-watch-prefix]').value.trim();if(!prefix)throw Error('Renseigner le code compétition WinPalme.');
          const mapping=new Map([...host.querySelectorAll('[data-watch-map]')].filter(n=>n.value).map(n=>[n.dataset.watchMap,n.value]));
          if(!mapping.size)throw Error('Associer au moins une épreuve avant de démarrer.');
          if(new Set(mapping.values()).size!==mapping.size)throw Error('Une épreuve du Direct est associée à plusieurs numéros WinPalme.');
          const lanes=txt.laneMapping({txtFirstLane:host.querySelector('[data-watch-txt-first]').value,seriesFirstLane:host.querySelector('[data-watch-series-first]').value});
          const build=file=>{if(file.info.prefix!==prefix)throw Error('Code compétition TXT différent : '+file.name);return txt.buildGroup(file,snapshot,mapping.get(file.info.key),lanes);};
          const files=await txt.readDirectory(directory);current(token);
          if(files.some(file=>file.info.prefix!==prefix))throw Error('Le code compétition ne correspond pas aux fichiers présents.');
          const includeExisting=host.querySelector('[data-watch-existing]').checked;
          if(includeExisting)files.forEach(build);
          runner=txt.createRunner({read:()=>txt.readDirectory(directory),build,publish:async(groups,receipt,onReceipt=()=>true)=>{
            current(token);
            if(!receipt){receipt=await call('previewBatch',{competitionId:identity.id,groups});current(token);if(onReceipt(receipt)===false)return;}
            current(token);if(!runner.active)throw Error('Surveillance arrêtée avant publication.');
            const result=await call('publishBatch',{competitionId:identity.id,groups,fingerprint:receipt.fingerprint,confirmReplacement:true});current(token);onPublished(result);
          },onState:state=>{
            if(token!==request)return;
            const time=state.lastCheck?' · Dernier contrôle : '+new Date(state.lastCheck).toLocaleTimeString('fr-FR'):'';
            message(state.message+time+(document.hidden?' · Onglet en arrière-plan : les contrôles peuvent être retardés.':''),state.error);
            const phase=host.querySelector('[data-watch-phase]');phase.textContent=state.error?'En pause':state.active?'Active':'Arrêtée';phase.dataset.state=state.error?'error':state.active?'active':'stopped';
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

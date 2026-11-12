(function(global){
  'use strict';
  const txt=global.LivePalmesDirectTxt,esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const settingsKey=identity=>'livepalmes-direct-watch-v1:'+encodeURIComponent(identity.uid)+':'+encodeURIComponent(identity.id);
  function loadSettings(identity){try{const value=JSON.parse(global.localStorage.getItem(settingsKey(identity)));txt.laneMapping(value);return value&&Array.isArray(value.associations)&&value.associations.length<=300?value:null;}catch{return null;}}
  function saveSettings(identity,value){try{global.localStorage.setItem(settingsKey(identity),JSON.stringify(value));return true;}catch{return false;}}
  function create({getIdentity,call,onPublished=()=>{},onAlert=()=>{},onState=()=>{}}){
    let host=null,configuration=null,runner=null,directory=null,snapshot=null,initial=[],identity=null,request=0,laneEdited=false,archiveMode=false;
    const find=selector=>host?.querySelector(selector)||configuration?.querySelector(selector);
    const findAll=selector=>[...new Set([...(host?.querySelectorAll(selector)||[]),...(configuration?.querySelectorAll(selector)||[])])];
    function current(token=request){const value=getIdentity();if(token!==request||!identity||identity.id!==value.id||identity.uid!==value.uid)throw Error('La compétition ou la connexion a changé. Reconfigurer la surveillance.');}
    function reset(){request++;runner?.stop();runner=null;directory=null;snapshot=null;initial=[];identity=null;onAlert('');onState({active:false,busy:false});}
    function stop(){runner?.stop();}
    function message(text,error=false,warning=false){const node=find('[data-watch-status]');if(node){node.textContent=text;node.classList.toggle('error',error);node.classList.toggle('direct-warning',warning);}host?.classList.toggle('direct-watch-error',error);if(error){const phase=find('[data-watch-phase]');if(phase){phase.textContent=archiveMode?(runner?'Mise à jour de l’archive en pause':'Mise à jour de l’archive non démarrée'):(runner?'Résultats en direct en pause':'Résultats en direct non démarrés');find('[data-watch-state]').dataset.state='error';phase.dataset.state='error';}}onAlert(error||warning?text:'',error?'error':'warning');}
    function mount(target,{archiveCorrection=false,configurationHost}={}){
      reset();host=target;if(!host)return;laneEdited=false;archiveMode=archiveCorrection;
      configuration=configurationHost||host.directWatchConfiguration||null;host.directWatchConfiguration=configuration;
      host.innerHTML=`<div class="direct-watch-head"><h2>Résultats en direct</h2></div><div class="direct-watch-state" data-watch-state data-state="stopped" role="status"><strong class="direct-watch-phase" data-watch-phase data-state="stopped">Résultats en direct non démarrés</strong><p data-watch-state-help>Choisir le dossier WinPalme, vérifier les associations puis confirmer le démarrage.</p></div><div class="direct-actions"><button type="button" class="secondary" data-watch-stop disabled hidden>Arrêter</button><button type="button" data-watch-resume hidden>Reprendre</button></div><p data-watch-status class="direct-status" role="status" aria-live="polite"></p><details data-watch-issues hidden><summary></summary><ul></ul></details><div data-watch-consents><button type="button" data-watch-start disabled>${archiveMode?'Démarrer la mise à jour de l’archive':'Démarrer les résultats en direct'}</button><p class="direct-note">Publier les séries puis choisir le dossier pour préparer le démarrage.</p></div><p class="direct-note" data-watch-locked hidden>Réglages et confirmations verrouillés pendant le direct. Arrêter pour les modifier.</p><details class="direct-watch-help"><summary>Mode d’emploi</summary><p class="direct-note">Garder cette page ouverte et le poste éveillé. Contrôle toutes les 30 secondes, diffusion après deux lectures identiques.</p><p class="direct-note">Une correction de temps ne demande pas de réimporter les séries. Après un regroupement ou changement de nageur/ligne, importer le PDF à jour. Pour modifier la première ligne après un démarrage, arrêter puis choisir de nouveau le dossier.</p></details><dl class="bureau-watch-stamps"><div><dt>Dernier contrôle</dt><dd data-watch-last-check>—</dd></div><div><dt>Dernière publication</dt><dd data-watch-last-publication>—</dd></div></dl><p class="bureau-watch-file" data-watch-last-file></p>`;
      if(!configuration){configuration=document.createElement('div');host.append(configuration);}
      const saved=loadSettings(getIdentity()),legacy=saved&&saved.txtFirstLane!==1;
      configuration.innerHTML=`<div class="direct-actions"><button type="button" data-watch-folder>Choisir le dossier WinPalme</button><span class="direct-note" data-watch-folder-state>Non choisi</span></div><p class="direct-note">Choisir le dossier ne démarre pas la diffusion des résultats.</p><div class="direct-watch-folder-help"><p class="direct-note">Pour retrouver le dossier des résultats dans WinPalme :</p><p>Data → bonne bibliothèque → renc → cette compétition → <strong>ResultatsSeries</strong></p></div><div class="direct-watch-lanes"><label>Première ligne utilisée dans les séries<input data-watch-series-first type="number" min="0" max="20" step="1" required value="${legacy?'':esc(saved?.seriesFirstLane??1)}"></label></div><p class="direct-note">Exemple : bassin de 8 lignes, seules les lignes <strong>2 à 7</strong> sont utilisées → indiquer <strong>2</strong>.</p><p class="direct-note" data-watch-lane-summary></p><p class="direct-warning" data-watch-legacy ${legacy?'':'hidden'}>Un ancien réglage TXT a été retrouvé. Indiquer la première ligne utilisée dans les séries ; les associations restent à vérifier avant tout démarrage.</p><div data-watch-setup></div>`;
      find('[data-watch-series-first]').addEventListener('input',()=>{laneEdited=true;if(find('[data-watch-grid]'))find('[data-watch-grid]').checked=false;updateLanes();});updateLanes();
      if(typeof global.showDirectoryPicker!=='function'){find('[data-watch-folder]').disabled=true;message('Surveillance disponible dans Chrome ou Edge sur ordinateur. L’import PDF reste disponible.');return;}
      if(archiveCorrection){find('[data-watch-phase]').textContent='Mise à jour de l’archive non démarrée';find('[data-watch-state-help]').textContent='La compétition reste archivée et les consoles restent fermées.';find('h2').textContent='Mise à jour des résultats de l’archive';find('.direct-watch-help p').textContent='Choisir ResultatsSeries sur le poste WinPalme. Seuls les résultats des séries déjà importées peuvent être mis à jour ; la compétition reste archivée.';}
      find('[data-watch-stop]').onclick=()=>stop();
      find('[data-watch-resume]').onclick=()=>{try{current();runner?.start();}catch(error){message(error.message,true);}};
      find('[data-watch-folder]').onclick=async()=>{
        stop();runner=null;find('[data-watch-resume]').hidden=true;find('[data-watch-issues]').hidden=true;find('[data-watch-setup]').innerHTML='';find('[data-watch-consents]').innerHTML='';find('[data-watch-folder-state]').textContent='Non choisi';find('[data-watch-setup]').hidden=false;const token=++request;identity={...getIdentity()};
        try{
          directory=await global.showDirectoryPicker({mode:'read',id:'livepalmes-direct-results'});current(token);
          snapshot=await call('watchContext',{competitionId:identity.id});current(token);
          initial=await txt.readDirectory(directory);current(token);
          if(!snapshot.events.length)throw Error('Importer et publier les séries avant de configurer la surveillance.');
          setup();find('[data-watch-folder-state]').textContent=(directory.name||'Dossier choisi')+' · associations à vérifier';message('Résultats de '+initial.length+' série(s) présents dans le dossier · aucune publication effectuée.');
        }catch(error){if(token===request&&error.name!=='AbortError')message(error.message,true);}
      };
    }
    function updateLanes(){const output=find('[data-watch-lane-summary]');try{const lanes=txt.laneMapping({txtFirstLane:1,seriesFirstLane:find('[data-watch-series-first]').value});output.textContent='Première ligne utilisée : '+lanes.seriesFirstLane;output.classList.remove('error');}catch{output.textContent='Indiquer un numéro de ligne entier entre 0 et 20.';output.classList.add('error');}}
    function setup(){
      const saved=loadSettings(identity),prefix=initial[0]?.info.prefix;
      const restored=saved&&(!prefix||saved.prefix===prefix)?saved:null;
      const legacy=restored&&restored.txtFirstLane!==1;find('[data-watch-legacy]').hidden=!legacy;
      if(!laneEdited)find('[data-watch-series-first]').value=legacy?'':restored?.seriesFirstLane??1;find('[data-watch-series-first]').disabled=false;updateLanes();
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
      find('[data-watch-setup]').innerHTML=`<p class="direct-note">Fichiers de résultats reconnus automatiquement après AS · session / épreuve / série / course.${restored?' Réglages de ce compte et de cette compétition retrouvés sur cet appareil.':''}</p><details><summary>Associations des épreuves · ${list.length}</summary><p class="direct-note">Vérifier les propositions, en particulier le sexe, la phase et le numéro d’épreuve dans chaque session.</p><div class="direct-table-wrap"><table><thead><tr><th>WinPalme</th><th>Épreuve du Direct</th></tr></thead><tbody>${list.map(group=>`<tr><td>Session ${group.session} · n° ${group.event}<span class="direct-person-meta">${esc(group.eventCode)}${group.count?' · '+group.count+' fichiers':''}</span></td><td><select data-watch-map="${esc(group.key)}" aria-label="Session ${group.session}, épreuve ${group.event}"><option value="">À associer</option>${snapshot.events.filter(event=>Number(event.sessionKey)===group.session).map(event=>`<option value="${esc(event.id)}" ${event.id===group.candidate?'selected':''}>${esc(event.date)} · ${esc(event.eventLabel)} · ${{F:'Femmes',M:'Hommes',X:'Mixte'}[event.sex]} · ${esc(event.phase)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></details>`;
      find('[data-watch-consents]').innerHTML=`<label class="direct-check-label"><input type="checkbox" data-watch-grid>Je confirme que les séries importées sont à jour et que les associations sont correctes.</label><label class="direct-check-label"><input type="checkbox" data-watch-existing>Publier aussi les résultats des ${initial.length} séries déjà présentes dans le dossier.</label><label class="direct-check-label"><input type="checkbox" data-watch-authorize>Publier automatiquement les nouveaux résultats et leurs corrections pour cette compétition.</label><div class="direct-actions"><button type="button" data-watch-start>${archiveMode?'Démarrer la mise à jour de l’archive':'Démarrer les résultats en direct'}</button></div>`;
      find('[data-watch-start]').onclick=async()=>{
        const token=request;
        try{
          current(token);
          if(!find('[data-watch-grid]').checked||!find('[data-watch-authorize]').checked)throw Error('Confirmer les séries, les associations et la publication automatique avant de démarrer.');
          let prefix=initial[0]?.info.prefix||null;
          const mapping=new Map([...findAll('[data-watch-map]')].filter(n=>n.value).map(n=>[n.dataset.watchMap,n.value]));
          if(!mapping.size)throw Error('Associer au moins une épreuve avant de démarrer.');
          if(new Set(mapping.values()).size!==mapping.size)throw Error('Une épreuve du Direct est associée à plusieurs numéros WinPalme.');
          const lanes=txt.laneMapping({txtFirstLane:1,seriesFirstLane:find('[data-watch-series-first]').value});
          const build=file=>{if(file.info.prefix!==prefix)throw Error('Code compétition du fichier de résultats différent : '+file.name);return txt.buildGroup(file,snapshot,mapping.get(file.info.key),lanes);};
          const files=await txt.readDirectory(directory);current(token);
          prefix=prefix||files[0]?.info.prefix||null;
          if(files.some(file=>file.info.prefix!==prefix))throw Error('Le dossier a changé de compétition. Choisir de nouveau le dossier.');
          const includeExisting=find('[data-watch-existing]').checked;
          let stored=saveSettings(identity,{...lanes,prefix,associations:[...mapping]});
          runner=txt.createRunner({read:async()=>{const next=await txt.readDirectory(directory);if(!prefix&&next.length){prefix=next[0].info.prefix;stored=saveSettings(identity,{...lanes,prefix,associations:[...mapping]});}if(next.some(file=>file.info.prefix!==prefix))throw Error('Le dossier a changé de compétition. Choisir de nouveau le dossier.');return next;},build,publish:async(groups,receipt,onReceipt=()=>true)=>{
            current(token);
            if(!receipt){receipt=await call('previewBatch',{competitionId:identity.id,groups});current(token);if(onReceipt(receipt)===false)return;}
            current(token);if(!runner.active)throw Error('Surveillance arrêtée avant publication.');
            const result=await call('publishBatch',{competitionId:identity.id,groups,fingerprint:receipt.fingerprint,confirmReplacement:true});current(token);const stamp=find('[data-watch-last-publication]');if(stamp)stamp.textContent=new Date().toLocaleTimeString('fr-FR');const file=find('[data-watch-last-file]');if(file)file.textContent='Dernier résultat reçu : '+(groups.at(-1)?.source?.name||'Publication confirmée');onPublished(result);
          },onState:state=>{
            if(token!==request)return;
            const stamp=find('[data-watch-last-check]');if(stamp&&state.lastCheck)stamp.textContent=new Date(state.lastCheck).toLocaleTimeString('fr-FR');const time='';
            const issues=state.issues||[],warning=issues.length>0;
            message(state.message+(warning?' · '+issues.length+' résultats en attente de vérification'+(state.active?' ; les autres continuent.':'.'):'')+time+(!stored?' · Réglages non mémorisés : stockage du navigateur indisponible.':'')+(document.hidden?' · Onglet en arrière-plan : les contrôles peuvent être retardés.':''),state.error,warning);
            const details=find('[data-watch-issues]');details.hidden=!warning;details.querySelector('summary').textContent=issues.length+' résultats à vérifier';details.querySelector('ul').innerHTML=issues.slice(0,10).map(issue=>'<li>'+esc(issue.message)+'</li>').join('')+(issues.length>10?'<li>Et '+(issues.length-10)+' autre(s) fichier(s).</li>':'');
            const phase=find('[data-watch-phase]');phase.textContent=state.error?'Résultats en direct en pause':state.active?warning?'Résultats en direct actifs · à vérifier':'Résultats en direct actifs':'Résultats en direct arrêtés';if(archiveMode)phase.textContent=state.error?'Mise à jour de l’archive en pause':state.active?'Mise à jour de l’archive active':'Mise à jour de l’archive arrêtée';phase.dataset.state=state.error?'error':state.active?warning?'warning':'active':'stopped';
            find('[data-watch-stop]').disabled=!state.active;find('[data-watch-stop]').hidden=!state.active;
            find('[data-watch-resume]').hidden=state.active||state.busy;
            find('[data-watch-folder]').disabled=state.active||state.busy;find('[data-watch-locked]').hidden=!state.active&&!state.busy;
            find('[data-watch-state]').dataset.state=state.error?'error':state.active?'active':'stopped';
            find('[data-watch-state-help]').textContent=archiveMode?'La compétition reste archivée et les consoles restent fermées.':state.active?'Les résultats WinPalme sont diffusés automatiquement.':state.error?'Corriger le problème signalé puis reprendre explicitement.':'Les résultats déjà diffusés restent accessibles. Pour reconfigurer, choisir de nouveau le dossier.';
            onState(state);
          }});
          if(!includeExisting)runner.ignore(initial);
          findAll('[data-watch-setup] input,[data-watch-setup] select,[data-watch-consents] input,[data-watch-start],[data-watch-series-first]').forEach(node=>node.disabled=true);
          find('[data-watch-setup]').hidden=true;
          runner.start();
        }catch(error){if(token===request)message(error.message,true);}
      };
    }
    global.addEventListener?.('beforeunload',event=>{if(runner?.active||runner?.busy){event.preventDefault();event.returnValue='';}});
    return {mount,reset,stop,get active(){return Boolean(runner?.active);}};
  }
  global.LivePalmesDirectWatchUI={create};
})(window);

(function registerTeamEntries(global){
  'use strict';
  global.LivePalmesPortalDeferred.register('team-entries',function create(context){
    const {state,actions,elements}=context,cl=x=>JSON.parse(JSON.stringify(x)),esc=x=>actions.escapeHtml(x);
    const drafts=new Map();let spreadsheetRequest,unloadBound=false;
    const profile=()=>state.selectedEngagementCompetition||{},isMasters=()=>profile().entryFormat==='clubs_masters',size=()=>isMasters()?4:6;
    const currentKey=()=>[state.activeAuthUid,state.activeEngagementClubId||state.selectedEngagementClubEntry?.clubId,profile().id].join('|');
    const collator = new Intl.Collator('fr', {sensitivity:'base'});
    let directoryCache;
    function directory() {
      const scope = currentKey();
      const clubId = String(state.activeEngagementClubId || state.selectedEngagementClubEntry?.clubId || '');
      const rosterClubId = String(state.engagementClubSwimmersClubId || clubId);
      const roster = rosterClubId === clubId ? state.engagementClubSwimmers : null;
      const saved = state.selectedEngagementClubEntry?.swimmers;
      if (directoryCache?.scope === scope && directoryCache.roster === roster && directoryCache.saved === saved) return directoryCache;
      const byId = new Map();
      for (const person of [...(saved || []), ...(roster || [])]) {
        const id = String(person.swimmerIndexId || person.id);
        byId.set(id, {...byId.get(id), ...person, id});
      }
      const sorted = [...byId.values()].sort((a,b) => collator.compare(a.lastName || '', b.lastName || '') || collator.compare(a.firstName || '', b.firstName || ''));
      directoryCache = {scope, roster, saved, byId, sorted, activeIds: new Set((roster || []).filter(p => p.active === true && (!p.clubId || String(p.clubId) === clubId)).map(p => String(p.swimmerIndexId || p.id))), savedById: new Map((saved || []).map(p => [String(p.swimmerIndexId || p.id), p]))};
      return directoryCache;
    }
    function name(id) {
      const person = directory().byId.get(String(id));
      return person ? [person.lastName, person.firstName].filter(Boolean).join(' ') : 'Nageur à vérifier';
    }
    const title=t=>(t.sex==='F'?'Femmes':t.sex==='M'?'Hommes':'Mixte')+' '+t.letter;
    function draft(){const key=currentKey(),entry=state.selectedEngagementClubEntry;if(!drafts.has(key)){if(drafts.size>=10)drafts.delete(drafts.keys().next().value);drafts.set(key,{value:cl(entry?.teamEntries||{teams:[],outside:[],individuals:[]}),baseFingerprint:entry?.napFingerprint,selected:'',tab:'teams',dirty:false,revision:0,pending:null,message:''});}const d=drafts.get(key);if(!d.dirty&&!d.pending&&!d.busy&&entry?.napFingerprint!==d.baseFingerprint){d.value=cl(entry?.teamEntries||{teams:[],outside:[],individuals:[]});d.baseFingerprint=entry?.napFingerprint;}return d;}
    const writeReason=()=>actions.engagementClubWriteLockReason({...profile(),nativeReadOnly:false})||profile().nativeSelectionLockReason||state.selectedEngagementClubEntry?.teamConsistencyIssues?.[0]||'';
    function locked(){return Boolean(writeReason()||!actions.engagementClubTeamComplete()||(draft().pending&&!draft().busy));}
    const individualEvents=()=> (profile().events||[]).filter(x=>x.type==='individual'&&(isMasters()?['50SF','100SF','200SF','400SF','200IS','50BI','100BI','200BI']:['50SF','100SF','200SF','400SF','800SF','50AP','100IS','200IS','50BI','100BI','200BI','400BI']).includes(x.code));
    const relayEvents=()=> (profile().events||[]).filter(x=>x.type==='relay'&&(isMasters()?x.code==='4X100SB':['6X100SBI','6X50SF','6X50SBA'].includes(x.code)));
    const btn=(text,action,data='',primary=false)=>`<button type="button" class="${primary?'':'ghost-button '}admin-button-compact" data-team-action="${action}" ${data}>${text}</button>`;
    function selected(){const d=draft();return d.value.teams.find(x=>x.id===d.selected)||d.value.teams[0];}
    function role(id) {
      const d = draft();
      if (d.roleValue !== d.value || d.roleRevision !== d.revision) {
        const roles = new Map();
        for (const team of d.value.teams) {
          for (const member of team.members.filter(Boolean)) roles.set(member, {role:'titular', team});
          if (team.reserve) roles.set(team.reserve, {role:'reserve', team});
        }
        for (const swimmer of d.value.outside) roles.set(swimmer, {role:'outside'});
        d.roles = roles;
        d.roleValue = d.value;
        d.roleRevision = d.revision;
      }
      return d.roles.get(id);
    }
    const courses=id=>draft().value.individuals.find(x=>x.swimmerId===id)?.eventCodes||[];
    function changeCourses(id,code,checked){const d=draft();let row=d.value.individuals.find(x=>x.swimmerId===id);if(!row){row={swimmerId:id,eventCodes:[]};d.value.individuals.push(row);}if(checked&&!row.eventCodes.includes(code)&&row.eventCodes.length<2)row.eventCodes.push(code);else if(!checked)row.eventCodes=row.eventCodes.filter(x=>x!==code);}
    function removePerson(id){const d=draft();d.value.individuals=d.value.individuals.filter(x=>x.swimmerId!==id);for(const t of d.value.teams)t.relays.forEach(r=>{if(r.members.includes(id))r.members=[];});}
    function options(current,sex='',outside=false){return `<option value="">${outside?'Choisir un nageur':'Non renseigné'}</option>`+directory().sorted.filter(p=>(p.id===current||directory().activeIds.has(p.id))&&(!sex||p.sex===sex)&&(!isMasters()||Number(profile().date.slice(0,4))+(Number(profile().date.slice(5,7))>=9?1:0)-Number(p.birthDate?.slice(0,4))>=30)).map(p=>{const used=role(p.id);return `<option value="${esc(p.id)}"${p.id===current?' selected':''}${used&&p.id!==current?' disabled':''}>${esc(name(p.id))}${used&&p.id!==current?' — '+(used.team?esc(title(used.team)):'HC sans équipe'):''}</option>`;}).join('');}
    function teamNav(){const d=draft();return `<nav class="portal-team-list" aria-label="Équipes du club">${d.value.teams.map(t=>btn(esc(title(t))+' · '+t.members.filter(Boolean).length+'/'+size(),'select',`data-id="${esc(t.id)}" aria-pressed="${d.selected===t.id}"`)).join('')}${btn('+ Équipe','add',locked()?'disabled':'')}${!isMasters()?btn('Hors concours sans équipe · '+d.value.outside.length,'outside',`aria-pressed="${d.tab==='outside'}"`):''}</nav>`;}
    function roster(t){return `<div class="portal-team-fields">${Array.from({length:size()},(_,i)=>`<label>Titulaire ${i+1}${isMasters()?' · '+(i<2?'Femme':'Homme'):''}<select data-team-field="member" data-index="${i}"${locked()?' disabled':''}>${options(t.members[i]||'',isMasters()?(i<2?'F':'M'):t.sex)}</select></label>`).join('')}${!isMasters()?`<label>Remplaçant facultatif<select data-team-field="reserve"${locked()?' disabled':''}>${options(t.reserve||'',t.sex)}</select></label>`:''}</div>${t.members.filter(Boolean).length<size()?'<p class="admin-engagements-message" data-tone="warning">Équipe incomplète : enregistrement autorisé, sans relais.</p>':''}<div class="admin-portal-actions">${btn('Retirer cette équipe','remove-team',locked()?'disabled':'')}</div>`;}
    function individualSessions(sex) {
      const events = individualEvents();
      const byCode = new Map(events.map(event => [event.code, event]));
      const seen = new Map();
      const sexes = sex === 'F' || sex === 'M' ? [sex] : ['F', 'M'];
      const sessions = actions.engagementClubProgramSessionsForEntries().map(session => {
        const columns = [];
        for (const item of session.items || []) {
          const event = byCode.get(item.eventCode);
          if (!event) continue;
          const previous = seen.get(event.code) || [];
          const eligible = sexes.filter(value => !previous.includes(value)
            && (item.genderMode !== 'female' || value === 'F')
            && (item.genderMode !== 'male' || value === 'M'));
          if (!eligible.length) continue;
          columns.push({event, sexes:eligible});
          seen.set(event.code, [...previous, ...eligible]);
        }
        return {...session, columns};
      }).filter(session => session.columns.length);
      const remaining = events.filter(event => !seen.has(event.code)).map(event => ({event, sexes}));
      if (remaining.length) sessions.push({label:sessions.length ? 'Autres courses' : 'Programme', columns:remaining});
      return sessions;
    }
    function matrix(ids, {outside = false, sex} = {}) {
      const team = selected();
      const sessions = individualSessions(outside ? sex : team?.sex);
      const columns = sessions.flatMap(session => session.columns);
      const {byId, savedById} = directory();
      const disabled = locked();
      const rows = ids.map(id => {
        const isReserve = !outside && team?.reserve === id;
        const hc = outside || isReserve;
        const person = byId.get(id);
        const personName = esc(name(id));
        const selectedCourses = courses(id);
        const savedCourses = savedById.get(id)?.individualEntries || [];
        const cells = columns.map(({event, sexes}) => {
          const {code} = event;
          if (person?.sex && !sexes.includes(person.sex)) return '<td aria-label="Course non proposée">–</td>';
          const checked = selectedCourses.includes(code);
          const assigned = !hc && team?.members.some(other => other !== id && courses(other).includes(code));
          const forbidden = Array.isArray(person?.nativeAllowedEventCodes) && !person.nativeAllowedEventCodes.includes(code);
          const unavailable = disabled || (!checked && (assigned || selectedCourses.length >= 2 || forbidden));
          const time = savedCourses.find(entry => entry.eventCode === code && !entry.horsConcours)?.entryTime;
          return `<td class="admin-engagements-club-entry-course"><label><input type="checkbox" aria-label="${personName} · ${esc(code)}" data-team-field="course" data-id="${esc(id)}" data-code="${esc(code)}"${checked?' checked':''}${unavailable?' disabled':''}>${checked?`<small data-engagement-club-entry-cell-time data-entry-time-mode="${hc || time ? 'known' : 'pending'}" title="${hc || time ? '' : 'Temps en attente d’enregistrement'}">${hc?'59:59.99':esc(time || 'En attente…')}</small>`:''}</label></td>`;
        }).join('');
        const roleLabel = isReserve ? '<small>Remplaçant · hors concours · 59:59.99 imposé</small>' : outside ? '<small>59:59.99 imposé</small>' : '';
        return `<tr><td>${personName}${roleLabel}</td>${cells}<td>${selectedCourses.length}/2</td></tr>`;
      }).join('');
      const headers = columns.map(({event, sexes}) => `<th scope="col">${esc(event.shortLabel || event.label || event.code)}${(!team || outside || isMasters()) && sexes.length === 1 ? `<small>${sexes[0] === 'F' ? 'Femmes' : 'Hommes'}</small>` : ''}</th>`).join('');
      const groups = sessions.map(session => {
        const meta = [session.date && actions.formatShortDate(session.date), session.startTime].filter(Boolean).join(' · ');
        return `<th colspan="${session.columns.length}" scope="colgroup">${esc(session.label || 'Session')}${meta ? `<small>${esc(meta)}</small>` : ''}</th>`;
      }).join('');
      const emptyRow = `<tr><td colspan="${columns.length + 2}">Aucun nageur déclaré.</td></tr>`;
      const heading = `<th scope="col"${groups ? ' rowspan="2"' : ''}>Nageur${outside ? ' hors concours' : ''}</th>`;
      const total = `<th scope="col"${groups ? ' rowspan="2"' : ''}>Total</th>`;
      return `<div class="portal-team-table"><table class="admin-engagements-table"><thead><tr>${heading}${groups}${total}</tr>${groups ? `<tr class="portal-team-course-head">${headers}</tr>` : ''}</thead><tbody>${rows || emptyRow}</tbody></table></div>`;
    }
    function relays(team) {
      const disabled = locked() || team.members.filter(Boolean).length !== size();
      const cards = relayEvents().map(event => {
        const code = esc(event.code);
        const saved = team.relays.find(relay => relay.eventCode === event.code);
        const legCodes = event.code === '6X100SBI' ? ['BI','BI','SF','SF','SF','IS']
          : event.code === '6X50SBA' ? ['BI','BI','SF','SF','SF','AP']
          : Array(size()).fill(event.discipline || 'SF');
        const action = btn(saved ? 'Retirer' : 'Engager', 'toggle-relay', `data-code="${code}"${disabled ? ' disabled' : ''}`);
        const title = `<header><strong>${esc(event.shortLabel || event.label || event.code)}</strong>${action}</header>`;
        if (!saved) return `<section class="portal-team-relay">${title}</section>`;
        const legs = legCodes.map((discipline, index) => {
          const options = team.members.filter(Boolean).map(id => `<option value="${esc(id)}"${saved.members[index] === id ? ' selected' : ''}${saved.members.includes(id) && saved.members[index] !== id ? ' disabled' : ''}>${esc(name(id))}</option>`).join('');
          return `<label><span>${index + 1} · ${esc(discipline)}</span><select data-team-field="relay-member" data-code="${code}" data-index="${index}"${disabled ? ' disabled' : ''}><option value="">À renseigner</option>${options}</select></label>`;
        }).join('');
        return `<section class="portal-team-relay">${title}<label><span>Temps</span><input aria-label="Temps d’engagement" data-team-field="relay-time" data-code="${code}" value="${esc(displayTime(saved.entryTime))}" placeholder="59:59.99"${disabled ? ' disabled' : ''}></label>${legs}${btn('Vider la composition', 'clear-relay', `data-code="${code}"${disabled ? ' disabled' : ''}`)}</section>`;
      }).join('');
      return `<h4>Relais</h4>${cards ? `<p>La composition peut rester vide. Si tu désignes un relayeur, renseigne toutes les positions.</p><div class="portal-team-relays">${cards}</div>` : '<p>Aucun relais correspondant au profil dans le programme.</p>'}`;
    }
    function displayTime(raw){const x=String(raw||'595999');return /^\d{6}$/.test(x)?x.slice(0,2)+':'+x.slice(2,4)+'.'+x.slice(4):x;}
    function total(){const d=draft(),hc=d.value.individuals.filter(x=>role(x.swimmerId)?.role!=='titular'),hcPeople=new Set([...d.value.outside,...hc.filter(x=>x.eventCodes.length).map(x=>x.swimmerId)]),count=hc.reduce((n,x)=>n+x.eventCodes.length,0),f=profile().fees||{};return {hcPeople:hcPeople.size,hcCount:count,value:d.value.teams.length*Number(f.teamFee||0)+hcPeople.size*Number(f.swimmerFee||0)+count*Number(f.individualEventFee||0)};}
    function summary() {
      const d = draft();
      const entry = state.selectedEngagementClubEntry || {};
      const stats = total();
      const eventNames = new Map(individualEvents().concat(relayEvents()).map(event => [event.code, event.shortLabel || event.label || event.code]));
      const eventName = code => esc(eventNames.get(code) || code);
      const {savedById} = directory();
      const swimmerRow = (id, role = '') => {
        const entries = savedById.get(id)?.individualEntries || [];
        const selectedCourses = courses(id).map(code => {
          const time = role ? '59:59.99' : entries.find(item => item.eventCode === code && !item.horsConcours)?.entryTime;
          return `<li><span>${eventName(code)}</span><strong>${esc(time || 'En attente')}</strong></li>`;
        }).join('');
        return `<li class="portal-team-recap-row"><span><strong>${esc(name(id))}</strong>${role ? `<small>${role}</small>` : ''}</span>${selectedCourses ? `<ul>${selectedCourses}</ul>` : '<span>Sans course</span>'}</li>`;
      };
      const teams = d.value.teams.map(team => {
        const members = team.members.filter(Boolean);
        const swimmers = members.map(id => swimmerRow(id)).join('') + (team.reserve ? swimmerRow(team.reserve, 'Remplaçant · HC') : '');
        const relays = team.relays.map(relay => {
          const names = relay.members.filter(Boolean).map(name).map(esc).join(' · ');
          return `<li class="portal-team-recap-row"><strong>${eventName(relay.eventCode)}</strong><span><strong>${esc(displayTime(relay.entryTime))}</strong><small>${names || 'Composition non renseignée'}</small></span></li>`;
        }).join('');
        const incomplete = members.length < size() || members.reduce((count, id) => count + courses(id).length, 0) < individualEvents().length || team.relays.length < relayEvents().length;
        return `<details open><summary>Équipe ${esc(title(team))} · ${members.length}/${size()} titulaires</summary>${swimmers ? `<ul class="portal-team-recap-list">${swimmers}</ul>` : '<p>Aucun titulaire</p>'}${relays ? `<h5>Relais</h5><ul class="portal-team-recap-list">${relays}</ul>` : '<p>Aucun relais engagé.</p>'}${incomplete ? '<p class="admin-engagements-message" data-tone="warning">Équipe ou programme incomplet.</p>' : ''}</details>`;
      }).join('');
      const outside = !isMasters() && d.value.outside.length ? `<details open><summary>Hors concours sans équipe</summary><ul class="portal-team-recap-list">${d.value.outside.map(id => swimmerRow(id, 'HC')).join('')}</ul></details>` : '';
      const leader = actions.engagementClubSummaryTeamLeaderLabel?.(entry);
      return `<h4>Dossier global du club</h4>${leader ? `<p>Chef d’équipe · ${esc(leader)}</p>` : ''}${teams || '<p>Aucune équipe déclarée.</p>'}${outside}<p><strong>Frais estimatifs · ${stats.value.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</strong> · ${d.value.teams.length} équipe(s) · ${stats.hcPeople} nageur(s) HC · ${stats.hcCount} course(s) HC</p>`;
    }
    function outsideParticipants(ids) {
      const disabled = locked() ? ' disabled' : '';
      const rows = ids.map(id => `<li class="portal-team-recap-row"><strong>${esc(name(id))}</strong><span>${btn('Retirer', 'remove-outside', `data-id="${esc(id)}"${disabled}`)}</span></li>`).join('');
      return `<div class="portal-team-fields"><label>Nageur du club<select data-team-field="outside-choice"${disabled}>${options('', '', true)}</select></label>${btn('+ Déclarer ce nageur hors concours', 'add-outside', disabled, true)}</div>${rows ? `<ul class="portal-team-recap-list">${rows}</ul>` : '<p>Aucun nageur hors concours déclaré.</p>'}<p>Les courses se sélectionnent dans l’onglet Courses et relais.</p>`;
    }
    function outsideCourses(ids) {
      const {byId} = directory();
      const women = ids.filter(id => byId.get(id)?.sex === 'F');
      const men = ids.filter(id => byId.get(id)?.sex === 'M');
      const unclassified = ids.filter(id => !['F', 'M'].includes(byId.get(id)?.sex));
      return `<p>Deux courses maximum, sans équipe ni points. Temps imposé : 59:59.99.</p><h5>Femmes</h5>${matrix(women, {outside:true, sex:'F'})}<h5>Hommes</h5>${matrix(men, {outside:true, sex:'M'})}${unclassified.length ? `<h5>Nageurs à vérifier</h5>${matrix(unclassified, {outside:true})}` : ''}`;
    }
    function body(section) {
      const d = draft();
      const team = selected();
      if (section === 'summary') return summary();
      const navigation = teamNav();
      if (d.tab === 'outside' && !isMasters()) {
        const content = section === 'swimmers' ? outsideParticipants(d.value.outside) : outsideCourses(d.value.outside);
        return navigation + '<h4>Hors concours — sans équipe</h4>' + content;
      }
      if (!team) return navigation + '<p>Aucune équipe déclarée.</p>';
      const content = section === 'swimmers' ? roster(team) : matrix([...team.members, team.reserve].filter(Boolean)) + relays(team);
      return `${navigation}<h4>Équipe ${esc(title(team))}</h4>${content}`;
    }
    function render(section){if(section==='relays')return;bindUnload();
      const panels={swimmers:'adminEngagementsDetailSwimmersPanel',entries:'adminEngagementsDetailEntriesPanel',relays:'adminEngagementsDetailRelaysPanel',summary:'adminEngagementsDetailSummaryPanel'},panel=document.getElementById(panels[section]);if(!panel)return;
      const summaryList = elements.engagementsClubSummaryList;
      const summaryHost = section === 'summary' ? summaryList?.parentElement : null;
      const host = summaryHost || panel;
      let mount = host.querySelector('[data-team-entry-mount]');
      if (!mount) {
        const original = summaryHost ? [summaryList, elements.engagementsClubNativeSummary].filter(Boolean) : [...host.children];
        for (const child of original) {
          child.dataset.teamEntryPreviousHidden = child.hidden ? 'true' : 'false';
          child.hidden = true;
        }
        mount = document.createElement('section');
        mount.dataset.teamEntryMount = section;
        mount.className = 'portal-team-workspace';
        host.insertBefore(mount, summaryHost ? elements.engagementsClubSummaryStatus || null : null);
        mount.addEventListener('click', onClick);
        mount.addEventListener('change', onChange);
      }
      const d=draft();if(!d.selected&&d.value.teams.length)d.selected=d.value.teams[0].id;
      const reason=writeReason()||(!actions.engagementClubTeamComplete()?'Déclarez le chef d’équipe avant les engagements.':'');
      mount.innerHTML=`${reason?`<p class="admin-engagements-message" data-tone="warning">${esc(reason)}</p>`:''}${d.message?`<p class="admin-engagements-message" role="status">${esc(d.message)}</p>`:''}${body(section)}<div class="admin-portal-actions portal-team-save"><span role="status">${d.busy?'Enregistrement…':d.pending?'Enregistrement à vérifier : reprendre la même opération.':d.dirty?'Modifications non enregistrées':'Dossier enregistré'}</span>${!writeReason()?btn(d.pending?'Reprendre l’enregistrement':'Enregistrer le dossier du club','save',d.busy||!actions.engagementClubTeamComplete()?'disabled':'',true):''}</div>`;
      if (section === 'summary' && elements.engagementsClubSummaryPdfButton) {
        const button = elements.engagementsClubSummaryPdfButton;
        const hasRecap = actions.engagementClubTeamComplete() && actions.engagementClubEntryHasParticipants();
        const loading = elements.engagementsClubSummaryStatus?.dataset.tone === 'loading';
        button.disabled = !hasRecap || loading;
        button.title = hasRecap ? 'Télécharger le PDF du dossier enregistré' : 'Enregistre au moins un participant pour télécharger le PDF.';
        button.textContent = d.dirty || d.pending ? 'Télécharger le PDF enregistré' : 'Télécharger le PDF';
      }
      if(!state.engagementClubSwimmersLoaded&&!state.engagementClubSwimmersLoading&&section!=='summary')void actions.loadEngagementClubSwimmers();
    }
    function redraw() {
      for (const node of document.querySelectorAll('[data-team-entry-mount]')) {
        if (node.closest('[hidden]')) continue;
        const scroll = node.querySelector('.portal-team-table')?.scrollLeft;
        const focused = document.activeElement;
        const focusData = node.contains(focused) ? focused.dataset : null;
        render(node.dataset.teamEntryMount);
        if (focusData?.teamField || focusData?.teamAction) {
          const target = [...node.querySelectorAll('[data-team-field], [data-team-action]')].find(element =>
            ['teamField', 'teamAction', 'id', 'index', 'code'].every(key => element.dataset[key] === focusData[key])
          );
          target?.focus({preventScroll:true});
        }
        const table = node.querySelector('.portal-team-table');
        if (table && scroll) table.scrollLeft = scroll;
      }
    }
    function dirty() {
      const d = draft();
      d.dirty = true;
      d.revision++;
      d.message = '';
      redraw();
      if (d.autoRequested) scheduleSave(d);
    }
    function scheduleSave(d) {
      if (d.busy || d.pending || !d.autoRequested) return;
      global.clearTimeout(d.timer);
      const scope = currentKey();
      d.timer = global.setTimeout(() => {
        if (scope === currentKey()) void save(true);
      }, 180);
    }
    function nextLetter(sex){let n=0;const taken=new Set(draft().value.teams.filter(x=>x.sex===sex).map(x=>x.letter));while(n<800){let number=n+1,result='';while(number){number--;result=String.fromCharCode(65+number%26)+result;number=Math.floor(number/26);}if(!taken.has(result))return result;n++;}throw new Error('Dossier trop volumineux.');}
    function addTeam(){const d=draft(),host=document.createElement('dialog');host.className='admin-portal-session-dialog';host.setAttribute('aria-labelledby','portalTeamDialogTitle');host.innerHTML=`<header class="admin-portal-session-dialog-heading"><span>Engagements par équipes</span><h2 id="portalTeamDialogTitle">Ajouter une équipe</h2></header><form method="dialog" class="admin-engagements-form"><label>Composition<select name="sex" autofocus>${isMasters()?'<option value="X">Mixte · Masters</option>':'<option value="F">Femmes</option><option value="M">Hommes</option>'}</select></label><div class="admin-portal-actions"><button class="ghost-button" value="cancel">Annuler</button><button value="add">Ajouter l’équipe</button></div></form>`;document.body.appendChild(host);host.addEventListener('close',()=>{if(host.returnValue==='add'&&currentKey()===d.key){const sex=host.querySelector('select').value,t={id:global.crypto.randomUUID(),sex,letter:nextLetter(sex),members:Array(size()).fill(''),reserve:'',relays:[]};d.value.teams.push(t);d.selected=t.id;d.tab='teams';dirty();}host.remove();});d.key=currentKey();host.showModal();}
    async function save(automatic = false) {
      const d = draft();
      if (d.busy || writeReason() || !actions.engagementClubTeamComplete()) return;
      global.clearTimeout(d.timer);
      if (automatic && d.value.teams.some(team => team.relays.some(relay => relay.members.length && relay.members.some(id => !id)))) {
        d.message = 'Complète les relayeurs ou laisse la composition vide pour enregistrer les courses.';
        redraw();
        return;
      }
      const scope = currentKey();
      const competitionId = profile().id;
      if (!d.pending) {
        d.pending = {competitionId, expectedFingerprint:d.baseFingerprint, mutationId:global.crypto.randomUUID(), teamDossier:cl(d.value)};
        d.pendingRevision = d.revision;
        d.autoRequested = false;
      }
      d.busy = true;
      redraw();
      let response;
      let failure;
      let saved = false;
      try {
        const ok = await actions.queueEngagementClubEntryMutation({
          competitionId,
          renderScope:'entries',
          execute: async () => {
            if (scope !== currentKey()) {
              failure = new Error('Le contexte du club a changé.');
              failure.details = {retrySameOperation:false};
              throw failure;
            }
            try {
              response = await actions.callFunction('saveEngagementClubSwimmerSelections', d.pending);
              if (!response?.entry) throw new Error('Réponse d’enregistrement incomplète.');
              if (scope !== currentKey()) throw new Error('Le contexte du club a changé pendant l’enregistrement.');
              return response;
            } catch (error) {
              failure = error;
              throw error;
            }
          }
        });
        if (!ok) throw failure || new Error('Enregistrement à vérifier.');
        d.baseFingerprint = response.entry.napFingerprint;
        d.dirty = d.revision !== d.pendingRevision;
        if (!d.dirty) d.value = cl(response.entry.teamEntries);
        d.pending = null;
        d.message = d.dirty ? '' : 'Dossier du club enregistré. Modifiable jusqu’à la clôture.';
        saved = true;
      } catch (error) {
        if (error?.details?.retrySameOperation === false) d.pending = null;
        d.message = error?.message || 'Enregistrement à vérifier. Reprenez la même opération.';
      } finally {
        d.busy = false;
        if (scope === currentKey()) {
          redraw();
          if (saved && d.dirty && d.autoRequested) scheduleSave(d);
        }
      }
    }
    async function onClick(e){const b=e.target.closest('[data-team-action]');if(!b||b.disabled)return;const d=draft(),a=b.dataset.teamAction,t=selected();if(a==='save'){await save();return;}if(a==='select'){d.selected=b.dataset.id;d.tab='teams';redraw();return;}if(a==='outside'){d.tab=a;redraw();return;}if(locked())return;if(a==='add'){addTeam();return;}if(a==='remove-team'){if(!global.confirm('Retirer cette équipe et ses engagements du dossier ?'))return;t.members.filter(Boolean).concat(t.reserve||[]).forEach(removePerson);d.value.teams=d.value.teams.filter(x=>x.id!==t.id);d.selected=d.value.teams[0]?.id||'';dirty();return;}if(a==='add-outside'){const select=b.closest('[data-team-entry-mount]').querySelector('[data-team-field=outside-choice]'),id=select.value;if(id&&!role(id)){d.value.outside.push(id);dirty();}return;}if(a==='remove-outside'){const id=b.dataset.id;if(d.value.outside.includes(id)){if(!global.confirm('Retirer ce nageur hors concours et ses courses ?'))return;d.value.outside=d.value.outside.filter(x=>x!==id);removePerson(id);dirty();}return;}if(a==='toggle-relay'){const code=b.dataset.code;if(t.relays.some(r=>r.eventCode===code))t.relays=t.relays.filter(r=>r.eventCode!==code);else t.relays.push({eventCode:code,members:[],entryTime:'595999'});dirty();return;}if(a==='clear-relay'){t.relays.find(x=>x.eventCode===b.dataset.code).members=[];dirty();}}
    function onChange(e){const f=e.target,k=f.dataset.teamField,d=draft(),t=selected();if(!k||locked()||k==='outside-choice')return;const id=f.dataset.id,code=f.dataset.code;
      if(k==='member'){const index=Number(f.dataset.index),old=t.members[index];if(f.value&&role(f.value)&&f.value!==old)return;if(old&&old!==f.value)removePerson(old);t.members[index]=f.value;if(t.members.filter(Boolean).length<size())t.relays=[];dirty();return;}
      if(k==='reserve'){if(f.value&&role(f.value)&&f.value!==t.reserve)return;if(t.reserve&&f.value!==t.reserve)removePerson(t.reserve);t.reserve=f.value;dirty();return;}
      if(k==='course'){const r=role(id);if(!r)return;if(f.checked&&r.role==='titular'&&r.team.members.some(x=>x!==id&&courses(x).includes(code)))return;changeCourses(id,code,f.checked);d.autoRequested=true;dirty();return;}
      const relay=t?.relays.find(x=>x.eventCode===code);if(!relay)return;if(k==='relay-time'){relay.entryTime=f.value;dirty();return;}if(k==='relay-member'){if(f.value&&relay.members.includes(f.value)&&relay.members[Number(f.dataset.index)]!==f.value)return;while(relay.members.length<size())relay.members.push('');relay.members[Number(f.dataset.index)]=f.value;if(relay.members.every(x=>!x))relay.members=[];dirty();}
    }
    async function exportExcel(button){const {id:exportId,date:exportDate,entryFormat:exportFormat}=profile();button.disabled=true;try{const response=await actions.callFunction('listEngagementCompetitionClubRecaps',{competitionId:exportId,teamExport:true});if(!global.XLSX){spreadsheetRequest||=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='performances/public/vendor/xlsx.full.min.js?v=20260603-international-xlsx-1';script.onload=resolve;script.onerror=()=>{spreadsheetRequest=null;reject(new Error('Export Excel indisponible.'));};document.head.appendChild(script);});await spreadsheetRequest;}const workbook=global.XLSX.utils.book_new(),teamRows=[],individualRows=[],relayRows=[];for(const entry of response.entries){const map=new Map((entry.swimmers||[]).map(p=>[p.swimmerIndexId,p])),n=id=>{const p=map.get(id);return p?[p.lastName,p.firstName].join(' '):id;};for(const team of entry.teamEntries?.teams||[]){teamRows.push({Club:entry.clubCode||entry.clubName,Équipe:title(team),Titulaires:team.members.filter(Boolean).map(n).join(' / '),Remplaçant:team.reserve?n(team.reserve):''});for(const r of team.relays)relayRows.push({Club:entry.clubCode,Équipe:title(team),Relais:r.eventCode,Temps:displayTime(r.entryTime),...Object.fromEntries(Array.from({length:exportFormat==='clubs_masters'?4:6},(_,i)=>['Relayeur '+(i+1),r.members[i]?n(r.members[i]):'']))});}for(const p of entry.swimmers||[])for(const r of p.individualEntries||[])individualRows.push({Club:entry.clubCode,Nageur:n(p.swimmerIndexId),Rôle:({titular:'Titulaire',reserve:'Remplaçant',outside:'Hors concours sans équipe'})[p.teamRole]||'À affecter',Équipe:p.teamId?title(entry.teamEntries.teams.find(t=>t.id===p.teamId)||{sex:'',letter:'À vérifier'}):'',Course:r.eventCode,Temps:r.entryTime,'Hors concours':r.horsConcours?'Oui':'Non'});}for(const [name,rows]of [['Équipes',teamRows],['Individuels',individualRows],['Relais',relayRows],['Hors concours',individualRows.filter(x=>x['Hors concours']==='Oui')]])global.XLSX.utils.book_append_sheet(workbook,global.XLSX.utils.json_to_sheet(rows),name);global.XLSX.writeFile(workbook,'Engagements-equipes-'+String(exportDate)+'.xlsx');}catch(error){global.alert(error.message||'Export impossible.');}finally{button.disabled=false;}}
    function renderAdmin(){const p=profile(),form=elements.engagementsEditForm;if(!actions.isEngagementAdminMode()||!actions.canUse('engagements.national.manage')){form?.querySelector('[data-team-format]')?.remove();elements.engagementsDetail?.querySelector('[data-team-export]')?.remove();return;}
      if(form&&actions.canUse('engagements.national.manage')&&p.level==='national'&&p.competitionType==='pool'){
        let label=form.querySelector('[data-team-format]');if(!label){label=document.createElement('label');label.dataset.teamFormat='';label.innerHTML='Format des engagements<select name="teamEntryFormat"><option value="classic">Classique · individuels et relais</option><option value="clubs">France des Clubs · 2026/2027</option><option value="clubs_masters">France des Clubs Masters · 2026/2027</option></select><small>Règlement fixe pour cette édition. Équipes et hors concours sont enregistrés dans NAP.</small>';form.prepend(label);}label.querySelector('select').value=p.entryFormat||'classic';label.querySelector('select').disabled=!p.teamSchemaReady||(p.entryFormat&&p.entryFormat!=='classic');
        if(!label.querySelector('select').disabled&&state.nativeCompetitionEditBaseline&&!Object.hasOwn(state.nativeCompetitionEditBaseline,'entryFormat'))state.nativeCompetitionEditBaseline.entryFormat=p.entryFormat||'classic';
      }else form?.querySelector('[data-team-format]')?.remove();
      const host=elements.engagementsDetail?.querySelector('.admin-engagements-detail-actions');if(!host)return;let button=host.querySelector('[data-team-export]');if(p.entryFormat&&p.entryFormat!=='classic'){if(!button){button=document.createElement('button');button.type='button';button.className='ghost-button admin-button-compact';button.textContent='Équipes · Excel';button.dataset.teamExport='';button.onclick=()=>exportExcel(button);host.appendChild(button);}}else button?.remove();
    }
    function bindUnload(){if(unloadBound)return;unloadBound=true;global.addEventListener('beforeunload',e=>{if([...drafts.values()].some(x=>x.dirty||x.pending)){e.preventDefault();e.returnValue='';}});}
    return {render,renderAdmin};
  });
})(window);

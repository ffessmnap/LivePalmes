(function attachPortalSession(global) {
  "use strict";
  const DAY = 86400000, INTERVAL = 300000, PREFIX = "livepalmes.portal.session.v2.";
  const enabled = global.LivePalmesEnvironment?.isTest === true && document.body?.classList.contains("admin-portal-page");
  let state, uid = "", prepared = false, preparing, preparingUid, profile, raw, expiryTimer, activityTimer;
  let lastStored = 0, lastSynced = 0, lastTouchAttempt = 0, serverDeadline = Infinity, offset = 0, dialog;
  const originalServices = new WeakMap();
  function now() { return Date.now() + offset; }
  function user() { return global.firebase?.auth?.().currentUser; }
  function read(id) { try { return JSON.parse(global.localStorage?.getItem(PREFIX + id) || "null"); } catch { return null; } }
  function save(force = false) {
    if (!state || !uid || !force && now() - lastStored < 5000) return;
    lastStored = now();
    try { global.localStorage?.setItem(PREFIX + uid, JSON.stringify(state)); } catch {}
  }
  function expired() { return !state || state.locked || now() >= state.lastActivityAt + DAY || now() >= serverDeadline; }
  function error() { return Object.assign(new Error("Votre session a expiré. Reconnectez-vous."), {code:"functions/unauthenticated",details:{portalSessionExpired:true}}); }
  function setLocked(value) {
    document.body.dataset.portalSession = value ? "locked" : "active";
    const main = document.querySelector("main");
    if (main) main.inert = value;
  }
  function lock(persist = true) {
    if (!user()) return;
    if (state) { state.locked = true; if (persist) save(true); }
    prepared = false;
    global.clearTimeout(expiryTimer); global.clearTimeout(activityTimer);
    setLocked(true);
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "adminPortalSessionLock";
      dialog.className = "admin-portal-session-dialog";
      dialog.setAttribute("aria-labelledby", "adminPortalSessionTitle");
      dialog.innerHTML = '<form id="adminPortalSessionUnlockForm"><h2 id="adminPortalSessionTitle">Reconnectez-vous</h2><p>Après 24 heures sans activité, votre mot de passe est nécessaire pour reprendre. Les saisies de cette page restent en mémoire.</p><label>Compte<input type="email" id="adminPortalSessionEmail" readonly autocomplete="username"></label><label>Mot de passe<input id="adminPortalSessionPassword" type="password" autocomplete="current-password" required></label><p id="adminPortalSessionMessage" role="status" aria-live="polite"></p><div class="admin-portal-actions"><button type="submit">Reprendre ma session</button><button type="button" id="adminPortalSessionSignOut" class="ghost-button">Déconnexion</button></div></form>';
      document.body.appendChild(dialog);
      dialog.addEventListener("cancel", e => e.preventDefault());
      dialog.querySelector("form").addEventListener("submit", unlock);
      dialog.querySelector("#adminPortalSessionSignOut").addEventListener("click", async () => {
        try { await global.LivePalmesPortalAuth.signOut(); global.location.reload(); }
        catch (failure) { dialog.querySelector("#adminPortalSessionMessage").textContent = "Déconnexion impossible. Réessayez."; }
      });
    }
    dialog.querySelector("#adminPortalSessionEmail").value = user().email || "";
    if (!dialog.open) { dialog.showModal(); dialog.querySelector("#adminPortalSessionPassword").focus(); }
  }
  function schedule() {
    global.clearTimeout(expiryTimer);
    if (state && !state.locked) expiryTimer = global.setTimeout(check, Math.max(1, Math.min(state.lastActivityAt + DAY, serverDeadline) - now()));
  }
  function check() {
    if (!user() || user().uid !== uid) return;
    if (expired()) lock(); else schedule();
  }
  function stamp(result) {
    if (!Number.isFinite(result.serverTime) || !Number.isFinite(result.expiresAt)) throw new Error("Réponse de session invalide.");
    offset = result.serverTime - Date.now();
    serverDeadline = result.expiresAt;
    lastSynced = now();
    lastTouchAttempt = lastSynced;
    if (state) { state.syncedAt = lastSynced; save(true); }
  }
  async function prepare(forceToken = false) {
    if (preparing && preparingUid === user()?.uid) return preparing;
    if (prepared && user()?.uid === uid) { check(); if (expired()) throw error(); return profile; }
    const account = user();
    if (!account) throw error();
    let pending;
    pending = (async () => {
      const token = await account.getIdTokenResult(forceToken);
      if (user() !== account) throw error();
      const authTime = Number(token.claims?.auth_time) * 1000;
      if (!Number.isSafeInteger(authTime) || authTime <= 0) throw error();
      if (uid !== account.uid) serverDeadline = Infinity;
      uid = account.uid; state = read(uid);
      if (state?.authTime > authTime) { lock(false); throw error(); }
      const fresh = !state || state.authTime !== authTime;
      if (!state || !/^[a-f0-9]{32}$/.test(state.id)) {
        const bytes = global.crypto.getRandomValues(new Uint8Array(16));
        state = {id:Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("")};
      }
      if (fresh) { serverDeadline = Infinity; Object.assign(state, {authTime,lastActivityAt:now(),locked:false}); }
      if (!Number.isFinite(state.lastActivityAt) || state.lastActivityAt > now() + 60000 || expired()) {lock();throw error();}
      try {
        const response = await raw("openPortalSession")({_portalSession:state.id});
        if (user()?.uid !== uid || user() !== account) throw error();
        stamp(response.data); profile = response.data.profile;
        if (!profile || profile.uid !== uid) throw error();
        prepared = true; save(true); check();
        if (expired()) throw error();
        setLocked(false);
        return profile;
      } catch (failure) { if (failure.details?.portalSessionExpired) lock(); throw failure; }
    })().finally(() => { if (preparing === pending) preparing = null; });
    preparingUid = account.uid; preparing = pending;
    return pending;
  }
  async function touch() {
    activityTimer = null;
    if (!prepared || !state || expired() || document.visibilityState === "hidden" || state.lastActivityAt <= lastSynced) return;
    const stored = read(uid);
    if (stored?.syncedAt > lastSynced) lastSynced = stored.syncedAt;
    if (now() - lastSynced < INTERVAL) return;
    const expected = uid, id = state.id;
    lastTouchAttempt = now();
    try {
      const response = await raw("touchPortalSession")({_portalSession:id,_portalActivityAge:Math.min(INTERVAL,Math.max(0,now()-state.lastActivityAt))});
      if (expected !== uid || id !== state?.id) return;
      stamp(response.data); schedule();
    } catch (failure) {
      if (failure.details?.portalSessionExpired) lock();
      // No retry loop or heartbeat while idle. A later real interaction retries.
    }
  }
  function activity(event) {
    if (!prepared || !state || user()?.uid !== uid || document.visibilityState === "hidden" || event && event.isTrusted === false) return;
    if (expired()) { lock(); return; }
    state.lastActivityAt = now(); save(); schedule();
    if (!activityTimer) activityTimer = global.setTimeout(touch, Math.max(0, INTERVAL - (now() - Math.max(lastSynced,lastTouchAttempt))));
  }
  function wrap(service) {
    if (!enabled || !service?.httpsCallable) return service;
    if (originalServices.has(service)) return service;
    const original = service.httpsCallable.bind(service);
    originalServices.set(service, original);
    raw = (name,options) => {
      const actions = {openPortalSession:"open",touchPortalSession:"touch",closePortalSession:"close",getPortalAccessUser:"profile"};
      const action = actions[name], snapshot = name === "getPortalAccessDirectorySnapshot";
      const call = original(action ? "getCurrentAccessUser" : snapshot ? "listAccessUsers" : name,options);
      return input => call({...input,...(action ? {_portalSessionAction:action} : {}),...(snapshot ? {_portalSnapshot:true} : {})});
    };
    service.httpsCallable = (name, options) => {
      const call = raw(name === "getCurrentAccessUser" ? "getPortalAccessUser" : name, options);
      if (["getPublicEngagementClubDirectory","submitEngagementAccessRequest"].includes(name)) return call;
      return async input => {
        const wasPrepared = prepared;
        const current = await prepare();
        if (name === "getCurrentAccessUser" && !wasPrepared) return {data:current};
        check(); if (expired()) throw error();
        try { return await call({...input,_portalSession:state.id}); }
        catch (failure) { if (failure.details?.portalSessionExpired) lock(); throw failure; }
      };
    };
    return service;
  }
  function signature(value) { return JSON.stringify([value?.uid,value?.status,[...(value?.capabilities||[])].sort(),value?.accessScopes,value?.clubId,value?.regionId]); }
  async function unlock(event) {
    event.preventDefault();
    const password = dialog.querySelector("#adminPortalSessionPassword"), message = dialog.querySelector("#adminPortalSessionMessage"), button = dialog.querySelector('button[type="submit"]');
    if (!password.value || button.disabled) return;
    button.disabled = true; message.textContent = "Vérification en cours…";
    const account = user(), previous = global.LivePalmesPortalAuth?.status?.().profile;
    try {
      const credential = global.firebase.auth.EmailAuthProvider.credential(account.email,password.value);
      await account.reauthenticateWithCredential(credential); await account.getIdToken(true);
      prepared = false;
      const next = await prepare();
      const changed = signature(previous) !== signature(next);
      const allowed = await global.LivePalmesPortalAuth?.refreshProfile?.({notify:changed});
      if (!allowed || user()?.uid !== account.uid) throw new Error("Ce compte n’a plus accès au portail.");
      password.value = ""; dialog.close(); setLocked(false);
      document.dispatchEvent(new CustomEvent("livepalmes:portal-session-resumed", {detail:{profile:next,changed}}));
    } catch (failure) {
      lock();
      message.textContent = /wrong-password|invalid-credential/.test(failure.code || "") ? "Le mot de passe est incorrect." : failure.message || "Reconnexion impossible.";
    } finally { button.disabled = false; }
  }
  async function end() {
    if (raw && state && user()?.uid === uid) {
      state.locked = true; save(true);
      await raw("closePortalSession")({_portalSession:state.id}).catch(()=>{});
    }
    prepared = false; preparing = null; profile = null;
    global.clearTimeout(expiryTimer); global.clearTimeout(activityTimer);
    dialog?.close(); setLocked(false);
  }
  if (enabled) {
    for (const name of ["pointerdown","keydown","input","scroll","touchstart"]) global.addEventListener(name,activity,{capture:true,passive:true});
    document.addEventListener("visibilitychange",check);
    global.addEventListener("pageshow",check);
    global.addEventListener("storage",event=>{
      if (!uid || event.key !== PREFIX + uid) return;
      const stored = read(uid);
      if (!stored || stored.id !== state?.id) { prepared=false;lock(false);return; }
      if (stored.locked) { state=stored;lock(false);return; }
      if (stored.authTime !== state?.authTime || state.locked) {
        const previous = global.LivePalmesPortalAuth?.status?.().profile;
        state = stored; prepared=false; serverDeadline=Infinity;
        void prepare(true).then(async next => {
          const changed = signature(previous) !== signature(next);
          if (!await global.LivePalmesPortalAuth?.refreshProfile?.({notify:changed})) throw error();
          dialog?.close();setLocked(false);
          document.dispatchEvent(new CustomEvent("livepalmes:portal-session-resumed",{detail:{profile:next,changed}}));
        }).catch(()=>lock(false));
        return;
      }
      state = stored; lastSynced=Math.max(lastSynced,stored.syncedAt||0);check();
    });
  }
  global.LivePalmesPortalSession = {enabled,wrap,check,end,prepare,inactivityTimeoutMs:DAY};
})(window);

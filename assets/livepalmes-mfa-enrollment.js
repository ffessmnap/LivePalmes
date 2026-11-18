(function(global){
  'use strict';
  const SUPPORTED=new Set(['10.12.2','10.12.5']),sdkCache=new Map();let qrPromise;
  function fail(code){const error=new Error('Configuration de sécurité indisponible.');error.code=code;return error;}
  function version(document){
    const found=new Set();for(const script of document.querySelectorAll('script[src]')){
      const url=new URL(script.src,document.baseURI),match=/^\/firebasejs\/(10\.12\.[25])\/firebase-auth-compat\.js$/.exec(url.pathname);
      if(url.origin==='https://www.gstatic.com'&&match)found.add(match[1]);
    }
    if(found.size!==1)throw fail('mfa/sdk');return [...found][0];
  }
  function loadSdk(value){
    if(!SUPPORTED.has(value))return Promise.reject(fail('mfa/sdk'));
    if(!sdkCache.has(value))sdkCache.set(value,import('https://www.gstatic.com/firebasejs/'+value+'/firebase-auth.js').catch(error=>{sdkCache.delete(value);throw error;}));
    return sdkCache.get(value);
  }
  function loadQr(document){
    if(global.QRCode?.toCanvas)return Promise.resolve(global.QRCode);
    if(!qrPromise)qrPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='/assets/vendor/qrcode.min.js?v=20260831-whatsapp-qr-1';
      const failed=()=>{clearTimeout(timer);script.remove();qrPromise=null;reject(fail('mfa/qr'));};
      const timer=setTimeout(failed,15000);script.onload=()=>{clearTimeout(timer);if(global.QRCode?.toCanvas)resolve(global.QRCode);else failed();};
      script.onerror=failed;document.head.append(script);
    });return qrPromise;
  }
  const ERROR_CODES=new Set(['auth/requires-recent-login','auth/invalid-user-token','auth/user-token-expired','auth/network-request-failed','auth/too-many-requests','auth/internal-error','auth/invalid-credential','auth/wrong-password','auth/second-factor-already-in-use','auth/maximum-second-factor-count-exceeded','auth/unsupported-first-factor','auth/unverified-email','auth/multi-factor-info-not-found','auth/missing-multi-factor-session','auth/invalid-multi-factor-session','auth/operation-not-allowed','auth/unsupported-tenant-operation','auth/mfa-cancelled','auth/mfa-unavailable','auth/mfa-context-changed','mfa/secret','mfa/email','mfa/factors','mfa/expired','mfa/context','mfa/last-factor']);
  const STAGES=new Set(['sdk','reauth','session','secret','enroll','reload','remove','email']);
  function diagnostic(stage,error){return (STAGES.has(stage)?stage:'unknown')+' / '+(ERROR_CODES.has(error?.code)?error.code:'unavailable');}
  function eligible(auth,isAdmin){return auth?.app?.options?.projectId==='livepalmes-test'&&Boolean(auth.currentUser?.uid&&auth.currentUser.email&&!auth.currentUser.isAnonymous&&isAdmin?.());}
  function secretParameters(secret,now){
    const end=Date.parse(secret?.enrollmentCompletionDeadline||'');
    if(!secret||!/^[A-Z2-7]{16,128}$/.test(secret.secretKey||'')||![6,8].includes(secret.codeLength)||secret.codeIntervalSeconds!==30||secret.hashingAlgorithm!=='SHA1'||!Number.isFinite(end)||end<=now||end>now+60*60*1000)throw fail('mfa/secret');
    return end;
  }
  function createEnrollment({document=global.document,sdkLoader=loadSdk,qrLoader=()=>loadQr(document),versionReader=()=>version(document),now=Date.now,print=()=>global.print()}={}){
    let active=null,sequence=0;
    function cancelIfNotAllowed(){if(active&&!active.valid())active.finish(fail('mfa/context'));}
    function open({auth,isAdmin,reauthenticate}={}){
      if(!eligible(auth,isAdmin)||typeof reauthenticate!=='function')return Promise.reject(fail('mfa/forbidden'));
      if(active)return Promise.reject(fail('mfa/busy'));
      if(!document?.body||typeof document.createElement('dialog').showModal!=='function')return Promise.reject(fail('mfa/browser'));
      const dialog=document.createElement('dialog'),id='mfaEnrollment'+(++sequence),uid=auth.currentUser.uid;
      dialog.className='livepalmes-mfa-enrollment';dialog.setAttribute('aria-labelledby',id+'Title');
      dialog.innerHTML='<h2 id="'+id+'Title">Microsoft Authenticator — TEST</h2><p data-enroll-account></p><p data-enroll-message role="status" aria-live="polite">Chargement de la sécurité…</p><section data-enroll-step="choose" hidden><p>Cette préparation concerne uniquement votre compte administrateur général sur TEST.</p><ul data-enroll-factors></ul><div data-enroll-verification hidden><p>Votre adresse e-mail doit être vérifiée avant d’associer une application.</p><button type="button" data-enroll-send-email>Recevoir le lien de vérification</button><button type="button" data-enroll-reload>J’ai vérifié mon adresse</button></div><form data-enroll-prepare hidden><label>Mot de passe actuel<input data-enroll-password type="password" autocomplete="current-password" required></label><p>Gardez une feuille pour conserver votre clé de configuration de secours. Le responsable du projet Google pourra vous accompagner si vous perdez aussi cette clé.</p><button type="submit">Préparer le QR code</button></form></section><section data-enroll-step="secret" hidden><h3>Associer l’application</h3><p>Dans Microsoft Authenticator, choisissez Ajouter un compte, puis Autre compte, et scannez ce QR code.</p><canvas data-enroll-qr aria-label="QR code de configuration Microsoft Authenticator"></canvas><div class="mfa-enrollment-recovery"><h3>Votre clé de configuration de secours</h3><p>Conservez cette clé sur papier, avec le nom du compte ci-dessus. Elle permet de réinstaller les codes sur un autre téléphone. Elle doit rester secrète ; ne l’envoyez pas dans une conversation.</p><code data-enroll-secret></code><button type="button" data-enroll-print>Imprimer la fiche de secours</button><p>Après une perte ou un vol, remplacez ensuite l’ancienne application pour invalider ses codes.</p></div><form data-enroll-confirm><label class="mfa-enrollment-check"><input data-enroll-saved type="checkbox" required>J’ai conservé la clé de configuration en lieu sûr.</label><label>Code affiché dans Microsoft Authenticator<input data-enroll-code type="text" inputmode="numeric" autocomplete="one-time-code" required minlength="6" maxlength="8"></label><p>L’association ferme les autres sessions Firebase de ce compte. Aucune action métier ne sera rejouée.</p><button type="submit">Activer avec ce code</button></form></section><section data-enroll-step="success" hidden><h3>Application associée</h3><p>Votre QR code et votre clé ont été effacés de cet écran. Testez une nouvelle connexion avec le code, puis une restauration depuis votre fiche de secours, avant toute obligation de double vérification.</p><p>Pour remplacer un téléphone perdu, ajoutez une nouvelle application, vérifiez son code, puis retirez l’ancienne.</p><button type="button" data-enroll-again>Gérer les applications</button></section><section data-enroll-step="remove" hidden><h3>Retirer une ancienne application</h3><p data-enroll-remove-name></p><p>Ses codes ne fonctionneront plus. Une autre application TOTP doit rester associée.</p><form data-enroll-remove-form><label>Mot de passe actuel<input data-enroll-remove-password type="password" autocomplete="current-password" required></label><label class="mfa-enrollment-check"><input data-enroll-remove-confirm type="checkbox" required>J’ai vérifié que l’autre application fonctionne.</label><button type="submit">Retirer cette application</button></form><button type="button" data-enroll-back>Revenir</button></section><div class="mfa-enrollment-footer"><button type="button" data-enroll-close>Fermer</button></div>';
      const q=selector=>dialog.querySelector(selector),message=q('[data-enroll-message]'),password=q('[data-enroll-password]'),code=q('[data-enroll-code]'),canvas=q('[data-enroll-qr]');
      const state={dialog,uid,sdk:null,secret:null,deadline:0,expiryTimer:null,stage:'sdk',finished:false,busy:false,changed:false,removeUid:null,unsubscribe:null,valid:()=>!state.finished&&auth.currentUser?.uid===uid&&eligible(auth,isAdmin)};
      active=state;q('[data-enroll-account]').textContent=auth.currentUser.email;
      let accept,reject;const result=new Promise((yes,no)=>{accept=yes;reject=no;});
      function wipeSecret(){clearTimeout(state.expiryTimer);state.expiryTimer=null;state.secret=null;state.deadline=0;q('[data-enroll-secret]').textContent='';canvas.width=0;canvas.height=0;code.value='';q('[data-enroll-saved]').checked=false;}
      function finish(error){
        if(state.finished)return;state.finished=true;state.unsubscribe?.();wipeSecret();
        for(const input of dialog.querySelectorAll('input')){input.value='';if(input.type==='checkbox')input.checked=false;}
        dialog.close();dialog.remove();if(active===state)active=null;if(error)reject(error);else accept({changed:state.changed});
      }
      state.finish=finish;
      function guard(){if(!state.valid())throw fail('mfa/context');}
      function step(name){for(const panel of dialog.querySelectorAll('[data-enroll-step]'))panel.hidden=panel.dataset.enrollStep!==name;}
      function pending(value){state.busy=value;for(const button of dialog.querySelectorAll('button'))button.disabled=value;for(const input of dialog.querySelectorAll('input'))input.disabled=value;}
      function readable(error){
        if(error?.code==='mfa/context')return 'Le compte ou les droits ont changé. Fermez puis recommencez.';
        if(error?.code==='mfa/expired')return 'Le délai de configuration est dépassé. Fermez puis préparez un nouveau QR code.';
        if(error?.code==='mfa/last-factor')return 'Gardez au moins une autre application TOTP vérifiée avant ce retrait.';
        if(error?.code==='auth/too-many-requests')return 'Trop de tentatives. Patientez avant de réessayer.';
        if(error?.code==='auth/requires-recent-login')return 'Une nouvelle connexion est nécessaire. Fermez cette fenêtre, déconnectez-vous puis reconnectez-vous avant de reprendre la configuration.';
        if(error?.code==='auth/second-factor-already-in-use')return 'Ce moyen de vérification est déjà associé. Conservez votre application actuelle et signalez ce message.';
        if(error?.code==='auth/maximum-second-factor-count-exceeded')return 'Le nombre maximal de moyens de vérification est atteint. Conservez les applications existantes.';
        return 'L’opération n’a pas pu être terminée. Vérifiez votre saisie et votre connexion, puis réessayez.';
      }
      async function run(operation){
        if(state.busy||state.finished)return;pending(true);message.textContent='Vérification en cours…';
        try{guard();await operation();}
        catch(error){if(!state.finished){if(!state.valid())finish(fail('mfa/context'));else message.textContent=readable(error)+' Référence : '+diagnostic(state.stage,error)+'.';}}
        finally{if(!state.finished){pending(false);if(!q('[data-enroll-step=secret]').hidden&&state.secret)code.focus();}}
      }
      // Compat owns its existing reload listener. A second modular multiFactor(user)
      // instance from the CDN would fail and must not replace that listener.
      function factors(){const values=auth.currentUser.multiFactor.enrolledFactors;if(!Array.isArray(values)||values.length>5)throw fail('mfa/factors');return values;}
      function render(){
        guard();wipeSecret();state.removeUid=null;step('choose');message.textContent='';
        const values=factors(),totp=values.filter(value=>value.factorId==='totp'),list=q('[data-enroll-factors]');list.replaceChildren();
        for(const factor of totp){
          const item=document.createElement('li'),label=document.createElement('span');label.textContent=factor.displayName||'Application de sécurité';item.append(label);
          if(totp.length>=2){const button=document.createElement('button');button.type='button';button.textContent='Retirer';button.setAttribute('aria-label','Retirer '+label.textContent);button.addEventListener('click',()=>{if(state.busy||!state.valid())return;state.removeUid=factor.uid;q('[data-enroll-remove-name]').textContent=label.textContent;step('remove');message.textContent='';});item.append(button);}list.append(item);
        }
        if(!totp.length){const item=document.createElement('li');item.textContent='Aucune application TOTP associée.';list.append(item);}
        const verified=auth.currentUser.emailVerified===true;q('[data-enroll-verification]').hidden=verified;q('[data-enroll-prepare]').hidden=!verified||values.length>=5;
        if(values.length>=5)message.textContent='Le nombre maximal de moyens de vérification est atteint.';
        password.value='';q('[data-enroll-remove-password]').value='';q('[data-enroll-remove-confirm]').checked=false;
      }
      q('[data-enroll-close]').addEventListener('click',()=>{if(!state.busy)finish();});
      dialog.addEventListener('cancel',event=>{event.preventDefault();if(!state.busy)finish();});
      dialog.addEventListener('close',()=>{if(!state.finished)finish(fail('mfa/context'));});
      q('[data-enroll-again]').addEventListener('click',()=>{if(!state.busy)render();});q('[data-enroll-back]').addEventListener('click',()=>{if(!state.busy)render();});
      q('[data-enroll-send-email]').addEventListener('click',()=>run(async()=>{state.stage='email';await auth.currentUser.sendEmailVerification();guard();message.textContent='Le lien de vérification a été envoyé à votre adresse. Aucun autre destinataire.';}));
      q('[data-enroll-reload]').addEventListener('click',()=>run(async()=>{state.stage='reload';await auth.currentUser.reload();guard();render();if(!auth.currentUser.emailVerified)message.textContent='L’adresse n’est pas encore vérifiée. Ouvrez le lien reçu puis réessayez.';}));
      q('[data-enroll-prepare]').addEventListener('submit',event=>{
        event.preventDefault();if(!password.value||state.busy)return;let supplied=password.value;password.value='';
        void run(async()=>{
          state.stage='reauth';try{await reauthenticate(supplied);}finally{supplied='';}guard();if(!auth.currentUser.emailVerified)throw fail('mfa/email');
          if(factors().length>=5)throw fail('mfa/factors');state.stage='session';const session=await auth.currentUser.multiFactor.getSession();guard();
          state.stage='secret';let secret=await state.sdk.TotpMultiFactorGenerator.generateSecret(session);guard();const deadline=secretParameters(secret,now());
          state.secret=secret;state.deadline=deadline;state.expiryTimer=setTimeout(()=>{if(!state.finished){wipeSecret();message.textContent=readable(fail('mfa/expired'));}},deadline-now());step('secret');q('[data-enroll-secret]').textContent=secret.secretKey;
          code.minLength=secret.codeLength;code.maxLength=secret.codeLength;code.pattern='[0-9]{'+secret.codeLength+'}';message.textContent='';
          try{const qr=await qrLoader();guard();if(!state.secret)return;await qr.toCanvas(canvas,secret.generateQrCodeUrl(auth.currentUser.email,'LivePalmes TEST'),{width:240,margin:4,color:{dark:'#000000',light:'#FFFFFF'}});guard();}
          catch(error){if(!state.valid())throw error;canvas.width=0;canvas.height=0;message.textContent='Le QR code est indisponible. Dans Authenticator, utilisez la saisie manuelle avec la clé ci-dessous.';}
          finally{secret=null;}
          currentSecret();
        });
      });
      function currentSecret(){guard();if(!state.secret||now()>=state.deadline){wipeSecret();throw fail('mfa/expired');}return state.secret;}
      q('[data-enroll-print]').addEventListener('click',()=>{if(state.busy)return;try{currentSecret();print();}catch(error){message.textContent=readable(error);}});
      q('[data-enroll-confirm]').addEventListener('submit',event=>{
        event.preventDefault();if(state.busy)return;
        let secret;try{secret=currentSecret();}catch(error){message.textContent=readable(error);return;}
        if(!q('[data-enroll-saved]').checked||!new RegExp('^[0-9]{'+secret.codeLength+'}$').test(code.value)){message.textContent='Conservez votre clé de secours puis saisissez le code affiché par l’application.';return;}
        let supplied=code.value;code.value='';void run(async()=>{
          try{guard();state.stage='enroll';await auth.currentUser.multiFactor.enroll(state.sdk.TotpMultiFactorGenerator.assertionForEnrollment(secret,supplied),'Microsoft Authenticator '+(factors().filter(x=>x.factorId==='totp').length+1));}
          finally{supplied='';secret=null;}guard();state.changed=true;wipeSecret();state.stage='reload';await auth.currentUser.reload();guard();step('success');message.textContent='Application associée. La double vérification n’est pas rendue obligatoire pour les autres comptes.';
        });
      });
      q('[data-enroll-remove-form]').addEventListener('submit',event=>{
        event.preventDefault();if(state.busy||!q('[data-enroll-remove-password]').value||!q('[data-enroll-remove-confirm]').checked)return;
        let supplied=q('[data-enroll-remove-password]').value;q('[data-enroll-remove-password]').value='';const target=state.removeUid;
        void run(async()=>{
          state.stage='reauth';try{await reauthenticate(supplied);}finally{supplied='';}guard();state.stage='reload';await auth.currentUser.reload();guard();
          const values=factors().filter(x=>x.factorId==='totp');if(!target||values.length<2||!values.some(x=>x.uid===target))throw fail('mfa/last-factor');
          state.stage='remove';await auth.currentUser.multiFactor.unenroll(target);guard();state.changed=true;state.stage='reload';await auth.currentUser.reload();guard();render();message.textContent='Ancienne application retirée. L’autre application reste associée.';
        });
      });
      document.body.append(dialog);dialog.showModal();
      if(!document.getElementById('livepalmesMfaEnrollmentStyles')){const link=document.createElement('link');link.id='livepalmesMfaEnrollmentStyles';link.rel='stylesheet';link.href='/assets/livepalmes-mfa-enrollment.css?v=20261118-totp-test-1';document.head.append(link);}
      state.unsubscribe=auth.onAuthStateChanged?.(()=>{if(!state.valid()&&!state.finished)finish(fail('mfa/context'));});if(state.finished)state.unsubscribe?.();
      Promise.resolve().then(()=>state.valid()?sdkLoader(versionReader()):null).then(sdk=>{if(!state.valid())return;state.sdk=sdk;render();}).catch(()=>{if(!state.finished)finish(fail('mfa/sdk'));});
      return result;
    }
    return {open,cancelIfNotAllowed};
  }
  global.LivePalmesMfaEnrollment=createEnrollment();
  if(typeof module!=='undefined'&&module.exports)module.exports={createEnrollment,eligible,secretParameters,version,diagnostic};
})(typeof window!=='undefined'?window:globalThis);

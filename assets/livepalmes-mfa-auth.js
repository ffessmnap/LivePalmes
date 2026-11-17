(function(global){
  'use strict';
  const versions=new Set(['10.12.2','10.12.5']),modules=new Map();
  function failure(code,message){const error=new Error(message);error.code=code;return error;}
  function detectSdkVersion(document){
    const found=new Set();
    for(const script of document.querySelectorAll('script[src]')){
      const url=new URL(script.src,document.baseURI);
      const match=/^\/firebasejs\/(10\.12\.[25])\/firebase-auth-compat\.js$/.exec(url.pathname);
      if(url.origin==='https://www.gstatic.com'&&match)found.add(match[1]);
    }
    if(found.size!==1)throw failure('auth/mfa-sdk-unavailable','Version de connexion MFA indisponible. Rechargez la page.');
    return [...found][0];
  }
  function loadSdk(version){
    if(!versions.has(version))return Promise.reject(failure('auth/mfa-sdk-unavailable','Version de connexion MFA non prise en charge.'));
    if(!modules.has(version))modules.set(version,import('https://www.gstatic.com/firebasejs/'+version+'/firebase-auth.js').catch(error=>{modules.delete(version);throw error;}));
    return modules.get(version);
  }
  function createMfaAuth({document=global.document,sdkLoader=loadSdk,versionReader=()=>detectSdkVersion(document)}={}){
    let active=null,sequence=0;
    function resolve(auth,error){
      if(error?.code!=='auth/multi-factor-auth-required')return Promise.reject(error);
      if(active)return Promise.reject(failure('auth/mfa-in-progress','Terminez la vérification de sécurité déjà ouverte.'));
      if(!document?.body||typeof document.createElement('dialog').showModal!=='function')return Promise.reject(failure('auth/mfa-unavailable','La vérification de sécurité nécessite un navigateur récent.'));
      const dialog=document.createElement('dialog'),id='livepalmesMfa'+(++sequence);
      dialog.className='livepalmes-mfa-dialog';dialog.setAttribute('aria-labelledby',id+'Title');dialog.setAttribute('aria-describedby',id+'Help');
      dialog.innerHTML='<form><h2 id="'+id+'Title">Vérification de sécurité</h2><p id="'+id+'Help">Saisissez le code à usage unique de votre application d’authentification.</p><label data-mfa-factor-label hidden>Application<select data-mfa-factor></select></label><label>Code de sécurité<input data-mfa-code type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8" required disabled></label><p data-mfa-message role="status" aria-live="polite">Chargement de la vérification…</p><div class="livepalmes-mfa-actions"><button type="submit" disabled>Vérifier</button><button type="button" data-mfa-cancel>Annuler</button></div></form>';
      const form=dialog.querySelector('form'),code=dialog.querySelector('[data-mfa-code]'),factor=dialog.querySelector('[data-mfa-factor]'),message=dialog.querySelector('[data-mfa-message]'),submit=dialog.querySelector('[type=submit]'),cancel=dialog.querySelector('[data-mfa-cancel]');
      const context={dialog,busy:false,finished:false,initialUid:auth.currentUser?.uid||'',unsubscribe:null};active=context;
      const promise=new Promise((accept,reject)=>{
        function finish(error,value){
          if(active!==context||context.finished)return;
          context.finished=true;active=null;context.unsubscribe?.();code.value='';dialog.close();dialog.remove();
          if(error)reject(error);else accept(value);
        }
        function cancelChallenge(){if(!context.busy)finish(failure('auth/mfa-cancelled','Vérification de sécurité annulée.'));}
        cancel.addEventListener('click',cancelChallenge);
        dialog.addEventListener('cancel',event=>{event.preventDefault();cancelChallenge();});
        dialog.addEventListener('close',()=>{if(!context.finished)finish(failure('auth/mfa-context-changed','La vérification de sécurité a été interrompue.'));});
        document.body.append(dialog);dialog.showModal();
        if(!document.getElementById('livepalmesMfaStyles')){
          const style=document.createElement('link');style.id='livepalmesMfaStyles';style.rel='stylesheet';style.href='/assets/livepalmes-mfa-auth.css?v=20261117-mfa-client-1';document.head.append(style);
        }
        context.unsubscribe=auth.onAuthStateChanged?.(user=>{
          if(active===context&&!context.busy&&(user?.uid||'')!==context.initialUid)finish(failure('auth/mfa-context-changed','Le compte a changé. Recommencez la connexion.'));
        });
        if(context.finished)context.unsubscribe?.();
        Promise.resolve().then(()=>active===context?sdkLoader(versionReader()):null).then(sdk=>{
          if(active!==context||context.finished)return;
          const resolver=sdk.getMultiFactorResolver(auth,error),hints=resolver.hints.filter(hint=>hint.factorId==='totp');
          if(!hints.length||hints.length>5)throw failure('auth/mfa-unsupported','Ce moyen de vérification n’est pas pris en charge. Contactez le responsable LivePalmes.');
          for(const [index,hint] of hints.entries()){
            const option=document.createElement('option');option.value=String(index);option.textContent=hint.displayName||'Application '+(index+1);factor.append(option);
          }
          dialog.querySelector('[data-mfa-factor-label]').hidden=hints.length===1;code.disabled=false;submit.disabled=false;message.textContent='';code.focus();
          form.addEventListener('submit',async event=>{
            event.preventDefault();if(active!==context||context.busy||context.finished)return;
            if(!/^[0-9]{6,8}$/.test(code.value)){message.textContent='Saisissez le code de votre application.';code.focus();return;}
            const hint=hints[Number(factor.value)];if(!hint)return;
            context.busy=true;code.disabled=true;factor.disabled=true;submit.disabled=true;cancel.disabled=true;message.textContent='Vérification en cours…';
            const verificationCode=code.value;code.value='';
            try{
              const credential=await resolver.resolveSignIn(sdk.TotpMultiFactorGenerator.assertionForSignIn(hint.uid,verificationCode));
              if(active!==context||context.finished)return;
              const current=auth.currentUser;
              if(!current||credential.user?.uid!==current.uid||(error.customData?.operationType==='reauthenticate'&&current.uid!==context.initialUid)){
                finish(failure('auth/mfa-context-changed','Le compte a changé. Recommencez la connexion.'));return;
              }
              // Keep the compat User expected by existing callers and session recovery.
              finish(null,{...credential,user:current});
            }catch(sdkFailure){
              if(active!==context||context.finished)return;
              if((auth.currentUser?.uid||'')!==context.initialUid){finish(failure('auth/mfa-context-changed','Le compte a changé. Recommencez la connexion.'));return;}
              // CDN compat/modular errors may lose their precise provider code.
              message.textContent='Le code n’a pas pu être validé. Vérifiez le code et votre connexion, puis réessayez.';
            }finally{
              context.busy=false;
              if(active===context&&!context.finished){code.disabled=false;factor.disabled=false;submit.disabled=false;cancel.disabled=false;code.focus();}
            }
          });
        }).catch(error=>{
          if(active!==context||context.finished)return;
          finish(error?.code==='auth/mfa-unsupported'?error:failure('auth/mfa-unavailable','La vérification de sécurité est indisponible. Conservez vos saisies, puis rechargez la page pour réessayer.'));
        });
      });
      return promise.finally(()=>{
        if(active===context){context.finished=true;active=null;context.unsubscribe?.();code.value='';dialog.close();dialog.remove();}
      });
    }
    return {resolve};
  }
  global.LivePalmesMfaAuth=createMfaAuth();
  if(typeof module!=='undefined'&&module.exports)module.exports={createMfaAuth,detectSdkVersion};
})(typeof window!=='undefined'?window:globalThis);

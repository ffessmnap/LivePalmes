(function(global){
  'use strict';
  // A separate dialog also works above a decision draft without replacing it.
  let pending=null,cancelPending=null;
  function ask(message,{title='Confirmer',label='Confirmer',danger=false}={}){
    if(pending)return Promise.resolve(false);
    return new Promise(resolve=>{
      const dialog=document.createElement('dialog');dialog.className='direct-confirm';
      const heading=document.createElement('h2');heading.id='directConfirmTitle';heading.textContent=title;
      const text=document.createElement('p');text.textContent=message;
      const actions=document.createElement('div');actions.className='direct-confirm-actions';
      const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='Annuler';cancel.dataset.confirmCancel='';
      const ok=document.createElement('button');ok.type='button';ok.className=danger?'danger':'';ok.textContent=label;ok.dataset.confirmAccept='';
      function finish(value){if(pending!==dialog)return;pending=null;cancelPending=null;dialog.close();dialog.remove();resolve(value);}
      cancel.onclick=()=>finish(false);ok.onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false);};
      dialog.setAttribute('aria-labelledby',heading.id);actions.append(cancel,ok);dialog.append(heading,text,actions);document.body.append(dialog);pending=dialog;cancelPending=()=>finish(false);dialog.showModal();cancel.focus();
    });
  }
  global.LivePalmesDirectConfirm={ask,close:()=>cancelPending?.()};
})(window);

(function(global){
  'use strict';
  let loading=null;
  function library(){
    if(global.QRCode?.toCanvas)return Promise.resolve(global.QRCode);
    if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/vendor/qrcode.min.js?v=20260831-whatsapp-qr-1';script.onload=()=>global.QRCode?.toCanvas?resolve(global.QRCode):reject(Error('QR code indisponible.'));script.onerror=()=>{script.remove();loading=null;reject(Error('QR code indisponible. Le lien reste accessible.'));};document.head.append(script);});
    return loading;
  }
  function create({current,identity}){
    const dialog=document.createElement('dialog');dialog.className='direct-dialog direct-console-share';document.body.append(dialog);let disposed=false;
    const valid=()=>!disposed&&current().uid===identity.uid&&String(current().id)===String(identity.id);
    async function open({label,url},qr=true){
      if(!valid())return;dialog.replaceChildren();
      const head=document.createElement('div');head.className='direct-dialog-head';const title=document.createElement('h2');title.textContent=label;const close=document.createElement('button');close.type='button';close.className='secondary';close.textContent='Fermer';close.onclick=()=>dialog.close();head.append(title,close);
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;canvas.hidden=true;canvas.setAttribute('aria-label','QR code vers '+label);
      const note=document.createElement('p');note.className='direct-note';note.textContent='Scannez pour ouvrir cette console. La connexion LivePalmes reste nécessaire.';
      const link=document.createElement('input');link.type='url';link.readOnly=true;link.value=url;link.setAttribute('aria-label','Lien de la console');link.onclick=()=>link.select();
      const status=document.createElement('p');status.setAttribute('role','status');status.className='direct-status';const copy=document.createElement('button');copy.type='button';copy.textContent='Copier le lien';copy.onclick=()=>copyLink({label,url},status,link);dialog.append(head,note,canvas,link,copy,status);dialog.showModal();
      if(!qr){link.focus();link.select();status.textContent='Sélectionnez et copiez ce lien.';return;}
      try{status.textContent='Préparation du QR code…';const qrLibrary=await library();if(!valid()||!dialog.open)return;await qrLibrary.toCanvas(canvas,url,{width:256,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}});if(!valid())return;canvas.hidden=false;status.textContent='';}catch(error){if(valid())status.textContent=error.message;}
    }
    async function copyLink(target,status,link){
      if(!valid())return;
      try{if(!navigator.clipboard?.writeText)throw Error('Clipboard');await navigator.clipboard.writeText(target.url);if(valid()){if(status)status.textContent='Lien copié.';else target.button.textContent='Copié';}}
      catch{if(!valid())return;if(link){link.focus();link.select();status.textContent='Sélectionnez et copiez ce lien.';}else await open(target,false);}
    }
    function controls({label,url}){const group=document.createElement('span');group.className='direct-console-share-actions';for(const qr of [false,true]){const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.consoleShare=qr?'qr':'copy';button.textContent=qr?'QR code':'Copier';button.setAttribute('aria-label',(qr?'Afficher le QR code : ':'Copier le lien : ')+label);button.onclick=()=>qr?open({label,url}):copyLink({label,url,button});group.append(button);}return group;}
    return {controls,stop(){disposed=true;if(dialog.open)dialog.close();dialog.remove();}};
  }
  global.LivePalmesDirectConsoleShare={create};
})(window);

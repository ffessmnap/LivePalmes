(function(global){
  "use strict";
  function mount({host,competitionId,onRead}){
    host.className="admin-engagements-shared-document-card";
    const content=document.createElement("div"),title=document.createElement("strong"),note=document.createElement("p"),status=document.createElement("p"),button=document.createElement("button");
    content.className="admin-engagements-shared-document-main";
    title.textContent="TXT source du dernier import — privé";
    note.textContent="Réservé aux administrations nationale et régionale habilitées. Remplacé au nouvel import, sans suppression manuelle.";
    status.setAttribute("role","status");button.type="button";button.className="ghost-button compact";button.textContent="Télécharger le TXT source";
    content.append(title,note,button,status);host.replaceChildren(content);
    button.onclick=async()=>{
      button.disabled=true;status.textContent="Vérification de l’accès et du dernier import…";
      try{
        const result=await onRead({action:"import-source",competitionId});
        if(!host.isConnected)return;
        if(!result.file){status.textContent="Aucun TXT archivé pour cet import. L’archivage s’applique aux nouveaux imports.";return;}
        const file=result.file,bytes=Uint8Array.from(global.atob(file.dataBase64),c=>c.charCodeAt(0));
        const blob=new Blob([bytes],{type:"text/plain"}),url=global.URL.createObjectURL(blob),link=document.createElement("a");
        link.href=url;link.download=file.fileName;link.hidden=true;host.append(link);link.click();link.remove();global.setTimeout(()=>global.URL.revokeObjectURL(url),1000);
        status.textContent="TXT source téléchargé. Aucun fichier modifié.";
      }catch(error){if(host.isConnected)status.textContent=error.message||"Téléchargement du TXT impossible.";}
      finally{if(host.isConnected)button.disabled=false;}
    };
  }
  global.LivePalmesImportSource={mount};
})(window);

(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.LivePalmesFeaturedDocumentsModel=api;})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 function create(){
  let saved=[],current=[],fingerprint="";
  const copy=items=>items.map(item=>({...item}));
  return {
   load(result){if(!Array.isArray(result.documents)||result.documents.length>6||new Set(result.documents.map(item=>item.id)).size!==result.documents.length||!/^[a-f0-9]{64}$/.test(result.fingerprint||""))throw Error("Sélection invalide.");saved=copy(result.documents);current=copy(saved);fingerprint=result.fingerprint;},
   documents:()=>copy(current),
   dirty:()=>JSON.stringify(current.map(item=>item.id))!==JSON.stringify(saved.map(item=>item.id)),
   add(item){if(current.some(row=>row.id===item.id))return;if(current.length>=6)throw Error("La sélection est limitée à six documents.");current.push({...item});},
   remove(id){current=current.filter(item=>item.id!==id);},
   move(id,direction){const index=current.findIndex(item=>item.id===id),next=index+direction;if(![-1,1].includes(direction)||index<0||next<0||next>=current.length)return;[current[index],current[next]]=[current[next],current[index]];},
   cancel(){current=copy(saved);},
   payload:()=>({documentIds:current.map(item=>item.id),expectedFingerprint:fingerprint})
  };
 }
 return {create};
});

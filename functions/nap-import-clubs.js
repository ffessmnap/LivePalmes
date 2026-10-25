"use strict";
// Pure ZIP resolution on the already bounded club reference. Never pad a
// federal number or silently replace a source club with a swimmer's club.
const codeKey=value=>String(value||"").trim().toUpperCase();
const nameKey=value=>codeKey(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
function createClubMatcher(clubs,declarations){
  const numbers=new Map(),names=new Map(),codes=new Map(),headers=new Map();
  const add=(map,key,value)=>{if(key){if(!map.has(key))map.set(key,[]);map.get(key).push(value);}};
  for(const c of clubs){add(numbers,String(c.federal_club||"").trim(),c);add(names,nameKey(c.nom_club),c);add(codes,codeKey(c.abre_club),c);}
  for(const d of declarations)add(headers,codeKey(d.cells[1]),d);
  return code=>{
    const declared=headers.get(codeKey(code))||[],source=declared[0]?.cells||[],number=String(source[3]||"").trim(),name=source[2]||"";
    const byNumber=numbers.get(number)||[],byName=names.get(nameKey(name))||[],byCode=codes.get(codeKey(code))||[];
    const all=[...new Map([...byNumber,...byName,...byCode].map(c=>[String(c.num_club),c])).values()];
    const base={code,sourceName:name,federalNumber:number,candidateIds:all.slice(0,20).map(c=>String(c.num_club)),moreCandidates:all.length>20};
    if(declared.length!==1)return {...base,reason:declared.length?"multiple-declarations":"missing-declaration"};
    if(!number)return {...base,reason:"missing-federal-number"};
    if(!/^\d{8}$/.test(number))return {...base,reason:"invalid-federal-number"};
    if(byNumber.length!==1)return {...base,reason:byNumber.length?"duplicate-federal-number":"unknown-federal-number"};
    const selected=byNumber[0];
    if(nameKey(name)&&nameKey(name)!==nameKey(selected.nom_club))return {...base,reason:"federal-name-conflict",napName:selected.nom_club||""};
    return {...base,id:String(selected.num_club),napName:selected.nom_club||"",method:"federal-number"};
  };
}
module.exports={createClubMatcher,nameKey};

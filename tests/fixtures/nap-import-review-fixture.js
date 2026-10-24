"use strict";
const assert=require("node:assert/strict");
const person=(id,nom,prenom,club="106")=>({id,nom,prenom,date:"2000-02-01",sexe:"M",club});
const people=[person(168,"TEST","Personne","107"),person(169,"DUP","Homonyme"),person(170,"DUP","Homonyme"),person(171,"KNOWN","Trouve"),person(172,"THREE","Trois"),person(173,"FOUR","Quatre")];
const row=(nom,prenom,course,hint,time="1:00.00",split="00.00")=>["NAG",nom,prenom,"01/02/2000","M","ABC","",course,"","HSE","NAG",split,"00.00","00.00","00.00",time,"","100","1","1","HSE","",hint].join(";");
const text="REN;11/10/2026;Compétition;Ville\nBAS;25;M\nCLU;ABC;Club source;01020304\n"+[
 row("TEST","Personne","100SF","912"),row("TEST","Personne","200SF","912","2:15.00","1:01.00"),row("DUP","Homonyme","50SF","913","32.45"),row("UNKNOWN","Inconnu","100BI","914"),row("THREE","Trois","50SF","915","32.45"),row("FOUR","Quatre","50SF","916","32.45"),
 ["REL","ABC","XSE","4X100SF","","","NAG","1:02.34","2:04.00","3:05.00","00.00","4:12.34","912","914","915","916","","100","1","1",""].join(";")].join("\n");
const old={id:900,nageur:168,compet:5172,course:"200SF",cat:"HSE",tps:"021000",points:100,newpoints:0,passage:0,club:"106",relais:0,pid:null,classement:1};
function fixture({capped=false,existing=[old]}={}) {
 const calls=[];
 const pool={execute:async({sql},values=[])=>{
  calls.push({sql,values});assert.match(sql,/^SELECT /,"All import review operations are read only");
  if(sql.includes("FROM competitions"))return [[{id:5172,libelle:"Compétition",date:"2026-10-11",lieu:"Ville",bassin:25,chrono:"M"}]];
  if(sql.includes("FROM nageurs"))return [sql.includes("WHERE id IN")?people.filter(p=>values.includes(p.id)):people.filter(p=>values.includes(p.nom))];
  if(sql.includes("FROM clubs"))return [[{num_club:106,abre_club:"ABC",nom_club:"Club source",federal_club:"01020304"},{num_club:107,abre_club:"CUR",nom_club:"Club actuel",federal_club:"01020305"}]];
  if(sql.startsWith("SELECT nageur FROM perfs"))return [capped?Array.from({length:10001},()=>({nageur:168})):[{nageur:168},{nageur:168},{nageur:169}]];
  if(sql.includes("FROM perfs_relais"))return [[]];
  if(sql.includes("FROM perfs"))return [existing];
  if(sql.includes("FROM livepalmes_performance_imports"))return [[]];
  throw Error("Unexpected SQL: "+sql);
 }};
 return {pool,calls,input:{sourceType:"winpalme-zip-preview",rawText:text,competitionId:5172}};
}
module.exports={fixture,text,people,old};

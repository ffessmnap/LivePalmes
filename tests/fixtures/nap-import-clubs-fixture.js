"use strict";
const {fixture}=require('./nap-import-review-fixture');
const clubs=[{num_club:110,abre_club:'CSL',nom_club:'Club Subaquatique Lorientais',federal_club:'03560008'},{num_club:568,abre_club:'CSL',nom_club:'Club Subaquatique du Léman',federal_club:'14740014'},{num_club:681,abre_club:'CSL',nom_club:'CLUB SUBAQUATIQUE DE LIMOGES',federal_club:'02870082'},{num_club:107,abre_club:'CUR',nom_club:'Club actuel',federal_club:'03569999'}];
const header=(name='Club Subaquatique Lorientais',number='03560008')=>({cells:['CLU','CSL',name,number]});
function clubFixture(){
 const f=fixture(),execute=f.pool.execute;f.input.rawText=f.input.rawText.replace('CLU;ABC;Club source;01020304','CLU;CSL;Club Subaquatique Lorientais;03560008').split('\n').map(line=>{const c=line.split(';');if(c[0]==='NAG')c[5]='CSL';if(c[0]==='REL')c[1]='CSL';return c.join(';');}).join('\n');
 f.pool.execute=async(query,values)=>{if(query.sql.includes('FROM clubs')){f.calls.push({sql:query.sql,values});return [clubs.map(c=>({...c}))];}const [rows]=await execute(query,values);return [query.sql.includes('FROM nageurs')?rows.map(p=>({...p,club:p.club==='106'?'110':p.club})):rows];};return f;
}
module.exports={clubs,header,clubFixture};

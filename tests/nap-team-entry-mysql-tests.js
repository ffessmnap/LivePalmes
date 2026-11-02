"use strict";
// Explicit isolated MySQL 5.7 service only. Never accepts a NAP hostname, an
// application password, or an existing sporting database name.
const assert=require('node:assert/strict');
const mysql=require('../functions/node_modules/mysql2/promise');
const {randomUUID}=require('node:crypto');
const {fingerprint}=require('../functions/nap-competition-fingerprint');
const {saveTeamEntries}=require('../functions/nap-team-entry-change');
const model=require('../functions/nap-team-entries');
const schema=require('../functions/nap-approved-team-entry-schema');
const clone=x=>JSON.parse(JSON.stringify(x));
async function main(){
  assert.equal(process.env.NAP_TEAM_FIXTURE_ALLOWED,'isolated-ci');assert.ok(process.env.NAP_TEAM_FIXTURE_PASSWORD);
  const database='lp_team_fixture_'+Date.now()+'_'+process.pid;assert.match(database,/^lp_team_fixture_[0-9]+_[0-9]+$/);
  const settings={host:'127.0.0.1',port:33317,user:'root',password:process.env.NAP_TEAM_FIXTURE_PASSWORD,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false,connectionLimit:3};
  const admin=await mysql.createConnection(settings),[[runtime]]=await admin.query('SELECT VERSION() AS version');assert.match(runtime.version,/^5\.7\./);
  await admin.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const pool=mysql.createPool({...settings,database}),q=async(sql,v=[])=>(await pool.execute(sql,v))[0];
  const definitions={
    competitions:'id int PRIMARY KEY,libelle varchar(255),lieu varchar(64),date date,enddate date,comite int,description text,comments text,bassin int,chrono varchar(1),ld int,type int',
    compet_parametres:'id int PRIMARY KEY,compet int,actif int,dateactif date,date_limit datetime,officiel int,nb_lignes int,mailtxt varchar(255),mailjuges varchar(255),tps_d date,tps_f date,niveau int,saisie int,relais int,cat_d date,cat_f date,qualif int',
    livepalmes_competition_options:'competition_id int PRIMARY KEY,canceled tinyint,entry_closed tinyint,version bigint,created_at datetime(6),updated_at datetime(6),created_by varchar(128),updated_by varchar(128)',
    livepalmes_competition_fees:'competition_id int PRIMARY KEY,enabled tinyint,swimmer_fee decimal(10,2),individual_event_fee decimal(10,2),relay_fee decimal(10,2)',
    compet_courses:'id int PRIMARY KEY,compet int,pos int,id_course int,opencourse int,cost int,limitnageur int,KEY livepalmes_compet (compet)',
    course_dispo:'id int PRIMARY KEY,course varchar(32),sexe varchar(1),relais int',
    courses_swim:'id int PRIMARY KEY,compet int,course varchar(32),categorie int,swim int,KEY livepalmes_compet_course_cat_id (compet,course,categorie,id)',
    compet_participations:'id int PRIMARY KEY,compet int,participation int,modeengagement int,KEY livepalmes_compet_id (compet,id)',
    nageurs:'id int PRIMARY KEY,nom varchar(80),prenom varchar(80),date date,sexe varchar(1),club varchar(16)',
    livepalmes_swimmer_merges:'swimmer_id int PRIMARY KEY,target_id int',
    chefsdequipe:'id int PRIMARY KEY,compet int,nom varchar(80),prenom varchar(80),date date,club int,pourclub int,KEY livepalmes_compet_id (compet,id)',
    officielsengager:'id int PRIMARY KEY,compet int,officiel int,club int,KEY livepalmes_compet_club_id (compet,club,id)',
    forfait:'id int PRIMARY KEY,compet int,engagement int,KEY livepalmes_compet_engagement_id (compet,engagement,id)',
    nageursengager:'id int AUTO_INCREMENT PRIMARY KEY,nageur int,compet int,KEY livepalmes_compet_nageur_id (compet,nageur,id)',
    engagements:'id int AUTO_INCREMENT PRIMARY KEY,engagement int,course varchar(32),tps varchar(6),KEY engagements_clef (engagement,course,id)',
    engagements_relais:'id int AUTO_INCREMENT PRIMARY KEY,compet int,categorie int,club int,course int,tps varchar(6),KEY livepalmes_compet_club_id (compet,club,id)',
    engagements_relayeurs:'id int AUTO_INCREMENT PRIMARY KEY,relais int,pos int,nageur int,KEY livepalmes_relais_pos_id (relais,pos,id)',
    livepalmes_club_entry_options:'competition_id int,club_id int,team_leader_waiver tinyint,team_leader_contact json,submission_metadata json,version bigint NOT NULL DEFAULT 1,created_at datetime(6),updated_at datetime(6),created_by varchar(128),updated_by varchar(128),PRIMARY KEY(competition_id,club_id)'
  };
  let failAfter=0,mutations=0,fixtureTime='002500';const journal=new Map();
  const scopedPool={getConnection:async()=>{const c=await pool.getConnection();return {execute:async(spec,v)=>{const r=await c.execute(spec,v);if(/^(INSERT|DELETE|UPDATE)\b/.test(spec.sql)){mutations++;if(failAfter&&mutations===failAfter){failAfter=0;throw new Error('synthetic response loss');}}return r;},query:(spec)=>c.query(spec),release:()=>c.release(),destroy:()=>c.destroy()};}};
  const read=async(c,sql,v=[])=> (await c.execute({sql,timeout:10000},v))[0];
  const comp=async(c)=>{const [native]=await read(c,'SELECT * FROM competitions WHERE id=42'),[parameters]=await read(c,'SELECT * FROM compet_parametres WHERE id=42'),[options]=await read(c,'SELECT * FROM livepalmes_competition_options WHERE competition_id=42'),[fees]=await read(c,'SELECT * FROM livepalmes_competition_fees WHERE competition_id=42');return {event:{id:'42',eventType:'pool',level:'national',date:'2026-12-12',entryStatus:Number(parameters.actif)===1?'open':'closed',entryDeadlineAt:'2035-01-01T00:00:00.000Z'},options,fees,nativeSnapshot:{competition:native,parameters},courses:await read(c,'SELECT cc.id,cc.pos,cc.id_course,cc.opencourse,cc.cost,cc.limitnageur,d.course,d.sexe,d.relais FROM compet_courses cc LEFT JOIN course_dispo d ON d.id=cc.id_course WHERE cc.compet=42 ORDER BY cc.pos,cc.id'),restrictions:[],participations:[]};};
  const entry=async c=>{const people=await read(c,'SELECT * FROM nageurs ORDER BY id'),inscriptions=await read(c,'SELECT id,nageur,compet FROM nageursengager WHERE compet=42 ORDER BY nageur,id'),individual=await read(c,'SELECT id,engagement,course,tps FROM engagements ORDER BY engagement,course,id'),relays=await read(c,'SELECT id,compet,categorie,club,course,tps FROM engagements_relais WHERE compet=42 AND club=12 ORDER BY id'),members=await read(c,'SELECT id,relais,pos,nageur FROM engagements_relayeurs ORDER BY relais,pos,id'),leaders=await read(c,'SELECT id,compet,nom,prenom,date,club,pourclub FROM chefsdequipe WHERE compet=42 ORDER BY id'),[options]=await read(c,'SELECT * FROM livepalmes_club_entry_options WHERE competition_id=42 AND club_id=12');return {competitionId:'42',clubId:'12',readAt:new Date().toISOString(),swimmers:people.map(p=>({id:p.id,firstName:p.prenom,lastName:p.nom,birthDate:p.date,sex:p.sexe,clubId:p.club})),inscriptions,individual,relays,members,leaders,officials:[],options:options||null};};
  const raw=()=>({teams:[{id:'f-a',letter:'A',sex:'F',members:['1','2','3','4','5','6'],reserve:'7',relays:[{eventCode:'6X100SBI',members:['1','2','3','4','5','6'],entryTime:'05:00.00'}]}],outside:['8'],individuals:[{swimmerId:'1',eventCodes:['50SF']},{swimmerId:'7',eventCodes:['50SF']},{swimmerId:'8',eventCodes:['50SF']}]});
  const services={authorize:()=>{},readers:{competition:comp,entry},resolve:async({competition,pack,dossier})=>{const v=model.normalize(dossier,{entryFormat:'clubs',entryRulesVersion:model.VERSION,date:'2026-12-12',events:[{code:'50SF',type:'individual'},{code:'6X100SBI',type:'relay'}]},pack,{age:()=>27});return {value:v,people:[...model.roles(v).keys()],individual:v.individuals.flatMap(x=>x.eventCodes.map(course=>({swimmerId:x.swimmerId,course,tps:x.swimmerId==='1'?fixtureTime:'595999'}))),relays:v.teams.flatMap(t=>t.relays.map(r=>({key:t.id+'|'+r.eventCode,course:101,categorie:10,tps:r.entryTime,members:r.members}))) };},audit:{read:async op=>journal.get(op),prepare:async(op,value)=>{assert.ok(!journal.has(op));journal.set(op,clone(value));},complete:async()=>{}}};
  async function reset(){for(const table of ['engagements_relayeurs','engagements_relais','engagements','nageursengager','livepalmes_club_entry_options'])await q('DELETE FROM '+table);await q('UPDATE compet_parametres SET actif=1 WHERE id=42');journal.clear();mutations=0;failAfter=0;}
  async function input(dossier=raw()){return {competitionId:42,clubId:'12',actorUid:'fixture',mutationId:randomUUID(),expectedFingerprint:fingerprint(await entry(pool)),dossier};}
  try{
    for(const [name,columns]of Object.entries(definitions))await q(`CREATE TABLE ${name} (${columns}) ENGINE=${name.startsWith('livepalmes_')?'InnoDB':'MyISAM'}`);
    const prepared=await schema.approvedTeamEntrySchema(pool,{phase:'prepare',confirmation:'nap-add-team-entry-columns'});await schema.approvedTeamEntrySchema(pool,{phase:'apply',confirmation:'nap-add-team-entry-columns',planHash:schema.planHash,schemaHash:prepared.schemaHash});const repeat=await schema.approvedTeamEntrySchema(pool,{phase:'prepare',confirmation:'nap-add-team-entry-columns'});assert.ok(repeat.alreadyPresent.every(Boolean));assert.equal((await q('SHOW TABLES')).length,Object.keys(definitions).length,'migration creates no table');
    await q("INSERT INTO competitions VALUES (42,'Fixture Clubs','Dijon','2026-12-12','2026-12-13',4,'','',50,'E',0,0)");
    await q("INSERT INTO compet_parametres VALUES (42,42,1,NULL,'2035-01-01 00:00:00',0,10,'','',NULL,NULL,2,0,1,NULL,NULL,0)");
    await q("INSERT INTO livepalmes_competition_options (competition_id,canceled,entry_closed,entry_format,entry_rules_version) VALUES (42,0,0,'clubs',?)",[model.VERSION]);
    await q("INSERT INTO livepalmes_competition_fees VALUES (42,1,10,5,0,70)");
    await q("INSERT INTO course_dispo VALUES (101,'6X100SBI','F',1)");await q('INSERT INTO compet_courses VALUES (1,42,1,101,0,0,0)');
    await q("INSERT INTO chefsdequipe VALUES (1,42,'CHEF','Alex','1970-01-01',12,0)");
    for(let i=1;i<=8;i++)await q("INSERT INTO nageurs VALUES (?,?,?,'2000-01-01',?, '12')",[i,'NOM'+i,'Prénom'+i,i<=7?'F':'M']);
    await reset();const normal=await saveTeamEntries(scopedPool,await input(),services);assert.equal(normal.ok,true);assert.equal(normal.nativeEntry.members.length,6);assert.equal(normal.nativeEntry.inscriptions.length,8);assert.equal(normal.nativeEntry.individual.filter(x=>x.tps==='595999').length,2);const expectedWrites=mutations;assert.ok(expectedWrites<=12);
    for(let n=1;n<=expectedWrites;n++){await reset();const request=await input();failAfter=n;await assert.rejects(saveTeamEntries(scopedPool,request,services),/response loss/);const recovered=await saveTeamEntries(scopedPool,request,services);assert.equal(recovered.ok,true);assert.equal(recovered.nativeEntry.relays.length,1);assert.equal(recovered.nativeEntry.members.length,6);assert.equal(recovered.nativeEntry.individual.length,3);assert.equal(journal.size,1);assert.ok(mutations<=expectedWrites,'no duplicate native writes on retry');}
    await reset();const request=await input();failAfter=2;await assert.rejects(saveTeamEntries(scopedPool,request,services));await q("UPDATE engagements SET tps='002400' WHERE course='50SF' LIMIT 1");await assert.rejects(saveTeamEntries(scopedPool,request,services),/ailleurs/);
    await reset();const stale=await input();await q('INSERT INTO nageursengager (compet,nageur) VALUES (42,1)');await assert.rejects(saveTeamEntries(scopedPool,stale,services),/changé/);assert.equal(mutations,0);
    await reset();let changed=raw();changed.teams[0].relays[0].members=[];await saveTeamEntries(scopedPool,await input(changed),services);assert.equal((await entry(pool)).members.length,0,'empty composition is stored without fake members');
    changed=raw();changed.teams[0].members=['1','2'];changed.teams[0].relays=[];changed.teams[0].reserve='';changed.outside=[];changed.individuals=[{swimmerId:'1',eventCodes:['50SF']}];await saveTeamEntries(scopedPool,await input(changed),services);const removed=await entry(pool);assert.equal(removed.inscriptions.length,2);assert.equal(removed.relays.length,0);assert.equal(removed.members.length,0);assert.equal(removed.individual.length,1);
    // Exercise UPDATE/DELETE and existing JSON, not just initial INSERT paths.
    const revised=raw();revised.teams[0].relays[0].entryTime='04:59.99';revised.teams[0].relays[0].members=['2','1','3','4','5','6'];revised.outside=[];revised.individuals=revised.individuals.filter(x=>x.swimmerId!=='8');
    async function beforeRevision(){await reset();fixtureTime='002500';await saveTeamEntries(scopedPool,await input(),services);mutations=0;fixtureTime='002400';return input(revised);}
    let revision=await beforeRevision();await saveTeamEntries(scopedPool,revision,services);const revisionWrites=mutations;assert.ok(revisionWrites<=12);assert.equal((await entry(pool)).individual.find(x=>x.tps==='002400').course,'50SF');
    for(let n=1;n<=revisionWrites;n++){revision=await beforeRevision();failAfter=n;await assert.rejects(saveTeamEntries(scopedPool,revision,services),/response loss/);const recovered=await saveTeamEntries(scopedPool,revision,services);assert.equal(recovered.ok,true);assert.equal(recovered.nativeEntry.inscriptions.length,7);assert.equal(recovered.nativeEntry.members[0].nageur,2);assert.ok(mutations<=revisionWrites,'no repeated update/delete after response loss');}
    // A verified completed receipt can be returned after closure, without writes.
    await q('UPDATE compet_parametres SET actif=0 WHERE id=42');const count=mutations;assert.equal((await saveTeamEntries(scopedPool,revision,services)).writesExecuted,0);assert.equal(mutations,count);
    const denied=await input();await assert.rejects(saveTeamEntries(scopedPool,denied,{...services,authorize:()=>{throw new Error('denied');}}),/denied/);
    await q('UPDATE compet_parametres SET actif=0 WHERE id=42');await assert.rejects(saveTeamEntries(scopedPool,await input(),services),/fermés/);
    await reset();await q('DELETE FROM nageurs');const empty=raw();empty.teams[0].members=[];empty.teams[0].reserve='';empty.teams[0].relays=[];empty.outside=[];empty.individuals=[];
    const declaration=await saveTeamEntries(scopedPool,await input(empty),services);assert.equal(declaration.nativeEntry.inscriptions.length,0);assert.equal(model.stored(declaration.nativeEntry).teams.length,1,'team declaration is allowed before any swimmer exists');
    console.log('Isolated MySQL 5.7: additive three-column schema, real table locks, grouped SQL, six members, empty composition, removal, stale dossiers, closure and every write-response-loss recovery passed.');
  }finally{await pool.end();assert.match(database,/^lp_team_fixture_[0-9]+_[0-9]+$/);await admin.query('DROP DATABASE `'+database+'`');await admin.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

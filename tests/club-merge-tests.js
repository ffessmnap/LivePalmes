"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const p = require("../tools/club-merge-plan"), backup = require("../tools/club-merge-backup"), engine = require("../tools/club-merge-engine"), {fixture,memory,s} = require("./club-merge-fixture");
global.fetch = async () => { throw Error("NETWORK_FORBIDDEN"); };
async function main() {
  const {inventory,plan} = fixture(), original=p.clone(inventory);
  assert.equal(p.validate(plan),plan);
  assert.equal(plan.changes.filter(o => !o.after).length,14);
  assert.equal(plan.firestore.length,3);
  assert.equal(plan.changes.find(o => o.table === "chefsdequipe").after.pourclub,"220");
  const tampered=p.clone(plan); tampered.changes[0].after={wrong:true}; assert.throws(() => p.validate(tampered),/PLAN_TAMPERED/);
  assert.throws(() => p.encode(9007199254740992),/LOSSY/);
  assert.throws(() => p.encode(new Date()),/LOSSY/);
  assert.deepEqual(p.decode(p.encode({binary:Buffer.from([0,255]),empty:"",nil:null,zero:0,big:"9007199254740999",stamp:"2026-01-01 00:00:00.123456"})),{binary:Buffer.from([0,255]),empty:"",nil:null,zero:0,big:"9007199254740999",stamp:"2026-01-01 00:00:00.123456"});
  for (const change of [x => x.sql.clubs.pop(),x => x.sql.nageurs.push(x.sql.nageurs[0]),x => x.sql.livepalmes_club_entry_options.push({competition_id:99,club_id:126,value:"different"}),x => x.sql.livepalmes_deleted_people_history.push({engagement_id:1,club:"518"}),x => x.docs.find(d => d.path === "users/fiction-source").fields.capabilities.mapValue.fields["admin.full"]={booleanValue:true},x => x.docs.find(d => d.path === "users/fiction-source").fields.accessScopes.mapValue.fields["engagements.club.manage"].mapValue.fields.scopeId=s("126")]) {
    const other=p.clone(inventory);change(other);assert.throws(() => p.prepare(other,plan.operation));
  }
  assert.deepEqual(inventory,original);
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),"club-merge-test-")), key = crypto.randomBytes(32), a=path.join(folder,"a.enc"), b=path.join(folder,"b.enc");
  try {
    backup.create(plan,key,a,b);assert.deepEqual(backup.verify(a,b,key),plan);
    assert.throws(() => backup.create(plan,key,a,b));
    assert.throws(() => backup.verify(a,b,crypto.randomBytes(32)));
    assert.throws(() => backup.verify(a,a,key));
    const broken=fs.readFileSync(b);broken[broken.length-1]^=1;fs.writeFileSync(b,broken);assert.throws(() => backup.verify(a,b,key));
    assert.throws(() => backup.privatePath(path.resolve(__dirname,"../private-test.enc")),/UNSAFE|REPOSITORY/);
    const log=backup.journal(folder,key); await log({phase:"test",private:"fiction-only"});
    assert(!fs.readdirSync(folder).filter(f => f.endsWith("club-event")).some(f => fs.readFileSync(path.join(folder,f)).includes(Buffer.from("fiction-only"))));
  } finally { for (const name of fs.readdirSync(folder)) fs.unlinkSync(path.join(folder,name)); fs.rmdirSync(folder); }
  const noApproval = memory(plan);
  await assert.rejects(() => engine.run({plan,...noApproval,checkGate:engine.gate}),/APPROVAL/);
  assert.equal(noApproval.counts().mutations,0);
  const evidence={operation:plan.operation,planDigest:plan.digest,direction:"apply",approval:{quote:"fiction-only approved",context:"offline test"},productionCommit:"a".repeat(40),projectionReplayProof:"https://github.com/ffessmnap/LivePalmes/actions/runs/1",projectionReview:"offline fixture",maintenance:{operator:"fixture",proof:"offline",startsAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+60000).toISOString()}};
  engine.gate(plan,evidence,"apply");assert.throws(() => engine.gate(plan,evidence,"restore"));
  assert.throws(() => engine.gate(plan,{...evidence,maintenance:{...evidence.maintenance,endsAt:new Date(0).toISOString()}},"apply"));
  const normal=memory(plan);await normal.run("apply");const final=p.clone(normal.state.sql);await normal.run("apply");assert.deepEqual(normal.state.sql,final);await normal.run("restore");await normal.run("restore");
  engine.inspect(plan,normal.state.sql);assert.deepEqual(normal.state.sql.clubs.sort((a,b)=>a.num_club-b.num_club),p.clone(plan.sql.clubs).sort((a,b)=>a.num_club-b.num_club));
  for (const op of plan.firestore) assert.deepEqual(normal.state.docs.find(d=>d.path===op.path).fields,op.before);
  const mutationCount=plan.changes.length+1;
  for (let stop=1;stop<=mutationCount;stop++) {
    const db=memory(plan,{stopAt:stop});await assert.rejects(() => db.run("apply"),/INJECTED/);await db.run("apply");await db.run("restore");assert([...engine.inspect(plan,db.state.sql).values()].every(v=>v==="before"));
    const undo=memory(plan,{stopAt:stop});await assert.rejects(() => undo.run("apply"),/INJECTED/);await undo.run("restore");assert([...engine.inspect(plan,undo.state.sql).values()].every(v=>v==="before"));
    const restoring=memory(plan);await restoring.run("apply");restoring.arm(stop);await assert.rejects(() => restoring.run("restore"),/INJECTED/);await restoring.run("restore");assert([...engine.inspect(plan,restoring.state.sql).values()].every(v=>v==="before"));
  }
  // Every progress-log boundary, including intent/receipt failure. No blind
  // retry and no reliance on the failed/missing receipt for recovery.
  const countRun=memory(plan);await countRun.run("apply");
  for (let n=1;n<=countRun.counts().events;n++) {
    const db=memory(plan,{failPersistAt:n});await assert.rejects(() => db.run("apply"),/JOURNAL/);await db.run("apply");await db.run("restore");
  }
  for (const modify of [db=>db.state.sql.clubs.find(r=>r.num_club===126).nom_club="changed",db=>db.state.sql.nageurs[0].name="épreuve fictive 😀",db=>db.state.sql.nageurs.push({id:12345,club:"518"}),db=>db.state.docs[0].fields.other={integerValue:"1"},db=>db.state.meta.changed=true,db=>db.state.safety.imports.push({pending:true})]) {
    const db=memory(plan);modify(db);const before=p.clone(db.state);await assert.rejects(() => db.run("apply"));assert.equal(db.counts().mutations,0);assert.deepEqual(db.state,before);await assert.rejects(() => db.run("restore"));
  }
  const convergence=memory(plan,{failConvergence:true});await assert.rejects(() => convergence.run("apply"),/CONVERGED/);assert.equal(convergence.state.sql.clubs.length,26);
  const reused=memory(plan);await reused.run("apply");reused.state.sql.clubs.push({num_club:518,nom_club:"another club"});const before=p.clone(reused.state);await assert.rejects(() => reused.run("restore"));assert.deepEqual(reused.state,before);
  const large=fixture({large:true}), mass=memory(large.plan);await mass.run("apply");await mass.run("restore");assert.equal(large.plan.changes.filter(o=>o.table==="nageurs").length,133);assert.equal(large.plan.changes.filter(o=>o.table==="perfs").length,455);
  console.log(`Club merge: ${mutationCount} SQL/Firestore interruption points in apply AND restore, ${countRun.counts().events} journal boundaries, backup reopen/tamper, drift/roles/collisions, 133 swimmers + 455 performances; offline only.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});

"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const yaml=require("./firestore-rules/node_modules/js-yaml");
const read=name=>yaml.load(fs.readFileSync(path.join(__dirname,"../.github/workflows",name),"utf8"));
const release=read("livepalmes-production-release.yml"),rollback=read("livepalmes-production-rollback.yml");
const steps=release.jobs.release.steps,back=rollback.jobs.rollback.steps;
const key="${{ secrets.LIVEPALMES_CODE_BACKUP_KEY_V2 }}",legacy="${{ secrets.FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_BACKEND }}";
function byId(rows,id){const x=rows.find(x=>x.id===id);assert(x,id);return x;}
function command(rows,part){const x=rows.find(x=>(x.run||"").includes(part));assert(x,part);return x;}
function before(rows,a,b){assert(rows.indexOf(a)<rows.indexOf(b));}
assert.equal(release.jobs.release.environment,"production");assert.equal(rollback.jobs.rollback.environment,"production");
assert(!JSON.stringify(release.jobs.release.env).includes("LIVEPALMES_CODE_BACKUP_"));assert(!JSON.stringify(rollback.jobs.rollback.env).includes("LIVEPALMES_CODE_BACKUP_"));
const seal=byId(steps,"encrypted_backup");
assert.equal(seal.if,"inputs.resume_run == '0'");assert.equal(seal.env.LIVEPALMES_CODE_BACKUP_KEY_V2,key);
assert(seal.run.includes("production-code-backup-archive.js seal "));assert(seal.run.includes('open-v2 "$RUNNER_TEMP/prod-backup.enc" "$RUNNER_TEMP/backup-verification" "$PLAN/request.json"'));
assert(seal.run.includes('diff -qr "$RUNNER_TEMP/prod-backup" "$RUNNER_TEMP/backup-verification"'));
assert(!seal.run.includes("production-backup-crypto.js")&&!seal.run.includes("open-legacy-v1"));
const format=byId(steps,"resume_backup_format"),resume=byId(steps,"resume");
const original=command(steps,'emit-link "$RUNNER_TEMP/prod-backup.enc" "$PLAN" "$PLAN/request.json"');
assert.equal(original.if,"inputs.resume_run == '0'");assert(!original.env);before(steps,seal,original);
assert.equal(format.if,"inputs.resume_run != '0'");assert(!format.env);
assert.match(format.run,/archive_format="\$\(node .* inspect /);assert(!format.run.startsWith('echo "format=$('),"A failed inspect must propagate");
const resumeV2=command(steps,'open-v2 "$RUNNER_TEMP/prod-backup.enc" "$RUNNER_TEMP/prod-backup"');
const resumeV1=command(steps,'open-legacy-v1 "$RUNNER_TEMP/prod-backup.enc"');
const provenance=command(steps,'validate-source "$PLAN/encrypted/prod-backup.enc"');
assert(!provenance.env);assert.equal(provenance.if,resumeV2.if);before(steps,format,provenance);before(steps,provenance,resumeV2);
assert(resumeV2.run.includes('"$PLAN/request.json" "$RUNNER_TEMP/code-backup-source.json"'));
const copyLink=command(steps,'emit-link "$RUNNER_TEMP/prod-backup.enc" "$PLAN" "$PLAN/request.json" "$RUNNER_TEMP/code-backup-source.json"');
assert(!copyLink.env);assert.equal(copyLink.if,resumeV2.if);before(steps,resume,copyLink);
assert.equal(resumeV2.if,"inputs.resume_run != '0' && steps.resume_backup_format.outputs.format == 'v2'");
assert.equal(resumeV1.if,"inputs.resume_run != '0' && steps.resume_backup_format.outputs.format == 'legacy-v1'");
assert.equal(resumeV2.env.LIVEPALMES_CODE_BACKUP_KEY_V2,key);assert(!resumeV2.env.LIVEPALMES_CODE_BACKUP_LEGACY_V1);
assert.equal(resumeV1.env.LIVEPALMES_CODE_BACKUP_LEGACY_V1,legacy);assert(!resumeV1.env.LIVEPALMES_CODE_BACKUP_KEY_V2);
assert(resumeV2.run.includes('cp "$PLAN/encrypted/code-backup-context.json" "$RUNNER_TEMP/code-backup-context.json"'));
assert(!resumeV2.run.includes(" seal ")&&!resumeV1.run.includes(" seal "));
for(const open of [resumeV2,resumeV1]){before(steps,format,open);before(steps,open,resume);assert(open.run.includes('test ! -e "$RUNNER_TEMP/code-backup-context.json"'));}
assert.equal(resume.run,'python tooling/tools/release-cycle.py verify-resume "$PLAN" "$RUNNER_TEMP/prod-backup"');
before(steps,resume,byId(steps,"functions"));before(steps,seal,byId(steps,"functions"));
const upload=steps.find(x=>x.with?.name==="production-code-backup");
assert.deepEqual(upload.with.path.trim().split("\n"),["${{ runner.temp }}/prod-backup.enc","${{ runner.temp }}/code-backup-context.json"]);
assert(!upload.with.path.includes("prod-backup/"));
before(steps,original,upload);before(steps,copyLink,upload);
const bf=byId(back,"backup_format"),opened=byId(back,"opened");
assert.match(bf.run,/archive_format="\$\(node .* inspect /);assert(!bf.env);
const plan=command(back,'release-plan "$RUNNER_TEMP/backup-plan"');
assert.equal(plan.if,"steps.backup_format.outputs.format == 'v2'");
const rv2=command(back,"production-code-backup-archive.js open-v2"),rv1=command(back,"production-code-backup-archive.js open-legacy-v1");
const backProvenance=command(back,"production-code-backup-archive.js validate-source");
assert.equal(backProvenance.if,rv2.if);assert.deepEqual(Object.keys(backProvenance.env),["GH_TOKEN"]);
before(back,plan,backProvenance);before(back,backProvenance,rv2);
assert(rv2.run.includes('"$RUNNER_TEMP/backup-plan/request.json" "$RUNNER_TEMP/code-backup-source.json"'));
assert.equal(rv2.if,"steps.backup_format.outputs.format == 'v2'");assert.equal(rv1.if,"steps.backup_format.outputs.format == 'legacy-v1'");
assert.equal(rv2.env.LIVEPALMES_CODE_BACKUP_KEY_V2,key);assert(!rv2.env.LIVEPALMES_CODE_BACKUP_LEGACY_V1);
assert.equal(rv1.env.LIVEPALMES_CODE_BACKUP_LEGACY_V1,legacy);assert(!rv1.env.LIVEPALMES_CODE_BACKUP_KEY_V2);
assert(rv2.run.includes('"$RUNNER_TEMP/backup-plan/request.json"'));
before(back,bf,plan);before(back,plan,rv2);before(back,bf,rv1);
for(const step of [rv1,rv2])before(back,step,opened);
assert(opened.run.includes("Retour B coordonne code/Hosting/Rules obligatoire"));
assert(opened.run.includes('python tools/direct-csp-production-state.py validate-rollback "$RUNNER_TEMP/prod-backup" "$RUNNER_TEMP/after/production-after.json"'));
assert(!opened.env&&!opened.run.includes(" seal "));
for(const step of back.filter(x=>/hosting-rollback|production-release-state\.py rollback |rollback-restore/.test(x.run||"")))before(back,opened,step);
const frozen=JSON.stringify(release.jobs["session-enforcement-completion"]);
assert(frozen.includes("production-backup-crypto.js open"));assert(!frozen.includes("production-code-backup-archive.js"));
for(const name of ["livepalmes-production-resume.yml","livepalmes-production-rebuild-tops.yml","livepalmes-production-top-diagnostic.yml"]){
 const source=JSON.stringify(read(name));assert(!source.includes("production-code-backup-archive.js")&&!source.includes("LIVEPALMES_CODE_BACKUP_KEY_V2"),name);
}
console.log("Publication code : V2 qualifie pour nouvelles sauvegardes, contexte copie a plat, formats et secrets separes, inspect sans faux succes, validation du retour avant ecritures et parcours historiques conserves.");

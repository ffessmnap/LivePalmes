"use strict";
const fs = require("node:fs"), path = require("node:path"), {gzipSync,gunzipSync} = require("node:zlib");
const p = require("./club-merge-plan"), {seal,open} = require("./production-backup-crypto");
const MAX = 64000000;
function read(file,secret) {
  if (fs.statSync(file).size > MAX) p.fail("BACKUP_TOO_LARGE");
  const data = gunzipSync(open(fs.readFileSync(file),secret),{maxOutputLength:MAX});
  const saved = p.decode(JSON.parse(data.toString("utf8")));
  if (saved.format !== "club-merge-backup-v1") p.fail("BACKUP_FORMAT");
  p.validate(saved.plan);
  return saved.plan;
}
function privatePath(file,{existing=false}={}) {
  const parent = fs.realpathSync(path.dirname(path.resolve(file)));
  const root = fs.realpathSync(path.resolve(__dirname,".."));
  if (parent === root || parent.startsWith(root+path.sep) || !existing && fs.existsSync(file)) p.fail("BACKUP_PATH_UNSAFE_OR_EXISTS");
  for (let dir=parent;;dir=path.dirname(dir)) {
    if (fs.existsSync(path.join(dir,".git"))) p.fail("BACKUP_INSIDE_REPOSITORY");
    if (path.dirname(dir) === dir) break;
  }
  return path.join(parent,path.basename(file));
}
function writeOnce(file,bytes) {
  const fd = fs.openSync(file,"wx",0o600);
  try { fs.writeFileSync(fd,bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (process.platform !== "win32") {
    const directory=fs.openSync(path.dirname(file),"r");
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  }
}
function create(plan,secret,primary,secondary) {
  p.validate(plan);
  if (!Buffer.isBuffer(secret) || secret.length < 32) p.fail("BACKUP_KEY_REQUIRED");
  const a = privatePath(primary), b = privatePath(secondary);
  if (a === b) p.fail("TWO_BACKUP_LOCATIONS_REQUIRED");
  const encrypted = seal(gzipSync(Buffer.from(JSON.stringify(p.encode({format:"club-merge-backup-v1",plan})))),secret);
  writeOnce(a,encrypted); writeOnce(b,encrypted);
  if (!p.equal(read(a,secret),plan) || !p.equal(read(b,secret),plan)) p.fail("BACKUP_REOPEN_FAILED");
  return {planDigest:plan.digest,archiveDigest:p.digest(encrypted),primary:a,secondary:b};
}
function verify(primary,secondary,secret) {
  if (fs.realpathSync(primary) === fs.realpathSync(secondary)) p.fail("TWO_BACKUP_LOCATIONS_REQUIRED");
  const plan = read(primary,secret), other = read(secondary,secret);
  if (!p.equal(plan,other)) p.fail("BACKUP_COPIES_DIFFER");
  return plan;
}
// Progress is advisory: recovery uses the immutable images, never this log.
// Each record is authenticated/encrypted and durably stored before mutation.
function journal(directory,secret) {
  let seq = 0;
  return async event => {
    const bytes = seal(Buffer.from(JSON.stringify(p.encode(event))),secret);
    writeOnce(path.join(directory,`${Date.now()}-${process.pid}-${seq++}-${require("node:crypto").randomUUID()}.club-event`),bytes);
  };
}
module.exports = {create,read,verify,journal,privatePath,writeOnce};

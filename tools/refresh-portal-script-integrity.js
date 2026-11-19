"use strict";
const fs = require("node:fs");
const crypto = require("node:crypto");
const loader = "assets/livepalmes-portal-deferred.js";
function integrityMap(source) {
  const views = JSON.parse(/const viewScripts = (\{[^\n]+\});/.exec(source)[1]);
  const files = [...Object.values(views).flat().map(url => url.split("?")[0]),
    ...fs.readdirSync("assets/portal/deferred").filter(name => name.endsWith(".js")).map(name => "assets/portal/deferred/" + name)];
  return Object.fromEntries([...new Set(files)].sort().map(file => {
    const lf = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const digest = text => "sha256-" + crypto.createHash("sha256").update(text).digest("base64");
    return [file, [digest(lf), digest(lf.replace(/\n/g, "\r\n"))].join(" ")];
  }));
}
function refresh(source) {
  const hashes = JSON.stringify(integrityMap(source), null, 2);
  return source.replace(/  const scriptIntegrity = \{[\s\S]*?\};/, () => "  const scriptIntegrity = " + hashes.replace(/\n/g, source.includes("\r\n") ? "\r\n  " : "\n  ") + ";");
}
if (require.main === module) {
  const source = fs.readFileSync(loader, "utf8");
  const updated = refresh(source);
  if (source !== updated) fs.writeFileSync(loader, updated);
}
module.exports = { refresh };

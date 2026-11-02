"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const html = fs.readFileSync("portail.html", "utf8");
const entry = fs.readFileSync("assets/livepalmes-admin-portal.css", "utf8");
const config = JSON.parse(fs.readFileSync("firebase.json", "utf8"));
// New modules use the existing Hosting policy. Only the two historical entry
// points have an explicit immutable header; all resources keep versioned URLs.
for (const source of ["/assets/livepalmes-admin-portal.js", "/assets/livepalmes-admin-portal.css"]) {
  assert.equal(config.hosting.headers.find(h => h.source === source)?.headers.find(h => h.key === "Cache-Control")?.value,
    "public, max-age=31536000, immutable");
}
function versions(html, css, loader = "", modules = "") {
  const result = new Map();
  for (const match of html.matchAll(/src="(assets\/(?:portal\/[^"?]+|livepalmes-(?:admin-portal|admin-auth|app-config|portal-session|portal-deferred|portal-preload)\.js))\?v=([^"?]+)"/g)) {
    assert.ok(!result.has(match[1]), "Duplicate module script: " + match[1]);
    result.set(match[1], match[2]);
  }
  const stylesheet = /(?:href|data-portal-style-source)="(assets\/livepalmes-admin-portal\.css)\?v=([^"?]+)"/.exec(html);
  assert.ok(stylesheet);
  result.set(stylesheet[1], stylesheet[2]);
  for (const match of html.matchAll(/data-portal-fragment-src="([^"?]+)\?v=([^"?]+)"/g)) result.set(match[1], match[2]);
  for (const match of css.matchAll(/@import url\("(portal\/styles\/[^"?]+)\?v=([^"?]+)"\);/g)) result.set("assets/" + match[1], match[2]);
  const chunkVersion = /const version = "([^"]+)"/.exec(loader)?.[1];
  if (chunkVersion) for (const name of fs.readdirSync("assets/portal/deferred")) result.set("assets/portal/deferred/"+name,chunkVersion);
  const sessionStyle = /href="(assets\/livepalmes-portal-session\.css)\?v=([^"?]+)"/.exec(html);
  if (sessionStyle) result.set(sessionStyle[1],sessionStyle[2]);
  const store = /"(performances\/public\/store\.js)\?v=([^"?]+)"/.exec(modules);
  if (store) result.set(store[1],store[2]);
  return result;
}
const current = versions(html, entry, fs.readFileSync("assets/livepalmes-portal-deferred.js","utf8"), fs.readFileSync("assets/portal/modules-and-clubs.js","utf8"));
assert.equal(current.size, 57);
const historical = file => {
  try { return execFileSync("git", ["show", "HEAD^:" + file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; } // New resources have no cached predecessor.
};
const oldHtml = historical("portail.html"), oldCss = historical("assets/livepalmes-admin-portal.css");
const previous = oldHtml && oldCss ? versions(oldHtml, oldCss, historical("assets/livepalmes-portal-deferred.js") || "", historical("assets/portal/modules-and-clubs.js") || "") : new Map();
for (const [file, version] of current) {
  assert.ok(version.trim());
  const before = historical(file);
  if (before !== null && before.replace(/\r\n/g, "\n") !== fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")) {
    assert.notEqual(version, previous.get(file), "Changed immutable resource needs a new URL version: " + file);
  }
}
console.log("Portal cache: versioned entry points/modules, no duplicate scripts and changed-resource invalidation verified.");

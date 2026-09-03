"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "portail.html"), "utf8");
const portal = fs.readFileSync(path.join(root, "assets", "livepalmes-admin-portal.js"), "utf8");
const moduleSource = fs.readFileSync(path.join(root, "assets", "livepalmes-license-administration.js"), "utf8");
const functionsSource = fs.readFileSync(path.join(root, "functions", "index.js"), "utf8");

assert.match(html, /href="#administration-licences"/);
assert.match(html, /data-engagements-national-panel="licenses"/);
assert.match(html, /id="adminLicenseControlValidate"/);
assert.match(html, /Contr&ocirc;le manuel/);
assert.match(html, /adminLicenseControlRequiredDate/);
assert.match(html, /livepalmes-license-administration\.js/);

assert.match(portal, /"#administration-licences"[\s\S]*nationalTab: "licenses"/);
assert.match(portal, /new Set\(\["deletions", "clubs", "licenses", "swimmers", "people", "audit"\]\)/);
assert.match(portal, /livepalmes:license-admin-open/);

assert.match(moduleSource, /currentSeasonStartYear/);
assert.match(moduleSource, /Array\.from\(\{ length: 6 \}/);
assert.match(moduleSource, /validateEngagementSwimmerLicenses/);
assert.match(moduleSource, /source,\s*items: group\.slice/);
assert.match(moduleSource, /admin_import/);
assert.match(moduleSource, /national_manual/);
assert.match(moduleSource, /Valider la sélection/);

assert.match(functionsSource, /function engagementLicenseControlSeason/);
assert.match(functionsSource, /requiredValidityDate: `\$\{startYear \+ 1\}-12-31`/);
assert.match(functionsSource, /exports\.prepareEngagementLicenseControlBatch/);
assert.match(functionsSource, /\.where\("competitionId", "==", competitionId\)\s*\.limit\(501\)/);
assert.match(functionsSource, /peopleById\.size > 800/);
assert.match(functionsSource, /exports\.validateEngagementSwimmerLicenses/);
assert.match(functionsSource, /licenseSeasons: \{ \[season\.label\]: seasonRecord \}/);
assert.match(functionsSource, /engagementSwimmerLicenses\.validated/);
assert.match(functionsSource, /source === "admin_import"[\s\S]*federalValidityEndDate < season\.requiredValidityDate/);

console.log("Administration nationale des licences : OK");

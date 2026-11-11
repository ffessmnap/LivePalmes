"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.events = {}; this.hidden = false; this.textContent = ""; }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(key, handler) { this.events[key] = handler; }
  createTHead() { const head = new Element("thead"); this.append(head); return head; }
  createTBody() { const body = new Element("tbody"); this.append(body); return body; }
  insertRow() { const row = new Element("tr"); this.append(row); return row; }
  insertCell() { const cell = new Element("td"); this.append(cell); return cell; }
  get cells() { return this.children; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
const walk = node => [node, ...node.children.flatMap(walk)];
const byClass = (root, name) => walk(root).filter(node => node.className === name);
const source = fs.readFileSync("assets/public/livepalmes-trophy-table.js", "utf8");
const window = {};
vm.runInNewContext(source, { window, document: { createElement: tag => new Element(tag) } });
const swimmer = (rank, id, overrides = {}) => ({
  rank, swimmerId: id, lastName: "NOM COMPOSÉ TRÈS LONG", firstName: "Anne-Charlotte", birthYear: 2014,
  club: "ABR", totalPoints: 3980, events: [{ time: "24.00", points: 850 }, null, null, null, null], ...overrides
});
const data = { edition: { seasonEndYear: 2027, title: "Amnéville", from: "2026-09-01", through: "2027-05-16" },
  updatedAt: "2026-11-11T12:00:00Z", groups: { F: [swimmer(31, "31"), swimmer(32, "32-a"), swimmer(32, "32-b", { club: "" }), swimmer(34, "34")], M: [] } };
const root = new Element("section"); root.id = "trophyRanking";
const unchanged = JSON.stringify(data);
window.LivePalmesTrophyTable.render(root, data);
assert.equal(JSON.stringify(data), unchanged, "rendering never changes rankings or performances");
assert.equal(byClass(root, "trophy-swimmer").length, 4, "desktop table preserved");
assert.equal(byClass(root, "trophy-mobile-entry").length, 4);
const mobile = byClass(root, "trophy-mobile")[0];
const entries = byClass(root, "trophy-mobile-entry");
assert.deepEqual(entries.map(entry => entry.children[0].children[0].textContent), [31, 32, 32, 34]);
assert.equal(byClass(root, "trophy-mobile-cutoff").length, 1);
const list = mobile.children[1];
assert.equal(list.children[3].className, "trophy-mobile-cutoff", "separator follows both equal ranks 32");
assert.equal(byClass(root, "trophy-mobile-club")[0].textContent, "ABR · 2014");
assert.equal(byClass(root, "trophy-mobile-club")[2].textContent, "— · 2014");
assert.equal(byClass(root, "trophy-mobile-total")[0].textContent, new Intl.NumberFormat("fr-FR").format(3980) + " pts");
const toggle = byClass(root, "trophy-mobile-toggle")[0];
const detail = byClass(root, "trophy-mobile-detail")[0];
assert.equal(toggle.attributes["aria-controls"], detail.id);
assert.equal(toggle.textContent, "", "chevron has no visible Details label");
assert.equal(toggle.children[0].attributes["aria-hidden"], "true");
assert.equal(detail.hidden, true);
toggle.events.click();
assert.equal(detail.hidden, false);
assert.equal(toggle.attributes["aria-expanded"], "true");
assert.match(toggle.attributes["aria-label"], /^Masquer les cinq épreuves/);
const rows = detail.children[0].children[1].children;
assert.equal(rows.length, 5);
assert.deepEqual(rows[0].children.map(node => node.textContent), ["50 m SF", "24.00", "850"]);
assert.deepEqual(rows[1].children.map(node => node.textContent), ["50 m BI", "—", "—"]);
toggle.events.click();
assert.equal(detail.hidden, true);
byClass(root, "trophy-mobile-name")[0].events.click();
assert.equal(detail.hidden, true, "profile button does not unfold the row");
assert.equal(byClass(root, "trophy-profile-dialog")[0].open, true);
assert.match(walk(root).find(node => node.tagName === "a").href, /id=31$/);
byClass(root, "trophy-category-m")[0].events.click();
assert.equal(byClass(root, "trophy-mobile-entry").length, 0);
assert.equal(byClass(root, "trophy-mobile-empty")[0].textContent, "Aucune performance dans cette catégorie.");
byClass(root, "trophy-category-f")[0].events.click();
assert.equal(byClass(root, "trophy-mobile-entry").length, 4);
assert.equal(byClass(root, "trophy-mobile-detail")[0].hidden, true);
const preview = new Element("section"); preview.id = "adminTrophyPreview";
window.LivePalmesTrophyTable.render(preview, data);
assert.equal(byClass(preview, "trophy-mobile").length, 0, "portal preview stays unchanged");
assert.equal(byClass(preview, "trophy-swimmer").length, 4);
// Regression from the real iPhone TEST report: the shared stylesheet converts
// tables/rows/cells to block/grid cards. The detail must opt out at every level.
const css = fs.readFileSync("assets/public/livepalmes-trophy.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rules = new Map([...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map(match => [match[1].trim(), match[2]]));
for (const [selector, display] of [
  [".trophy-mobile-detail table", "table"],
  [".trophy-mobile-detail thead", "table-header-group"],
  [".trophy-mobile-detail tbody", "table-row-group"],
  [".trophy-mobile-detail tr", "table-row"],
  [".trophy-mobile-detail :is(th, td)", "table-cell"]
]) assert.ok(rules.get(selector)?.includes(`display: ${display};`), `${selector} must override inherited mobile card display`);
assert.match(rules.get(".trophy-mobile-detail tr"), /border: 0; border-radius: 0;/);
assert.match(rules.get(".trophy-mobile-detail td::before"), /content: none; display: none;/);
assert.match(rules.get(".trophy-mobile-detail tbody"), /padding: 0; gap: 0;/);
const html = fs.readFileSync("performances/damien-hebert.html", "utf8");
assert.ok(html.indexOf("public/styles.css") < html.indexOf("livepalmes-trophy.css"), "scoped reset follows shared stylesheet");
console.log("Trophy mobile: supplied club abbreviation, ranks/ties/cutoff, five courses, absence, accessible disclosure/profile, categories and existing preview preserved; offline.");

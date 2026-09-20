const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/livepalmes-portal-appearance.js', 'utf8');
function setup(saved, blocked = false) {
  const events = {}, listeners = {}, clicks = {}, pressed = {};
  const root = { dataset: {} }, message = {};
  const media = { matches: false, addEventListener: (name, fn) => { listeners[name] = fn; } };
  const buttons = ['light','dark','system'].map(mode => ({ dataset: { portalAppearance: mode }, setAttribute: (_, value) => { pressed[mode] = value; }, addEventListener: (_, fn) => { clicks[mode] = fn; } }));
  const context = { window: { matchMedia: () => media, addEventListener: (name, fn) => { events[name] = fn; } }, document: { documentElement: root, querySelectorAll: () => buttons, querySelector: () => message, addEventListener: (name, fn) => { events[name] = fn; } }, localStorage: { getItem: () => { if (blocked) throw Error(); return saved; }, setItem: (_, value) => { if (blocked) throw Error(); saved = value; } } };
  vm.runInNewContext(source, context);
  events.DOMContentLoaded();
  return { root, message, media, clicks, pressed, events, listeners, saved: () => saved };
}
let app = setup('dark');
assert.equal(app.root.dataset.portalTheme, 'dark');
app.clicks.light(); assert.equal(app.saved(), 'light'); assert.equal(app.pressed.light, 'true');
app.clicks.system(); assert.equal(app.root.dataset.portalTheme, 'light');
app.media.matches = true; app.listeners.change(); assert.equal(app.root.dataset.portalTheme, 'dark');
app.clicks.light(); app.listeners.change(); assert.equal(app.root.dataset.portalTheme, 'light');
app.events.storage({ key: 'unrelated', newValue: 'dark' }); assert.equal(app.root.dataset.portalTheme, 'light');
app.events.storage({ key: 'livepalmes.portal.appearance', newValue: 'dark' }); assert.equal(app.root.dataset.portalTheme, 'dark');
app = setup('invalid'); assert.equal(app.root.dataset.portalTheme, 'light');
app = setup(null, true); app.clicks.dark(); assert.equal(app.root.dataset.portalTheme, 'dark'); assert.match(app.message.textContent, /cette visite/);
for (const file of ['index.html','public.html','performances/mpf.html','performances/records.html','performances/tops.html','performances/nageur.html']) assert.ok(!fs.readFileSync(file,'utf8').includes('livepalmes-portal-appearance'));
console.log('Apparence portail : préférences, système, stockage indisponible et isolation publique OK');

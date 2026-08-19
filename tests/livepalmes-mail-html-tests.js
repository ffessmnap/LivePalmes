const assert = require("node:assert/strict");
const {
  livePalmesMailHtml,
  livePalmesMailLinkLabel
} = require("../functions/livepalmes-mail-html");

const portalUrl = "https://livepalmes.web.app/portail.html#club-competitions";
const portalHtml = livePalmesMailHtml([
  "Pour saisir vos engagements, connectez-vous au portail :",
  portalUrl
].join("\n"));
assert.ok(portalHtml.includes(`href="${portalUrl}"`));
assert.ok(portalHtml.includes("Accéder à la compétition dans le portail LivePalmes"));
assert.equal(portalHtml.includes(`>${portalUrl}<`), false);

const helloAssoUrl = "https://www.helloasso.com/associations/livepalmes/paiements/test";
const paymentHtml = livePalmesMailHtml(`Paiement HelloAsso : ${helloAssoUrl}`);
assert.ok(paymentHtml.includes("Accéder au paiement HelloAsso"));
assert.equal(paymentHtml.includes(`>${helloAssoUrl}<`), false);

const notificationUrl = "https://livepalmes.web.app/notifications.html?uid=test&token=secret";
const notificationHtml = livePalmesMailHtml(`Gérer mes notifications :\n${notificationUrl}`);
assert.ok(notificationHtml.includes("Gérer mes notifications"));
assert.equal(notificationHtml.includes(`>${notificationUrl}<`), false);

assert.equal(
  livePalmesMailLinkLabel("https://firebasestorage.googleapis.com/test", "Document"),
  "Ouvrir le document"
);
assert.ok(livePalmesMailHtml("<script>alert('x')</script>").includes("&lt;script&gt;"));

console.log("Rendu HTML des mails LivePalmes : OK");

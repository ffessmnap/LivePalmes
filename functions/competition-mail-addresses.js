"use strict";
const CLUB_TYPES = new Set(["opening", "documents", "club_recap", "opening_notification", "competition_documents", "club_recap_pdf", "deadline_reminder"]);
const NOTICE = "Pour toute question concernant cette compétition, contactez l’organisateur ou le responsable informatique en copie de ce message. Le bouton Répondre leur adressera votre message.";
function list(raw, label = "Adresses e-mail") {
  if (raw === undefined || raw === null || raw === "") return [];
  if (typeof raw !== "string" || raw.length > 255 || /[\r\n\x00-\x1f\x7f]/.test(raw)) throw new TypeError(`${label} : liste de 255 caractères maximum, sur une ligne.`);
  const addresses = raw.split(";").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (addresses.some(value => !/^[^\s@;,<>]+@[^\s@;,<>]+\.[^\s@;,<>]+$/.test(value))) throw new TypeError(`${label} : adresse invalide. Séparez les adresses par un point-virgule.`);
  return [...new Set(addresses)];
}
function canonical(raw, label) { return list(raw, label).join(";"); }
function copies(competition) {
  const cc = [...new Set([...list(competition.organizerEmail, "Organisateur"), ...list(competition.computerEmail, "Responsable informatique")])];
  // Keep 50 envelope recipients, <=250 jobs/page and <=1000 jobs/event,
  // including the existing worst case of 10000 addresses and 500 clubs.
  if (cc.length > 10) throw new TypeError("Organisateur et informatique : 10 adresses différentes maximum au total en copie.");
  return cc;
}
function headers(competition, kind) {
  if (!CLUB_TYPES.has(kind)) return {};
  const cc = copies(competition);
  return { cc, replyTo: cc, contactNotice: cc.length ? NOTICE : "" };
}
function payload(raw, HttpsError) {
  try {
    const result={organizerEmail:canonical(raw.organizerEmail,"Email organisateur"),computerEmail:canonical(raw.computerEmail,"Email du responsable informatique"),
      officialsManagerEmail:canonical(raw.officialsManagerEmail,"Email du responsable juge")};
    copies(result);return result;
  } catch(error) { throw new HttpsError("invalid-argument",error.message); }
}
module.exports = { list, canonical, copies, headers, payload, CLUB_TYPES, NOTICE };

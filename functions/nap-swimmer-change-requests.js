"use strict";
const { createHash } = require("node:crypto");
const { swimmerId } = require("./nap-direct-swimmer");
const { person } = require("./nap-portal-swimmers");
const { fingerprint, planIdentityChange } = require("./nap-portal-swimmer-change");
const FIELDS = ["firstName", "lastName", "birthDate", "sex"];
function proposedFields(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some(key => !FIELDS.includes(key) && key !== "licenseNumber")) throw new TypeError("Champs de correction invalides.");
  if (raw.licenseNumber) throw new TypeError("Les licences seront ajoutees dans NAP ulterieurement.");
  return Object.fromEntries(FIELDS.filter(key => Object.hasOwn(raw, key)).map(key => [key, raw[key]]));
}
async function prepareRequest(connection, input, context) {
  if (!context?.uid || !/^\d{1,16}$/.test(String(context.clubId || ""))) throw new TypeError("Club NAP requis.");
  if (input?.napSource !== true || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint || "")) throw new TypeError("Rechargez la fiche NAP avant de demander une correction.");
  const id = swimmerId(input.swimmerId), fields = proposedFields(input.proposed);
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason || reason.length > 500) throw new TypeError("Le motif de la demande est obligatoire, 500 caracteres maximum.");
  const [rows] = await connection.execute({ sql: "SELECT id,nom,prenom,date,sexe,club FROM nageurs WHERE id=? LIMIT 1", timeout: 10000 }, [id]);
  if (rows.length !== 1 || String(rows[0].club) !== String(context.clubId)) throw new TypeError("Nageur absent du club actif.");
  const before = Object.fromEntries(["id", "nom", "prenom", "date", "sexe", "club"].map(key => [key, rows[0][key]]));
  const plan = planIdentityChange(before, fields, input.expectedFingerprint);
  return { napSource: true, nativeBefore: before, expectedFingerprint: fingerprint(before),
    requestedSource: "reference", requestedSwimmerId: String(id), targetSource: "reference", targetSwimmerId: String(id),
    current: person(before), proposed: person({ ...before, ...plan.after }), reason };
}
function prepareResolution(data, input, actorUid) {
  if (!actorUid || data?.napSource !== true || !data.nativeBefore || !/^[a-f0-9]{64}$/.test(data.expectedFingerprint || "")) throw new TypeError("Cette ancienne demande doit etre refaite depuis la fiche NAP.");
  const id = swimmerId(data.targetSwimmerId);
  if (String(data.requestedSwimmerId) !== String(id) || swimmerId(data.nativeBefore.id) !== id || String(data.nativeBefore.club) !== String(data.clubId) || fingerprint(data.nativeBefore) !== data.expectedFingerprint) throw new TypeError("Demande NAP incompatible.");
  if (!["approved", "rejected"].includes(input.decision)) throw new TypeError("Decision invalide.");
  const note = typeof input.resolutionNote === "string" ? input.resolutionNote.trim() : "";
  if (note.length > 500) throw new TypeError("Commentaire limite a 500 caracteres.");
  let proposed = null, resolvedProposed = null, proposalAdjusted = false;
  if (input.decision === "approved") {
    const savedFields = Object.fromEntries(FIELDS.map(key => [key, data.proposed?.[key]]));
    const original = planIdentityChange(data.nativeBefore, savedFields, data.expectedFingerprint);
    const plan = planIdentityChange(data.nativeBefore, proposedFields(input.proposed ?? savedFields), data.expectedFingerprint);
    resolvedProposed = person({ ...data.nativeBefore, ...plan.after });
    proposed = Object.fromEntries(FIELDS.map(key => [key, resolvedProposed[key]]));
    proposalAdjusted = ["nom", "prenom", "date", "sexe"].some(key => plan.after[key] !== original.after[key]);
  }
  const key = createHash("sha256").update(JSON.stringify([id, data.expectedFingerprint, actorUid, input.decision, note, proposed])).digest("hex");
  return { key, actorUid, decision: input.decision, note, proposed, resolvedProposed, proposalAdjusted,
    id, expectedFingerprint: data.expectedFingerprint, reason: note || data.reason };
}
module.exports = { prepareRequest, prepareResolution };

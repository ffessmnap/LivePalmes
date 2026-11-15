"use strict";
const { createHmac } = require("node:crypto");

// Public response projection only. Readers, private payloads and sporting
// calculations keep their full inputs. No query, storage or new secret.
const BIRTH_FIELDS = new Set(["birthDate", "birth_date", "dateNaissance", "date_naissance"]);
const IDENTITY_FIELDS = new Set(["identityKey", "swimmerIdentityKey"]);
const DATE_IN_IDENTITY = /\b\d{4}-\d{2}-\d{2}\b/;
function birthYear(value) {
  return String(value ?? "").match(/^(\d{4})(?:$|[-/])/)?.[1] || "";
}
function normalizeName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim();
}
function publicSportingPayload(payload, secret) {
  if (typeof secret !== "string" || !secret) throw new Error("Projection publique indisponible.");
  // Domain separation from the existing server credential. A keyed token avoids
  // a public hash of a birthday, which could be guessed in a few hundred tries.
  const token = (domain, value) => "public-v1:" + createHmac("sha256", secret)
    .update("LivePalmes public privacy v1\0" + domain + "\0" + String(value)).digest("hex");
  const recordKey = (name, date) => token("record-match", normalizeName(name) + "\0" + date);
  function visit(value, field = "", records = false) {
    if (Array.isArray(value)) return value.map(item => visit(item, field, records));
    if (!value || typeof value !== "object") {
      return ["aliases", "sourceIds"].includes(field) && typeof value === "string" && DATE_IN_IDENTITY.test(value)
        ? token("identity", value) : value;
    }
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (BIRTH_FIELDS.has(key)) output[key] = birthYear(item);
      else if (IDENTITY_FIELDS.has(key)) output[key] = item ? token("identity", item) : "";
      else if (["key", "swimmerId", "originalSwimmerId"].includes(key) && typeof item === "string" && DATE_IN_IDENTITY.test(item)) output[key] = token("identity", item);
      else if (key === "searchText") continue; // Rebuilt by public clients from reduced fields.
      else output[key] = visit(item, key, key === "records" || key === "franceRecords");
    }
    if (value.birthDate) output.birthYear = birthYear(value.birthDate);
    // Preserve the existing profile/record comparison: exact birthday, or the
    // historical record placeholder of January 1 in the same year. Tokens only.
    if (records && value.birthDate && value.swimmer) output.recordMatchKey = recordKey(value.swimmer, value.birthDate);
    if (field === "swimmer" && value.birthDate && value.name) {
      output.recordMatchKeys = [recordKey(value.name, value.birthDate), recordKey(value.name, birthYear(value.birthDate) + "-01-01")];
    }
    return output;
  }
  return visit(payload);
}
module.exports = { birthYear, publicSportingPayload };

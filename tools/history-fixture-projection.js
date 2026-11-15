"use strict";
// Verify fixture-only literal substitutions. Never execute either source.
const crypto = require("node:crypto");
const acorn = require("../tests/firestore-rules/node_modules/acorn");
const DATA = new Set(["string", "regexp", "template", "num"]);
function requireProof(value, message) { if (!value) throw new Error(message); }
function read(source) {
  const comments = [];
  const tokens = [...acorn.tokenizer(source, {
    ecmaVersion: "latest", sourceType: "module", allowHashBang: true,
    onComment: (block, text, start, end) => comments.push({ block, text, start, end })
  })];
  return { tokens, comments };
}
function value(token) {
  return token.type.label === "regexp" ? [token.value.pattern, token.value.flags] : token.value ?? null;
}
function mask(source, parsed, indices) {
  const spans = indices.map(index => ({ ...parsed.tokens[index], text: `/*fixture-literal-${index}*/` }));
  for (const c of parsed.comments) spans.push({ ...c, text: "/*fixture-comment*/" + (c.text.match(/\r\n|\r|\n/g) || []).join("") });
  let masked = source;
  for (const span of spans.sort((a, b) => b.start - a.start)) masked = masked.slice(0, span.start) + span.text + masked.slice(span.end);
  return masked;
}
function verify(before, after, indices) {
  requireProof(typeof before === "string" && typeof after === "string" && before.length <= 8 * 1024 ** 2 && after.length <= 8 * 1024 ** 2,
    "Fixture source outside bounds");
  const old = read(before), current = read(after);
  requireProof(Array.isArray(indices) && indices.every(i => Number.isSafeInteger(i) && i >= 0 && i < old.tokens.length)
    && JSON.stringify(indices) === JSON.stringify([...new Set(indices)].sort((a, b) => a - b)), "Invalid literal indices");
  requireProof(old.tokens.length === current.tokens.length && old.comments.length === current.comments.length, "Fixture structure changed");
  const allowed = new Set(indices), changed = [];
  old.tokens.forEach((token, index) => {
    const next = current.tokens[index], type = token.type.label;
    requireProof(type === next.type.label, "Fixture token type changed");
    if (JSON.stringify(value(token)) === JSON.stringify(value(next))) return;
    requireProof(allowed.has(index) && DATA.has(type), "Non-literal fixture code changed");
    if (type === "regexp") requireProof(token.value.flags === next.value.flags, "Fixture regular expression flags changed");
    if (type === "num") requireProof(Number.isSafeInteger(token.value) && token.value > 2200
      && Number.isSafeInteger(next.value) && next.value >= 900001 && next.value <= 999999, "Non-identifier fixture number changed");
    changed.push(index);
  });
  requireProof(JSON.stringify(changed) === JSON.stringify(indices), "Undeclared or unused fixture substitutions");
  old.comments.forEach((c, index) => {
    const next = current.comments[index];
    requireProof(c.block === next.block && JSON.stringify(c.text.match(/\r\n|\r|\n/g)) === JSON.stringify(next.text.match(/\r\n|\r|\n/g)),
      "Fixture comment boundaries changed");
  });
  const oldMask = mask(before, old, indices), newMask = mask(after, current, indices);
  requireProof(oldMask === newMask, "Code or whitespace outside fixture literals changed");
  return { schema: 1, literalCount: indices.length, shapeSha256: crypto.createHash("sha256").update(oldMask).digest("hex") };
}
module.exports = { verify };
if (require.main === module) {
  try {
    const input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
    console.log(JSON.stringify(verify(Buffer.from(input.before, "base64").toString("utf8"),
      Buffer.from(input.after, "base64").toString("utf8"), input.literalTokenIndices)));
  } catch { console.error("Fixture projection refused; no source values logged."); process.exitCode = 1; }
}

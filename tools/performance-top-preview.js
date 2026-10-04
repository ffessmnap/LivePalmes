// Input must be sorted by time/date; previews are used only without pool/season/region filters.
function distinctTopPreview(rows, limit, swimmerKey) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = swimmerKey(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

module.exports = { distinctTopPreview };

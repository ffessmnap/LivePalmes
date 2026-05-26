(function attachLivePalmesResultParser(global) {
  function dependencies(options = {}) {
    return {
      fixPdfEncoding: options.fixPdfEncoding || ((value) => String(value || "")),
      formatDisplayName: options.formatDisplayName || ((row) => [row.lastName, row.firstName].filter(Boolean).join(" ")),
      importedBirthYear: options.importedBirthYear || ((value) => String(value || "")),
      importedSeriesTime: options.importedSeriesTime || ((value) => String(value || "").trim()),
      splitImportedPersonName: options.splitImportedPersonName || ((value) => ({
        firstName: "",
        lastName: String(value || "").trim()
      }))
    };
  }

  function normalizeResultLineText(line, options = {}) {
    const deps = dependencies(options);
    return deps.fixPdfEncoding(String(line || ""))
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\s*(IN|NS)\s+(\d+)\s+/i, "$2 ");
  }

  function resultTimeFromMatch(match, options = {}) {
    const deps = dependencies(options);
    const time = match.groups?.time || "";
    const splitTimes = String(match.groups?.splitTimes || "").trim().split(/\s+/).filter(Boolean);
    if (!match.groups?.finalMarker && /^\d+$/.test(time) && splitTimes.length) {
      return deps.importedSeriesTime(splitTimes.at(-1)) || splitTimes.at(-1) || "";
    }
    return deps.importedSeriesTime(time) || time || "";
  }

  function parsedIdentity(rawName, birthYear, options = {}) {
    const deps = dependencies(options);
    const split = deps.splitImportedPersonName(deps.fixPdfEncoding(rawName));
    return {
      lastName: split.lastName,
      firstName: split.firstName,
      displayName: deps.formatDisplayName({ lastName: split.lastName, firstName: split.firstName }),
      birthYear: deps.importedBirthYear(birthYear)
    };
  }

  function parseResultRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const match = text.match(/^\s*(\d+)\s+(.+?)\s+(\d{2})\s+(?:(?<category>[A-Z][A-Z0-9+]{1,5})\s+\*\s+)?(?<club>[A-Z0-9]+)\s+(?:(?<splitTimes>(?:[0-9:.]+\s+)*))(?<finalMarker>\(.*?finale.*?\)\s+)?(?<time>[0-9:.]+)(?:\s+(?:\d+|[A-Z0-9]+))*\s*$/i);
    if (!match) return null;
    const identity = parsedIdentity(match[2], match[3], options);
    return {
      rank: Number(match[1]),
      ...identity,
      categoryCode: match.groups?.category || "",
      club: match.groups?.club || match[4],
      time: resultTimeFromMatch(match, options),
      qualified: Boolean(match.groups?.finalMarker)
    };
  }

  function parseUnrankedResultRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const match = text.match(/^\s*(.+?)\s+(\d{2})\s+(?:(?<category>[A-Z][A-Z0-9+]{1,5})\s+\*\s+)?(?<club>[A-Z0-9]+)\s+(?:(?<splitTimes>(?:[0-9:.]+\s+)*))(?<time>[0-9:.]+)(?:\s+(?:\d+|[A-Z0-9]+))*\s*$/i);
    if (!match || !match.groups?.splitTimes?.trim()) return null;
    const identity = parsedIdentity(match[1], match[2], options);
    return {
      rank: "",
      ...identity,
      categoryCode: match.groups?.category || "",
      club: match.groups?.club || match[4],
      time: resultTimeFromMatch(match, options),
      qualified: false
    };
  }

  function resultStatusFromText(value) {
    const text = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (/\b(dns|ns|absent|abs)\b/.test(text)) return "dns";
    if (/\b(abandon|abd|ab|dnf)\b/.test(text)) return "ab";
    if (/\b(disqualification|disqualifie|disqualifiee|dsq|dq)\b/.test(text)) return "dsq";
    if (/\b(forfait)\b/.test(text)) return "dns";
    return "";
  }

  function parseResultStatusRow(line, options = {}) {
    const text = normalizeResultLineText(line, options);
    const status = resultStatusFromText(text);
    if (!status) return null;
    const match = text.match(/^\s*(?:(\d+)\s+)?(.+?)\s+(\d{2})\s+(?:(?<category>[A-Z][A-Z0-9+]{1,5})\s+\*\s+)?(?<club>[A-Z0-9]+)\s+(.+?)\s*$/i);
    if (!match) return null;
    const identity = parsedIdentity(match[2], match[3], options);
    return {
      rank: match[1] ? Number(match[1]) : "",
      ...identity,
      categoryCode: match.groups?.category || "",
      club: match.groups?.club || match[4],
      time: "",
      resultStatus: status,
      statusLabel: {
        dns: "Forfait",
        ab: "ABD",
        dsq: "DSQ"
      }[status],
      qualified: false
    };
  }

  function resultImportRowKey(row) {
    return [
      row.rank || "",
      row.lastName || "",
      row.firstName || "",
      row.birthYear || "",
      row.club || "",
      row.time || "",
      row.resultStatus || ""
    ].map((value) => String(value).trim().toLowerCase()).join("|");
  }

  function parseFinalistsFromResultLines(lines, options = {}) {
    const seen = new Set();
    const ranking = lines
      .map((line, sourceIndex) => {
        const row = parseResultRow(line, options) || parseUnrankedResultRow(line, options) || parseResultStatusRow(line, options);
        return row ? { ...row, sourceIndex } : null;
      })
      .filter(Boolean)
      .filter((row) => {
        const key = resultImportRowKey(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        if (Number.isFinite(a.sourceIndex) && Number.isFinite(b.sourceIndex) && (a.resultStatus || b.resultStatus || !a.rank || !b.rank)) {
          return Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
        }
        const statusA = a.resultStatus ? 1 : 0;
        const statusB = b.resultStatus ? 1 : 0;
        return statusA - statusB ||
          Number(a.rank || 9999) - Number(b.rank || 9999) ||
          Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
      });
    const qualified = ranking.filter((row) => row.qualified);
    return {
      ranking,
      finalists: {
        a: qualified.slice(0, 8),
        b: qualified.slice(8, 16)
      },
      nextUnqualified: ranking.filter((row) => !row.qualified)
    };
  }

  global.LivePalmesResultParser = {
    normalizeResultLineText,
    parseFinalistsFromResultLines,
    parseResultRow,
    parseResultStatusRow,
    parseUnrankedResultRow,
    resultImportRowKey,
    resultStatusFromText
  };
})(window);

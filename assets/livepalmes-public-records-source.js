(function attachLivePalmesPublicRecordsSource(global) {
  const CATEGORY_LABELS = {
    P: "Poussin",
    B: "Benjamin",
    M: "Minime",
    C: "Cadet",
    J: "Junior",
    S: "Senior"
  };

  function clean(value) {
    return String(value || "").trim();
  }

  function sourceRows(source = global.LIVEPALMES_RECORDS) {
    if (!source) return [];
    return [
      ...(Array.isArray(source.franceRecords) ? source.franceRecords : []),
      ...(Array.isArray(source.records) ? source.records : [])
    ];
  }

  function categoryLabel(row) {
    const category = clean(row.category);
    const master = category.match(/^M(\d+\+)$/i);
    if (master && clean(row.sex)) {
      return `${clean(row.sex) === "F" ? "F" : "H"}${master[1]}`;
    }
    return CATEGORY_LABELS[category] || clean(row.categoryLabel) || category;
  }

  function recordType(row) {
    if (row.recordType === "RF" || row.recordType === "RFJ") return row.recordType;
    if (/^manual-rf\|RFJ\|/i.test(clean(row.key))) return "RFJ";
    if (/^manual-rf\|RF\|/i.test(clean(row.key))) return "RF";
    return "";
  }

  function recordLabel(row) {
    const type = recordType(row);
    const category = categoryLabel(row);
    if (type === "RF") return "Record de France senior";
    if (type === "RFJ") return "Record de France junior";
    if (clean(row.sourceCategory).toLowerCase().includes("mpf")) return `MPF ${category}`.trim();
    return clean(row.recordTypeLabel || row.competition || row.sourceCategory || row.label || "Record");
  }

  function publicRecordToConsoleRecord(row) {
    if (!row || row.placeholderRecord) return null;
    const eventId = clean(row.course || row.eventId).toLowerCase();
    const sex = clean(row.sex);
    const category = categoryLabel(row);
    const time = clean(row.time || row.rawTime || row.chrono);
    if (!eventId || !sex || !category || !time) return null;
    const record = {
      eventId,
      sex,
      category,
      label: recordLabel(row),
      holder: clean(row.swimmer || row.holder),
      club: clean(row.club),
      time,
      date: clean(row.date),
      place: clean(row.location || row.place),
      source: "LivePalmes performances",
      sourceKey: clean(row.key)
    };
    if (Array.isArray(row.intermediateTimes) && row.intermediateTimes.length) {
      record.intermediateTimes = row.intermediateTimes;
    }
    return record;
  }

  function toConsoleRecords(source = global.LIVEPALMES_RECORDS) {
    const seen = new Set();
    return sourceRows(source)
      .map(publicRecordToConsoleRecord)
      .filter(Boolean)
      .filter((row) => {
        const key = [row.eventId, row.sex, row.category, row.label, row.time, row.holder].join("|").toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function mergeIntoLiveData(data = {}, source = global.LIVEPALMES_RECORDS) {
    const records = toConsoleRecords(source);
    if (!records.length) return data || {};
    return {
      ...(data || {}),
      records,
      notes: {
        ...((data || {}).notes || {}),
        recordsSource: "LivePalmes performances",
        recordsSourceDate: clean(source?.sourceDate || source?.updatedAt || ""),
        recordsUpdatedAt: clean(source?.updatedAt || "")
      }
    };
  }

  global.LivePalmesPublicRecordsSource = {
    mergeIntoLiveData,
    toConsoleRecords
  };
})(window);

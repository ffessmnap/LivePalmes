"use strict";
// Existing singleton, values or query bodies; no business change.
function isIntermediateRow(row) {
  return String(row?.passage || "0") !== "0";
}

function intermediateGroupKey(perf) {
  return [
    perf.swimmerId,
    perf.competitionId,
    perf.clubId,
    perf.style,
    perf.sex
  ].join("|");
}

function annotateIntermediateOrigins(perfs) {
  const grouped = new Map();
  perfs.forEach((perf) => {
    if (!grouped.has(intermediateGroupKey(perf))) grouped.set(intermediateGroupKey(perf), []);
    grouped.get(intermediateGroupKey(perf)).push(perf);
  });

  grouped.forEach((rows) => {
    rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    const pending = [];
    rows.forEach((perf) => {
      if (perf.isIntermediate) {
        pending.push(perf);
        return;
      }

      const originLength = Number(perf.length || 0);
      const matched = pending.filter((candidate) =>
        candidate.style === perf.style &&
        Number(candidate.length || 0) < originLength &&
        candidate.timeValue < perf.timeValue
      );
      matched.forEach((candidate) => {
        candidate.originCourse = perf.course;
        candidate.originCourseShortLabel = perf.courseShortLabel;
        candidate.originPerformanceId = perf.id;
      });
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        if (matched.includes(pending[index])) pending.splice(index, 1);
      }
    });
  });
}

module.exports = { isIntermediateRow, intermediateGroupKey, annotateIntermediateOrigins };

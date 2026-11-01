// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_bestDtnQualificationRows(backendContext) {
  function dtnQualificationRow(row = {}) {
    return backendContext.cleanFirestoreValue({
      swimmerId: backendContext.cleanText(row.swimmerId),
      swimmerIdentityKey: backendContext.cleanText(row.swimmerIdentityKey),
      swimmer: backendContext.cleanText(row.swimmer),
      firstName: backendContext.cleanText(row.firstName),
      lastName: backendContext.cleanText(row.lastName),
      birthDate: backendContext.cleanText(row.birthDate),
      sex: backendContext.cleanText(row.sex),
      club: backendContext.cleanText(row.club || row.clubName),
      competition: backendContext.cleanText(row.competition),
      location: backendContext.cleanText(row.location),
      date: backendContext.cleanText(row.date),
      seasonYear: Number(row.seasonYear || 0) || 0,
      course: backendContext.cleanText(row.course),
      time: backendContext.cleanText(row.time),
      timeValue: Number(row.timeValue || 0) || 0
    });
  }

  function bestDtnQualificationRows(rows = [], standard = {}, threshold = 0) {
    const bestBySwimmer = new Map();
    rows.forEach((row) => {
      if (!Number(row.timeValue) || Number(row.timeValue) > threshold) return;
      if (standard.birthMin && backendContext.birthYear(row.birthDate) < standard.birthMin) return;
      const key = backendContext.publicSwimmerKey(row);
      if (!key) return;
      const current = bestBySwimmer.get(key);
      if (backendContext.publicBetterPerformance(row, current)) bestBySwimmer.set(key, row);
    });
    return Array.from(bestBySwimmer.values())
      .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || backendContext.cleanText(a.swimmer).localeCompare(backendContext.cleanText(b.swimmer), "fr-FR"))
      .map(dtnQualificationRow);
  }

  function nearDtnQualificationRows(rows = [], standard = {}, threshold = 0) {
    if (!threshold || !["TSP", "TRP"].includes(standard.id)) return [];
    // Select the best admissible swim BEFORE excluding achieved minima.
    return bestDtnQualificationRows(rows, standard, threshold * (1 + backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT / 100))
      .filter((row) => row.timeValue > threshold &&
        (row.timeValue - threshold) * 100 < threshold * backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT);
  }

  function dtnQualificationRowsForStandard(rows = [], standardId = "", competitionIds = []) {
    const id = backendContext.cleanText(standardId).toUpperCase();
    if (id === "TU16C1" || id === "TU16C2") return rows;
    const allowedCompetitionIds = id === "TJP" || id === "TEP"
      ? competitionIds.filter((competitionId) => competitionId !== backendContext.DTN_EDF_LIMOGES_COMPETITION_ID)
      : competitionIds;
    const allowed = new Set(allowedCompetitionIds);
    return rows.filter((row) => allowed.has(backendContext.cleanText(row.competitionId)));
  }

  async function buildDtnQualificationPayload({ seasonYear, sex, standards, competitionIds }) {
    const indexedCourses = await Promise.all(backendContext.POOL_COURSES.map(async (course) => {
      const categoryRows = await Promise.all(backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES.map((category) =>
        backendContext.readPublicPerformanceJson(`tops/${course}/${backendContext.publicPerformanceTopFileName(sex, category)}`, [])
      ));
      const rows = backendContext.uniquePublicPerformanceRows(categoryRows.flat()
        .map(backendContext.publicPerformanceBaseRow)
        .filter((row) =>
          Number(row.seasonYear || 0) === seasonYear &&
          row.course === course &&
          row.sex === sex &&
          row.active !== false &&
          row.status !== "hidden" &&
          row.status !== "deleted"
        ));
      if (rows.length > backendContext.DTN_QUALIFICATION_MAX_ROWS_PER_COURSE) {
        throw new Error(`Qualification DTN bornee pour ${course} (${rows.length} lignes).`);
      }
      return {
        course,
        rows
      };
    }));
    const scannedRows = indexedCourses.reduce((total, item) => total + item.rows.length, 0);
    return {
      ok: true,
      seasonYear,
      sex,
      standards: standards.map((standard) => ({
        id: standard.id,
        courses: indexedCourses.map(({ course, rows }) => {
          const threshold = Number(standard.thresholds[course] || 0);
          const eligibleRows = dtnQualificationRowsForStandard(rows, standard.id, competitionIds);
          const qualifiers = threshold ? bestDtnQualificationRows(eligibleRows, standard, threshold) : [];
          const nearMinimum = nearDtnQualificationRows(eligibleRows, standard, threshold);
          return { course, threshold, qualifiers, count: qualifiers.length,
            ...(["TSP", "TRP"].includes(standard.id) ? { nearMinimum, nearMinimumMaxPercent: backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT } : {}) };
        })
      })),
      competitionIds,
      readStats: { scannedRows, firestoreDocuments: 0, source: "public-storage-top-files", bounded: true }
    };
  }

  function isDtnElectronicFiftyMeterPerformance(row = {}) {
    const pool = backendContext.cleanText(row.pool).toUpperCase().replace(/\s+/g, "");
    const chrono = backendContext.cleanText(row.chrono)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase();
    return (pool === "50" || pool === "50M") && (chrono === "E" || chrono === "ELECTRONIC" || chrono === "ELECTRONIQUE");
  }

  function dtnListingAthletes(rows = [], rule = {}, seasonYear = 0) {
    const athletes = new Map();
    rows.forEach((row) => {
      if (!isDtnElectronicFiftyMeterPerformance(row)) return;
      const born = backendContext.birthYear(row.birthDate);
      const age = born ? seasonYear - born : -1;
      if (age < rule.minAge || age > rule.maxAge) return;
      const threshold = Number(rule.thresholds?.[row.sex]?.[row.course] || 0);
      if (!threshold || !Number(row.timeValue) || Number(row.timeValue) > threshold) return;
      const key = backendContext.publicSwimmerKey(row);
      if (!key) return;
      if (!athletes.has(key)) {
        athletes.set(key, {
          ...dtnQualificationRow(row),
          qualificationsByCourse: new Map()
        });
      }
      const athlete = athletes.get(key);
      const current = athlete.qualificationsByCourse.get(row.course)?.row;
      if (!current || backendContext.publicBetterPerformance(row, current)) {
        athlete.qualificationsByCourse.set(row.course, { row, threshold });
      }
    });
    return Array.from(athletes.values()).map((athlete) => {
      const qualifications = Array.from(athlete.qualificationsByCourse.entries())
        .sort((a, b) => backendContext.POOL_COURSES.indexOf(a[0]) - backendContext.POOL_COURSES.indexOf(b[0]))
        .map(([course, qualification]) => ({
          course,
          time: backendContext.cleanText(qualification.row.time),
          timeValue: Number(qualification.row.timeValue || 0),
          threshold: qualification.threshold,
          competition: backendContext.cleanText(qualification.row.competition),
          location: backendContext.cleanText(qualification.row.location),
          date: backendContext.cleanText(qualification.row.date)
        }));
      const { qualificationsByCourse, ...row } = athlete;
      return backendContext.cleanFirestoreValue({ ...row, qualifications });
    }).sort((a, b) => backendContext.cleanText(a.lastName).localeCompare(backendContext.cleanText(b.lastName), "fr-FR") || backendContext.cleanText(a.firstName).localeCompare(backendContext.cleanText(b.firstName), "fr-FR"));
  }

  async function buildDtnListingPayload({ seasonYear, rules }) {
    const sourceRows = await backendContext.readPublicPerformanceJson(`dtn-listing/${seasonYear}.json`, []);
    const rows = backendContext.uniquePublicPerformanceRows(sourceRows
      .map(backendContext.publicPerformanceBaseRow)
      .filter((row) =>
        Number(row.seasonYear || 0) === seasonYear &&
        backendContext.POOL_COURSES.includes(row.course) &&
        (row.sex === "F" || row.sex === "M") &&
        isDtnElectronicFiftyMeterPerformance(row) &&
        row.active !== false &&
        row.status !== "hidden" &&
        row.status !== "deleted"
      ));
    if (rows.length > backendContext.DTN_QUALIFICATION_MAX_ROWS_PER_COURSE * backendContext.POOL_COURSES.length) {
      throw new Error(`Mise en liste DTN bornee pour ${seasonYear} (${rows.length} lignes).`);
    }
    const athletesByRule = new Map(rules.map((rule) => [rule.id, dtnListingAthletes(rows, rule, seasonYear)]));
    const releveAthleteKeys = new Set((athletesByRule.get("RELEVE") || []).map(backendContext.publicSwimmerKey).filter(Boolean));
    return {
      ok: true,
      seasonYear,
      standards: rules.map((rule) => {
        const athletes = rule.id === "RELEVE"
          ? athletesByRule.get(rule.id) || []
          : (athletesByRule.get(rule.id) || []).filter((athlete) => !releveAthleteKeys.has(backendContext.publicSwimmerKey(athlete)));
        return {
          id: rule.id,
          sourceId: rule.sourceId,
          minAge: rule.minAge,
          maxAge: rule.maxAge,
          athletes,
          count: athletes.length
        };
      }),
      eligibility: { pool: "50", timing: "electronic" },
      readStats: { scannedRows: rows.length, firestoreDocuments: 0, storageFiles: 1, source: "public-storage-dtn-season-file", bounded: true }
    };
  }

  return { dtnQualificationRow, bestDtnQualificationRows, nearDtnQualificationRows, dtnQualificationRowsForStandard, buildDtnQualificationPayload, isDtnElectronicFiftyMeterPerformance, dtnListingAthletes, buildDtnListingPayload };
}

module.exports = { createDtnService_bestDtnQualificationRows };

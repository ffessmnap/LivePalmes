"use strict";

const { parseCompactTime } = require("./nap-performance-time");

const COURSES = Object.freeze(["50SF", "50BI", "100IS", "400SF", "800SF"]);

// The caller supplies published, eligible individual results in the edition's
// date window. It handles sporting eligibility and any official exceptions.
function bestTrophyCourses(performances) {
  const swimmers = new Map();
  for (const performance of performances) {
    const { swimmerId, course, time, points } = performance;
    if (!COURSES.includes(course)) continue;

    const centiseconds = parseCompactTime(time);
    if (centiseconds === null) continue;

    let courses = swimmers.get(swimmerId);
    if (!courses) {
      courses = new Map();
      swimmers.set(swimmerId, courses);
    }
    const current = courses.get(course);
    if (!current || centiseconds < current.centiseconds) {
      courses.set(course, { course, time, points, centiseconds });
    }
  }
  return swimmers;
}

// Rank a single category after the caller determines the eligible cohort.
function rankTrophyCategory(swimmers) {
  const ordered = [...swimmers].sort((a, b) =>
    Number(Boolean(b.complete)) - Number(Boolean(a.complete)) || b.totalPoints - a.totalPoints || a.swimmerId - b.swimmerId
  );
  const result = [];
  let rank = 0;
  for (const [index, swimmer] of ordered.entries()) {
    if (index === 0 || swimmer.complete !== ordered[index - 1].complete
      || swimmer.totalPoints !== ordered[index - 1].totalPoints) {
      rank = index + 1;
    }
    result.push({ ...swimmer, rank });
  }
  return result;
}

module.exports = { COURSES, bestTrophyCourses, rankTrophyCategory };

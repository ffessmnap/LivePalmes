"use strict";
// Existing singleton, values or query bodies; no business change.
const CURRENT_POOL_COURSES = [
  "50SF",
  "100SF",
  "200SF",
  "400SF",
  "800SF",
  "1500SF",
  "50AP",
  "100IS",
  "200IS",
  "400IS",
  "50BI",
  "100BI",
  "200BI",
  "400BI"
];

const SUPPORTED_POOLS = ["25", "33", "50"];

const SUPPORTED_CHRONOS = ["M", "E"];

const COURSE_META = {
  "50SF": ["50 m Surface", "50 SF", "SF", 50],
  "100SF": ["100 m Surface", "100 SF", "SF", 100],
  "200SF": ["200 m Surface", "200 SF", "SF", 200],
  "400SF": ["400 m Surface", "400 SF", "SF", 400],
  "800SF": ["800 m Surface", "800 SF", "SF", 800],
  "1500SF": ["1500 m Surface", "1500 SF", "SF", 1500],
  "50AP": ["50 m Apnee", "50 AP", "AP", 50],
  "100IS": ["100 m Immersion", "100 IS", "IS", 100],
  "200IS": ["200 m Immersion", "200 IS", "IS", 200],
  "400IS": ["400 m Immersion", "400 IS", "IS", 400],
  "50BI": ["50 m Bi-palmes", "50 BI", "BI", 50],
  "100BI": ["100 m Bi-palmes", "100 BI", "BI", 100],
  "200BI": ["200 m Bi-palmes", "200 BI", "BI", 200],
  "400BI": ["400 m Bi-palmes", "400 BI", "BI", 400]
};

const MIN_TIME_BY_COURSE = {
  "50SF": 1200,
  "100SF": 3000,
  "200SF": 7000,
  "400SF": 15000,
  "800SF": 33000,
  "1500SF": 63000,
  "50AP": 1200,
  "100IS": 2500,
  "200IS": 7000,
  "400IS": 15000,
  "50BI": 1500,
  "100BI": 3500,
  "200BI": 8000,
  "400BI": 17000
};

function coursePayload(course) {
  const meta = COURSE_META[course] || [course, course, "", 0];
  return {
    code: course,
    label: meta[0],
    shortLabel: meta[1],
    style: meta[2],
    length: meta[3]
  };
}

module.exports = { CURRENT_POOL_COURSES, SUPPORTED_POOLS, SUPPORTED_CHRONOS, COURSE_META, MIN_TIME_BY_COURSE, coursePayload };

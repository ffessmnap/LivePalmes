// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_coursePayload(backendContext) {
  function coursePayload(course) {
    const meta = backendContext.COURSE_META[course] || [course, course, backendContext.courseStyleFromCode(course), backendContext.courseLengthFromCode(course)];
    return {
      code: course,
      label: meta[0],
      shortLabel: meta[1],
      style: meta[2],
      length: meta[3]
    };
  }

  return { coursePayload };
}

module.exports = { createImportService_coursePayload };

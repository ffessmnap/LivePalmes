// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementOpenWaterCourses(backendContext) {
  function cleanEngagementOpenWaterCourses(rawCourses = []) {
    const byId = new Map();
    backendContext.ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES.forEach((course) => byId.set(course.id, { ...course }));
    (Array.isArray(rawCourses) ? rawCourses : []).slice(0, backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT).forEach((rawCourse) => {
      const course = (0, backendContext.local$cleanEngagementOpenWaterCourse)(rawCourse, { strict: false });
      if (course) byId.set(course.id, course);
    });
    return Array.from(byId.values()).sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label, "fr"));
  }

  function engagementOpenWaterCourseConfigRef(database = backendContext.db) {
    return database.collection(backendContext.ENGAGEMENT_CONFIGURATION_COLLECTION).doc(backendContext.ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID);
  }

  return { cleanEngagementOpenWaterCourses, engagementOpenWaterCourseConfigRef };
}

module.exports = { createCompetitionModelService_cleanEngagementOpenWaterCourses };

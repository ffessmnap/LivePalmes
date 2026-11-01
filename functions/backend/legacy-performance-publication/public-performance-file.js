// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyPerformancePublication_publicPerformanceFile(backendContext) {
  function publicPerformanceFilePath(relativePath = "") {
    return `${backendContext.PUBLIC_PERFORMANCE_FILES_PATH}/${String(relativePath || "").replace(/^\/+/, "")}`;
  }

  function publicPerformanceFile(relativePath = "") {
    return (0, backendContext.publicPerformanceFilesBucket)().file(publicPerformanceFilePath(relativePath));
  }

  async function readPublicPerformanceJson(relativePath, fallback) {
    const file = publicPerformanceFile(relativePath);
    try {
      const [buffer] = await file.download();
      return JSON.parse(buffer.toString("utf8"));
    } catch (error) {
      if (error?.code === 404 || error?.code === 403 || /No such object|not found/i.test(error?.message || "")) {
        return fallback;
      }
      throw error;
    }
  }

  return { publicPerformanceFilePath, publicPerformanceFile, readPublicPerformanceJson };
}

module.exports = { createLegacyPerformancePublication_publicPerformanceFile };

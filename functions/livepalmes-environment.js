const PROJECTS = {
  livepalmes: {
    name: "production",
    projectId: "livepalmes",
    hostingOrigin: "https://livepalmes.web.app",
    firebaseStorageBucket: "livepalmes.firebasestorage.app",
    publicBucket: "livepalmes-public-data-718081132564",
    legacyAdminUids: ["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]
  },
  "livepalmes-test": {
    name: "test",
    projectId: "livepalmes-test",
    hostingOrigin: "https://livepalmes-test.web.app",
    firebaseStorageBucket: "livepalmes-test.firebasestorage.app",
    publicBucket: "livepalmes-test-public-data-206080168534",
    legacyAdminUids: []
  }
};

function runtimeProjectId(env = process.env) {
  return String(env.GCLOUD_PROJECT || env.GCP_PROJECT || env.GOOGLE_CLOUD_PROJECT || "livepalmes").trim();
}

function livePalmesEnvironment(env = process.env) {
  const projectId = runtimeProjectId(env);
  const config = PROJECTS[projectId];
  if (!config) throw new Error(`Projet Firebase LivePalmes non autorise : ${projectId || "absent"}`);
  if (config.name === "test" && (
    config.projectId === "livepalmes" ||
    config.firebaseStorageBucket === "livepalmes.firebasestorage.app" ||
    config.publicBucket === "livepalmes-public-data-718081132564"
  )) {
    throw new Error("La configuration Functions TEST contient une reference de production.");
  }
  return { ...config, legacyAdminUids: [...config.legacyAdminUids] };
}

module.exports = { PROJECTS, livePalmesEnvironment, runtimeProjectId };

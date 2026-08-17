(function attachLivePalmesAppCheck(global) {
  function siteKey() {
    return String(global.LivePalmesAppConfig?.appCheck?.recaptchaEnterpriseSiteKey || "").trim();
  }

  function activate() {
    const key = siteKey();
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!key || !firebase?.appCheck || !firebase?.initializeApp || !config) return false;

    try {
      if (!firebase.apps?.length) firebase.initializeApp(config);
      const service = firebase.appCheck();
      if (service.livePalmesActivated) return true;
      service.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(key), true);
      service.livePalmesActivated = true;
      return true;
    } catch (error) {
      console.warn("App Check LivePalmes indisponible", error);
      return false;
    }
  }

  global.LivePalmesAppCheck = { activate };
  activate();
})(window);

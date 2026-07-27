(function attachLivePalmesPublicAnalytics(global, document) {
  const measurementId = "G-MF8X3CR1F4";
  const hostname = String(global.location?.hostname || "").toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";
  const debugEnabled = new URLSearchParams(global.location?.search || "").has("analytics-debug");

  if (!measurementId || (isLocal && !debugEnabled)) return;
  if (String(global.navigator?.doNotTrack || "") === "1") return;
  if (document.querySelector(`script[data-livepalmes-analytics="${measurementId}"]`)) return;
  const searchTimers = new Map();
  const lastSearchEvents = new Map();

  global.dataLayer = global.dataLayer || [];
  global.gtag = global.gtag || function gtag() {
    global.dataLayer.push(arguments);
  };

  global.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted"
  });
  global.gtag("js", new Date());
  global.gtag("config", measurementId, {
    page_title: document.title,
    page_path: `${global.location.pathname}${global.location.search}`,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.livepalmesAnalytics = measurementId;
  document.head.appendChild(script);

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function pageArea() {
    const path = String(global.location?.pathname || "");
    if (path.includes("/performances/records")) return "records";
    if (path.includes("/performances/mpf")) return "mpf";
    if (path.includes("/performances/tops")) return "top";
    if (path.includes("/performances/nageur")) return "nageur";
    if (path.includes("resultats")) return new URLSearchParams(global.location.search || "").has("archive") ? "archive_resultats" : "resultats";
    if (path.includes("series")) return "series";
    if (path.includes("archives")) return "archives";
    return "accueil_public";
  }

  function sendEvent(name, params = {}) {
    if (typeof global.gtag !== "function") return;
    global.gtag("event", name, {
      page_area: pageArea(),
      ...params
    });
  }

  function hrefInfo(link) {
    const rawHref = link?.getAttribute?.("href") || "";
    try {
      return {
        rawHref,
        url: new URL(rawHref, global.location.href)
      };
    } catch {
      return { rawHref, url: null };
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (link) {
      const { rawHref, url } = hrefInfo(link);
      const path = url?.pathname || rawHref;
      if (path.includes("pdf.html") || /\.pdf(?:$|[?#])/i.test(path)) {
        sendEvent("pdf_open", {
          pdf_type: cleanText(url?.searchParams?.get("type") || "pdf"),
          link_domain: cleanText(url?.hostname || ""),
          link_path: cleanText(path)
        });
      } else if (path.includes("resultats") && url?.searchParams?.has("archive")) {
        sendEvent("archive_open", {
          archive_entry: "resultats"
        });
      } else if (path.includes("resultats") || path.includes("series") || path.includes("/performances/") || path.includes("archives")) {
        sendEvent("public_navigation", {
          target_path: cleanText(path)
        });
      }
    }

    if (event.target.closest?.("[data-swimmer-id], [data-search-swimmer-key], [data-swimmer-key], [data-result-swimmer-key]")) {
      sendEvent("swimmer_profile_open", {
        source: pageArea()
      });
    }

    const courseButton = event.target.closest?.("[data-course]");
    if (courseButton && pageArea() === "top") {
      sendEvent("top_course_select", {
        course: cleanText(courseButton.dataset.course)
      });
    }

    const row = event.target.closest?.("tr");
    const area = pageArea();
    if (row && ["records", "mpf", "top", "nageur"].includes(area) && !event.target.closest?.("a, button, input, select, textarea")) {
      sendEvent("performance_row_open", {
        view: area
      });
    }
  }, { passive: true });

  document.addEventListener("input", (event) => {
    const input = event.target;
    if (!input?.matches?.("#swimmerSearchInput, #publicSwimmerSearchInput")) return;
    const queryLength = cleanText(input.value).length;
    const key = input.id || "swimmer-search";
    global.clearTimeout(searchTimers.get(key));
    searchTimers.set(key, global.setTimeout(() => {
      const bucket = queryLength < 2 ? "0-1" : queryLength < 4 ? "2-3" : queryLength < 8 ? "4-7" : "8+";
      const eventKey = `${pageArea()}|${key}|${bucket}`;
      const now = Date.now();
      if (now - Number(lastSearchEvents.get(eventKey) || 0) < 15000) return;
      lastSearchEvents.set(eventKey, now);
      sendEvent("swimmer_search", {
        query_length_bucket: bucket
      });
    }, 1200));
  }, { passive: true });
}(window, document));

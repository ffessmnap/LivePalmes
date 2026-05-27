(function () {
  function downloadJson(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "livepalmes.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openHtmlWindow(html, options = {}) {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      window.alert(options.blockedMessage || "La fenêtre a été bloquée par le navigateur.");
      return;
    }
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    if (options.print) {
      setTimeout(() => reportWindow.print(), 250);
    }
  }

  window.LivePalmesExportActions = {
    downloadJson,
    openHtmlWindow
  };
}());

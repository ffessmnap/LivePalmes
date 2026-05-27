(function () {
  function init(context = {}) {
    window.LivePalmesUiNavigationEvents?.init?.(context);
    window.LivePalmesUiResultsEvents?.init?.(context);
    window.LivePalmesUiAdminEvents?.init?.(context);
    window.LivePalmesUiAlertEvents?.init?.(context);
  }

  window.LivePalmesUiEvents = { init };
}());

(function attachLivePalmesAppState(global) {
  function bindOptionState(options, accessors = {}, keys = []) {
    keys.forEach((key) => {
      const accessor = accessors[key];
      if (!accessor) return;
      Object.defineProperty(options, key, {
        get: accessor.get,
        set: accessor.set
      });
    });
    return options;
  }

  global.LivePalmesAppState = {
    bindOptionState
  };
})(window);

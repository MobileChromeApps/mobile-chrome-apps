// Prefix file for Grunt build. Included before all modules, and sets them up.

(function() {
  if (window.chrome && chrome.mobile) {
    console.log('WARNING - chrome apis doubly included.');
    return;
  }

  var __modules = {};
  function define(name, fn) {
    if (__modules[name]) {
      console.log('WARNING - duplicate definition of module: ' + name);
      return;
    }
    __modules[name] = fn;
  }

  function unsupportedApi(name) {
    return function() {
      console.warn('API is not supported on mobile: ' + name);
    }
  }


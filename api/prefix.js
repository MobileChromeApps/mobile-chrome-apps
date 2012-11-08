// Prefix file for Grunt build. Included before all modules, and sets them up.

(function() {
  if (window.chrome && chrome.mobile) {
    console.log('WARNING - chrome apis doubly included.');
    return;
  }

  var require, define;
  var modules = {};
  (function() {
    define = function define(name, fn) {
      if (modules[name]) {
        console.log('WARNING - duplicate definition of module: ' + name);
        return;
      }
      modules[name] = fn;
    }

    var resolving = {};
    require = function require(target) {
      // Look up the module.
      var mod = modules[target];
      if (!mod) {
        console.error('No such module: ' + target);
        return;
      }
      if (resolving[target]) {
        console.error('Circular require(): ' + target + ' included twice.');
        return;
      }

      if (typeof mod == 'function') {
        // Prevent circular requires.
        resolving[target] = true;

        // This layer of indirection is present so that the module code can change exports to point to something new, like a function.
        var module = {};
        module.exports = {};
        mod(require, module);
        modules[target] = module;

        // No longer resolving this module.
        delete resolving[target];

        return module.exports;
        // Each module is a singleton run only once, and this allows static data.
      } else if (typeof mod == 'object') {
        return mod.exports;
      } else {
        console.error('unsupported module type: ' + typeof mod);
      }
    };
  })();

  function unsupportedApi(name) {
    return function() {
      console.warn('API is not supported on mobile: ' + name);
    }
  }


// Concluding code for the APIs, with the implementation of require and inclusion of main.

var require = (function() {
  var resolving = {};

  return function require(target) {
    // Look up the module.
    var mod = __modules[target];
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
      mod(require, module, window.chrome);
      __modules[target] = module;

      // No longer resolving this module.
      delete resolving[target];

      return module.exports;
      // Each module is a singleton run only once, and this allows static data.
      // Modules are passed an object they should treat as being the "chrome" object.
      // Currently this is literally window.chrome, but we can change that in future if necessary.
    } else if (typeof mod == 'object') {
      return mod.exports;
    } else {
      console.error('unsupported module type: ' + typeof mod);
    }
  };
})();

// Load the module 'chrome' to kick things off.
window.chrome = {};
require('chrome');

// Close the wrapping function and call it.
})();

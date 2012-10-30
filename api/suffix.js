// Concluding code for the APIs, with the implementation of require and inclusion of main.

function require(target) {
  // Look up the module.
  var mod = __modules[target];
  if (!mod) {
    console.error('No such module: ' + target);
    return;
  }

  if (typeof mod == 'function') {
    // This layer of indirection is present so that the module code can change exports to point to something new, like a function.
    var module = {};
    module.exports = {};
    mod(require, module, window.chrome);
    __modules[target] = module;
    return module.exports;
    // Now each module is a singleton run only once, and this allows static data.
    // Modules are passed an object they should treat as being the "chrome" object.
    // Currently this is literally window.chrome, but we can change that in future if necessary.
  } else if (typeof mod == 'object') {
    return mod.exports;
  } else {
    console.error('unsupported module type: ' + typeof mod);
  }
}

// Load the module 'chrome' to kick things off.
window.chrome = {};
require('chrome');

// Close the wrapping function and call it.
})();

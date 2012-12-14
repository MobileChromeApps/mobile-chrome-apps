define('chrome.runtime', function(require, module) {
  var Event = require('chrome.Event');
  var exports = module.exports;
  exports.onSuspend = new Event('onSuspend');

  var original_addListener = exports.onSuspend.addListener;

  // Uses a trampoline to bind the Cordova pause event on the first call.
  exports.onSuspend.addListener = function(f) {
    window.document.addEventListener('pause', exports.onSuspend.fire, false);
    exports.onSuspend.addListener = original_addListener;
    exports.onSuspend.addListener(f);
  };
});


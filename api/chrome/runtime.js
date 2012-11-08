define('chrome.runtime', function(require, module) {
  var events = require('helpers.events');
  var exports = module.exports;
  exports.onSuspend = {};

  exports.onSuspend.fire = events.fire('onSuspend');

  // Uses a trampoline to bind the Cordova pause event on the first call.
  exports.onSuspend.addListener = function(f) {
    window.document.addEventListener('pause', exports.onSuspend.fire, false);
    var h = events.addListener('onSuspend');
    console.log('sub-handler type: ' + typeof h);
    exports.onSuspend.addListener = h;
    exports.onSuspend.addListener(f);
  };
});


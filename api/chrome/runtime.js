define('chrome.runtime', function(require, module, chrome) {
  if (!chrome.runtime) {
    chrome.runtime = {};
  }

  var events = require('helpers.events');
  chrome.runtime.onSuspend = {};

  chrome.runtime.onSuspend.fire = events.fire('onSuspend');

  // Uses a trampoline to bind the Cordova pause event on the first call.
  chrome.runtime.onSuspend.addListener = function(f) {
    window.document.addEventListener('pause', chrome.runtime.onSuspend.fire, false);
    var h = events.addListener('onSuspend');
    console.log('sub-handler type: ' + typeof h);
    chrome.runtime.onSuspend.addListener = h;
    chrome.runtime.onSuspend.addListener(f);
  };
});


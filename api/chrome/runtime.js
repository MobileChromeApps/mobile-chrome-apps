__modules['chrome.runtime'] = function(require, module, chrome) {
  if (!chrome.runtime) {
    chrome.runtime = {};
  }

  var events = require('helpers.events');
  chrome.runtime.onSuspend = {};

  chrome.runtime.onSuspend.fire = events.fire('onSuspend');

  // Uses a trampoline to bind the Cordova pause event on the first call.
  chrome.runtime.onSuspend.addListener = function(f) {
    window.document.addEventListener('pause', chrome.runtime.onSuspend.fire, false);
    chrome.runtime.onSuspend.addListener = events.addListener('onSuspend');
    chrome.runtime.onSuspend.addListener(f);
  };
};


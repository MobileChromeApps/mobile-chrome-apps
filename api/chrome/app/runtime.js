// chrome.app.runtime

__modules['chrome.app.runtime'] = function(require, module, chrome) {
  chrome.app.runtime = {};

  var events = require('helpers.events');
  chrome.app.runtime.onLaunched = {};
  chrome.app.runtime.onLaunched.addListener = events.addListener('onLaunched');
  chrome.app.runtime.onLaunched.fire = events.fire('onLaunched');
};







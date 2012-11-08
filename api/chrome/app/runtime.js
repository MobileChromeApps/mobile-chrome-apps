// chrome.app.runtime

define('chrome.app.runtime', function(require, module) {
  var events = require('helpers.events');
  var exports = module.exports;
  exports.onLaunched = {};
  exports.onLaunched.addListener = events.addListener('onLaunched');
  exports.onLaunched.fire = events.fire('onLaunched');
});


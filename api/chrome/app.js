define('chrome.app', function(require, module, chrome) {
  chrome.app = {};
  require('chrome.app.runtime');
  require('chrome.app.window');
});

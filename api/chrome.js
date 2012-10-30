// Main module: Master set-up of Chrome APIs.

__modules['chrome'] = function(require) {
  // API modules export functions that expect this value as an argument and populate it with their part of the API.
  require('chrome.app');
  require('chrome.runtime');
};

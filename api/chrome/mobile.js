define('chrome.mobile', function(require, module, chrome) {
  var common = require('chrome.common');

  chrome.mobile = {};
  chrome.mobile.impl = {};
  chrome.mobile.impl.init = function(_fgWindow, _bgWindow) {
    module.exports.fgWindow = _fgWindow;
    module.exports.bgWindow = _bgWindow;
    module.exports.bgWindow.chrome = chrome;
  };

  chrome.mobile.impl.createWindowHook = function() {
    common.windowCreateCallback();
    common.windowCreateCallback = null;
  };
});

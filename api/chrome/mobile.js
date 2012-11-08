define('chrome.mobile.impl', function(require, module) {
  var common = require('common');
  var exports = module.exports;

  exports.init = function(_fgWindow, _bgWindow) {
    exports.fgWindow = _fgWindow;
    exports.bgWindow = _bgWindow;
    exports.bgWindow.chrome = window.chrome;
  };

  exports.createWindowHook = function() {
    common.windowCreateCallback();
    common.windowCreateCallback = null;
  };
});

define('chrome.mobile.impl', function(require, module) {
  var exports = module.exports;

  exports.init = function(fgWindow, eventIframe) {
    exports.fgWindow = fgWindow;
    exports.bgWindow = eventIframe.contentWindow;
    exports.eventIframe = eventIframe;
    exports.bgWindow.chrome = window.chrome;
  };
});

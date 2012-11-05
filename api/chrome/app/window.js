define('chrome.app.window', function(require, module, chrome) {
  var mobile = require('chrome.mobile');
  var common = require('chrome.common');

  // The AppWindow created by chrome.app.window.create.
  var createdAppWindow = null;

  function AppWindow() {
    this.contentWindow = mobile.fgWindow;
    this.id = '';
  }
  AppWindow.prototype = {
    restore: unsupportedApi('AppWindow.restore'),
    moveTo: unsupportedApi('AppWindow.moveTo'),
    clearAttention: unsupportedApi('AppWindow.clearAttention'),
    minimize: unsupportedApi('AppWindow.minimize'),
    drawAttention: unsupportedApi('AppWindow.drawAttention'),
    focus: unsupportedApi('AppWindow.focus'),
    resizeTo: unsupportedApi('AppWindow.resizeTo'),
    maximize: unsupportedApi('AppWindow.maximize'),
    close: unsupportedApi('AppWindow.close')
  };

  chrome.app.window = {};
  chrome.app.window.create = function(filePath, options, callback) {
    if (createdAppWindow) {
      console.log('ERROR - chrome.app.window.create called multiple times. This is unsupported.');
      return;
    }
    createdAppWindow = new AppWindow();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    var topDoc = mobile.fgWindow.document;
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        topDoc.open();
        var pageContent = xhr.responseText || 'Page load failed.';
        var headIndex = pageContent.indexOf('<head>');
        if (headIndex != -1) {
          var endIndex = headIndex + '<head>'.length;
          topDoc.write(pageContent.slice(0, endIndex));
          topDoc.write('<link rel="stylesheet" type="text/css" href="chromeappstyles.css">');
          // Set up the callback to be called before the page contents loads.
          if (callback) {
            common.windowCreateCallback = function() {
              callback(createdAppWindow);
            };
            topDoc.write('<script>chrome.mobile.impl.createWindowHook()</script>');
          }
          topDoc.write(pageContent.slice(endIndex));
        } else {
          topDoc.write(pageContent);
          // Callback is called even when the URL is invalid.
          if (callback) {
            callback(createdAppWindow);
          }
        }
        topDoc.close();
      }
    };
    xhr.send();
  };

  chrome.app.window.current = function() {
    return window == mobile.fgWindow ? createdAppWindow : null;
  };
});

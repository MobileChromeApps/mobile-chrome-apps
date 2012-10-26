(function() {
  // The added mobile check lets this work in desktop Chrome.
  if (this.chrome && chrome.mobile) {
    console.log('WARNING - chrome apis doubly included.');
    return;
  }

  // The AppWindow created by chrome.app.window.create.
  var createdAppWindow = null;
  // Used during chrome.app.window.create to store the funciton's callback.
  var createWindowCallback = null;
  // The top window.
  var fgWindow = null;
  // The events page window.
  var bgWindow = null;

  var listeners = {};
  function addListener(name) {
    return function(f) {
      if(!listeners[name]) {
        listeners[name] = [f];
      } else {
        listeners[name].push(f);
      }
    };
  }

  function fire(name) {
    return function() {
      for (var i = 0, f; f = listeners[name][i]; ++i) {
        f();
      }
    };
  }

  // chrome.app.runtime
  chrome = {};
  chrome.app = {};
  chrome.app.runtime = {};
  chrome.app.runtime.onLaunched = {};
  chrome.app.runtime.onLaunched.addListener = addListener('onLaunched');
  chrome.app.runtime.onLaunched.fire = fire('onLaunched');

  chrome.runtime = {};
  chrome.runtime.onSuspend = {};
  chrome.runtime.onSuspend.fire = fire('onSuspend');

  chrome.runtime.onSuspend.addListener = function(f) {
    // Trampoline to add the Cordova pause event to the DOM.
    console.log('first-time trampoline behavior');
    document.addEventListener('pause', chrome.runtime.onSuspend.fire, false);

    chrome.runtime.onSuspend.addListener = addListener('onSuspend');
    chrome.runtime.onSuspend.addListener(f);
  };

  // chrome.mobile.impl
  chrome.mobile = {};
  chrome.mobile.impl = {};
  chrome.mobile.impl.init = function(_fgWindow, _bgWindow) {
    fgWindow = _fgWindow;
    bgWindow = _bgWindow;
    bgWindow.chrome = chrome;
  };
  chrome.mobile.impl.createWindowHook = function() {
    createWindowCallback();
    createWindowCallback = null;
  };


  // chrome.app.window
  function unsupportedApi(name) {
    return function() {
      console.warn('API is not supported on mobile: ' + name);
    }
  }

  function AppWindow() {
    this.contentWindow = fgWindow;
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
      console.log('ERROR - chrome.createWindow called multiple times. This is unsupported.');
      return;
    }
    createdAppWindow = new AppWindow();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    var topDoc = fgWindow.document;
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        topDoc.open();
        var pageContent = xhr.responseText || 'Page load failed.';
        var headIndex = pageContent.indexOf('<head>');
        if (headIndex != -1) {
          chrome.mobile.impl.windowCreateCallback = callback;
          var endIndex = headIndex + '<head>'.length;
          topDoc.write(pageContent.slice(0, endIndex));
          topDoc.write('<link rel="stylesheet" type="text/css" href="chromeappstyles.css">');
          // Set up the callback to be called before the page contents loads.
          if (callback) {
            createWindowCallback = callback;
            topDoc.write('<script>chrome.mobile.impl.createWindowHook()</script>');
          }
          topDoc.write(pageContent.slice(endIndex));
        } else {
          topDoc.write(pageContent);
          // Callback is called even when the URL is invalid.
          callback && callback(createdAppWindow);
        }
        topDoc.close();
      }
    };
    xhr.send();
  };

  chrome.app.window.current = function() {
    return window == fgWindow ? createdAppWindow : null;
  };
})();


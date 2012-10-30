(function() {
  // The added mobile check lets this work in desktop Chrome.
  if (this.chrome && chrome.mobile) {
    console.log('WARNING - chrome apis doubly included.');
    return;
  }

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


})();


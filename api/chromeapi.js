(function() {
  // Find the parent window, which has its parent set to itself.
  var parentWindow = window;
  while (parentWindow.parent !== parentWindow) {
    parentWindow = parentWindow.parent;
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


  chrome.app.window = {};
  chrome.app.window.create = function(filePath, opt_options, opt_callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    xhr.onload = function() {
      document.open();
      document.write(xhr.responseText);
      document.close();
    };
    xhr.onerror = function() {
      alert('XHR failed');
    };
    xhr.send();
  };
})();


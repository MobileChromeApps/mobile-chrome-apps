(function() {
  // Find the parent window, which has its parent set to itself.
  var parentWindow = window;
  while (parentWindow.parent !== parentWindow) {
    parentWindow = parentWindow.parent;
  }

  var onLaunchedListeners = [];
  chrome = {};
  chrome.app = {};
  chrome.app.runtime = {};
  chrome.app.runtime.onLaunched = {};
  chrome.app.runtime.onLaunched.addListener = function(func) {
    onLaunchedListeners.push(func);
  };
  chrome.app.runtime.onLaunched.fire = function() {
    for (var i = 0, f; f = onLaunchedListeners[i]; ++i) {
      f();
    }
  };
  chrome.app.window = {};
  chrome.app.window.create = function(filePath, opt_options, opt_callback) {
    console.log('fetching ' + filePath);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    xhr.onload = function() {
      console.log('found ' + filePath);
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


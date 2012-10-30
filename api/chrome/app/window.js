__modules['chrome.app.window'] = function(require, modules, chrome) {
  if (!chrome.app) {
    chrome.app = {};
  }

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
};

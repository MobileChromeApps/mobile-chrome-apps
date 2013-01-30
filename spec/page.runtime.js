
chromespec.registerSubPage('chrome.runtime', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Attach onSuspend', function() {
    var buttonTime = new Date();
    chrome.runtime.onSuspend.addListener(function() {
      var callbackTime = new Date();
      chromespec.log('onSuspend fired: ' + (callbackTime - buttonTime) + 'ms after button');
    });
  });

  addButton('chrome.runtime.reload()', function() {
    chrome.runtime.reload();
  });
});

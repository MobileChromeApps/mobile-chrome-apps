

var uiWindowFirstCallError = null;

// This can also be called by manual tests when they are testing lifecycle events.
// E.g. A notification that restarts the app.
function createUiWindow(callback) {
  if (uiWindowFirstCallError) {
    throw new Error('createUiWindow called multiple times. first from: ' + uiWindowFirstCallError);
  }
  uiWindowFirstCallError = new Error();

  chrome.app.window.create('index.html', {
    id: 'tests'
  }, function(appWindow) {
    appWindow.contentWindow.registerManualTests = registerManualTests;
    appWindow.contentWindow.registerAutoTests = registerAutoTests;
    appWindow.contentWindow.logger = logger;
    appWindow.contentWindow.medic = medic;
    if (callback) {
      callback(appWindow);
    }
  });
}

chrome.app.runtime.onLaunched.addListener(function() {
  console.log('onLaunched fired.');
  createUiWindow();
});

chromespec.registerJasmineTest('chrome.app.runtime');
chromespec.registerJasmineTest('chrome.app.window');
chromespec.registerJasmineTest('chrome.runtime');
chromespec.registerJasmineTest('chrome.storage');
chromespec.registerJasmineTest('pageload');

function initPage() {
  chromespec.addActionButton('chrome.runtime', function() {
    top.location = 'runtime/chromeapp.html';
  });
  chromespec.addActionButton('chrome.socket', function() {
    top.location = 'socket/chromeapp.html';
  });
}

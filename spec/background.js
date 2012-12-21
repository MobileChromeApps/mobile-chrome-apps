var specScripts = [
  'test.chrome.app.runtime.js',
  'test.chrome.app.window.js',
  'test.chrome.runtime.js',
  'test.chrome.storage.js',
  'test.pageload.js'
];

function initPage() {
  addActionButton('chrome.runtime', function() {
    top.location = 'runtime/chromeapp.html';
  });
}

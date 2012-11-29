var specScripts = [
  'test.runtime.js'
];

function initPage() {
  addActionButton('chrome.runtime', function() {
    top.location = 'runtime/chromeapp.html';
  });
}

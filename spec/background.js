function initPage() {
  addActionButton('chrome.runtime', function() {
    top.location = 'runtime/chromeapp.html';
  });
}

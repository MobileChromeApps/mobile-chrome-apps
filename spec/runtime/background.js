/**
 * Listens for the app launching then creates the window.
 * Ignores the provided window size.
 *
 * @see http://developer.chrome.com/trunk/apps/app.window.html
 */

var specScripts = [
  'runtime_spec.js'
];

function initPage() {
  addActionButton('Attach onSuspend', function() {
    var buttonTime = new Date();
    chrome.runtime.onSuspend.addListener(function() {
      var callbackTime = new Date();
      log('onSuspend fired: ' + (callbackTime - buttonTime) + 'ms after button');
    });
  });
}


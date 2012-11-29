
function chromeSpec(func) {
  var runningInBackground = !chrome.app.window.current();
  chromeSpecs[runningInBackground].push(func);
}


function chromeSpec(func) {
  var runningInBackground = !chrome.app.window.current();
  var wndName = runningInBackground ? 'bg' : 'fg';
  describe('In ' + wndName + ':', function() {
    func(runningInBackground);
  });
}

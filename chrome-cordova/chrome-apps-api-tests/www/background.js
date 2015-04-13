chrome.app.runtime.onLaunched.addListener(function() {
  console.log('onLaunched fired.');
  var helper = cordova.require('cordova-plugin-chrome-apps-test-framework.app_helpers');
  helper.createUiWindow();
});

var Q = require('q');

var utils = require('./utils');
var check_reqs = require('../cordova/cordova-android/bin/lib/check_reqs');

var hasAndroidPlatform;
var hasXcode;

function checkHasAndroid() {
  hasAndroidPlatform = false;
  return check_reqs.check_java()
  .then(function() {
    return check_reqs.check_android();
  }).then(function() {
    console.log('Android SDK detected.');
    hasAndroidPlatform = true;
  }).then(null, function(err) {
    console.warn(err.message);
  });
}

function checkHasIos() {
  if (process.platform != 'darwin')
    return Q();

  return utils.exec('which xcodebuild', true /* opt_silent */)
  .then(function() {
    return utils.exec('xcodebuild -version', true /* opt_silent */)
    .then(function() {
      hasXcode = true;
      console.log('Xcode detected.');
    }, function(err) {
      console.log('Xcode appears to be installed, but no version is selected (fix this with xcodeselect).');
    });
  }, function(err) {
    console.log('Xcode not detected.');
  });
}

// Returns a promise.
module.exports = exports = function toolsCheck() {
  var ret = Q();

  // Is this the first time we're checking for the tools?
  if (typeof hasAndroidPlatform == 'undefined') {
    ret = ret.then(function() {
      console.log('## Checking that tools are installed');
      return checkHasAndroid().then(checkHasIos);
    });
  }

  return ret.then(function() {
    if (!hasAndroidPlatform && !hasXcode)
      // TODO: Replace inline docs links with general instructions to read --help / docs / report issues
      return Q.reject('No usable build environment could be found. Please refer to our installation guide:\n' +
          'https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md');

    return Q({
      hasAndroidPlatform: hasAndroidPlatform,
      hasXcode: hasXcode,
    });
  });
};

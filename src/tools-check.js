var Q = require('q');

var utils = require('./utils');
var check_reqs = require('../cordova/cordova-android/bin/lib/check_reqs');

var hasAndroidPlatform;
var hasXcode;

function checkHasAndroid() {
  hasAndroidPlatform = false;
  return check_reqs.check_java()
  .then(function() {
    return check_reqs.check_android()
    .then(function() {
      console.warn('\x1B[32mAndroid Development: SDK configured properly.\x1B[39m');
      hasAndroidPlatform = true;
    }, function(err) {
      console.warn('Android Development: ' + err.message);
    });
  }, function(err) {
    console.warn('Android Development: JDK not found. ' + err.message);
    return Q.reject();
  }).then(null, function(){});
}

function checkHasIos() {
  if (process.platform != 'darwin')
    return Q();

  return utils.exec('which xcodebuild', true /* opt_silent */)
  .then(function() {
    return utils.exec('xcodebuild -version', true /* opt_silent */)
    .then(function() {
      hasXcode = true;
      console.warn('\x1B[32miOS Development: SDK configured properly.\x1B[39m');
    }, function(err) {
      console.warn('iOS Development: Xcode appears to be installed, but no version is selected (fix this with xcodeselect).');
    });
  }, function(err) {
    console.warn('iOS Development: SDK not detected.');
  });
}

// Returns a promise.
module.exports = exports = function toolsCheck() {
  var ret = Q();

  // Is this the first time we're checking for the tools?
  if (typeof hasAndroidPlatform == 'undefined') {
    ret = ret.then(function() {
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

exports.fixEnv = function() {
  return check_reqs.check_java()
  .then(function() {
    return check_reqs.check_android();
  })
  .then(null, function() {});
};

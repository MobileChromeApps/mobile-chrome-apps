var os = require('os');
var Q = require('q');

var utils = require('./utils');

function parseTargetOutput(targetOutput) {
  var targets = [];
  var target;
  var targetRe = /^id: (\d+) or "([^"]*)"/gm;
  while ((target = targetRe.exec(targetOutput))) {
    targets.push(target[2]);
  }
  return targets;
}

// Returns a promise.
module.exports = exports = function toolsCheck() {
  console.log('## Checking that tools are installed');

  var hasAndroidSdk = false;
  var hasAndroidPlatform = false;
  var hasXcode = false;

  if (!os.tmpdir) return Q.reject('Your version of node (' + process.version + ') is too old. Please update your version of node.');

  // Android
  return utils.exec('android list targets', true /* opt_silent */).then(function(out) {
    var targetOutput = out.stdout;
    hasAndroidSdk = true;
    console.log('Android SDK detected.');
    var targets = parseTargetOutput(targetOutput);
    /* This is the android SDK version declared in cordova-android/framework/project.properties */
    if (!(targets.indexOf('Google Inc.:Google APIs:19') > -1 || targets.indexOf('android-19') > -1)) {
      console.warn('Dependency warning: Android 4.4 (Google APIs) Platform is not installed.' +
        '\nAdd it using the Android SDK Manager (run the "android" command)');
    }
    // Stacking up here because we want to bail after the first one fails.
    return utils.exec('ant -version', true /* opt_silent */).then(function() {
      // Project creation does succeed without javac.
      hasAndroidPlatform = true;
      return utils.exec('javac -version', true /* opt_silent */).then(null, function(err) {
        console.warn('Dependency warning: `javac` command not detected on your PATH.');
      });
    }, function(err) {
      console.warn('Dependency warning: `ant` command not detected on your PATH.');
    });
  }, function(err) {
    console.warn('Android not detected (`android` command not detected on your PATH).');
  })
  // iOS
  .then(function() {
    if (process.platform != 'darwin') return;
    return utils.exec('which xcodebuild', true /* opt_silent */).then(function() {
      return utils.exec('xcodebuild -version', true /* opt_silent */).then(function() {
        hasXcode = true;
        console.log('Xcode detected.');
      }, function(err) {
        console.log('Xcode appears to be installed, but no version is selected (fix this with xcodeselect).');
      });
    }, function(err) {
      console.log('Xcode not detected.');
    });
  })
  // Check for at least one of the tools.
  .then(function() {
    if (!hasAndroidPlatform && ! hasXcode) {
      return Q.reject('No usable build environment could be found. Please refer to our installation guide:\n' +
          'https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md');
    } else {
      return Q({
        hasAndroidSdk: hasAndroidSdk,
        hasAndroidPlatform: hasAndroidPlatform,
        hasXcode: hasXcode,
      });
    }
  });
};

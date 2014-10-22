var fs = require('fs');
var Q = require('q');
var path = require('path');
var shelljs = require('shelljs');
var utils = require('./utils');

// Exports
exports.upgradeProject = upgradeProject;
exports.upgradeProjectIfStale = upgradeProjectIfStale;


function upgradeProjectIfStale() {
  var packageVersion = require('../package').version;
  var versionFile = path.join('platforms', 'created-with-cca-version');
  var projectIsStale = false;

  // If you have at least one platform already installed, check to see if you need to do an upgrade
  if (fs.existsSync(path.join('platforms', 'android')) || fs.existsSync(path.join('platforms', 'ios'))) {
    projectIsStale = !fs.existsSync(versionFile) || fs.readFileSync(versionFile, 'utf-8') != packageVersion;
  }

  if(projectIsStale) {
    console.log('This project was not upgraded to cca v' + packageVersion + ' yet.  Attempting to upgrade now...');
    return exports.upgradeProject();
  } else {
    return Q();
  }
}


function upgradeProject(skipPrompt) {
  return Q()
  .then(function(){
    if (skipPrompt) return 'y';
    return utils.waitForKey('Warning: Upgrade will replace all files in platforms and plugins. Continue? [y/N] ');
  })
  .then(function(key) {
    if (key != 'y' && key != 'Y') {
      return Q.reject('Okay, nevermind.');
    }
  })
  .then(function() {
    // Upgrading.

    // If you don't have any platforms installed, lets add some default ones
    // Ideally we just do this in pre-prepare, but cordova doesn't run pre-prepare scripts if there are no target platforms,
    // and its unclear how to make it do so with a difference concept for pre-prepare scripts.

    // If you have plugins/ folder, re-installing platforms won't reinstall plugins unless you delete these files.
    // TODO: There is some concern that doing this will not maintain plugin explicit/implicit install history,
    //       But that should not be a problem for cca apps which don't really use those concepts.

    shelljs.rm('-rf', path.join('platforms'));
    shelljs.rm('-rf', path.join('plugins'));
    shelljs.rm('-f', path.join('plugins', 'android.json'));
    shelljs.rm('-f', path.join('plugins', 'ios.json'));

    console.log('## First-time build. Detecting available SDKs:');
  })
  .then(require('./tools-check'))
  .then(function(toolsCheckResults) {
    // TODO(mmocny): any way to use .raw so as not to also call prepare after each platform add?
    var plats = [];
    if (toolsCheckResults.hasAndroidPlatform) {
      plats.push('android');
    }
    if (toolsCheckResults.hasXcode ) {
      plats.push('ios');
    }
    if (plats.length) {
      return require('./cordova-commands').runCmd(['platform', 'add', plats]);
    }
  })
  .then(require('./write-out-cca-version'));
}

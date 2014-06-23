var fs = require('fs');
var path = require('path');
var Q = require('q');

module.exports = exports = function autoUpgrade() {
  var packageVersion = require('../package').version;

  return Q.fcall(function() {
    // If you have at least one platform already installed, check to see if you need to do an upgrade
    if (fs.existsSync(path.join('platforms', 'android')) || fs.existsSync(path.join('platforms', 'ios'))) {
      var projectIsStale = !fs.existsSync(path.join('platforms', 'created-with-cca-version')) ||
                            fs.readFileSync(path.join('platforms', 'created-with-cca-version'), 'utf-8') != packageVersion;
      if (projectIsStale) {
        console.log('This project was not upgraded to cca v' + packageVersion + ' yet.  Attempting to upgrade now...');
        return require('./upgrade-project')();
      }
      return;
    }

    // If you don't have any platforms installed, lets add some default ones
    // Ideally we just do this in pre-prepare, but cordova doesn't run pre-prepare scripts if there are no target platforms,
    // and its unclear how to make it do so with a difference concept for pre-prepare scripts.

    // If you have plugins/ folder, re-installing platforms won't reinstall plugins unless you delete these files.
    // TODO: There is some concern that doing this will not maintain plugin explicit/implicit install history,
    //       But that should not be a problem for cca apps which don't really use those concepts.
    var shelljs = require('shelljs');
    shelljs.rm('-f', path.join('plugins', 'android.json'));
    shelljs.rm('-f', path.join('plugins', 'ios.json'));

    return require('./tools-check')()
    .then(function(toolsCheckResults) {
      var cmds = [];
      // TODO(mmocny): any way to use .raw so as not to also call prepare after each platform add?
      if (toolsCheckResults.hasXcode) {
        cmds.push(['platform', 'add', 'ios']);
      }
      if (toolsCheckResults.hasAndroidPlatform) {
         cmds.push(['platform', 'add', 'android']);
      }
      return require('./cordova-commands').runAllCmds(cmds);
    })
    .then(function() {
      return require('./write-out-cca-version')();
    });
  });
};

var Q = require('q');
var cordovaCommands = require('./cordova-commands');
var path = require('path');
var shelljs = require('shelljs');
var utils = require('./utils');

module.exports = exports = function upgradeProject() {
  return utils.waitForKey('Upgrading will delete platforms/ and plugins/ - Continue? [y/N] ')
  .then(function(key) {
    if (key != 'y' && key != 'Y') {
      return Q.reject('Okay, nevermind.');
    }
    shelljs.rm('-rf', path.join('platforms'));
    shelljs.rm('-rf', path.join('plugins'));
    return cordovaCommands.runCmd(['prepare']);
  }
};

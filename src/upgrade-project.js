var Q = require('q');
var path = require('path');
var shelljs = require('shelljs');
var utils = require('./utils');

module.exports = exports = function upgradeProject(skipPrompt) {
  return Q.fcall(function() {
    if (skipPrompt) return 'y';
    return utils.waitForKey('Warning: Upgrade will replace all files in platforms and plugins. Continue? [y/N] ');
  })
  .then(function(key) {
    if (key != 'y' && key != 'Y') {
      return Q.reject('Okay, nevermind.');
    }
    shelljs.rm('-rf', path.join('platforms'));
    shelljs.rm('-rf', path.join('plugins'));
    // TODO: this is a bit odd, auto-upgrade calls upgrade calls auto-upgrade.
    // It works, because the state changes in second round, but we should make it more clear and less prone to mistakes.
    return require('./auto-upgrade')();
  });
};

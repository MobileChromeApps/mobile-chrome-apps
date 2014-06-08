var Q = require('q');
var utils = require('./utils');

// Returns a promise.
module.exports = exports = function push(platform, url) {
  var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
  var hasIos = fs.existsSync(path.join('platforms', 'ios'));

  var srcDir = utils.assetDirForPlatform(platform);

  if (platform == 'android' && !hasAndroid) {
    return Q.reject('Selected platform \'android\' is not available.');
  }
  if (platform == 'ios' && !hasIos) {
    return Q.reject('Selected platform \'ios\' is not available.');
  }

  var Push = require('cca-push');
  return Q.nfcall(Push.push, srcDir, url);
};

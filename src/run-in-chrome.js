var fs = require('fs');
var path = require('path');
var Q = require('q');
var child_process = require('child_process');

// Returns a promise.
module.exports = exports = function runInChrome(platform) {
  chromeAppRunRoot = null;
  if (fs.existsSync('www/manifest.json')) {
    chromeAppRunRoot = 'www';
  } else if (fs.existsSync('manifest.json')) {
    chromeAppRunRoot = '.';
  } else {
    return Q.reject('Not a chrome app.');
  }

  var chromeArgs = ['--load-and-launch-app=' + path.resolve(chromeAppRunRoot)]; // '--disable-web-security'
  if (platform === 'canary') {
    chromeArgs.push('--user-data-dir=/tmp/cca_chrome_data_dir');
  }

  return Q.fcall(function() {
    if (process.platform === 'win32') {
      var chrome = 'Chrome' + (platform === 'canary' ? ' Canary' : '');
      child_process.spawn('cmd', ['/s', '/c', 'start', chrome].concat(chromeArgs));
    } else if (process.platform === 'darwin') {
      var chrome = 'Google Chrome' + (platform === 'canary' ? ' Canary' : '');
      child_process.spawn('open', ['-n', '-a', chrome, '--args'].concat(chromeArgs));
    }
  });
};

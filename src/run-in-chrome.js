var fs = require('fs');
var path = require('path');
var Q = require('q');
var child_process = require('child_process');

// Returns a promise.
module.exports = exports = function runInChrome(platform) {
  var chromeAppRunRoot = null;
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
    var chromeExe = null;
    if (process.platform === 'win32') {
      chromeExe = 'Chrome' + (platform === 'canary' ? ' Canary' : '');
      child_process.spawn('cmd', ['/s', '/c', 'start', chromeExe].concat(chromeArgs));
    } else if (process.platform === 'darwin') {
      chromeExe = 'Google Chrome' + (platform === 'canary' ? ' Canary' : '');
      child_process.spawn('open', ['-n', '-a', chromeExe, '--args'].concat(chromeArgs));
    }
  });
};

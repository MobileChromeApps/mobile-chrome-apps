var Q = require('q');
var path = require('path');
var childProcess = require('child_process');

exports.exit = function exit(code) {
  if (exports.exit.pause_on_exit) {
    exports.waitForKey(function() {
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
};
exports.exit.pause_on_exit = false;

exports.fatal = function fatal(msg) {
  console.error(msg);
  if (msg && msg.stack) console.error(msg.stack);
  exports.exit(1);
};

exports.fixPathSlashes = function fixPathSlashes(p) {
  return exports.isWindows() ? p.replace(/\//g, '\\') : p;
};

exports.colorizeConsole = function colorizeConsole() {
  var origWarn = console.warn;
  console.warn = function() {
    var msg = [].slice.call(arguments).join(' ');
    origWarn.call(console, '\x1B[33m' + msg + '\x1B[39m');
  };
  console.error = function() {
    var msg = [].slice.call(arguments).join(' ');
    origWarn.call(console, '\x1B[31m' + msg + '\x1B[39m');
  };
};

exports.assetDirForPlatform = function assetDirForPlatform(platform) {
  if (platform === 'android') {
    return path.join('platforms', platform, 'assets','www');
  }
  return path.join('platforms', platform, 'www');
};

// Returns a promise for an object with 'stdout' and 'stderr' as keys.
exports.exec = function exec(cmd, opt_silent) {
  if (!opt_silent) {
    console.log('Running: ' + cmd);
  }
  var d = Q.defer();
  childProcess.exec(cmd, function(error, stdout, stderr) {
    if (error) {
      d.reject(error);
    } else {
      d.resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    }
  });
  return d.promise;
};

// Returns a promise with the key as its value.
exports.waitForKey = function waitForKey(opt_prompt) {
  opt_prompt = opt_prompt || 'Press the Any Key';
  process.stdout.write(opt_prompt);
  process.stdin.resume();
  try {
    // This fails if the process is a spawned child (likely a node bug);
    process.stdin.setRawMode(true);
  } catch (e) {
  }
  process.stdin.setEncoding('utf8');
  var d = Q.defer();
  process.stdin.on('data', function cont(key) {
    if (key == '\u0003') {
      process.exit(2);
    }
    process.stdin.removeListener('data', cont);
    process.stdin.pause();
    process.stdout.write('\n');
    d.resolve(key);
  });
  return d.promise;
};

exports.isWindows = function isWindows() {
  return process.platform.slice(0, 3) == 'win';
};


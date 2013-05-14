/**
  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
 */

if (typeof WScript != 'undefined') {
  var shell = WScript.CreateObject("WScript.Shell");
  try {
    var ret = shell.Run('node "' + WScript.ScriptFullName + '" --pause_on_exit', 1, true);
  } catch (e) {
    shell.Popup('NodeJS is not installed. Please install it from http://nodejs.org');
    ret = 1;
  }
  WScript.Quit(ret);
}

process.on('uncaughtException', function(e) {
  fatal('Uncaught exception: ' + e);
});

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
var isWindows = process.platform.slice(0, 3) == 'win';
var scriptDir = path.dirname(process.argv[1]);

function exit(code) {
  if (process.argv[2] == '--pause_on_exit') {
    waitForKey(function() {
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
}

function fatal(msg) {
  console.error(msg);
  exit(1);
}

function exec(cmd, onSuccess, opt_onError, opt_silent) {
  var onError = opt_onError || function(e) {
    fatal('command failed: ' + cmd + '\n' + e);
  };
  if (!opt_silent) {
    console.log('Running: ' + cmd);
  }
  childProcess.exec(cmd, function(error, stdout, stderr) {
    if (error) {
      onError(error);
    } else {
      onSuccess(stdout.trim());
    }
  });
}

function sudo(cmd, onSuccess, opt_onError, silent) {
  if (!isWindows) {
    cmd = 'sudo ' + cmd;
  }
  exec(cmd, onSuccess, opt_onError, silent);
}

function copyFile(src, dst, callback) {
  var rd = fs.createReadStream(src);
  var wr = fs.createWriteStream(dst);
  wr.on('error', function(err) {
    fatal('Copy file error: ' + err);
  });
  wr.on('close', callback);
  rd.pipe(wr);
}

function recursiveDelete(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log('Deleting: ' + dirPath);
    helper(dirPath);
  }
  function helper(dirPath) {
    try {
       var files = fs.readdirSync(dirPath);
    } catch(e) {
      return;
    }
    for (var i = 0; i < files.length; i++) {
      var filePath = path.join(dirPath, files[i]);
      fs.chmodSync(filePath, '777');
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else {
        helper(filePath);
      }
    }
    fs.rmdirSync(dirPath);
  }
}

function checkGit(callback) {
  var errMsg = 'git is not installed (or not available on your PATH). Please install it from http://git-scm.com';
  exec('git --version', callback, function() {
    if (isWindows) {
      // See if it's at the default install path.
      process.env['PATH'] += ';' + path.join(process.env['ProgramFiles'], 'Git', 'bin');
      exec('git --version', callback, function() {
        fatal(errMsg);
      }, true);
    } else {
      fatal(errMsg);
    }
  }, true);
}

function computeGitVersion(callback) {
  exec('git describe --tags --long', function(stdout) {
    var version = stdout.replace(/^2.5.0-.*?-/, 'dev-');
    callback(version);
  }, null, true);
}

function chdir(d) {
  d = path.join(scriptDir, d);
  if (process.cwd() != d) {
    console.log('Changing directory to: ' + d);
    process.chdir(d);
  }
}

function checkOutSelf(callback) {
  // If the repo doesn't exist where the script is, then use the CWD as the checkout location.
  var origDir = process.cwd();
  var requiresClone = true;
  // First - try the directory of the script.
  if (scriptDir.slice(0, 2) != '\\\\') {
    process.chdir(scriptDir);
    requiresClone = !fs.existsSync('.git');
  }
  // Next - try the CWD.
  if (requiresClone) {
    scriptDir = origDir;
    process.chdir(scriptDir);
    requiresClone = !fs.existsSync('.git');
  }
  // Next - see if it exists within the CWD.
  if (requiresClone) {
    if (fs.existsSync(path.join(origDir, 'mobile-chrome-apps'))) {
      scriptDir = path.join(origDir, 'mobile-chrome-apps');
      process.chdir(scriptDir);
      requiresClone = !fs.existsSync('.git');
    }
  }
  if (requiresClone) {
    scriptDir = origDir;
    chdir('');
    recursiveDelete('mobile-chrome-apps');
    exec('git clone --progress "https://github.com/MobileChromeApps/mobile-chrome-apps.git"', function() {
      scriptDir = path.join(origDir, 'mobile-chrome-apps');
      var scriptName = path.basename(process.argv[1]);
      // Copy the init script in to so that it will be used when hacking on it.
      copyFile(process.argv[1], path.join(scriptDir, scriptName), function() {
        chdir('');
        exec('"' + process.argv[0] + '" ' + scriptName, function() {
          exit(0);
        });
      });
    });
  } else {
    callback();
  }
}

function checkOutSubModules(callback) {
  chdir('');
  exec('git pull', function() {
    exec('git submodule init', function() {
      exec('git submodule update', callback);
    });
  });
}

function buildCordovaJs(callback) {
  chdir('cordova-js');
  var needsJake = true;
  computeGitVersion(function(version) {
    if (fs.existsSync('pkg/cordova.ios.js')) {
      needsJake = (fs.readFileSync('pkg/cordova.ios.js').toString().indexOf(version) != -1);
    }
    if (needsJake) {
      console.log('CordovaJS needs to be built.');
      exec('jake build', callback, function() {
        console.log('Jake not installed. Installing.');
        sudo('npm install -g jake', function() {
          exec('jake build', callback);
        });
      });
    } else {
      console.log('CordovaJS is up-to-date.');
      callback();
    }
  });
}

function initPlugman(callback) {
  chdir('cordova-plugman');
  exec('npm install', function() {
    sudo('npm link', callback);
  });
}

function initCli(callback) {
  chdir('cordova-cli');
  exec('npm install', function() {
    sudo('npm link', function() {
      exec('npm link plugman', callback);
    });
  });
}

function finished(callback) {
  console.log('You\'ve successfully set up for Mobile Chrome Apps.');
}

function waitForKey(callback) {
  console.log('press a key');
  function cont(key) {
    if (key == '\u0003') {
      process.exit(2);
    }
    process.stdin.removeListener('data', cont);
    process.stdin.pause();
    callback();
  }
  process.stdin.resume();
  process.stdin.setRawMode(true);
  process.stdin.on('data', cont);
}

var eventQueue = [];
eventQueue.push(checkGit);
eventQueue.push(checkOutSelf);
eventQueue.push(checkOutSubModules);
eventQueue.push(buildCordovaJs);
eventQueue.push(initPlugman);
eventQueue.push(initCli);
eventQueue.push(finished);

function pump() {
  eventQueue.shift()(pump);
}
pump();

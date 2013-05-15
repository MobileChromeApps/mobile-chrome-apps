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
    var ret = shell.Run('cmd /c node "' + WScript.ScriptFullName + '" --pause_on_exit', 1, true);
  } catch (e) {
    shell.Popup('NodeJS is not installed. Please install it from http://nodejs.org');
    ret = 1;
  }
  WScript.Quit(ret);
}

var common = require('./common');
process.on('uncaughtException', function(e) {
  common.fatal('Uncaught exception: ' + e);
});

var fs = require('fs');
var path = require('path');

var origDir = process.cwd();
var isWindows = process.platform.slice(0, 3) == 'win';
var appName = process.argv[2];

if (appName && !/\w+\.\w+\.\w+/.exec(appName)) {
  common.fatal('App Name must follow the pattern: com.company.id');
}


function checkGit(callback) {
  var errMsg = 'git is not installed (or not available on your PATH). Please install it from http://git-scm.com';
  common.exec('git --version', callback, function() {
    if (isWindows) {
      // See if it's at the default install path.
      process.env['PATH'] += ';' + path.join(process.env['ProgramFiles'], 'Git', 'bin');
      common.exec('git --version', callback, function() {
        common.fatal(errMsg);
      }, true);
    } else {
      common.fatal(errMsg);
    }
  }, true);
}

function computeGitVersion(callback) {
  common.exec('git describe --tags --long', function(stdout) {
    var version = stdout.replace(/^2.5.0-.*?-/, 'dev-');
    callback(version);
  }, null, true);
}

function checkOutSelf(callback) {
  // If the repo doesn't exist where the script is, then use the CWD as the checkout location.
  var requiresClone = true;
  // First - try the directory of the script.
  if (common.scriptDir.slice(0, 2) != '\\\\') {
    process.chdir(common.scriptDir);
    requiresClone = !fs.existsSync('.git');
  }
  // Next - try the CWD.
  if (requiresClone) {
    common.scriptDir = origDir;
    process.chdir(common.scriptDir);
    requiresClone = !fs.existsSync('.git');
  }
  // Next - see if it exists within the CWD.
  if (requiresClone) {
    if (fs.existsSync(path.join(origDir, 'mobile-chrome-apps'))) {
      common.scriptDir = path.join(origDir, 'mobile-chrome-apps');
      process.chdir(common.scriptDir);
      requiresClone = !fs.existsSync('.git');
    }
  }
  if (requiresClone) {
    common.scriptDir = origDir;
    common.chdir(origDir);
    common.recursiveDelete('mobile-chrome-apps');
    common.exec('git clone "https://github.com/MobileChromeApps/mobile-chrome-apps.git"', function() {
      common.scriptDir = path.join(origDir, 'mobile-chrome-apps');
      var scriptName = path.basename(process.argv[1]);
      // Copy the init script in to so that it will be used when hacking on it.
      common.copyFile(process.argv[1], path.join(common.scriptDir, scriptName), function() {
        common.chdir(exports.scriptDir);
        common.exec('"' + process.argv[0] + '" ' + scriptName, function() {
          common.exit(0);
        });
      });
    });
  } else {
    callback();
  }
}

function checkOutSubModules(callback) {
  common.exec('git pull', function() {
    common.exec('git submodule init', function() {
      common.exec('git submodule update --recursive', callback);
    });
  });
}

function buildCordovaJs(callback) {
  common.chdir(path.join(exports.scriptDir, 'cordova-js'));
  var needsBuildJs = true;
  computeGitVersion(function(version) {
    if (fs.existsSync('pkg/cordova.ios.js')) {
      needsBuildJs = (fs.readFileSync('pkg/cordova.ios.js').toString().indexOf(version) == -1);
    }
    if (needsBuildJs) {
      console.log('CordovaJS needs to be built.');
      var packager = require('./cordova-js/build/packager');
      packager.generate('ios', version);
      packager.generate('android', version);
    } else {
      console.log('CordovaJS is up-to-date.');
    }
    callback();
  });
}

function initCli(callback) {
  // TODO: Figure out when this should be re-run (e.g. upon update).
  if (fs.existsSync('cordova-cli/node_modules')) {
    console.log('cordova-cli already has its dependencies installed.');
    callback();
  } else {
    common.chdir(path.join(exports.scriptDir, 'cordova-cli'));
    common.exec('npm install', callback);
  }
}

function createApp(callback) {
  common.chdir(origDir);
  var name = /\w+\.(\w+)$/.exec(appName)[1];

  // TODO: add android.
  var cmds = [
      ['platform', 'add', 'ios'],
  ];
  ['bootstrap', 'common', 'file-chooser', 'fileSystem', 'i18n', 'identity', 'socket', 'storage'].forEach(function(pluginName) {
    cmds.push(['plugin', 'add', path.join(common.scriptDir, 'chrome-cordova', 'plugins', pluginName)]);
  });

  function runCmd() {
    var curCmd = cmds.shift();
    if (curCmd) {
      common.exec(common.cordovaCmd(curCmd), runCmd);
    } else {
      // Create a script that runs update.js.
      if (isWindows) {
        fs.writeFileSync('chrome_app_update.bat', '"' + process.argv[0] + '" "' + path.join(common.scriptDir, 'update.js') + '"');
      } else {
        fs.writeFileSync('chrome_app_update.sh', '#!/bin/sh\ncd "`dirname "$0"`"\n"' + process.argv[0] + '" "' + path.join(common.scriptDir, 'update.js') + '"');
        fs.chmodSync('chrome_app_update.sh', '777');
      }
      callback();
    }
  }

  common.exec(common.cordovaCmd(['create', name, appName, name]), function() {
    common.chdir(path.join(origDir, name));
    runCmd();
  });
}


var eventQueue = common.eventQueue;
eventQueue.push(checkGit);
eventQueue.push(checkOutSelf);
eventQueue.push(checkOutSubModules);
eventQueue.push(buildCordovaJs);
eventQueue.push(initCli);

if (appName) {
  eventQueue.push(createApp);
}

common.pump();

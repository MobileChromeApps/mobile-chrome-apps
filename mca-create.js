//usr/bin/env node $0 $*; exit $?
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

/**
  The top line of this file will allow this script to be run as
  a UNIX shell script, as well as being a valid Node.js program.
 */

if (typeof WScript != 'undefined') {
  var shell = WScript.CreateObject("WScript.Shell");
  try {
    // Don't worry about passing along arguments here. It's stricly a double-click convenience.
    var ret = shell.Run('cmd /c node "' + WScript.ScriptFullName + '" --pause_on_exit', 1, true);
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

var commandLineFlags = {};
var commandLineArgs = process.argv.slice(2).filter(function(arg) {
  if (arg.slice(0, 2) == '--') {
    commandLineFlags[arg.slice(2)] = true;
  }
  return arg.slice(0, 2) != '--';
});

var origDir = process.cwd();
var isWindows = process.platform.slice(0, 3) == 'win';
var eventQueue = [];
var scriptDir = path.dirname(process.argv[1]);
var scriptName = path.basename(process.argv[1]);
var hasAndroidSdk = false;
var hasXcode = false;

function exit(code) {
  if (eventQueue) {
    eventQueue.length = 0;
  }
  if (commandLineFlags['pause_on_exit']) {
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

function cordovaCmd(args) {
  return '"' + process.argv[0] + '" "' + path.join(scriptDir, 'cordova-cli', 'bin', 'cordova') + '" ' + args.join(' ');
}

function chdir(d) {
  d = path.resolve(scriptDir, d);
  if (process.cwd() != d) {
    console.log('Changing directory to: ' + d);
    process.chdir(d);
  }
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

function pump() {
  if (eventQueue.length) {
    eventQueue.shift()(pump);
  }
}

////////////////////////// INIT LOGIC //////////////////////////
function initRepoMain() {
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

  function checkOutSelf(callback) {
    console.log('## Checking Out mobile-chrome-apps');
    // If the repo doesn't exist where the script is, then use the CWD as the checkout location.
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
      chdir(origDir);
      recursiveDelete('mobile-chrome-apps');
      exec('git clone "https://github.com/MobileChromeApps/mobile-chrome-apps.git"', function() {
        scriptDir = path.join(origDir, 'mobile-chrome-apps');
        chdir(scriptDir);
        console.log('Successfully cloned mobile-chrome-apps repo. Delegating to checked-out version of ' + scriptName);
        // TODO: We should quote the args.
        exec('"' + process.argv[0] + '" ' + scriptName + ' ' + process.argv.slice(2).join(' '), function() {
          exit(0);
        });
      });
    } else {
      callback();
    }
  }

  function checkOutSubModules(callback) {
    console.log('## Checking Out SubModules');
    chdir(scriptDir);
    exec('git pull --rebase', function() {
      exec('git submodule init', function() {
        exec('git submodule update', function() {
          chdir(path.join(scriptDir, 'cordova-cli'));
          exec('git submodule init', function() {
            exec('git submodule update', callback);
          });
        });
      });
    });
  }

  function buildCordovaJs(callback) {
    console.log('## Building cordova-js');
    chdir(path.join(scriptDir, 'cordova-js'));
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
    console.log('## Setting up cordova-cli');
    // TODO: Figure out when this should be re-run (e.g. upon update).
    if (fs.existsSync('cordova-cli/node_modules')) {
      //console.log('cordova-cli already has its dependencies installed.');
      callback();
    } else {
      chdir(path.join(scriptDir, 'cordova-cli'));
      exec('npm install', callback);
    }
  }

  eventQueue.push(checkGit);
  eventQueue.push(checkOutSelf);
  eventQueue.push(checkOutSubModules);
  eventQueue.push(buildCordovaJs);
  eventQueue.push(initCli);
}

function createAppMain(appName) {
  if (!/\w+\.\w+\.\w+/.exec(appName)) {
    fatal('App Name must follow the pattern: com.company.id');
  }
  function createApp(callback) {
    console.log('## Creating Your Application');
    chdir(origDir);
    var name = /\w+\.(\w+)$/.exec(appName)[1];

    // TODO: add android.
    var cmds = [];
    if (hasXcode) {
      cmds.push(['platform', 'add', 'ios']);
    }
    if (hasAndroidSdk) {
      cmds.push(['platform', 'add', 'android']);
    }
    ['bootstrap', 'common', 'file-chooser', 'fileSystem', 'i18n', 'identity', 'socket', 'storage'].forEach(function(pluginName) {
      cmds.push(['plugin', 'add', path.join(scriptDir, 'chrome-cordova', 'plugins', pluginName)]);
    });

    function runCmd() {
      var curCmd = cmds.shift();
      if (curCmd) {
        console.log(curCmd.join(' '));
        exec(cordovaCmd(curCmd), runCmd, undefined, true);
      } else {
        // Create a script that runs update.js.
        if (isWindows) {
          fs.writeFileSync('mca_update.bat', '"' + process.argv[0] + '" "' + path.join(scriptDir, scriptName) + '" --update_app');
        } else {
          fs.writeFileSync('mca_update.sh', '#!/bin/sh\ncd "`dirname "$0"`"\n"' + process.argv[0] + '" "' + path.join(scriptDir, scriptName) + '" --update_app');
          fs.chmodSync('mca_update.sh', '777');
        }
        callback();
      }
    }

    var curCmd = ['create', name, appName, name];
    console.log(curCmd.join(' '));
    exec(cordovaCmd(curCmd), function() {
      chdir(path.join(origDir, name));
      runCmd();
    }, undefined, true);
  }

  eventQueue.push(createApp);
}

function updateMain() {
  var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
  var hasIos = fs.existsSync(path.join('platforms', 'ios'));

  if (!fs.existsSync('platforms')) {
    fatal('No platforms directory found. Please run script from the root of your project.');
  }

  function runPrepare(callback) {
    console.log('## Preparing your project')
    exec(cordovaCmd(['prepare']), callback, undefined, true);
  }

  function createAddJsStep(platform) {
    return function(callback) {
      console.log('## Updating cordova.js for ' + platform);
      copyFile(path.join(scriptDir, 'cordova-js', 'pkg', 'cordova.' + platform + '.js'), path.join('platforms', platform, 'www', 'cordova.js'), callback);
    };
  }

  function createAddAccessTagStep(platform) {
    return function(callback) {
      console.log('## Setting <access> tag for ' + platform);
      var appName = path.basename(origDir);
      var configFilePath = platform == 'android' ?
          path.join('platforms', 'android', 'res', 'xml', 'config.xml') :
          path.join('platforms', 'ios', appName, 'config.xml');
      if (!fs.existsSync(configFilePath)) {
        fatal('Expected file to exist: ' + configFilePath);
      }
      var contents = fs.readFileSync(configFilePath);
      //contents = contents.replace();
  //\ \ \ \ <access origin="chrome-extension://*" />
      fs.writeFileSync(configFilePath, contents);
      callback();
    };
  };

  eventQueue.push(runPrepare);
  if (hasAndroid) {
    eventQueue.push(createAddJsStep('android'));
    eventQueue.push(createAddAccessTagStep('android'));
  }
  if (hasIos) {
    eventQueue.push(createAddJsStep('ios'));
    eventQueue.push(createAddAccessTagStep('ios'));
  }
}

function toolsCheckMain() {
  function checkAndroid(callback) {
    exec('android list targets', function() {
      hasAndroidSdk = true;
      console.log('Android SDK is installed.');
      callback();
      }, function() {
        console.log('Android SDK is not installed.');
        callback();
      }, true);
  }
  function checkXcode(callback) {
    if (process.platform == 'darwin') {
      exec('which xcodebuild', function() {
        hasXcode = true;
        console.log('Xcode is installed.');
        callback();
      }, function() {
        console.log('Xcode is not installed.');
        callback();
      }, true);
    } else {
      callback();
    }
  }
  function checkAtLeastOneTool(callback) {
    if (!hasAndroidSdk && !hasIos) {
      if (process.platform == 'darwin') {
        fatal('Neither android nor xcodebuild were found on your PATH. Please install at least one of them.');
      } else {
        fatal('Android SDK was not found on your PATH. Please ensure that the android tool is available.');
      }
    }
    callback();
  }
  eventQueue.push(checkAndroid);
  eventQueue.push(checkXcode);
  eventQueue.push(checkAtLeastOneTool);
}
function main() {
  toolsCheckMain();
  if (commandLineFlags['update_app']) {
    updateMain();
  } else {
    initRepoMain();
    var appName = commandLineArgs[0];
    if (appName) {
      createAppMain(appName);
    }
  }
  pump();
}
main();

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

/******************************************************************************/
/******************************************************************************/

if (typeof WScript != 'undefined') {
  var shell = WScript.CreateObject("WScript.Shell");
  var ret;
  try {
    // Don't worry about passing along arguments here. It's stricly a double-click convenience.
    ret = shell.Run('cmd /c node "' + WScript.ScriptFullName + '" --pause_on_exit', 1, true);
  } catch (e) {
    shell.Popup('NodeJS is not installed. Please install it from http://nodejs.org');
    ret = 1;
  }
  WScript.Quit(ret);
}

process.on('uncaughtException', function(e) {
  fatal('Uncaught exception: ' + e);
});

/******************************************************************************/
/******************************************************************************/

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
var hasAndroidPlatform = false;
var hasXcode = false;
var updateStrategy = (function() {
  if ('always-update-repo' in commandLineFlags) {
    return 'always';
  }
  if ('never-update-repo' in commandLineFlags) {
    return 'never';
  }
  return 'prompt';
}());

/******************************************************************************/
/******************************************************************************/

var ACTIVE_PLUGINS = [
    'chrome-bootstrap',
    'chrome-common',
    'chrome.alarms',
    'chrome.fileSystem',
    'chrome.i18n',
    'chrome.identity',
    'chrome.socket',
    'chrome.storage',
    'chrome.syncFileSystem',
    'file-chooser',
    'polyfill-CustomEvent',
    'polyfill-Function.bind',
    'polyfill-xhr-blob'
];

function cordovaCmd(args) {
  return '"' + process.argv[0] + '" "' + path.join(scriptDir, 'cordova-cli', 'bin', 'cordova') + '" ' + args.join(' ');
}

/******************************************************************************/
/******************************************************************************/
// Utility Functions

function pump() {
  if (eventQueue.length) {
    eventQueue.shift()(pump);
  }
}

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
      onSuccess(stdout.trim(), stderr.trim());
    }
  });
}

function sudo(cmd, onSuccess, opt_onError, silent) {
  if (!isWindows) {
    cmd = 'sudo ' + cmd;
  }
  exec(cmd, onSuccess, opt_onError, silent);
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

function copyDirectory(src, dst, callback) {
  fatal('copyDirectory not implemented');
  // TODO: Requires ncp module
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

function waitForKey(opt_prompt, callback) {
  if (typeof opt_prompt == 'function') {
    callback = opt_prompt;
    opt_prompt = 'press a key';
  }
  console.log(opt_prompt);
  function cont(key) {
    if (key == '\u0003') {
      process.exit(2);
    }
    process.stdin.removeListener('data', cont);
    process.stdin.pause();
    callback(key);
  }
  process.stdin.resume();
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', cont);
}

/******************************************************************************/
/******************************************************************************/
// Tools Check

function parseTargetOutput(targetOutput) {
  var targets = [];
  var target;
  var targetRe = /^id: (\d+) or "([^"]*)"/gm;
  while (target = targetRe.exec(targetOutput)) {
    targets.push(target[2]);
  }
  return targets;
}

function toolsCheck() {
  console.log('## Checking that tools are installed');
  function checkAndroid(callback) {
    exec('android list targets', function(targetOutput) {
      hasAndroidSdk = true;
      console.log('Android SDK is installed.');
      var targets = parseTargetOutput(targetOutput);
      /* This is the android SDK version declared in cordova-android/framework/project.properties */
      if (targets.length === 0) {
          console.log('No Android Platforms are installed');
      } else if (targets.indexOf('Google Inc.:Google APIs:17') > -1) {
          hasAndroidPlatform = true;
          console.log('Android 4.2.2 (Google APIs) Platform is installed.');
      } else {
          console.log('Android 4.2.2 (Google APIs) Platform is not installed.');
      }
      callback();
    }, function() {
      console.log('Android SDK is not installed.');
      callback();
    }, true);
  }
  function checkXcode(callback) {
    if (process.platform == 'darwin') {
      exec('which xcodebuild', function() {
        exec('xcodebuild -version', function() {
          hasXcode = true;
          console.log('Xcode is installed.');
          callback();
        }, function() {
          console.log('Xcode appears to be installed, but no version is selected.');
          callback();
        }, true);
      }, function() {
        console.log('Xcode is not installed.');
        callback();
      }, true);
    } else {
      callback();
    }
  }
  function checkAtLeastOneTool(callback) {
    if (!hasAndroidPlatform && !hasXcode) {
      if (process.platform == 'darwin') {
        fatal('No usable build environment could be found. Please install either XCode or the\nAndroid SDK (with the Android 4.2.2 platform and Google APIs) and try again.');
      } else {
        fatal('No usable build environment could be found. Please install the Android SDK (with\nthe Android 4.2.2 platform and Google APIs), make sure that android is on your\npath, and try again.');
      }
    }
    callback();
  }
  eventQueue.push(checkAndroid);
  eventQueue.push(checkXcode);
  eventQueue.push(checkAtLeastOneTool);
}

/******************************************************************************/
/******************************************************************************/
// Init

function initRepo() {
  if (updateStrategy == 'never') {
    return;
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

  function checkOutSelf(callback) {
    console.log('## Checking Out mobile-chrome-apps');

    function reRunThisScriptWithNewVersionThenExit() {
      console.log(scriptName + ' version has been updated, restarting with new version.\n');
      // TODO: We should quote the args.
      // TODO: This doesn't print to console
      exec('"' + process.argv[0] + '" ' + scriptName + ' ' + process.argv.slice(2).join(' '), function() {
        exit(0);
      });
    }

    // If the repo doesn't exist where the script is, then use the CWD as the checkout location.
    var requiresClone = true;
    // First - try the directory of the script.
    if (scriptDir.slice(0, 2) != '\\\\') {
      process.chdir(scriptDir);
      requiresClone = !fs.existsSync('.git');
    }
    // Next - try the CWD, if it is 
    if (requiresClone && fs.basename(origDir) == 'mobile-chrome-apps') {
      scriptDir = origDir;
      process.chdir(scriptDir);
      requiresClone = !fs.existsSync('.git');
    }
    // Next - see if it exists within the CWD.
    if (requiresClone && fs.existsSync(path.join(origDir, 'mobile-chrome-apps'))) {
      scriptDir = path.join(origDir, 'mobile-chrome-apps');
      process.chdir(scriptDir);
      requiresClone = !fs.existsSync('.git');
    }
    if (requiresClone) {
      scriptDir = path.join(origDir, 'mobile-chrome-apps');
      chdir(origDir);
      recursiveDelete('mobile-chrome-apps');
      exec('git clone "https://github.com/MobileChromeApps/mobile-chrome-apps.git"', function() {
        console.log('Successfully cloned mobile-chrome-apps repo');
        chdir(scriptDir);
        reRunThisScriptWithNewVersionThenExit();
        return;
      });
    }

    function finish() {
      callback();
    }
    function updateAndRerun() {
      exec('git pull --rebase', reRunThisScriptWithNewVersionThenExit);
    }
    function promptForUpdate() {
      waitForKey('There are new git repo updates. Would you like to autoupdate? [y/n] ', function(key) {
        if (key.toLowerCase() == 'y') {
          updateAndRerun();
        } else {
          finish();
        }
      });
    }

    if (updateStrategy == 'never') {
      finish();
    } else {
      exec('git pull --rebase --dry-run', function(stdout, stderr) {
        var needsUpdate = (!!stdout || !!stderr);
        if (!needsUpdate) {
          finish();
        } else if (updateStrategy == 'always') {
          updateAndRerun();
        } else if (updateStrategy == 'prompt') {
          promptForUpdate();
        }
      }, function(error) {
        console.log("Could not update repo:");
        console.error(error.toString());
        console.log("Continuing without update.");
        finish();
      }, true);
    }
  }

  function checkOutSubModules(callback) {
    console.log('## Checking Out SubModules');
    process.chdir(scriptDir);
    exec('git submodule update --init --recursive --rebase', callback, function(error) {
      console.log("Could not update submodules:");
      console.error(error.toString());
      console.log("Continuing without update.");
      callback();
    });
  }

  function buildCordovaJs(callback) {
    console.log('## Building cordova-js');
    process.chdir(path.join(scriptDir, 'cordova-js'));
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
    if (fs.existsSync(path.join(scriptDir, 'cordova-cli/node_modules'))) {
      console.log('Already installed.');
      callback();
    } else {
      process.chdir(path.join(scriptDir, 'cordova-cli'));
      exec('npm install', function() {
        process.chdir(origDir);
        callback();
      });
    }
  }

  function cleanup(callback) {
    process.chdir(origDir);
    callback();
  }

  eventQueue.push(checkGit);
  eventQueue.push(checkOutSelf);
  eventQueue.push(checkOutSubModules);
  eventQueue.push(buildCordovaJs);
  eventQueue.push(initCli);
  eventQueue.push(cleanup);
}

/******************************************************************************/
/******************************************************************************/
// Create App

function createApp(appName) {
  if (!/\w+\.\w+\.\w+/.exec(appName)) {
    fatal('App Name must follow the pattern: com.company.id');
  }
  function createApp(callback) {
    console.log('## Creating Your Application');
    chdir(origDir);
    var name = /\w+\.(\w+)$/.exec(appName)[1];

    var cmds = [];
    if (hasXcode) {
      cmds.push(['platform', 'add', 'ios']);
    }
    if (hasAndroidSdk) {
      cmds.push(['platform', 'add', 'android']);
    }
    ACTIVE_PLUGINS.forEach(function(pluginName) {
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
          fs.writeFileSync('mca-update.bat', '"' + process.argv[0] + '" "' + path.join(scriptDir, scriptName) + '" --update_app');
        } else {
          fs.writeFileSync('mca-update.sh', '#!/bin/sh\ncd "`dirname "$0"`"\n"' + process.argv[0] + '" "' + path.join(scriptDir, scriptName) + '" --update_app "$@"');
          fs.chmodSync('mca-update.sh', '777');
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

  function setAccessTag(callback) {
    console.log('## Setting <access> tag');
    var configFilePath = path.join('app', 'config.xml');
    if (!fs.existsSync(configFilePath)) {
      fatal('Expected file to exist: ' + configFilePath);
    }

    // Manipulating XML with Regex: See http://stackoverflow.com/a/1732454
    var contents = fs.readFileSync(configFilePath, 'utf8');
    contents = contents.replace(/(access.*)/,"$1\n    <access origin=\"chrome-extension://*\" />");
    fs.writeFileSync(configFilePath, contents);

    callback();
  }

  function createDefaultApp(callback) {
    console.log('## Creating Default Chrome App');
    var wwwDir = path.join('app', 'www');
    if (fs.existsSync(wwwDir)) {
      recursiveDelete(wwwDir);
    }
    var sampleAppDir = path.join(scriptDir, 'mobile-chrome-app-samples', 'helloworld');
    fs.mkdirSync(wwwDir);
    function createCopyFileCallback(fileName, callback) {
      return function() {
        copyFile(path.join(sampleAppDir, fileName), path.join(wwwDir, fileName), callback);
      };
    }
    var copyFiles = createCopyFileCallback(
        'background.js', createCopyFileCallback(
          'index.css', createCopyFileCallback(
            'index.html', createCopyFileCallback(
              'manifest.json', callback))));
    copyFiles();
  }

  eventQueue.push(createApp);
  eventQueue.push(setAccessTag);
  eventQueue.push(createDefaultApp);
  eventQueue.push(function(callback) { updateApp(); callback(); });
}

/******************************************************************************/
/******************************************************************************/
// Update App

function updateApp() {
  var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
  var hasIos = fs.existsSync(path.join('platforms', 'ios'));

  if (!fs.existsSync('platforms')) {
    fatal('No platforms directory found. Please run script from the root of your project.');
  }

  function runPrepare(callback) {
    console.log('## Preparing your project')
    exec(cordovaCmd(['prepare']), callback, undefined, true);
  }

  function assetDirForPlatform(platform) {
    if (platform === 'android') {
      return path.join('platforms', platform, 'assets','www');
    }
    return path.join('platforms', platform, 'www');
  }

  function createAddJsStep(platform) {
    return function(callback) {
      console.log('## Updating cordova.js for ' + platform);
      copyFile(path.join(scriptDir, 'cordova-js', 'pkg', 'cordova.' + platform + '.js'), path.join(assetDirForPlatform(platform), 'cordova.js'), callback);
    };
  }

  eventQueue.push(runPrepare);
  if (hasAndroid) {
    eventQueue.push(createAddJsStep('android'));
  }
  if (hasIos) {
    eventQueue.push(createAddJsStep('ios'));
  }
}


/******************************************************************************/
/******************************************************************************/

(function() {
  toolsCheck();
  initRepo();
  if (commandLineFlags['update_app']) {
    updateApp();
  } else {
    var appName = commandLineArgs[0];
    if (appName) {
      createApp(appName);
    }
  }
  pump();
}());

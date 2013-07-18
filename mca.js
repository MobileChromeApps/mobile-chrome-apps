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
function wscriptWrapper() {
  var shell = WScript.CreateObject("WScript.Shell");
  var args = [];
  for (var i = 0; i < WScript.Arguments.Length; ++i) {
    args.push('"' + WScript.Arguments.Item(i) + '"');
  }
  var ret;
  try {
    // Don't worry about passing along arguments here. It's stricly a double-click convenience.
    var cmd = 'cmd /c node "' + WScript.ScriptFullName + '" ' + args.join(' ') + ' --pause_on_exit';
    ret = shell.Run(cmd, 1, true);
  } catch (e) {
    shell.Popup('NodeJS is not installed. Please install it from http://nodejs.org');
    ret = 1;
  }
  WScript.Quit(ret);
}
wscriptWrapper();
}

/******************************************************************************/
/******************************************************************************/

// System modules.
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

// Third-party modules.
var ncp = require('ncp');
var optimist = require('optimist');

var commandLineFlags = null;
var origDir = process.cwd();
var isWindows = process.platform.slice(0, 3) == 'win';
var eventQueue = [];
var scriptDir = path.dirname(process.argv[1]);
var scriptName = path.basename(process.argv[1]);
var hasAndroidSdk = false;
var hasAndroidPlatform = false;
var hasXcode = false;
var command = null;

/******************************************************************************/
/******************************************************************************/

var ACTIVE_PLUGINS = [
    path.join(scriptDir, 'cordova', 'cordova-plugin-file'),
    path.join(scriptDir, 'cordova', 'cordova-plugin-inappbrowser'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome-bootstrap'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome.alarms'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome.fileSystem'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome.i18n'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome.identity'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome.socket'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome.storage'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'chrome.syncFileSystem'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'directoryFinder'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'fileChooser'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'polyfill-CustomEvent'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'polyfill-Function.bind'),
    path.join(scriptDir, 'chrome-cordova', 'plugins', 'polyfill-xhr-blob')
];

function cordovaCmd(args) {
  return '"' + process.argv[0] + '" "' + path.join(scriptDir, 'cordova', 'cordova-cli', 'bin', 'cordova') + '" ' + args.join(' ');
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

function spawn(cmd, args, onSuccess, opt_onError, opt_silent) {
  var onError = opt_onError || function(e) {
    fatal('command failed: ' + cmd + '\n' + e);
  };
  if (!opt_silent) {
    console.log('Spawning: ' + cmd + ' ' + args.join(' '));
  }
  var p = childProcess.spawn(cmd, args);

  p.stdout.on('data', function (data) {
    process.stdout.write(data);
  });
  p.stderr.on('data', function (data) {
    process.stderr.write(data);
  });

  process.stdin.resume();
  try {
    // This fails if the process is a spawned child (likely a node bug);
    process.stdin.setRawMode(true);
  } catch (e) {
  }
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', forward);
  p.on('close', function (code) {
    process.stdin.removeListener('data', forward);
    process.stdin.pause();
    onSuccess();
  });
  function forward(data) {
    p.stdin.write(data);
  }
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
  ncp.ncp(src, dst, function(err) {
    if (err) {
      fatal('Copy file error: ' + err);
    } else {
      callback();
    }
  });
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
  try {
    // This fails if the process is a spawned child (likely a node bug);
    process.stdin.setRawMode(true);
  } catch (e) {
  }
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
      console.log('Android SDK detected.');
      var targets = parseTargetOutput(targetOutput);
      /* This is the android SDK version declared in cordova-android/framework/project.properties */
      if (targets.length === 0) {
          console.log('No Android Platforms are installed');
      } else if (targets.indexOf('Google Inc.:Google APIs:17') > -1 ||
                 targets.indexOf('android-17') > -1) {
          hasAndroidPlatform = true;
          console.log('Android 4.2.2 (Google APIs) Platform is installed.');
      } else {
          console.log('Android 4.2.2 (Google APIs) Platform is not installed.');
      }
      callback();
    }, function() {
      console.log('Android SDK not detected on your PATH.');
      callback();
    }, true);
  }
  function checkXcode(callback) {
    if (process.platform == 'darwin') {
      exec('which xcodebuild', function() {
        exec('xcodebuild -version', function() {
          hasXcode = true;
          console.log('Xcode detected.');
          callback();
        }, function() {
          console.log('Xcode appears to be installed, but no version is selected (fix this with xcodeselect).');
          callback();
        }, true);
      }, function() {
        console.log('Xcode not detected.');
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
  function checkNodeVersion(callback) {
    if (!os.tmpdir) {
      fatal('Your version of node (' + process.version + ') is too old. Please update your version of node.');
    }
    callback();
  }
  eventQueue.push(checkNodeVersion);
  eventQueue.push(checkAndroid);
  eventQueue.push(checkXcode);
  eventQueue.push(checkAtLeastOneTool);
}

/******************************************************************************/
/******************************************************************************/
// Init
function buildCordovaJsStep(callback) {
  console.log('## Building cordova-js');
  process.chdir(path.join(scriptDir, 'cordova', 'cordova-js'));
  var packager = require(path.join(scriptDir, 'cordova', 'cordova-js', 'build', 'packager'));
  packager.generate('ios', undefined, function() {
    packager.generate('android', undefined, callback);
  });
}


function initCommand() {
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

  function checkOutSelf(callback) {
    console.log('## Checking Out mobile-chrome-apps');

    function reRunThisScriptWithNewVersionThenExit() {
      console.log(scriptName + ' has been updated.  Restarting with new version.');
      console.log(new Array(80).join('*'));
      console.log(new Array(80).join('*'));
      process.chdir(origDir);
      // TODO: We should quote the args.
      spawn(process.argv[0], process.argv.slice(1), function() {
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
    if (requiresClone && path.basename(origDir) == 'mobile-chrome-apps') {
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
        return;
      });
      return;
    }

    function updateAndRerun() {
      exec('git pull --rebase', reRunThisScriptWithNewVersionThenExit);
    }
    function promptForUpdate() {
      waitForKey('There are new git repo updates. Would you like to autoupdate? [y/n] ', function(key) {
        if (key.toLowerCase() == 'y') {
          updateAndRerun();
        } else {
          callback();
        }
      });
    }
    function checkIfNeedsUpdate() {
      exec('git pull --rebase --dry-run', function(stdout, stderr) {
        var needsUpdate = (!!stdout || !!stderr);
        if (needsUpdate)
          promptForUpdate();
      }, function(error) {
        console.log("Could not update repo:");
        console.error(error.toString());
        console.log("Continuing without update.");
        callback();
      }, true);
    }

    exec('git pull --rebase', function() {
      if (command === 'init') {
        callback();
        return;
      }
      reRunThisScriptWithNewVersionThenExit();
    });
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

  function cleanup(callback) {
    process.chdir(origDir);
    callback();
  }

  eventQueue.push(checkGit);
  eventQueue.push(checkOutSelf);
  eventQueue.push(checkOutSubModules);
  eventQueue.push(buildCordovaJsStep);
  eventQueue.push(cleanup);
}

/******************************************************************************/
/******************************************************************************/
// Create App

function createCommand(appId, addAndroidPlatform, addIosPlatform) {
  var match = /[a-z]+\.[a-z][a-z0-9]*\.([a-z][a-z0-9]*)/i.exec(appId);
  if (!match) {
    fatal('App Name must follow the pattern: com.company.id');
  }
  var appName = match[1];
  var appDir = null;

  function resolveTilde(string) {
    // TODO: implement better
    if (string.substr(0,1) === '~')
      string = process.env.HOME + string.substr(1)
    return path.resolve(string)
  }
  function validateSourceArgStep(callback) {
    var sourceArg = commandLineFlags.source;
    if (!sourceArg) {
      appDir = path.join(scriptDir, 'mobile-chrome-app-samples', 'helloworld', 'www');
    } else {
      var dirsToTry = [
        sourceArg && path.resolve(origDir, resolveTilde(sourceArg)),
        sourceArg === 'spec' && path.join(scriptDir, 'chrome-cordova', 'spec', 'www'),
        sourceArg && path.join(scriptDir, 'mobile-chrome-app-samples', sourceArg, 'www')
      ];
      for (var i = 0; appDir = dirsToTry[i]; i++) {
        if (appDir) console.log('Searching for Chrome app source in ' + appDir);
        if (appDir && fs.existsSync(appDir)) {
          if (!fs.existsSync(path.join(appDir, 'manifest.json'))) {
            fatal('No manifest.json file found within: ' + appDir);
          } else {
            break;
          }
        }
      }
      if (!appDir) {
        fatal('Directory does not exist.');
      }
    }
    callback();
  }

  function createStep(callback) {
    console.log('## Creating Your Application');
    chdir(origDir);

    var platformSpecified = addAndroidPlatform || addIosPlatform;
    var cmds = [];
    if ((!platformSpecified && hasXcode) || addIosPlatform) {
      cmds.push(['platform', 'add', 'ios']);
    }
    if ((!platformSpecified && hasAndroidSdk) || addAndroidPlatform) {
      cmds.push(['platform', 'add', 'android']);
    }
    ACTIVE_PLUGINS.forEach(function(pluginPath) {
      cmds.push(['plugin', 'add', pluginPath]);
    });

    function runCmd() {
      var curCmd = cmds.shift();
      if (curCmd) {
        console.log(curCmd.join(' '));
        exec(cordovaCmd(curCmd), runCmd, undefined, true);
      } else {
        // Create a script that runs update.js.
        if (isWindows) {
          fs.writeFileSync('.cordova/hooks/after_prepare/mca-update.cmd', 'cd "' + process.cwd() + '"\n"' + process.argv[0] + '" "' + path.join(scriptDir, scriptName) + '" update-app');
        } else {
          fs.writeFileSync('.cordova/hooks/after_prepare/mca-update.sh', '#!/bin/sh\ncd "' + process.cwd() + '"\n"' + process.argv[0] + '" "' + path.join(scriptDir, scriptName) + '" update-app');
          fs.chmodSync('.cordova/hooks/after_prepare/mca-update.sh', '777');
        }
        // Create a convenience link to our version of CLI.
        if (isWindows) {
          fs.writeFileSync('cordova.cmd', '"' + process.argv[0] + '" "' + path.join(scriptDir, 'cordova', 'cordova-cli', 'bin', 'cordova') + '" %*');
        } else {
          fs.symlinkSync(path.join(scriptDir, 'cordova', 'cordova-cli', 'bin', 'cordova'), 'cordova')
        }
        callback();
      }
    }

    var curCmd = ['create', appName, appId, appName];
    console.log(curCmd.join(' '));
    exec(cordovaCmd(curCmd), function() {
      chdir(path.join(origDir, appName));
      var cordova = require(path.join(scriptDir, 'cordova', 'cordova-cli', 'cordova'));
      cordova.config(path.join('.'), {
        lib: {
          android: {
            uri: path.join(scriptDir, 'cordova', 'cordova-android'),
            version: "master",
            id: "cordova-master"
          },
          ios: {
            uri: path.join(scriptDir, 'cordova', 'cordova-ios'),
            version: "master",
            id: "cordova-master"
          }
        }
      });
      runCmd();
    }, undefined, true);
  }

  function createDefaultApp(callback) {
    console.log('## Creating Default Chrome App');
    // TODO: add merges dir
    var wwwDir = 'www';
    if (!fs.existsSync(wwwDir)) {
      return;
    }
    var wwwConfigPath = path.join(wwwDir, 'config.xml');
    var configFileData = fs.readFileSync(wwwConfigPath, 'utf8');
    recursiveDelete(wwwDir);
    fs.mkdirSync(wwwDir);
    copyDirectory(appDir, wwwDir, function() {
      if (!fs.existsSync(wwwConfigPath)) {
        fs.writeFileSync(wwwConfigPath, configFileData);
      }
      callback();
    });
  }
  function prepareStep(callback) {
    exec(cordovaCmd(['prepare']), callback);
  }

  eventQueue.push(validateSourceArgStep);
  eventQueue.push(buildCordovaJsStep);
  eventQueue.push(createStep);
  eventQueue.push(createDefaultApp);
  eventQueue.push(prepareStep);
}

/******************************************************************************/
/******************************************************************************/
// Update App

function updateAppCommand() {
  var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
  var hasIos = fs.existsSync(path.join('platforms', 'ios'));

  if (!fs.existsSync('platforms')) {
    fatal('No platforms directory found. Please run script from the root of your project.');
  }

  function assetDirForPlatform(platform) {
    if (platform === 'android') {
      return path.join('platforms', platform, 'assets','www');
    }
    return path.join('platforms', platform, 'www');
  }

  function removeVestigalConfigFile(platform) {
    return function(callback) {
      var badPath = path.join(assetDirForPlatform(platform), 'config.xml');
      if (fs.existsSync(badPath)) {
        console.log('## Removing unnecessary files for ' + platform);
        fs.unlinkSync(badPath);
      }
      callback();
    };
  }

  function fixIosWhitelist(callback) {
    var configPath = path.join('platforms', 'ios', path.basename(process.cwd()), 'config.xml')
    var data = fs.readFileSync(configPath, 'utf8');
    data = data.replace('<access origin="*" />', '<access origin="*" />\n<access origin="chrome-extension://*" />');
    fs.writeFileSync(configPath, data);
    callback();
  }

  function createAddJsStep(platform) {
    return function(callback) {
      console.log('## Updating cordova.js for ' + platform);
      copyFile(path.join(scriptDir, 'cordova', 'cordova-js', 'pkg', 'cordova.' + platform + '.js'), path.join(assetDirForPlatform(platform), 'cordova.js'), callback);
    };
  }

  if (hasAndroid) {
    eventQueue.push(removeVestigalConfigFile('android'));
    eventQueue.push(createAddJsStep('android'));
  }
  if (hasIos) {
    eventQueue.push(removeVestigalConfigFile('ios'));
    eventQueue.push(fixIosWhitelist);
    eventQueue.push(createAddJsStep('ios'));
  }
}


/******************************************************************************/
/******************************************************************************/
function parseCommandLine() {
  commandLineFlags = optimist
      .usage('Usage: $0 command [commandArgs]\n' +
             '\n' +
             'Valid Commands:\n' +
             '\n' +
             'init - Checks for updates to the mobile-chrome-apps repository and ensures the environment is setup correctly.\n' +
             '    Examples:\n' +
             '        mca.js init.\n' +
             '\n' +
             'create [--android] [--ios] [--source path] - Creates a new project.\n' +
             '    Flags:\n' +
             '        --android: Add the Android platform (default if android SDK is detected).\n' +
             '        --ios: Add the iOS platform (default if Xcode is detected).\n' +
             '        --source=path/to/chromeapp: Create a project based on the given chrome app.\n' +
             '    Examples:\n' +
             '        mca.js create org.chromium.Demo\n' +
             '        mca.js create org.chromium.Spec --android --source=chrome-cordova/spec/www\n'
      ).options('h', {
          alias: 'help',
          desc: 'Show usage message.'
      }).argv;
  var validCommands = {
      'create': 1,
      'init': 1,
      'update-app': 1 // Secret command used by our prepare hook.
  };
  if (commandLineFlags.h || !validCommands[commandLineFlags._[0]]) {
    if (commandLineFlags._[0]) {
      fatal('Invalid command: ' + commandLineFlags._[0] + '. Use --help for usage.');
    }
    optimist.showHelp();
    exit(1);
  }
}

function main() {
  parseCommandLine();
  command = commandLineFlags._[0];
  if (command == 'update-app') {
    updateAppCommand();
  } else if (command == 'init') {
    toolsCheck();
    initCommand();
  } else if (command == 'create') {
    var appId = commandLineFlags._[1] || '';
    toolsCheck();
    if (!fs.existsSync(path.join(scriptDir, 'cordova/cordova-js/pkg/cordova.ios.js'))) {
      initCommand();
    }
    createCommand(appId, commandLineFlags.android, commandLineFlags.ios);
  }
  pump();
}

if (require.main === module) {
    main();
}


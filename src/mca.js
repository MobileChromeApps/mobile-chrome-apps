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
var Crypto = require('cryptojs').Crypto;

// Globals
var commandLineFlags = null;
var origDir = process.cwd();
var isWindows = process.platform.slice(0, 3) == 'win';
var eventQueue = [];
var mcaRoot = path.join(__dirname, '..');
var scriptName = path.basename(process.argv[1]);
var hasAndroidSdk = false;
var hasAndroidPlatform = false;
var hasXcode = false;

/******************************************************************************/
/******************************************************************************/

var ACTIVE_PLUGINS = [
    path.join(mcaRoot, 'cordova', 'cordova-plugin-file'),
    path.join(mcaRoot, 'cordova', 'cordova-plugin-inappbrowser'),
    path.join(mcaRoot, 'cordova', 'cordova-plugin-network-information'),
    path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome-navigation'),
    path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome-bootstrap'),
    path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.i18n'),
    path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.storage'),
    path.join(mcaRoot, 'chrome-cordova', 'plugins', 'polyfill-CustomEvent'),
    path.join(mcaRoot, 'chrome-cordova', 'plugins', 'polyfill-xhr-features'),
    path.join(mcaRoot, 'chrome-cordova', 'plugins', 'polyfill-blob-constructor')
];

var PLUGIN_MAP = {
  'alarms': [path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.alarms')],
  'fileSystem': [path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.fileSystem'),
                 path.join(mcaRoot, 'chrome-cordova', 'plugins', 'fileChooser')],
  'identity': [path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.identity')],
  'notifications': [path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.notifications')],
  'socket': [path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.socket')],
  'syncFileSystem': [path.join(mcaRoot, 'chrome-cordova', 'plugins', 'chrome.syncFileSystem')]
};

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

function chdir(d) {
  d = path.resolve(mcaRoot, d);
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
    opt_prompt = 'Press the Any Key';
  }
  process.stdout.write(opt_prompt);
  process.stdin.resume();
  try {
    // This fails if the process is a spawned child (likely a node bug);
    process.stdin.setRawMode(true);
  } catch (e) {
  }
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function cont(key) {
    if (key == '\u0003') {
      process.exit(2);
    }
    process.stdin.removeListener('data', cont);
    process.stdin.pause();
    process.stdout.write('\n');
    callback(key);
  });
}

function readManifest(manifestFilename, callback) {
  fs.readFile(manifestFilename, { encoding: 'utf-8' }, function(err, data) {
    if (err) {
      fatal('Unable to open manifest ' + manifestFilename + ' for reading.');
    }
    try {
      var manifest = eval('(' + data + ')'); // JSON.parse(data);
      callback(manifest);
    } catch (e) {
      console.log(e);
      fatal('Unable to parse manifest ' + manifestFilename);
    }
  });
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
  function printHeader(callback) {
    console.log('## Checking that tools are installed');
    callback();
  }
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
  eventQueue.push(printHeader);
  eventQueue.push(checkNodeVersion);
  eventQueue.push(checkAndroid);
  eventQueue.push(checkXcode);
  eventQueue.push(checkAtLeastOneTool);
}

/******************************************************************************/
/******************************************************************************/

function ensureHasRunInit() {
  eventQueue.push(function(callback) {
    if (!fs.existsSync(path.join(mcaRoot, 'cordova/cordova-js/pkg/cordova.ios.js')))
      return fatal('Please run \'' + scriptName + ' init\' first');
    callback();
  });
}

function promptIfNeedsUpdate() {
  eventQueue.push(function(callback) {
    process.chdir(mcaRoot);
    exec('git pull --rebase --dry-run', function(stdout, stderr) {
      var needsUpdate = (!!stdout || !!stderr);
      if (!needsUpdate)
        return callback();

      console.log('Warning: mobile-chrome-apps has updates pending; Please run \'' + scriptName + ' init\'');
      waitForKey('Continue anyway? [y/n] ', function(key) {
        if (key.toLowerCase() !== 'y')
          return exit(1);
        callback();
      });
    }, function(error) {
      console.log("Could not check repo for updates:");
      console.error(error.toString());
      callback();
    }, true);
  });
}


/******************************************************************************/
/******************************************************************************/
// Init

function buildCordovaJsStep(callback) {
  console.log('## Building cordova-js');
  process.chdir(path.join(mcaRoot, 'cordova', 'cordova-js'));
  var packager = require(path.join(mcaRoot, 'cordova', 'cordova-js', 'build', 'packager'));
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
    console.log('## Updating mobile-chrome-apps');

    process.chdir(mcaRoot);
    exec('git pull --rebase', callback);
  }

  function checkOutSubModules(callback) {
    console.log('## Updating git submodules');

    process.chdir(mcaRoot);
    exec('git submodule update --init --recursive', callback, function(error) {
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
  var manifestFile = null;
  var manifest = null;

  var whitelist = [];
  var chromeAppId;

  var cordova = require('cordova');

  function runCmd(cmd, callback) {
    console.log(cmd.join(' '));
    cordova[cmd[0]].apply(cordova, cmd.slice(1).concat([callback]));
  }

  function resolveTilde(string) {
    // TODO: implement better
    if (string.substr(0,1) === '~')
      return path.resolve(process.env.HOME + string.substr(1))
    return string
  }
  function validateSourceArgStep(callback) {
    var sourceArg = commandLineFlags.source;
    if (!sourceArg) {
      appDir = path.join(mcaRoot, 'mobile-chrome-app-samples', 'helloworld', 'www');
    } else {
      var dirsToTry = [
        sourceArg && path.resolve(origDir, resolveTilde(sourceArg)),
        sourceArg === 'spec' && path.join(mcaRoot, 'chrome-cordova', 'spec', 'www'),
        sourceArg && path.join(mcaRoot, 'mobile-chrome-app-samples', sourceArg, 'www')
      ];
      var foundManifest = false;
      for (var i = 0; i < dirsToTry.length; i++) {
        if (dirsToTry[i]) {
          appDir = dirsToTry[i];
          console.log('Searching for Chrome app source in ' + appDir);
          if (fs.existsSync(appDir)) {
            manifestFile = path.join(appDir, 'manifest.json');
            if (fs.existsSync(manifestFile)) {
              foundManifest = true;
              break;
            }
          }
        }
      }
      if (!appDir) {
        fatal('Directory does not exist.');
      }
      if (!foundManifest) {
        fatal('No manifest.json file found');
      }
    }
    callback();
  }

  function readManifestStep(callback) {
    /* If we have reached this point and manifestFile is set, then it is the
     * name of a readable manifest file.
     */
    if (!manifestFile) {
      return callback();
    }
    readManifest(manifestFile, function(manifestData) {
      manifest = manifestData;
      var permissions = [];
      if (manifest && manifest.permissions) {
        for (var i = 0; i < manifest.permissions.length; ++i) {
          if (typeof manifest.permissions[i] === "string") {
            if (manifest.permissions[i].indexOf('://') > -1) {
              // Check for wildcard path scenario: <scheme>://<host>/ should translate to <scheme>://<host>/*
              if (/:\/\/[^\/]+\/$/.test(manifest.permissions[i])) {
                manifest.permissions[i] += "*";
              }
              whitelist.push(manifest.permissions[i]);
            } else if (manifest.permissions[i] === "<all_urls>") {
              whitelist.push("*");
            } else {
              permissions.push(manifest.permissions[i]);
            }
          } else {
            permissions = permissions.concat(Object.keys(manifest.permissions[i]));
          }
        }
      }
      for (var i = 0; i < permissions.length; i++) {
        var plugins = PLUGIN_MAP[permissions[i]];
        if (plugins) {
          for (var j = 0; j < plugins.length; ++j) {
            ACTIVE_PLUGINS.push(plugins[j]);
          }
        }
      }
      if (manifest.key) {
        // stub for testing
        function mapAppKeyToAppId(key) {
          var mpdec = {'0': 'a', '1': 'b', '2': 'c', '3': 'd', '4': 'e', '5': 'f', '6': 'g', '7': 'h',
                       '8': 'i', '9': 'j', 'a': 'k', 'b': 'l', 'c': 'm', 'd': 'n', 'e': 'o', 'f': 'p' };
          return (Crypto.SHA256(new Buffer(key, 'base64'))
                  .substr(0,32)
                  .replace(/[a-f0-9]/g, function(char) {
                     return mpdec[char];
                  }));
        }
        chromeAppId = mapAppKeyToAppId(manifest.key);
      } else {
        // All zeroes -- should we use rand() here instead?
        chromeAppId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      }
      callback();
    });
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

    function runAllCmds(callback) {
      chdir(path.join(origDir, appName));
      var curCmd = cmds.shift();
      if (!curCmd)
        return callback();
      runCmd(curCmd, function(err) {
        if (err)
          return fatal(err);
        runAllCmds(callback);
      });
    }

    function afterAllCommands() {
      // Create a script that runs update.js.
      if (isWindows) {
        fs.writeFileSync('.cordova/hooks/after_prepare/mca-update.cmd', 'cd "' + process.cwd() + '"\n"' + process.argv[0] + '" "' + path.join(mcaRoot, scriptName) + '" update-app');
      } else {
        fs.writeFileSync('.cordova/hooks/after_prepare/mca-update.sh', '#!/bin/sh\ncd "' + process.cwd() + '"\n"' + process.argv[0] + '" "' + path.join(mcaRoot, scriptName) + '" update-app');
        fs.chmodSync('.cordova/hooks/after_prepare/mca-update.sh', '777');
      }
      // Create a convenience link to our version of CLI.
      if (isWindows) {
        fs.writeFileSync('cordova.cmd', '"' + process.argv[0] + '" "' + path.join(mcaRoot, 'node_modules', 'cordova', 'bin', 'cordova') + '" %*');
      } else {
        fs.symlinkSync(path.join(mcaRoot, 'node_modules', 'cordova', 'bin', 'cordova'), 'cordova')
      }
      callback();
    }

    var config_default = {
      lib: {
        android: {
          uri: path.join(mcaRoot, 'cordova', 'cordova-android'),
          version: "mca",
          id: "cordova-mca",
          template: path.join(mcaRoot, 'chrome-cordova', 'platform-templates', 'android'),
        },
        ios: {
          uri: path.join(mcaRoot, 'cordova', 'cordova-ios'),
          version: "mca",
          id: "cordova-mca",
          template: path.join(mcaRoot, 'chrome-cordova', 'platform-templates', 'ios'),
        },
        www: {
          uri: appDir,
          version: "mca",
          id: appName
        }
      }
    };

    runCmd(['create', appName, appId, appName, config_default], function(err) {
      if(err)
        return fatal(err);
      writeConfigStep(function(err) {
        if(err)
           return fatal(err);
        runAllCmds(afterAllCommands);
      });
    });
  }

  function writeConfigStep(callback) {
    console.log("Writing config.xml");
    fs.readFile(path.join(mcaRoot, 'chrome-cordova', 'templates', 'config.xml'), {encoding: 'utf-8'}, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        var whitelistXML = "";
        for (var i = 0; i < whitelist.length; i++) {
          whitelistXML = whitelistXML + "    <access origin=\"" + whitelist[i] + "\" />\n";
        }
      var configfile = data.replace(/__APP_NAME__/, (manifest && manifest.name) || appName)
          .replace(/__APP_ID__/, appId)
          .replace(/__APP_VERSION__/, (manifest && manifest.version) || "0.0.1")
          .replace(/__CHROME_APP_ID__/, chromeAppId)
          .replace(/__DESCRIPTION__/, (manifest && manifest.description) || "Plain text description of this app")
          .replace(/__AUTHOR__/, (manifest && manifest.author) || "Author name and email")
          .replace(/__WHITELIST__/, whitelistXML);
      fs.writeFile(path.join(appName, 'www', 'config.xml'), configfile, callback);
      }
    });
  }

  var welcomeText="\nCongratulations! Your project has been created at: "+
                  path.join(origDir,appName)+"\n"+
                  "Be sure to edit only the copy of your application that is in the project www directory:\n"+
                  path.join(origDir,appName,"www")+" \n"+
                  "After any edits, remember to run 'cordova prepare'\n"+
                  "This ensures that any changes are reflected in your mobile application projects\n";

  function prepareStep(callback) {
    runCmd(['prepare'], function(err) {
       if(err) {
          return fatal(err);
       }
       if(commandLineFlags.source) {
         console.log(welcomeText);
       }
       callback()
    });
  }

  eventQueue.push(validateSourceArgStep);
  eventQueue.push(readManifestStep);
  eventQueue.push(buildCordovaJsStep);
  eventQueue.push(createStep);
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

  /* Android asset packager ignores, by default, directories beginning with
     underscores. This can be fixed with an update to the project.properties
     file, but only when compiling with ant. There is a bug outstanding to
     fix this behaviour in Eclipse/ADT as well.

     References:
       https://code.google.com/p/android/issues/detail?id=5343
       https://code.google.com/p/android/issues/detail?id=41237
   */
  function moveI18NMessagesDir(platform) {
    return function(callback) {
      var badPath = path.join(assetDirForPlatform(platform), '_locales');
      var betterPath = path.join(assetDirForPlatform(platform), 'MCA_locales');
      if (fs.existsSync(badPath)) {
        console.log('## Moving ' + platform + ' locales directory');
        fs.renameSync(badPath, betterPath);
        console.log('## Renaming directories inside locales');
        fs.readdir(betterPath,function(err, files) {
          if (!err) {
            for (var i=0; i<files.length; i++) {
              var fullName = path.join(betterPath, files[i]);
              var adjustedFilename= files[i].replace('-', '_').toLowerCase();
              if (files[i] !== adjustedFilename) {
                stats = fs.statSync(fullName);
                if (stats.isDirectory()) {
                  fs.renameSync(fullName, path.join(betterPath, adjustedFilename));
                }
              }
            }
          }
          callback();
        });
      } else {
        callback();
      }
    };
  }

  function copyIconAssetsStep(platform) {
    return function(callback) {
      readManifest('www/manifest.json', function(manifest) {
        var permissions = [];
        if (manifest && manifest.icons) {
          var iconMap = {};
          if (platform === "android") {
            iconMap = {
              "36": [path.join('res','drawable-ldpi','icon.png')],
              "48": [path.join('res','drawable-mdpi','icon.png')],
              "72": [path.join('res','drawable-hdpi','icon.png')],
              "96": [path.join('res','drawable-xhdpi','icon.png'),
                     path.join('res','drawable','icon.png')],
            };
          } else if (platform === "ios") {
            var cordova = require('cordova');
            var parser = new cordova.platforms.ios.parser(path.join('platforms','ios'));
            iconMap = {
              "57": [path.join(parser.originalName, 'Resources','icons','icon.png')],
              "72": [path.join(parser.originalName, 'Resources','icons','icon-72.png')],
              "114": [path.join(parser.originalName, 'Resources','icons','icon@2x.png')],
              "144": [path.join(parser.originalName, 'Resources','icons','icon-72@2x.png')]
            };
          }
          if (iconMap) {
            //console.log('## Copying icons for ' + platform);
            for (size in iconMap) {
              if (manifest.icons[size]) {
                for (var i=0; i < iconMap[size].length; i++) {
                  //console.log("Copying " + size + "px icon file");
                  copyFile(path.join('www', manifest.icons[size]),
                           path.join('platforms', platform, iconMap[size][i]),
                           function(err) {
                             if (err) {
                               console.log("Error copying " + size + "px icon file");
                             }
                           });
                }
              } else {
                //console.log("No " + size + "px icon file declared");
              }
            }
          }
        }
        callback();
      });
    };
  }

  function createAddJsStep(platform) {
    return function(callback) {
      console.log('## Updating cordova.js for ' + platform);
      copyFile(path.join(mcaRoot, 'cordova', 'cordova-js', 'pkg', 'cordova.' + platform + '.js'), path.join(assetDirForPlatform(platform), 'cordova.js'), callback);
    };
  }

  if (hasAndroid) {
    eventQueue.push(removeVestigalConfigFile('android'));
    eventQueue.push(moveI18NMessagesDir('android'));
    eventQueue.push(createAddJsStep('android'));
    eventQueue.push(copyIconAssetsStep('android'));
  }
  if (hasIos) {
    eventQueue.push(removeVestigalConfigFile('ios'));
    eventQueue.push(moveI18NMessagesDir('ios'));
    eventQueue.push(createAddJsStep('ios'));
    eventQueue.push(copyIconAssetsStep('ios'));
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
             '        mca init.\n' +
             '\n' +
             'create [--android] [--ios] [--source path] - Creates a new project.\n' +
             '    Flags:\n' +
             '        --android: Add the Android platform (default if android SDK is detected).\n' +
             '        --ios: Add the iOS platform (default if Xcode is detected).\n' +
             '        --source=path/to/chromeapp: Create a project based on the given chrome app.\n' +
             '    Examples:\n' +
             '        mca create org.chromium.Demo\n' +
             '        mca create org.chromium.Spec --android --source=chrome-cordova/spec/www\n' +
             'Cordova commands will be forwarded directly to cordova.\n' +
             '    Commands:\n' +
             '        build, compile, emulate, platform(s), plugin(s), prepare, run\n' +
             '    Examples:\n' +
             '        mca platform add ios\n' +
             '        mca build ios\n' +
             '    Run "cordova help" for details.\n'
      ).options('h', {
          alias: 'help',
          desc: 'Show usage message.'
      }).argv;

  if (commandLineFlags.h || !commandLineFlags._[0]) {
    optimist.showHelp();
    exit(1);
  }
}

function main() {
  parseCommandLine();
  var command = commandLineFlags._[0];
  var appId = commandLineFlags._[1] || '';

  var commandActions = {
    // Secret command used by our prepare hook.
    'update-app': function() {
      updateAppCommand();
    },
    'init': function() {
      toolsCheck();
      initCommand();
    },
    'create': function() {
      ensureHasRunInit();
      promptIfNeedsUpdate();
      toolsCheck();
      createCommand(appId, commandLineFlags.android, commandLineFlags.ios);
    },
  };

  // The following commands are forwarded to cordova with all args.
  var cordovaCommands = {
    'build': 1,
    'compile': 1,
    'emulate': 1,
    'platform': 1,
    'platforms': 1,
    'plugin': 1,
    'plugins': 1,
    'prepare': 1,
    'run': 1
  };

  if (commandActions.hasOwnProperty(command)) {
    commandActions[command]();
    pump();
  } else if (cordovaCommands[command]) {
    console.log('Running cordova ' + command);
    // TODO (kamrik): to avoid this hackish require, add require('cli') in cordova.js
    var CLI = require('../node_modules/cordova/src/cli');
    new CLI(process.argv);
  } else {
    fatal('Invalid command: ' + command + '. Use --help for usage.');
  }
}

if (require.main === module) {
    main();
} else {
    module.exports = {
        parseCLI: main
    };
}

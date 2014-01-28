#!/usr/bin/env node
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

// System modules.
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

// Third-party modules.
var optimist = require('optimist');
var Crypto = require('cryptojs').Crypto;
var et = require('elementtree');
var shelljs = require('shelljs');
var cordova = require('cordova');

// Globals
var isGitRepo = fs.existsSync(path.join(__dirname, '..', '.git')); // git vs npm
var commandLineFlags = null;
var origDir = process.cwd();
var isWindows = process.platform.slice(0, 3) == 'win';
var eventQueue = [];
var ccaRoot = path.join(__dirname, '..');
var scriptName = path.basename(process.argv[1]);
var hasAndroidSdk = false;
var hasAndroidPlatform = false;
var hasXcode = false;

/******************************************************************************/
/******************************************************************************/

var DEFAULT_PLUGINS = [
    'org.apache.cordova.file',
    'org.apache.cordova.inappbrowser',
    'org.apache.cordova.network-information',
    'org.apache.cordova.keyboard',
    'org.apache.cordova.statusbar',
    'org.chromium.navigation',
    'org.chromium.bootstrap',
    'org.chromium.i18n',
    'org.chromium.polyfill.CustomEvent',
    'org.chromium.polyfill.xhr_features',
    'org.chromium.polyfill.blob_constructor',
];

var PLUGIN_MAP = {
  'alarms': ['org.chromium.alarms'],
  'fileSystem': ['org.chromium.fileSystem',
                 'org.chromium.FileChooser'],
  'identity': ['org.chromium.identity'],
  'idle': ['org.chromium.idle'],
  'notifications': ['org.chromium.notifications'],
  'payments': ['com.google.payments'],
  'power': ['org.chromium.power'],
  'pushMessaging': ['org.chromium.pushMessaging'],
  'socket': ['org.chromium.socket'],
  'storage': ['org.chromium.storage'],
  'syncFileSystem': ['org.chromium.syncFileSystem'],
  'unlimitedStorage': []
};

var CORDOVA_CONFIG_JSON = {
  plugin_search_path: [
      path.join(ccaRoot, 'cordova'),
      path.join(ccaRoot, 'cordova', 'cordova-plugins'),
      path.join(ccaRoot, 'chrome-cordova', 'plugins'),
      ],
  lib: {
    android: {
      uri: path.join(ccaRoot, 'cordova', 'cordova-android')
    },
    ios: {
      uri: path.join(ccaRoot, 'cordova', 'cordova-ios')
    }
  }
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

function fixPathSlashes(p) {
  return isWindows ? p.replace(/\//g, '\\') : p;
}

function colorizeConsole() {
  var origWarn = console.warn;
  console.warn = function() {
    var msg = [].slice.call(arguments).join(' ');
    origWarn.call(console, '\x1B[33m' + msg + '\x1B[39m');
  };
  console.error = function() {
    var msg = [].slice.call(arguments).join(' ');
    origWarn.call(console, '\x1B[31m' + msg + '\x1B[39m');
  };
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

function chdir(d) {
  d = path.resolve(ccaRoot, d);
  if (process.cwd() != d) {
    console.log('Changing directory to: ' + d);
    process.chdir(d);
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

function getManifest(manifestDir, callback) {
  var manifestFilename = path.join(manifestDir, 'manifest.json');
  var manifestMobileFilename = path.join(manifestDir, 'manifest.mobile.json');

  fs.readFile(manifestFilename, { encoding: 'utf-8' }, function(err, manifestData) {
    if (err) {
      fatal('Unable to open manifest ' + manifestFilename + ' for reading.');
    }
    fs.readFile(manifestMobileFilename, { encoding: 'utf-8' }, function(err, manifestMobileData) {
      // Manifest Mobile is not required, its not fatal if we fail reading it
      try {
        var manifest = eval('(' + manifestData + ')');
        var manifestMobile = err ? {} : eval('(' + manifestMobileData + ')');
        var extend = require('node.extend');
        manifest = extend(true, manifest, manifestMobile); // true -> deep recursive merge of these objects
        callback(manifest);
      } catch (e) {
        console.error(e);
        fatal('Unable to parse manifest ' + manifestFilename);
      }
    });
  });
}

function mapAppKeyToAppId(key) {
  var mpdec = {'0': 'a', '1': 'b', '2': 'c', '3': 'd', '4': 'e', '5': 'f', '6': 'g', '7': 'h',
               '8': 'i', '9': 'j', 'a': 'k', 'b': 'l', 'c': 'm', 'd': 'n', 'e': 'o', 'f': 'p' };
  return (Crypto.SHA256(new Buffer(key, 'base64'))
          .substr(0,32)
          .replace(/[a-f0-9]/g, function(char) {
             return mpdec[char];
          }));
}

function parseManifest(manifest, callback) {
  var permissions = [],
      chromeAppId,
      whitelist = [],
      plugins = [],
      i;
  if (manifest && manifest.permissions) {
    for (i = 0; i < manifest.permissions.length; ++i) {
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
  for (i = 0; i < permissions.length; i++) {
    var pluginsForPermission = PLUGIN_MAP[permissions[i]];
    if (pluginsForPermission) {
      for (var j = 0; j < pluginsForPermission.length; ++j) {
        plugins.push(pluginsForPermission[j]);
      }
    } else {
      console.warn('Permission not supported by cca: ' + permissions[i] + ' (skipping)');
    }
  }
  // Note: chromeAppId is not currently used.
  if (manifest.key) {
    chromeAppId = mapAppKeyToAppId(manifest.key);
  } else {
    // All zeroes -- should we use rand() here instead?
    chromeAppId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  }
  callback(chromeAppId, whitelist, plugins);
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
      } else if (targets.indexOf('Google Inc.:Google APIs:19') > -1 ||
                 targets.indexOf('android-19') > -1) {
          hasAndroidPlatform = true;
      } else {
          console.warn('Android 4.4 (Google APIs) Platform is not installed.');
      }
      exec('ant -version', callback, function() {
        console.warn('Ant not detected on your PATH.');
        callback();
      }, true);
    }, function() {
      console.warn('Android SDK not detected on your PATH.');
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
      fatal('No usable build environment could be found. Please refer to our installation guide: http://goo.gl/KWZFSe');
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
    if (!fs.existsSync(path.join(ccaRoot, path.join('chrome-cordova', 'README.md'))))
      return fatal('Please run \'' + scriptName + ' init\' first');
    callback();
  });
}

function promptIfNeedsGitUpdate() {
  eventQueue.push(function(callback) {
    process.chdir(ccaRoot);
    exec('git pull --rebase --dry-run', function(stdout, stderr) {
      var needsUpdate = (!!stdout || !!stderr);
      if (!needsUpdate)
        return callback();

      console.warn('Warning: mobile-chrome-apps has updates pending; Please run \'' + scriptName + ' init\'');
      waitForKey('Continue anyway? [y/n] ', function(key) {
        if (key.toLowerCase() !== 'y')
          return exit(1);
        callback();
      });
    }, function(error) {
      console.warn("Could not check repo for updates:");
      console.warn(error.toString());
      callback();
    }, true);
  });
}


/******************************************************************************/
/******************************************************************************/
// Init

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

    process.chdir(ccaRoot);
    exec('git pull --rebase', callback);
  }

  function checkOutSubModules(callback) {
    console.log('## Updating git submodules');

    process.chdir(ccaRoot);

    var error = function(error) {
      console.log("Could not update submodules:");
      console.warn(error.toString());
      console.log("Continuing without update.");
      callback();
    }
    exec('git submodule status', function(stdout) {
      var isFirstInit = stdout.split('\n').some(function(s) { return s[0] == '-'; });
      if (isFirstInit) {
        console.warn('The next step may take a while the first time.');
      }
      exec('git submodule update --init --recursive', callback, error);
    }, error);
  }

  function cleanup(callback) {
    process.chdir(origDir);
    callback();
  }

  if (isGitRepo) {
    eventQueue.push(checkGit);
    eventQueue.push(checkOutSelf);
    eventQueue.push(checkOutSubModules);
  }
  eventQueue.push(cleanup);
}

/******************************************************************************/
/******************************************************************************/

function runCmd(cmd, callback) {
  // Hack to remove the obj passed to the cordova create command.
  console.log(cmd.join(' ').replace('[object Object]', ''));
  cordova[cmd[0]].apply(cordova, cmd.slice(1).concat([callback]));
}

function runAllCmds(commands, callback) {
  if (commands.length === 0) {
    return callback();
  }
  var curCmd = commands[0],
      moreCommands = commands.slice(1);
  runCmd(curCmd, function(err) {
    if (err)
      return fatal(err);
    runAllCmds(moreCommands, callback);
  });
}


/******************************************************************************/
/******************************************************************************/
// Create App

function createCommand(destAppDir, addAndroidPlatform, addIosPlatform) {
  var srcAppDir = null;
  var manifest = null;

  var whitelist = [];
  var plugins = [];
  var chromeAppId;

  function resolveTilde(string) {
    // TODO: implement better
    if (string.substr(0,1) === '~')
      return path.resolve(process.env.HOME + string.substr(1))
    return string
  }

  function validateSourceArgStep(callback) {
    var sourceArg = commandLineFlags['copy-from'] || commandLineFlags['link-to'];
    if (!sourceArg) {
      srcAppDir = path.join(ccaRoot, 'templates', 'default-app');
    } else {
      // Strip off manifest.json from path (its containing dir must be the root of the app)
      if (path.basename(sourceArg) === 'manifest.json') {
        sourceArg = path.dirname(sourceArg);
      }
      // Always check the sourceArg as a relative path, even if its a special value (like 'spec')
      var dirsToTry = [ path.resolve(origDir, resolveTilde(sourceArg)) ];

      // Special values for sourceArg we resolve to predefined locations
      if (sourceArg === 'spec') {
        dirsToTry.push(path.join(ccaRoot, 'chrome-cordova', 'spec', 'www'));
      } else if (sourceArg === 'default') {
        dirsToTry.push(path.join(ccaRoot, 'templates', 'default-app'));
      }

      // Find the first valid path in our list (valid paths contain a manifest.json file)
      var foundManifest = false;
      for (var i = 0; i < dirsToTry.length; i++) {
        srcAppDir = dirsToTry[i];
        console.log('Searching for Chrome app source in ' + srcAppDir);
        if (fs.existsSync(path.join(srcAppDir, 'manifest.json'))) {
          foundManifest = true;
          break;
        }
      }
      if (!srcAppDir) {
        fatal('Directory does not exist.');
      }
      if (!foundManifest) {
        fatal('No manifest.json file found');
      }
    }
    callback();
  }

  function readManifestStep(callback) {
    getManifest(srcAppDir, function(manifestData) {
      parseManifest(manifestData, function(chromeAppIdFromManifest, whitelistFromManifest, pluginsFromManifest) {
        // Set globals
        manifest = manifestData;
        chromeAppId = chromeAppIdFromManifest;
        whitelist = whitelistFromManifest;
        plugins = pluginsFromManifest;
        callback();
      });
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
    DEFAULT_PLUGINS.forEach(function(pluginID) {
      cmds.push(['plugin', 'add', pluginID]);
    });
    plugins.forEach(function(pluginPath) {
      cmds.push(['plugin', 'add', pluginPath]);
    });

    function afterAllCommands() {
      // Create scripts that update the cordova app on prepare
      fs.mkdirSync(path.join('hooks', 'before_prepare'));
      fs.mkdirSync(path.join('hooks', 'after_prepare'));

      function writeHook(path, ccaArg) {
        var contents = [
            '#!/usr/bin/env node',
            'var child_process = require("child_process");',
            'var fs = require("fs");',
            'var isWin = process.platform.slice(0, 3) === "win";',
            'var cmd = isWin ? "cca.cmd" : "cca";',
            'if (!isWin && fs.existsSync(cmd)) { cmd = "./" + cmd }',
            'var p = child_process.spawn(cmd, ["' + ccaArg + '"], { stdio:"inherit" });',
            'p.on("close", function(code) { process.exit(code); });',
            ];
        fs.writeFileSync(path, contents.join('\n'));
        fs.chmodSync(path, '777');
      }
      writeHook(path.join('hooks', 'before_prepare', 'cca-pre-prepare.js'), 'pre-prepare');
      writeHook(path.join('hooks', 'after_prepare', 'cca-post-prepare.js'), 'update-app');

      // Create a convenience link to cca
      if (isGitRepo) {
        var ccaPath = path.relative('.', path.join(ccaRoot, 'src', 'cca.js'));
        var comment = 'Feel free to rewrite this file to point at "cca" in a way that works for you.';
        fs.writeFileSync('cca.cmd', 'REM ' + comment + '\r\nnode "' + ccaPath.replace(/\//g, '\\') + '" %*\r\n');
        fs.writeFileSync('cca', '#!/bin/sh\n# ' + comment + '\nexec "$(dirname $0)/' + ccaPath.replace(/\\/g, '/') + '" "$@"\n');
        fs.chmodSync('cca', '777');
      }
      callback();
    }

    var config_default = JSON.parse(JSON.stringify(CORDOVA_CONFIG_JSON));
    config_default.lib.www = { uri: srcAppDir };
    if (commandLineFlags['link-to']) {
      config_default.lib.www.link = true;
    }

    function writeConfigStep(callback) {
      console.log("Writing config.xml");
      fs.readFile(path.join(ccaRoot, 'templates', 'config.xml'), {encoding: 'utf-8'}, function(err, data) {
        if (err) {
          console.log(err);
        } else {
          var configfile = data
              .replace(/__APP_NAME__/, (manifest.name) || "Your App Name")
              .replace(/__APP_PACKAGE_ID__/, (manifest.packageId) || "com.your.company.HelloWorld")
              .replace(/__APP_VERSION__/, (manifest.version) || "0.0.1")
              .replace(/__DESCRIPTION__/, (manifest.description) || "Plain text description of this app")
              .replace(/__AUTHOR__/, (manifest.author) || "Author name and email");
          fs.writeFile(path.join(destAppDir, 'config.xml'), configfile, callback);
        }
      });
    }

    runCmd(['create', destAppDir, manifest.name, manifest.name, config_default], function(err) {
      if(err)
        return fatal(err);
      writeConfigStep(function(err) {
        if(err)
           return fatal(err);
        chdir(path.join(origDir, destAppDir));
        runAllCmds(cmds, afterAllCommands);
      });
    });
  }

  function ensureManifestMobileExists(callback) {
    var manifestMobileFilename = path.join('www', 'manifest.mobile.json');
    if (fs.existsSync(manifestMobileFilename)) {
      return callback();
    }
    var defaultManifestMobileFilename = path.join(ccaRoot, 'templates', 'default-app', 'manifest.mobile.json');
    if (!fs.existsSync(defaultManifestMobileFilename)) {
      return callback();
    }
    shelljs.cp('-f', defaultManifestMobileFilename, manifestMobileFilename);
    return callback();
  }

  function prepareStep(callback) {
    var wwwPath = path.join(origDir, destAppDir, 'www');
    var welcomeText = 'Done!\n\n';
    if (commandLineFlags['link-to']) {
      welcomeText += 'Your project has been created, with the following symlink:\n' +
                     wwwPath + ' --> ' + path.resolve(origDir, commandLineFlags['link-to']) + '\n\n';
    } else {
      welcomeText += 'Your project has been created, with web assets residing inside the `www` folder:\n'+
                     wwwPath + '\n\n';
    }
    welcomeText += 'Remember to run `cca prepare` after making changes (full instructions: http://goo.gl/iCaCFG).';

    runCmd(['prepare'], function(err) {
       if(err) {
          return fatal(err);
       }
       console.log(welcomeText);
       callback()
    });
  }

  eventQueue.push(validateSourceArgStep);
  eventQueue.push(readManifestStep);
  eventQueue.push(createStep);
  eventQueue.push(ensureManifestMobileExists);
  eventQueue.push(prepareStep);
}

/******************************************************************************/
/******************************************************************************/
// Update App

function prePrepareCommand() {
  var plugins = [];

  /* pre-prepare manifest check and project munger */
  function readManifestStep(callback) {
    getManifest('www', function(manifest) {
      parseManifest(manifest, function(chromeAppId, whitelist, pluginsFromManifest) {
        plugins = pluginsFromManifest;
        console.log("Writing config.xml");
        fs.readFile('config.xml', {encoding: 'utf-8'}, function(err, data) {
          if (err) {
            console.log(err);
          } else {
            var tree = et.parse(data);

            var widget = tree.getroot();
            if (widget.tag == 'widget') {
              widget.attrib.version = manifest.version;
              widget.attrib.id = manifest.packageId;
            }

            var name = tree.find('./name');
            if (name) name.text = manifest.name;

            var description = tree.find('./description');
            if (description) description.text = manifest.description;

            var author = tree.find('./author');
            if (author) author.text = manifest.author;

            var content = tree.find('./content');
            if (content) content.attrib.src = "plugins/org.chromium.bootstrap/chromeapp.html";

            var access = widget.findall('access');
            access.forEach(function(elem, index) {
              /* The useless '0' parameter here will be removed with elementtree 0.1.6 */
              widget.remove(0, elem);
            });
            whitelist.forEach(function(pattern, index) {
              var tag = et.SubElement(widget, 'access');
              tag.attrib.origin = pattern;
            });

            var configfile = et.tostring(tree.getroot(), {indent: 4});
            fs.writeFile('config.xml', configfile, callback);
          }
        });
      });
    });
  }

  function installPluginsStep(callback) {
    console.log("Updating plugins");
    var cmds = [];
    plugins.forEach(function(pluginPath) {
      cmds.push(['plugin', 'add', pluginPath]);
    });
    runAllCmds(cmds, callback);
  }

  eventQueue.push(readManifestStep);
  eventQueue.push(installPluginsStep);
}

/******************************************************************************/

function postPrepareCommand() {
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
      var betterPath = path.join(assetDirForPlatform(platform), 'CCA_locales');
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
      getManifest('www', function(manifest) {
        if (manifest && manifest.icons) {
          var iconMap = {};
          var iPhoneFiles = {
              'icon-40': true,
              'icon-small': true,
              'icon.png': true,
              'icon@2x': true,
              'icon-72': true,
              'icon-72@2x': true
          };
          var iPadFiles = {
              'icon-small': true,
              'icon-40': true,
              'icon-50': true,
              'icon-76': true,
              'icon': true,
              'icon@2x': true,
              'icon-72': true,
              'icon-72@2x': true
          };
          var infoPlistXml = null;
          var infoPlistPath = null;
          var iosIconDir = null;

          if (platform === "android") {
            iconMap = {
              "36": [path.join('res','drawable-ldpi','icon.png')],
              "48": [path.join('res','drawable-mdpi','icon.png')],
              "72": [path.join('res','drawable-hdpi','icon.png')],
              "96": [path.join('res','drawable-xhdpi','icon.png')],
              "144": [path.join('res','drawable-xxhdpi','icon.png')],
              "192": [path.join('res','drawable-xxxhdpi','icon.png')]
            };
          } else if (platform === "ios") {
            var platforms = require('cordova/platforms');
            var parser = new platforms.ios.parser(path.join('platforms','ios'));
            iconMap = {
              "-1": [path.join(parser.originalName, 'Resources','icons','icon-60.png')], // this file exists in the template but isn't used.
              "29": [path.join(parser.originalName, 'Resources','icons','icon-small.png')],
              "40": [path.join(parser.originalName, 'Resources','icons','icon-40.png')],
              "50": [path.join(parser.originalName, 'Resources','icons','icon-50.png')],
              "57": [path.join(parser.originalName, 'Resources','icons','icon.png')],
              "58": [path.join(parser.originalName, 'Resources','icons','icon-small@2x.png')],
              "72": [path.join(parser.originalName, 'Resources','icons','icon-72.png')],
              "76": [path.join(parser.originalName, 'Resources','icons','icon-76.png')],
              "80": [path.join(parser.originalName, 'Resources','icons','icon-40@2x.png')],
              "100": [path.join(parser.originalName, 'Resources','icons','icon-50@2x.png')],
              "114": [path.join(parser.originalName, 'Resources','icons','icon@2x.png')],
              "120": [path.join(parser.originalName, 'Resources','icons','icon-60@2x.png')],
              "144": [path.join(parser.originalName, 'Resources','icons','icon-72@2x.png')],
              "152": [path.join(parser.originalName, 'Resources','icons','icon-76@2x.png')]
            };
            infoPlistPath = path.join('platforms', 'ios', parser.originalName, parser.originalName + '-Info.plist');
            infoPlistXml = et.parse(fs.readFileSync(infoPlistPath, 'utf-8'));
            iosIconDir = path.join(parser.originalName, 'Resources', 'icons');
          }
          function copyIcon(size, dstPath) {
            shelljs.mkdir('-p', path.dirname(dstPath));
            shelljs.cp('-f', path.join('www', fixPathSlashes(manifest.icons[size])), dstPath);
            if (shelljs.error()) {
              console.log("Error copying " + size + "px icon file: " + shelljs.error());
            }
          }
          var missingIcons = [];
          if (iconMap) {
            //console.log('## Copying icons for ' + platform);
            for (size in iconMap) {
              for (var i=0; i < iconMap[size].length; i++) {
                var dstPath = path.join('platforms', platform, iconMap[size][i]);
                if (manifest.icons[size]) {
                  //console.log("Copying " + size + "px icon file");
                  copyIcon(size, dstPath);
                } else {
                  missingIcons.push(dstPath);
                }
              }
            }
            // Find the largest icon.
            var bestSize = '0';
            for (size in manifest.icons) {
              bestSize = +size > +bestSize ? size : bestSize;
            }
            missingIcons.forEach(function(dstPath) {
              var imgName = path.basename(dstPath).replace(/\..*?$/, '');
              // Leave at least one icon.
              if (imgName != 'icon') {
                delete iPadFiles[imgName];
                delete iPhoneFiles[imgName];
              }
              // TODO: need to remove the iOS assets from the Xcode project file (ugh).
              if (platform == 'android') {
                shelljs.rm('-f', dstPath);
              } else if (platform == 'ios') {
                // Fill in all missing iOS icons with the largest resolution we have.
                copyIcon(bestSize, dstPath);
              }
            });
            // Use the largest icon as the default Android one.
            if (platform == 'android') {
              var dstPath = path.join('platforms', platform, 'res', 'drawable', 'icon.png');
              copyIcon(bestSize, dstPath);
            }
            if (infoPlistXml) {
              function findArrayNode(key) {
                var foundNode = null;
                var foundKey = 0;
                infoPlistXml.iter('*', function(e) {
                  if (foundKey == 0) {
                    if (e.text == key) {
                      foundKey = 1;
                    }
                  } else if (foundKey == 1) {
                    if (e.text == 'CFBundleIconFiles') {
                      foundKey = 2;
                    }
                  } else if (foundKey == 2) {
                    if (e.tag == 'array') {
                      foundNode = e;
                      foundKey = 3;
                    }
                  }
                });
                return foundNode;
              }
              function setValues(key, vals) {
                var node = findArrayNode(key);
                node.clear();
                for (var imgName in vals) {
                  et.SubElement(node, 'string').text = imgName;
                }
              }
              setValues('CFBundleIcons', iPhoneFiles);
              setValues('CFBundleIcons~ipad', iPadFiles);
              fs.writeFileSync(infoPlistPath, et.tostring(infoPlistXml.getroot(), {indent: 8}), 'utf8');
            }
          }
        }
        callback();
      });
    };
  }

  function mergeManifests(platform) {
    return function (callback) {
      var root = assetDirForPlatform(platform);
      getManifest(root, function(manifest) {
        fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest), callback);
      });
    };
  }

  // Set the "other" version values if defined in the manifest.
  // CFBundleVersion on iOS and versionCode on Android.
  function setVersionCode(platform) {
    return function(callback) {
      var root = assetDirForPlatform(platform);
      getManifest(root, function(manifest) {
        // Android
        if (platform === 'android' && manifest && manifest.versionCode) {
          var androidManifestPath = path.join('platforms', 'android', 'AndroidManifest.xml');
          var androidManifest = et.parse(fs.readFileSync(androidManifestPath, 'utf-8'));
          androidManifest.getroot().attrib["android:versionCode"] = manifest.versionCode;
          fs.writeFileSync(androidManifestPath, androidManifest.write({indent: 4}), 'utf-8');
        }

        // On iOS it is customary to set CFBundleVersion = CFBundleShortVersionString
        // so if manifest.CFBundleVersion is not specifically set, we'll default to manifest.version
        if (platform === 'ios' && manifest && (manifest.version || manifest.CFBundleVersion)) {
          var platforms = require('cordova/platforms');
          var parser = new platforms.ios.parser(path.join('platforms','ios'));
          var infoPlistPath = path.join('platforms', 'ios', parser.originalName, parser.originalName + '-Info.plist');
          var infoPlistXml = et.parse(fs.readFileSync(infoPlistPath, 'utf-8'));
          var theNode;
          var isFound = 0;

          // plist file format is pretty strange, we need the <string> node
          // immediately following <key>CFBundleVersion</key>
          // iterating over all the nodes.
          infoPlistXml.iter('*', function(e) {
            if (isFound == 0) {
              if (e.text == 'CFBundleVersion') {
                isFound = 1;
              }
            } else if (isFound == 1) {
              theNode = e;
              isFound = 2;
            }
          });

          theNode.text = manifest.CFBundleVersion || manifest.version;
          fs.writeFileSync(infoPlistPath, infoPlistXml.write({indent: 4}), 'utf-8');
        }
        callback();
      });
    }
  }

  if (hasAndroid) {
    eventQueue.push(moveI18NMessagesDir('android'));
    eventQueue.push(copyIconAssetsStep('android'));
    eventQueue.push(setVersionCode('android'));
    eventQueue.push(mergeManifests('android'));
  }
  if (hasIos) {
    eventQueue.push(moveI18NMessagesDir('ios'));
    eventQueue.push(copyIconAssetsStep('ios'));
    eventQueue.push(setVersionCode('ios'));
    eventQueue.push(mergeManifests('ios'));
  }
}

/******************************************************************************/
/******************************************************************************/

function parseCommandLine() {
  var pathToApp = '<' + path.join('path', 'to', 'app') + '>';
  commandLineFlags = optimist
      .usage('Usage: $0 <command> [commandArgs]\n' +
             '\n' +
             'checkenv - Ensures that your environment is setup correctly.\n' +
             '    Example:\n' +
             '        cca checkenv\n' +
             '\n' +
             'create <directory> [--android] [--ios] [--copy-from=' + pathToApp + ' | --link-to=' + pathToApp + '] - Creates a project.\n' +
             '    Details:\n' +
             '        <directory>: The directory to create the project in.\n' +
             '        --android: Add the Android platform (default if android SDK is detected).\n' +
             '        --ios: Add the iOS platform (default if Xcode is detected).\n' +
             '        --copy-from=' + pathToApp + ': Create a project based on the given Chrome App.\n' +
             '        --link-to=' + pathToApp + ': Create a project that symlinks to the given Chrome App.\n' +
             '\n' +
             'platform [{add|remove|rm} <PLATFORM>] ..... add or remove a specified PLATFORM, OR\n' +
             '         [{list|ls}] ...................... list all installed and available platforms\n' +
             '         [{update|up} <PLATFORM>] ......... update the version of Cordova used for a specific\n' +
             '                                            PLATFORM; use after updating the CLI.\n' +
             '\n' +
             'plugin [{add|remove|rm} <PATH|URI>] ....... add or remove a plugin from the specified PATH or URI, OR\n' +
             '       [{ls|list}] ........................ list all currently installed plugins\n' +
             '       [search <keyword1 keyword2...>] .... search the plugin registry for plugins matching the keywords\n' +
             '\n' +
             'prepare [PLATFORM..] ...................... copies files for specified platforms, or all platforms,\n' +
             '                                            so that the project is ready to build in each SDK\n' +
             '\n' +
             'build [PLATFORM...] ....................... shortcut for prepare, then compile\n' +
             '\n' +
             'run [--debug|--release]\n' +
             '    [--device|--emulator|--target=FOO]\n' +
             '    [PLATFORM] ............................ deploys app on specified platform devices / emulators\n' +
             '\n' +
             'serve [PORT] .............................. runs a local web server for www/ assets. Port defaults to 8000.\n' +
             '                                            Access projects at: http://HOST_IP:PORT/PLATFORM/www\n' +
             'Examples:\n' +
             '    cca create MyApp\n' +
             '    cca create MyApp --link-to=' + pathToApp + '\n' +
             '    cca prepare\n' +
             '    cca run android --device\n' +
             '    cca run ios --emulator\n' +
             '    cca plugin ls'
      ).options('h', {
          alias: 'help',
          desc: 'Show usage message.'
      }).options('d', {
          alias: 'verbose',
          desc: 'Enable verbose logging.'
      }).options('v', {
          alias: 'version',
          desc: 'Show version.'
      }).options('android', { type: 'boolean'
      }).options('ios', { type: 'boolean'
      }).options('pause_on_exit', { type: 'boolean'
      }).options('copy-from', { type: 'string'
      }).options('link-to', { type: 'string'
      }).argv;
}

function fixEnv() {
  if (isWindows) {
    // Windows java installer doesn't add javac to PATH, nor set JAVA_HOME (ugh).
    var javacInPath = !shelljs.which('javac');
    var hasJavaHome = !!process.env['JAVA_HOME'];
    if (hasJavaHome && !javacInPath) {
      process.env['PATH'] += ';' + process.env['JAVA_HOME'] + '\\bin';
    } else if (!hasJavaHome || !javacInPath) {
      var firstJdkDir =
          shelljs.ls(process.env['ProgramFiles'] + '\\java\\jdk*')[0] ||
          shelljs.ls('C:\\Program Files\\java\\jdk*')[0] ||
          shelljs.ls('C:\\Program Files (x86)\\java\\jdk*')[0];
      if (firstJdkDir) {
        if (!javacInPath) {
          process.env['PATH'] += ';' + firstJdkDir + '\\bin';
        }
        process.env['JAVA_HOME'] = firstJdkDir;
        console.log('Set JAVA_HOME to ' + firstJdkDir);
      }
    }
  }
}

function main() {
  parseCommandLine();
  var command = commandLineFlags._[0];
  var packageVersion = require('../package').version;

  if (commandLineFlags.v) {
    command = 'version';
  }
  if (commandLineFlags.h || !command) {
    command = 'help';
  }

  // Colorize after parseCommandLine to avoid --help being printed in red.
  colorizeConsole();

  // TODO: Add env detection to Cordova.
  fixEnv();

  var commandActions = {
    // Secret command used by our prepare hook.
    'pre-prepare': function() {
      prePrepareCommand();
    },
    'update-app': function() {
      postPrepareCommand();
    },
    'init': function() {
      toolsCheck();
      initCommand();
    },
    'checkenv': function() {
      toolsCheck();
    },
    'create': function() {
      ensureHasRunInit();
      if (isGitRepo) {
        promptIfNeedsGitUpdate();
      }
      toolsCheck();

      var destAppDir = commandLineFlags._[1] || '';
      createCommand(destAppDir, commandLineFlags.android, commandLineFlags.ios);
    },
    'version': function() {
      console.log(packageVersion);
    },
    'help': function() {
      optimist.showHelp(console.log);
    }
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
    'run': 1,
    'serve': 1
  };

  cordova.config.setAutoPersist(false);
  var projectRoot = cordova.findProjectRoot();
  if (projectRoot) {
    cordova.config(projectRoot, CORDOVA_CONFIG_JSON);
  }
  if (commandActions.hasOwnProperty(command)) {
    if (command != 'version') {
      console.log('cca v' + packageVersion);
    }
    if (commandLineFlags.d) {
      cordova.on('verbose', console.log);
      require('plugman').on('verbose', console.log);
    }
    commandActions[command]();
    pump();
  } else if (cordovaCommands[command]) {
    console.log('cca v' + packageVersion);
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
    module.exports.parseCLI = main;
}

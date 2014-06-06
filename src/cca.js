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
var et = require('elementtree');
var shelljs = require('shelljs');
var cordova = require('cordova');
var Q = require('q');

// Globals
var isGitRepo = fs.existsSync(path.join(__dirname, '..', '.git')); // git vs npm
var origDir = process.cwd();
var isWindows = process.platform.slice(0, 3) == 'win';
var ccaRoot = path.join(__dirname, '..');
var scriptName = path.basename(process.argv[1]);
var hasAndroidSdk = false;
var hasAndroidPlatform = false;
var hasXcode = false;
var pause_on_exit = false;

/******************************************************************************/
/******************************************************************************/

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

function exit(code) {
  if (pause_on_exit) {
    waitForKey(function() {
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
}

function fatal(msg) {
  console.error(msg);
  if (msg.stack) console.error(msg.stack);
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

function assetDirForPlatform(platform) {
  if (platform === 'android') {
    return path.join('platforms', platform, 'assets','www');
  }
  return path.join('platforms', platform, 'www');
}

// Returns a promise for an object with 'stdout' and 'stderr' as keys.
function exec(cmd, opt_silent) {
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
}

function chdir(d) {
  d = path.resolve(ccaRoot, d);
  if (process.cwd() != d) {
    console.log('Changing directory to: ' + d);
    process.chdir(d);
  }
}

// Returns a promise with the key as its value.
function waitForKey(opt_prompt) {
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
}

/******************************************************************************/
/******************************************************************************/
// Tools Check

function parseTargetOutput(targetOutput) {
  var targets = [];
  var target;
  var targetRe = /^id: (\d+) or "([^"]*)"/gm;
  while ((target = targetRe.exec(targetOutput))) {
    targets.push(target[2]);
  }
  return targets;
}

// Returns a promise.
function toolsCheck() {
  console.log('## Checking that tools are installed');

  if (!os.tmpdir) return Q.reject('Your version of node (' + process.version + ') is too old. Please update your version of node.');

  // Android
  return exec('android list targets', true /* opt_silent */).then(function(out) {
    var targetOutput = out.stdout;
    hasAndroidSdk = true;
    console.log('Android SDK detected.');
    var targets = parseTargetOutput(targetOutput);
    /* This is the android SDK version declared in cordova-android/framework/project.properties */
    if (!(targets.indexOf('Google Inc.:Google APIs:19') > -1 || targets.indexOf('android-19') > -1)) {
      console.warn('Dependency warning: Android 4.4 (Google APIs) Platform is not installed.' +
        '\nAdd it using the Android SDK Manager (run the "android" command)');
    }
    // Stacking up here because we want to bail after the first one fails.
    return exec('ant -version', true /* opt_silent */).then(function() {
      // Project creation does succeed without javac.
      hasAndroidPlatform = true;
      return exec('javac -version', true /* opt_silent */).then(null, function(err) {
        console.warn('Dependency warning: `javac` command not detected on your PATH.');
      });
    }, function(err) {
      console.warn('Dependency warning: `ant` command not detected on your PATH.');
    });
  }, function(err) {
    console.warn('Android not detected (`android` command not detected on your PATH).');
  })
  // iOS
  .then(function() {
    if (process.platform != 'darwin') return;
    return exec('which xcodebuild', true /* opt_silent */).then(function() {
      return exec('xcodebuild -version', true /* opt_silent */).then(function() {
        hasXcode = true;
        console.log('Xcode detected.');
      }, function(err) {
        console.log('Xcode appears to be installed, but no version is selected (fix this with xcodeselect).');
      });
    }, function(err) {
      console.log('Xcode not detected.');
    });
  })
  // Check for at least one of the tools.
  .then(function() {
    if (!hasAndroidPlatform && ! hasXcode) {
      return Q.reject('No usable build environment could be found. Please refer to our installation guide:\n' +
          'https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Installation.md');
    }
  });
}

/******************************************************************************/
/******************************************************************************/

// Returns a promise.
function ensureHasRunInit() {
  if (!fs.existsSync(path.join(ccaRoot, path.join('chrome-cordova', 'README.md'))))
    return Q.reject('Node submodules not initialized. Please run "dev-bin/git-up.js"');
  return Q();
}

/******************************************************************************/
/******************************************************************************/
// Create App

// Returns a promise.
function createCommand(destAppDir, addAndroidPlatform, addIosPlatform, flags) {
  var srcAppDir = null;
  var manifest = null;

  var whitelist = [];
  var plugins = [];
  var cmds = [];
  var chromeAppId;

  function resolveTilde(string) {
    // TODO: implement better
    if (string.substr(0,1) === '~')
      return path.resolve(process.env.HOME + string.substr(1));
    return string;
  }

  // Validate source arg.
  sourceArg = flags['copy-from'] || flags['link-to'];
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
      dirsToTry.push(path.join(ccaRoot, 'chrome-cordova', 'chrome-apps-api-tests'));
    } else if (sourceArg === 'oldspec') {
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
      return Q.reject('Directory does not exist.');
    }
    if (!foundManifest) {
      return Q.reject('No manifest.json file found');
    }
  }

  // Get the manifest.
  return require('./get-manifest')(srcAppDir).then(function(manifestData) {
    if (!(manifestData.app && manifestData.app.background && manifestData.app.background.scripts && manifestData.app.background.scripts.length)) {
      fatal('No background scripts found in your manifest.json file. Your manifest must contain at least one script in the "app.background.scripts" array.');
    }
    manifest = manifestData;
    return Q.when(require('./parse_manifest')(manifest));
  }).then(function(parsed) {
    chromeAppId = parsed.appId;
    whitelist = parsed.whitelist;
    plugins = parsed.plugins;
  })

  // Create step.
  .then(function() {
    console.log('## Creating Your Application');
    chdir(origDir);

    var platformSpecified = addAndroidPlatform || addIosPlatform;

    if ((!platformSpecified && hasXcode) || addIosPlatform) {
      cmds.push(['platform', 'add', 'ios']);
    }
    if ((!platformSpecified && hasAndroidSdk) || addAndroidPlatform) {
      cmds.push(['platform', 'add', 'android']);
    }

    var config_default = JSON.parse(JSON.stringify(CORDOVA_CONFIG_JSON));
    config_default.lib.www = { uri: srcAppDir };
    if (flags['link-to']) {
      config_default.lib.www.link = true;
    }

    return require('./cordova-commands').runCmd(['create', destAppDir, manifest.name, manifest.name, config_default]);
  }).then(function() {
    chdir(destAppDir);
    console.log("Generating config.xml from manifest.json");
    return Q.ninvoke(fs, 'readFile', path.join(ccaRoot, 'templates', 'config.xml'), {encoding: 'utf-8'});
  }).then(function(data) {
    var configfile = data
        .replace(/__APP_NAME__/, (manifest.name) || "Your App Name")
        .replace(/__APP_PACKAGE_ID__/, (manifest.packageId) || "com.your.company.HelloWorld")
        .replace(/__APP_VERSION__/, (manifest.version) || "0.0.1")
        .replace(/__DESCRIPTION__/, (manifest.description) || "Plain text description of this app")
        .replace(/__AUTHOR__/, (manifest.author) || "Author name and email");
    return Q.ninvoke(fs, 'writeFile', 'config.xml', configfile, { encoding: 'utf-8' });
  }).then(function() {
    return require('./cordova-commands').runAllCmds(cmds);
  })
  .then(function() {
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
    if (isGitRepo || !shelljs.which('cca')) {
      var ccaPath = path.relative('.', path.join(ccaRoot, 'src', 'cca.js'));
      var comment = 'Feel free to rewrite this file to point at "cca" in a way that works for you.';
      fs.writeFileSync('cca.cmd', 'REM ' + comment + '\r\nnode "' + ccaPath.replace(/\//g, '\\') + '" %*\r\n');
      fs.writeFileSync('cca', '#!/bin/sh\n# ' + comment + '\nexec "$(dirname $0)/' + ccaPath.replace(/\\/g, '/') + '" "$@"\n');
      fs.chmodSync('cca', '777');
    }

    // Create a convenience gitignore
    shelljs.cp('-f', path.join(ccaRoot, 'templates', 'DEFAULT_GITIGNORE'), path.join('.', '.gitignore'));
  })

  // Ensure the mobile manifest exists.
  .then(function() {
    var manifestMobileFilename = path.join('www', 'manifest.mobile.json');
    if (fs.existsSync(manifestMobileFilename)) return;
    var defaultManifestMobileFilename = path.join(ccaRoot, 'templates', 'default-app', 'manifest.mobile.json');
    if (!fs.existsSync(defaultManifestMobileFilename)) return; // TODO: Was I supposed to be an error?
    shelljs.cp('-f', defaultManifestMobileFilename, manifestMobileFilename);
  })

  // Add a URL type to the iOS project's .plist file.
  // This is necessary for chrome.identity to redirect back to the app after authentication.
  .then(function() {
    var hasIos = fs.existsSync(path.join('platforms', 'ios'));
    if (hasIos) {
      var platforms = require('cordova/node_modules/cordova-lib').cordova_platforms;
      var parser = new platforms.ios.parser(path.join('platforms','ios'));
      var infoPlistPath = path.join('platforms', 'ios', parser.originalName, parser.originalName + '-Info.plist');
      var infoPlistXml = et.parse(fs.readFileSync(infoPlistPath, 'utf-8'));

      var rootPlistElement = infoPlistXml.getroot();
      var rootDictElement = rootPlistElement.getItem(0);

      var bundleUrlTypesKey = et.SubElement(rootDictElement, 'key');
      bundleUrlTypesKey.text = 'CFBundleURLTypes';
      var bundleUrlTypesArray = et.SubElement(rootDictElement, 'array');
      var bundleUrlTypesDict = et.SubElement(bundleUrlTypesArray, 'dict');

      var bundleTypeRoleKey = et.SubElement(bundleUrlTypesDict, 'key');
      bundleTypeRoleKey.text = 'CFBundleTypeRole';
      var bundleTypeRoleString = et.SubElement(bundleUrlTypesDict, 'string');
      bundleTypeRoleString.text = 'Editor';

      var bundleUrlNameKey = et.SubElement(bundleUrlTypesDict, 'key');
      bundleUrlNameKey.text = 'CFBundleURLName';
      var bundleUrlNameString = et.SubElement(bundleUrlTypesDict, 'string');
      bundleUrlNameString.text = manifest.packageId;

      var bundleUrlSchemesKey = et.SubElement(bundleUrlTypesDict, 'key');
      bundleUrlSchemesKey.text = 'CFBundleURLSchemes';
      var bundleUrlSchemesArray = et.SubElement(bundleUrlTypesDict, 'array');
      var bundleUrlSchemeString = et.SubElement(bundleUrlSchemesArray, 'string');
      bundleUrlSchemeString.text = manifest.packageId;

      fs.writeFileSync(infoPlistPath, infoPlistXml.write({indent: 4}), 'utf-8');
    }
  })

  // Run prepare.
  .then(function() {
    var wwwPath = path.join(destAppDir, 'www');
    var welcomeText = 'Done!\n\n';
    // Strip off manifest.json from path (its containing dir must be the root of the app)
    if (path.basename(sourceArg) === 'manifest.json') {
      sourceArg = path.dirname(sourceArg);
    }
    if (flags['link-to']) {
      welcomeText += 'Your project has been created, with web assets symlinked to the following chrome app:\n' +
                     wwwPath + ' --> ' + srcAppDir + '\n\n';
    } else if (flags['copy-from']) {
      welcomeText += 'Your project has been created, with web assets copied from the following chrome app:\n'+
                     srcAppDir + ' --> ' + wwwPath + '\n\n';
    } else {
      welcomeText += 'Your project has been created, with web assets in the `www` directory:\n'+
                     wwwPath + '\n\n';
    }
    welcomeText += 'Remember to run `cca prepare` after making changes\n';
    welcomeText += 'Full instructions: https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/Develop.md#making-changes-to-your-app-source-code';

    return require('./cordova-commands').runCmd(['prepare']).then(function() {
      console.log(welcomeText);
    });
  });
}

/******************************************************************************/
/******************************************************************************/
// Update App

/******************************************************************************/

// Returns a promise.
function postPrepareCommand() {
  var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
  var hasIos = fs.existsSync(path.join('platforms', 'ios'));

  if (!fs.existsSync('platforms')) {
    return Q.reject('No platforms directory found. Please run script from the root of your project.');
  }

  var p = Q();
  if (hasAndroid) {
    p = p.then(function() { return postPrepareInternal('android'); });
  }
  if (hasIos) {
    p = p.then(function() { return postPrepareInternal('ios'); });
  }
  return p;
}

// Internal function called potentially multiple times to cover all platforms.
function postPrepareInternal(platform) {
  var root = assetDirForPlatform(platform);

  /* Android asset packager ignores, by default, directories beginning with
     underscores. This can be fixed with an update to the project.properties
     file, but only when compiling with ant. There is a bug outstanding to
     fix this behaviour in Eclipse/ADT as well.

     References:
       https://code.google.com/p/android/issues/detail?id=5343
       https://code.google.com/p/android/issues/detail?id=41237
   */
  var badPath = path.join(assetDirForPlatform(platform), '_locales');
  var betterPath = path.join(assetDirForPlatform(platform), 'CCA_locales');
  var promise = Q();
  if (fs.existsSync(badPath)) {
    console.log('## Pre-processing _locales for ' + platform);
    fs.renameSync(badPath, betterPath);
    promise = Q.ninvoke(fs, 'readdir', betterPath)
    .then(function(files) {
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
    });
  }

  return promise.then(function() {
    return require('./get-manifest')('www');
  }).then(function(manifest) {
    if (!manifest || !manifest.icons) return;
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
      var platforms = require('cordova/node_modules/cordova-lib').cordova_platforms;
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
    var dstPath;
    if (iconMap) {
      //console.log('## Copying icons for ' + platform);
      for (var size in iconMap) {
        for (var i=0; i < iconMap[size].length; i++) {
          dstPath = path.join('platforms', platform, iconMap[size][i]);
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
        dstPath = path.join('platforms', platform, 'res', 'drawable', 'icon.png');
        copyIcon(bestSize, dstPath);
      }
      if (infoPlistXml) {
        var findArrayNode = function(key) {
          var foundNode = null;
          var foundKey = 0;
          infoPlistXml.iter('*', function(e) {
            if (foundKey === 0) {
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
        var setValues = function(key, vals) {
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
  })

  // Merge the manifests.
  .then(function() {
    return require('./get-manifest')(root, platform);
  }).then(function(manifest) {
    return Q.ninvoke(fs, 'writeFile', path.join(root, 'manifest.json'), JSON.stringify(manifest));
  })

  // Set the "other" version values if defined in the manifest.
  // CFBundleVersion on iOS and versionCode on Android.
  .then(function() {
    return require('./get-manifest')(root);
  }).then(function(manifest) {
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
      var platforms = require('cordova/node_modules/cordova-lib').cordova_platforms;
      var parser = new platforms.ios.parser(path.join('platforms','ios'));
      var infoPlistPath = path.join('platforms', 'ios', parser.originalName, parser.originalName + '-Info.plist');
      var infoPlistXml = et.parse(fs.readFileSync(infoPlistPath, 'utf-8'));
      var theNode;
      var isFound = 0;

      // plist file format is pretty strange, we need the <string> node
      // immediately following <key>CFBundleVersion</key>
      // iterating over all the nodes.
      infoPlistXml.iter('*', function(e) {
        if (isFound === 0) {
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
  });
}


// Returns a promise.
function push(platform, url) {
  var hasAndroid = fs.existsSync(path.join('platforms', 'android'));
  var hasIos = fs.existsSync(path.join('platforms', 'ios'));

  var srcDir = assetDirForPlatform(platform);

  if (platform == 'android' && !hasAndroid) {
    return Q.reject('Selected platform \'android\' is not available.');
  }
  if (platform == 'ios' && !hasIos) {
    return Q.reject('Selected platform \'ios\' is not available.');
  }

  var Push = require('cca-push');
  return Q.nfcall(Push.push, srcDir, url);
}

/******************************************************************************/
/******************************************************************************/

function fixEnv() {
  if (isWindows) {
    // Windows java installer doesn't add javac to PATH, nor set JAVA_HOME (ugh).
    var javacInPath = !shelljs.which('javac');
    var hasJavaHome = !!process.env.JAVA_HOME;
    if (hasJavaHome && !javacInPath) {
      process.env.PATH += ';' + process.env.JAVA_HOME + '\\bin';
    } else if (!hasJavaHome || !javacInPath) {
      var firstJdkDir =
          shelljs.ls(process.env.ProgramFiles + '\\java\\jdk*')[0] ||
          shelljs.ls('C:\\Program Files\\java\\jdk*')[0] ||
          shelljs.ls('C:\\Program Files (x86)\\java\\jdk*')[0];
      if (firstJdkDir) {
        if (!javacInPath) {
          process.env.PATH += ';' + firstJdkDir + '\\bin';
        }
        process.env.JAVA_HOME = firstJdkDir;
        console.log('Set JAVA_HOME to ' + firstJdkDir);
      }
    }
  }
}

function main() {
  var commandLineFlags = require('./parse_command_line')();
  pause_on_exit = commandLineFlags.pause_on_exit;

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
      return require('./pre-prepare')();
    },
    'update-app': function() {
      return postPrepareCommand();
    },
    'checkenv': function() {
      console.log('cca v' + packageVersion);
      return toolsCheck();
    },
    'push': function() {
      console.log('cca v' + packageVersion);
      var platform = commandLineFlags._[1];
      var url = commandLineFlags._[2];
      if (!platform) {
        return Q.reject('You must specify a platform: cca push <platform> <url>');
      } else if (!url) {
        return Q.reject('You must specify the destination URL: cca push <platform> <url>');
      }
      return push(platform, url);
    },
    'run': function() {
      console.log('cca v' + packageVersion);
      var platform = commandLineFlags._[1];
      if (platform !== 'chrome') {
        require('../node_modules/cordova/src/cli')(process.argv);
      } else {
        // TODO: improve
        var chromePath = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
        var args = ['--profile-directory=/dev/null', '--load-and-launch-app=' + path.join('www')];
        childProcess.spawn(chromePath, args);
      }
      return Q();
    },
    'create': function() {
      console.log('cca v' + packageVersion);
      var destAppDir = commandLineFlags._[1] || '';
      if (!destAppDir) {
        console.error('No output directory given.');
        require('optimist').showHelp(console.log);
        process.exit(1);
      }
      // resolve turns relative paths into absolute
      destAppDir = path.resolve(destAppDir);
      return ensureHasRunInit()
      .then(toolsCheck)
      .then(function() {
        return createCommand(destAppDir, commandLineFlags.android, commandLineFlags.ios, commandLineFlags);
      });
    },
    'version': function() {
      console.log(packageVersion);
      return Q();
    },
    'help': function() {
      console.log('cca v' + packageVersion);
      require('optimist').showHelp(console.log);
      return Q();
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
    var cliDummyArgs = [0, 0, 'foo'];
    if (commandLineFlags.d) {
      cliDummyArgs.push('--verbose');
    }
    // Hack to enable logging :(.
    try {
      require('../node_modules/cordova/src/cli')(cliDummyArgs);
    } catch(e) {}
    commandActions[command]().done(null, fatal);
  } else if (cordovaCommands[command]) {
    console.log('cca v' + packageVersion);
    // TODO (kamrik): to avoid this hackish require, add require('cli') in cordova.js
    require('../node_modules/cordova/src/cli')(process.argv);
  } else {
    fatal('Invalid command: ' + command + '. Use --help for usage.');
  }
}

if (require.main === module) {
    main();
} else {
    module.exports.parseCLI = main;
}

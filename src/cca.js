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

var utils = require('./utils');

// Globals
var origDir = process.cwd();
var ccaRoot = path.join(__dirname, '..');
var scriptName = path.basename(process.argv[1]);

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
// Update App

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
  var root = utils.assetDirForPlatform(platform);

  /* Android asset packager ignores, by default, directories beginning with
     underscores. This can be fixed with an update to the project.properties
     file, but only when compiling with ant. There is a bug outstanding to
     fix this behaviour in Eclipse/ADT as well.

     References:
       https://code.google.com/p/android/issues/detail?id=5343
       https://code.google.com/p/android/issues/detail?id=41237
   */
  var badPath = path.join(utils.assetDirForPlatform(platform), '_locales');
  var betterPath = path.join(utils.assetDirForPlatform(platform), 'CCA_locales');
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
      shelljs.cp('-f', path.join('www', utils.fixPathSlashes(manifest.icons[size])), dstPath);
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

  var srcDir = utils.assetDirForPlatform(platform);

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
  if (utils.isWindows()) {
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
  utils.exit.pause_on_exit = commandLineFlags.pause_on_exit;

  var command = commandLineFlags._[0];
  var packageVersion = require('../package').version;

  if (commandLineFlags.v) {
    command = 'version';
  }
  if (commandLineFlags.h || !command) {
    command = 'help';
  }

  // Colorize after parseCommandLine to avoid --help being printed in red.
  utils.colorizeConsole();

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
      return require('./tools-check')();
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
      .then(require('./tools-check'))
      .then(function() {
        return require('./create-app')(destAppDir, ccaRoot, origDir, commandLineFlags);
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
    cordova.config(projectRoot, require('./default-config')(ccaRoot));
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
    commandActions[command]().done(null, utils.fatal);
  } else if (cordovaCommands[command]) {
    console.log('cca v' + packageVersion);
    // TODO (kamrik): to avoid this hackish require, add require('cli') in cordova.js
    require('../node_modules/cordova/src/cli')(process.argv);
  } else {
    utils.fatal('Invalid command: ' + command + '. Use --help for usage.');
  }
}

if (require.main === module) {
    main();
} else {
    module.exports.parseCLI = main;
}

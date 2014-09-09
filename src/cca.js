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
var path = require('path');

// Third-party modules.
var Q = require('q');

// Local modules.
var utils = require('./utils');

// Globals
var origDir = process.cwd();
var ccaRoot = path.join(__dirname, '..');

/******************************************************************************/

function fixEnv() {
  var shelljs = require('shelljs');
  if (utils.isWindows()) {
    // Windows java installer doesn't add javac to PATH, nor set JAVA_HOME (ugh).
    var javacInPath = !!shelljs.which('javac');
    var hasJavaHome = !!process.env.JAVA_HOME;
    if (hasJavaHome && !javacInPath) {
      process.env.PATH += ';' + process.env.JAVA_HOME + '\\bin';
    } else if (!hasJavaHome || !javacInPath) {
      var firstJdkDir =
          shelljs.ls(process.env.ProgramFiles + '\\java\\jdk*')[0] ||
          shelljs.ls('C:\\Program Files\\java\\jdk*')[0] ||
          shelljs.ls('C:\\Program Files (x86)\\java\\jdk*')[0];
      if (firstJdkDir) {
        // shelljs always uses / in paths.
        firstJdkDir = firstJdkDir.replace(/\//g, '\\');
        if (!javacInPath) {
          process.env.PATH += ';' + firstJdkDir + '\\bin';
        }
        process.env.JAVA_HOME = firstJdkDir;
        console.log('Set JAVA_HOME to ' + firstJdkDir);
      }
    }
  }
  // Add flags for building with Gradle
  if (typeof process.env.ANDROID_BUILD == 'undefined') {
    process.env.ANDROID_BUILD = 'gradle';
  }
  if (typeof process.env.BUILD_MULTIPLE_APKS == 'undefined') {
    process.env.BUILD_MULTIPLE_APKS = '1';
  }
  if (process.env.BUILD_MULTIPLE_APKS && typeof process.env.DEPLOY_APK_ARCH == 'undefined') {
    process.env.DEPLOY_APK_ARCH = 'armv7';
  }
}

/******************************************************************************/

function main() {
  var commandLineFlags = require('./parse-command-line')();
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

  function printCcaVersionPrefix() {
    console.log('cca v' + packageVersion);
  }

  function beforeCordovaPrepare() {
    if (commandLineFlags['skip-upgrade']) {
      return Q.when();
    }
    return require('./auto-upgrade')();
  }

  function forwardCurrentCommandToCordova() {
    // TODO: Can we replace use of CLI here?  Calls to cordova-lib cordova.raw?
    require('cordova/src/cli')(process.argv);
  }

  function printVersionThenPrePrePrepareThenForwardCommandToCordova() {
    printCcaVersionPrefix();
    return beforeCordovaPrepare()
      .then(forwardCurrentCommandToCordova);
  }

  var commandActions = {
    'pre-prepare': function() {
      return require('./pre-prepare')();
    },
    'update-app': function() {
      // TODO: deprecated command, use post-prepare instead
      return commandActions['post-prepare']();
    },
    'post-prepare': function() {
      return require('./post-prepare')();
    },
    'checkenv': function() {
      printCcaVersionPrefix();
      return require('./tools-check')();
    },
    'push': function() {
      printCcaVersionPrefix();
      return require('./push-to-harness')(commandLineFlags.target, commandLineFlags.watch);
    },
    'run': function() {
      printCcaVersionPrefix();
      return beforeCordovaPrepare()
      .then(function() {
        var platform = commandLineFlags._[1];
        if (platform === 'chrome') {
          // TODO: improve
          var chromePath = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
          var args = ['--profile-directory=/dev/null', '--load-and-launch-app=' + path.join('www')];
          var childProcess = require('child_process');
          childProcess.spawn(chromePath, args);
          return;
        }
        forwardCurrentCommandToCordova();
      });
    },
    'create': function() {
      printCcaVersionPrefix();
      return Q.fcall(function() {
        var destAppDir = commandLineFlags._[1] || '';
        if (!destAppDir) {
          require('optimist').showHelp(console.log);
          return Q.reject('No output directory given.');
        }
        // resolve turns relative paths into absolute
        destAppDir = path.resolve(destAppDir);
        return require('./tools-check')()
          .then(function() {
            var packageId = commandLineFlags._[2] || '';
            var appName = commandLineFlags._[3] || '';
            return require('./create-app')(destAppDir, ccaRoot, origDir, packageId, appName, commandLineFlags);
          });
      });
    },
    'upgrade': function() {
      printCcaVersionPrefix();
      return require('./upgrade-project')();
    },
    'version': function() {
      console.log(packageVersion);
      return Q.when();
    },
    'help': function() {
      printCcaVersionPrefix();
      require('optimist').showHelp(console.log);
      return Q.when();
    },
    'platform': function() {
      printCcaVersionPrefix();
      // Do not run auto-upgrade step if doing a platforms command
      forwardCurrentCommandToCordova();
      return Q.when();
    },
    'platforms': function() {
      printCcaVersionPrefix();
      // Do not run auto-upgrade step if doing a platforms command
      forwardCurrentCommandToCordova();
      return Q.when();
    },
    'build': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'compile': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'emulate': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'plugin': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'plugins': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'prepare': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'serve': printVersionThenPrePrePrepareThenForwardCommandToCordova,
  };

  // TODO(mmocny): The following few lines seem to make global changes that affect all other subcommands.
  // May want to break this out to a module as an "init" step that every other step ensures has been called.
  var cordovaLib = require('cordova-lib');
  cordovaLib.cordova.config.setAutoPersist(false);
  var projectRoot = cordovaLib.cordova.findProjectRoot();
  if (projectRoot) {
    cordovaLib.cordova.config(projectRoot, require('./default-config')(ccaRoot));
    process.chdir(projectRoot);
  }

  if (!commandActions.hasOwnProperty(command)) {
    utils.fatal('Invalid command: ' + command + '. Use --help for usage.');
  }

  // In verbose mode, print all cordova events
  if (commandLineFlags.d) {
    // TODO: its possible we want to console.log the results for some cordova commands even in non-verbose mode
    cordovaLib.events.on('results', console.log);
    cordovaLib.events.on('log', console.log);
    cordovaLib.events.on('warn', console.warn);
    cordovaLib.events.on('verbose', console.log);
  }
  require('./getanalytics')()
  .then(function(analytics) {
    // TODO: Should we show the question when running cca help?
    // TODO: Do something with analytics
    console.log('TODO: Debug message. analyitcs loaded. command=', command, 'isFake=', analytics.isFake);
    return Q();
  })
  .then(commandActions[command])
  .done(null, utils.fatal);
}

if (require.main === module) {
    main();
} else {
    module.exports.parseCLI = main;
}

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
var fs = require('fs');
var path = require('path');

// Third-party modules.
var Q = require('q');

// Local modules.
var utils = require('./utils');

// Globals
var origDir = process.cwd();
var ccaRoot = path.join(__dirname, '..');

var cordova = require('cordova');
var cordovaLib = cordova.cordova_lib;
var hooks = require('./hooks');

/******************************************************************************/

function fixEnv() {
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

  // Colorize after parseCommandLine to avoid --help being printed in red.
  utils.colorizeConsole();

  // TODO: Add env detection to Cordova.
  fixEnv();

  hooks.registerHooks();

  function printCcaVersionPrefix() {
    console.log('cca v' + packageVersion);
  }

  if (command == 'exec') {
    return require('./tools-check').fixEnv()
    .then(function() {
      require('./exec')(process.argv.slice(3));
    }).done(null, utils.fatal);
  }

  if (commandLineFlags.v) {
    command = 'version';
  }
  if (commandLineFlags.h || !command) {
    command = 'help';
  }

  function beforeCordovaPrepare() {
    if (commandLineFlags['skip-upgrade']) {
      return Q.when();
    }
    if (!fs.existsSync(path.join('www', 'manifest.json'))) {
      return Q.reject('This is not a cca project (no www/manifest.json file). Perhaps you meant to use the cordova-cli?');
    }
    return require('./upgrade-project').upgradeProjectIfStale();
  }

  function forwardCurrentCommandToCordova() {
    // Unregister some event handlers in cordova-lib EventEmitter. Otherwise
    // double printouts will happen because cordova-cli registers its own
    // handlers. This is only relevant when --verbose or -d flag is used.
    cordovaLib.events.removeListener('results', console.log);
    cordovaLib.events.removeListener('log', console.log);
    cordovaLib.events.removeListener('warn', console.warn);
    cordovaLib.events.removeListener('verbose', console.log);

    // TODO: Can we replace use of CLI here?  Calls to cordova-lib cordova.raw?
    return cordova.cli(process.argv);
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
      return Q.fcall(function() {
        var extraFlag = commandLineFlags._[1] || '';
        if (extraFlag) {
          require('optimist').showHelp(console.log);
          return Q.reject('Flag "' + extraFlag + '" not understood.  Did you mean `--target=' + extraFlag + '`?');
        }
        return require('./push-to-harness')(commandLineFlags.target, commandLineFlags.watch);
      });
    },
    'run': function() {
      printCcaVersionPrefix();
      return beforeCordovaPrepare()
      .then(function() {
        var platform = commandLineFlags._[1];
        if (platform === 'chrome') {
          // TODO: For some reason --user-data-dir and --load-and-launch-app do not play well together.  Seems you must still quit Chrome Canary first for this to work.
          var spawn = require('child_process').spawn;
          spawn('open', ['-n', '-a', 'Google Chrome Canary', '--args', '--user-data-dir=/tmp/cca_chrome_data_dir', '--load-and-launch-app=' + path.resolve('www')]); // '--disable-web-security'
          return;
        }
        return forwardCurrentCommandToCordova();
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
        var packageId = commandLineFlags._[2] || '';
        var appName = commandLineFlags._[3] || '';
        return require('./create-app')(destAppDir, ccaRoot, origDir, packageId, appName, commandLineFlags);
      });
    },
    'upgrade': function() {
      printCcaVersionPrefix();
      return require('./upgrade-project').upgradeProject(commandLineFlags.y);
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
      return forwardCurrentCommandToCordova();
    },
    'platforms': function() {
      printCcaVersionPrefix();
      // Do not run auto-upgrade step if doing a platforms command
      return forwardCurrentCommandToCordova();
    },
    'analytics': function() {
      // Do nothing.  This is handled as a special-case below.
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
  cordovaLib.cordova.config.setAutoPersist(false);
  var projectRoot = cordovaLib.cordova.findProjectRoot();
  if (projectRoot) {
    cordovaLib.cordova.config(projectRoot, require('./default-config')(ccaRoot));
    process.chdir(projectRoot);
    // signing keys
    if (!process.env.DEBUG_SIGNING_PROPERTIES_FILE && fs.existsSync('android-debug-keys.properties')) {
      process.env.DEBUG_SIGNING_PROPERTIES_FILE = path.resolve('android-debug-keys.properties');
    }
    if (!process.env.RELEASE_SIGNING_PROPERTIES_FILE && fs.existsSync('android-release-keys.properties')) {
      process.env.RELEASE_SIGNING_PROPERTIES_FILE = path.resolve('android-release-keys.properties');
    }
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

  // If the command is an analytics command, act accordingly.
  // We do this now because it's a special case.  If this is the user's first command, a prompt doesn't make sense.
  var analyticsLoader = require('./analytics-loader');
  if (command === 'analytics') {
    analyticsLoader.analyticsCommand(commandLineFlags._[1]);
  }

  analyticsLoader.getAnalyticsModule()
  .then(function(analytics) {
    analytics.sendEvent('cca', command);
  }).then(commandActions[command])
  .then(null, function(e) {
    if (e instanceof cordovaLib.CordovaError) {
      utils.fatal(e.message.replace(/\bcordova /, 'cca '));
    } else {
      throw e;
    }
  }).done();
}

if (require.main === module) {
    main();
} else {
    module.exports.parseCLI = main;
}

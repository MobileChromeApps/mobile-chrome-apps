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
var updateNotifier = require('update-notifier');

// Local modules.
var utils = require('./utils');

// Globals
var origDir = process.cwd();
var ccaRoot = path.join(__dirname, '..');

var cordova = require('cordova');
var cordovaLib = cordova.cordova_lib;
var hooks = require('./hooks');

function main() {
  var commandLineFlags = require('./parse-command-line')();
  utils.exit.pause_on_exit = commandLineFlags.pause_on_exit;

  // TODO: Should we support an opt out `--no-update-notifier`?
  var pkg = require('../package.json');
  updateNotifier({
    pkg: pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24, // Daily
  }).notify();

  var command = commandLineFlags._[0];
  var packageVersion = require('../package').version;

  // Colorize after parseCommandLine to avoid --help being printed in red.
  utils.colorizeConsole();

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

  function autoAddPlatforms() {
    var plats = [];
    if (process.argv.indexOf('android') != -1 && !fs.existsSync(path.join('platforms', 'android'))) {
      plats.push('android');
    }
    if (process.argv.indexOf('ios') != -1 && !fs.existsSync(path.join('platforms', 'ios'))) {
      plats.push('ios');
    }
    if (plats.length === 0) {
      return Q();
    }
    var argv = require('optimist')
        .options('link', { type: 'boolean' })
        .options('verbose', { type: 'boolean', alias: 'd' })
        .argv;
    var opts = {
      link: argv.link,
      verbose: argv.verbose
    };
    return require('./cordova-commands').runCmd(['platform', 'add', plats, opts])
    .then(require('./write-out-cca-version'));
  }

  function beforeCordovaPrepare() {
    return autoAddPlatforms()
    .then(function() {
      if (commandLineFlags['skip-upgrade']) {
        return;
      }
      if (!fs.existsSync(path.join('www', 'manifest.json'))) {
        return Q.reject('This is not a cca project (no www/manifest.json file). Perhaps you meant to use the cordova-cli?');
      }
      return require('./upgrade-project').upgradeProjectIfStale(commandLineFlags.y);
    });
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
      var platform = commandLineFlags._[1];
      if (platform === 'chrome' || platform === 'canary') {
        return require('./run-in-chrome')(platform);
      } else {
        return beforeCordovaPrepare()
          .then(forwardCurrentCommandToCordova);
      }
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
      return require('./upgrade-project').upgradeProject(true); // true means never prompt for upgrade
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
    'plugin': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'plugins': function() {
      return commandActions.plugin.apply(this, arguments);
    },
    'platform': function() {
      printCcaVersionPrefix();
      // Do not run auto-upgrade step if doing a platforms command
      return forwardCurrentCommandToCordova();
    },
    'platforms': function() {
      return commandActions.platform.apply(this, arguments);
    },
    'analytics': function() {
      // Do nothing.  This is handled as a special-case below.
      return Q.when();
    },
    'build': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'compile': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'emulate': printVersionThenPrePrePrepareThenForwardCommandToCordova,
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

  if (commandLineFlags['android-minSdkVersion']) {
    process.env['ORG_GRADLE_PROJECT_cdvMinSdkVersion'] = commandLineFlags['android-minSdkVersion'];
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

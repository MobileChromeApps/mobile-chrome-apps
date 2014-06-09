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

/******************************************************************************/

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
      return require('./post-prepare')();
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
      return require('./push-to-harness')(platform, url);
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
        var childProcess = require('child_process');
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
      return require('./tools-check')()
        .then(require('./create-app')(destAppDir, ccaRoot, origDir, commandLineFlags));
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

  // TODO(mmocny): The following few lines seem to make global changes that affect all other subcommands.
  // May want to break this out to a module as an "init" step that every other step ensures has been called.
  var cordova = require('cordova');
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

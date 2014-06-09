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
var fs = require('fs');

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

  function printCcaVersionPrefix() {
    console.log('cca v' + packageVersion);
    return Q();
  }

  function beforeCordovaPrepare() {
    // If you have at least one platform, do nothing
    // TODO(mmocny): what if run from non root?
    if (fs.existsSync(path.join('platforms', 'android')) || fs.existsSync(path.join('platforms', 'ios'))) {
      return Q();
    }
    // TODO(mmocny): If plugins/ does exist, those don't get re-installed properly.
    //               But that is not a typicalal a scenario.  Usually either you have both, or you have no plugins.

    // Othwerwise, auto-add platforms
    // Ideally we just do this in pre-prepare, but cordova doesn't run pre-prepare scripts if there are no target platforms,
    // and its unclear how to make it do so with a difference concept for pre-prepare scripts.
    return require('./tools-check')()
    .then(function(toolsCheckResults) {
      var cmds = [];
      // TODO(mmocny): any way to use .raw so as not to also call prepare after each platform add?
      if (toolsCheckResults.hasXcode) {
        cmds.push(['platform', 'add', 'ios']);
      }
      if (toolsCheckResults.hasAndroidPlatform) {
         cmds.push(['platform', 'add', 'android']);
      }
      return require('./cordova-commands').runAllCmds(cmds);
    });
  }

  function forwardCurrentCommandToCordova() {
    require('../node_modules/cordova/src/cli')(process.argv);
    return Q();
  }

  function printVersionThenPrePrePrepareThenForwardCommandToCordova() {
    return printCcaVersionPrefix()
      .then(beforeCordovaPrepare)
      .then(forwardCurrentCommandToCordova);
  }

  var commandActions = {
    'pre-prepare': function() {
      return require('./pre-prepare')();
    },
    'update-app': function() {
      // TODO(mmocny): deprecated command, use post-prepare instead
      return commandActions['post-prepare']();
    },
    'post-prepare': function() {
      return require('./post-prepare')();
    },
    'checkenv': function() {
      return printCcaVersionPrefix()
      .then(require('./tools-check'));
    },
    'push': function() {
      printCcaVersionPrefix()
      .then(function() {
        var platform = commandLineFlags._[1];
        var url = commandLineFlags._[2];
        if (!platform) {
          return Q.reject('You must specify a platform: cca push <platform> <url>');
        } else if (!url) {
          return Q.reject('You must specify the destination URL: cca push <platform> <url>');
        }
        return require('./push-to-harness')(platform, url);
      });
    },
    'run': function() {
      return printCcaVersionPrefix()
      .then(beforeCordovaPrepare)
      .then(function() {
        var platform = commandLineFlags._[1];
        if (platform === 'chrome') {
          // TODO: improve
          var chromePath = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
          var args = ['--profile-directory=/dev/null', '--load-and-launch-app=' + path.join('www')];
          var childProcess = require('child_process');
          childProcess.spawn(chromePath, args);
          return Q();
        }
        return forwardCurrentCommandToCordova();
      });
    },
    'create': function() {
      return printCcaVersionPrefix()
      .then(function() {
        var destAppDir = commandLineFlags._[1] || '';
        if (!destAppDir) {
          require('optimist').showHelp(console.log);
          return Q.reject('No output directory given.');
        }
        // resolve turns relative paths into absolute
        destAppDir = path.resolve(destAppDir);
        return require('./tools-check')()
          .then(require('./create-app')(destAppDir, ccaRoot, origDir, commandLineFlags));
      });
    },
    'version': function() {
      console.log(packageVersion);
      return Q();
    },
    'help': function() {
      return printCcaVersionPrefix()
      .then(function() {
        require('optimist').showHelp(console.log);
        return Q();
      });
    },
    'build': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'compile': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'emulate': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'platform': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'platforms': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'plugin': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'plugins': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'prepare': printVersionThenPrePrePrepareThenForwardCommandToCordova,
    'serve': printVersionThenPrePrePrepareThenForwardCommandToCordova,
  };

  // TODO(mmocny): The following few lines seem to make global changes that affect all other subcommands.
  // May want to break this out to a module as an "init" step that every other step ensures has been called.
  var cordova = require('cordova');
  cordova.config.setAutoPersist(false);
  var projectRoot = cordova.findProjectRoot();
  if (projectRoot) {
    cordova.config(projectRoot, require('./default-config')(ccaRoot));
  }

  if (!commandActions.hasOwnProperty(command)) {
    utils.fatal('Invalid command: ' + command + '. Use --help for usage.');
  }

  // start hack to enable logging :(.
  var cliDummyArgs = [0, 0, 'foo'];
  if (commandLineFlags.d) {
    cliDummyArgs.push('--verbose');
  }
  try {
    require('../node_modules/cordova/src/cli')(cliDummyArgs);
  } catch(e) {}
  // end hack

  commandActions[command]().done(null, utils.fatal);
}

if (require.main === module) {
    main();
} else {
    module.exports.parseCLI = main;
}

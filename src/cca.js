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

  function printCcaVersionPrefix() {
    console.log('cca v' + packageVersion);
    return Q();
  }

  function beforeCordovaPrepare() {
    if (commandLineFlags['skip-upgrade']) {
      return Q();
    }
    return require('./auto-upgrade')();
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
      // TODO: deprecated command, use post-prepare instead
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
      return printCcaVersionPrefix()
      .then(function() {
        return require('./push-to-harness')(commandLineFlags.target, commandLineFlags.watch);
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
          .then(function() {
            return require('./create-app')(destAppDir, ccaRoot, origDir, commandLineFlags)
          });
      });
    },
    'upgrade': function() {
      return printCcaVersionPrefix()
      .then(function() {
        return utils.waitForKey('Upgrading will delete platforms/ and plugins/ - Continue? [y/N] ');
      })
      .then(function(key) {
        if (key != 'y' && key != 'Y') {
          return Q.reject('Okay, nevermind.');
        }
        var shelljs = require('shelljs');
        shelljs.rm('-rf', path.join('platforms'));
        shelljs.rm('-rf', path.join('plugins'));
        // TODO(mmocny): this hack changes the "upgrade" argument to "prepare", since we forward all argv over to cordova-cli
        for (var i = 0; i < process.argv.length; i++) {
          if (process.argv[i].toLowerCase() == 'upgrade') {
            process.argv[i] = "prepare";
            break;
          }
        }
        return commandActions['prepare']();
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
    process.chdir(projectRoot);
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

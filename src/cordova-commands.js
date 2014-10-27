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

var cordova = require('cordova');
var Q = require('q');

// Returns the promise from the raw Cordova command.
exports.runCmd = function runCmd(cmd) {
  var msg = cmd[0];
  cmd.slice(1).forEach(function(arg) {
    if (Array.isArray(arg)) {
      msg += ' ' + arg.join(' ');
      return;
    } else if (typeof arg != 'string') {
      return;
    }
    if (arg.indexOf(' ') != -1) {
      msg += ' "' + arg + '"';
    } else {
      msg += ' ' + arg;
    }
  });
  console.log('## Running Cordova Command: ' + msg);
  return cordova.raw[cmd[0]].apply(cordova, cmd.slice(1));
};

// Chains a list of cordova commands, returning a promise.
exports.runAllCmds = function runAllCmds(commands) {
  return commands.reduce(function(soFar, f) {
    return soFar.then(function() {
      return exports.runCmd(f);
    });
  }, Q());
};


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

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var isWindows = process.platform.slice(0, 3) == 'win';

exports.eventQueue = [];
exports.scriptDir = path.dirname(process.argv[1]);

function exit(code) {
  if (exports.eventQueue) {
    exports.eventQueue.length = 0;
  }
  if (process.argv[2] == '--pause_on_exit') {
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
      onSuccess(stdout.trim());
    }
  });
}

function sudo(cmd, onSuccess, opt_onError, silent) {
  if (!isWindows) {
    cmd = 'sudo ' + cmd;
  }
  exec(cmd, onSuccess, opt_onError, silent);
}

function cordovaCmd(args) {
  return '"' + process.argv[0] + '" "' + path.join(exports.scriptDir, 'cordova-cli', 'bin', 'cordova') + '" ' + args.join(' ');
}

function chdir(d) {
  d = path.resolve(exports.scriptDir, d);
  if (process.cwd() != d) {
    console.log('Changing directory to: ' + d);
    process.chdir(d);
  }
}

function copyFile(src, dst, callback) {
  var rd = fs.createReadStream(src);
  var wr = fs.createWriteStream(dst);
  wr.on('error', function(err) {
    fatal('Copy file error: ' + err);
  });
  wr.on('close', callback);
  rd.pipe(wr);
}

function recursiveDelete(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log('Deleting: ' + dirPath);
    helper(dirPath);
  }
  function helper(dirPath) {
    try {
       var files = fs.readdirSync(dirPath);
    } catch(e) {
      return;
    }
    for (var i = 0; i < files.length; i++) {
      var filePath = path.join(dirPath, files[i]);
      fs.chmodSync(filePath, '777');
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else {
        helper(filePath);
      }
    }
    fs.rmdirSync(dirPath);
  }
}

function waitForKey(callback) {
  console.log('press a key');
  function cont(key) {
    if (key == '\u0003') {
      process.exit(2);
    }
    process.stdin.removeListener('data', cont);
    process.stdin.pause();
    callback();
  }
  process.stdin.resume();
  process.stdin.setRawMode(true);
  process.stdin.on('data', cont);
}

function pump() {
  if (exports.eventQueue.length) {
    exports.eventQueue.shift()(pump);
  }
}

exports.exit = exit;
exports.fatal = fatal;
exports.exec = exec;
exports.sudo = sudo;
exports.cordovaCmd = cordovaCmd;
exports.copyFile = copyFile;
exports.recursiveDelete = recursiveDelete;
exports.chdir = chdir;
exports.pump = pump;
// exports.waitForKey = waitForKey;

#!/usr/bin/env node
// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var child_process = require('child_process');
var path = require('path');
var Q = require('q');

var ccaRoot = path.join(__dirname, '..');
var isWindows = process.platform.slice(0, 3) == 'win';

// Returns a promise for an object with 'stdout' and 'stderr' as keys.
function exec(cmd) {
  var d = Q.defer();
  child_process.exec(cmd, function(error, stdout, stderr) {
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

function spawn(cmd, args, opts) {
  var o = {stdio:'inherit'};
  opts = opts || {};
  for (var k in opts) {
    o[k] = opts[k];
  }
  console.log('CWD=' + path.basename(opts.cwd || process.cwd()) + ' cmd=' + cmd + ' args=' + JSON.stringify(args));
  var d = Q.defer();
  var child = child_process.spawn(cmd, args, o);
  var didReturn = false;
  child.on('error', function(e) {
    if (!didReturn) {
      didReturn = true;
      d.reject(e);
    }
  });
  child.on('close', function(code) {
    if (!didReturn) {
      didReturn = true;
      if (code) {
        d.reject(new Error('Exit code: ' + code));
      } else {
        d.resolve();
      }
    }
  });
  return d.promise;
}

function checkForGit() {
  return exec('git --version')
  .then(null, function(err) {
    var p;
    if (isWindows) {
      // See if it's at the default install path.
      process.env.PATH += ';' + path.join(process.env['ProgramFiles'], 'Git', 'bin');
      p = exec('git --version');
    } else {
      p = Q.reject();
    }
    return p.then(null, function(err) {
      return Q.reject('git is not installed (or not available on your PATH). Please install it from http://git-scm.com');
    });
  });
}

// Returns a promise.
function initCommand() {
  process.chdir(ccaRoot);
  return checkForGit()
  .then(function() {
    console.log('## Updating mobile-chrome-apps');
    return spawn('git', ['pull', '--rebase']);
  })
  .then(function() {
    return spawn('git', ['submodule', 'update', '--init', '--recursive']);
  })
  .then(function() {
    return spawn('npm', ['install']);
  }).done();
}

initCommand();

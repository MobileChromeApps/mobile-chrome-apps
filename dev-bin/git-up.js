#!/usr/bin/env node
// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var child_process = require('child_process');
var shelljs = require('shelljs');
var path = require('path');
var Q = require('q');
var fs = require('fs');

var ccaRoot = path.join(__dirname, '..');
var ccaPluginsRoot = path.join(ccaRoot, '..', 'mobile-chrome-apps-plugins');
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

function updateGitRepoInCwd() {
  return spawn('git', ['pull', '--rebase'])
    .then(function() {
      return spawn('git', ['submodule', 'update', '--init', '--recursive']);
    });
}

function cloneOrUpdateGitRepo(repo, dir) {
  if (!fs.existsSync(dir)) {
    return spawn('git', ['clone', '--recursive', repo, dir]);
  }
  return spawn('git', ['-C', dir, 'pull', '--rebase']);
}

function updateAllPlugins() {
  var plugins = [
    'cordova-plugin-chrome-apps-bootstrap',
    'cordova-plugin-chrome-apps-common',
    'cordova-plugin-chrome-apps-navigation',
    'cordova-plugin-chrome-apps-runtime',
    'cordova-plugin-chrome-apps-alarms',
    'cordova-plugin-chrome-apps-audioCapture',
    'cordova-plugin-chrome-apps-bluetooth',
    'cordova-plugin-chrome-apps-bluetoothLowEnergy',
    'cordova-plugin-chrome-apps-bluetoothSocket',
    'cordova-plugin-chrome-apps-fileSystem',
    'cordova-plugin-chrome-apps-gcm',
    'cordova-plugin-chrome-apps-i18n',
    'cordova-plugin-chrome-apps-identity',
    'cordova-plugin-chrome-apps-idle',
    'cordova-plugin-chrome-apps-iosSocketsCommon',
    'cordova-plugin-chrome-apps-notifications',
    'cordova-plugin-chrome-apps-power',
    'cordova-plugin-chrome-apps-proxy',
    'cordova-plugin-chrome-apps-pushMessaging',
    'cordova-plugin-chrome-apps-socket',
    'cordova-plugin-chrome-apps-sockets-tcp',
    'cordova-plugin-chrome-apps-sockets-tcpServer',
    'cordova-plugin-chrome-apps-sockets-udp',
    'cordova-plugin-chrome-apps-storage',
    'cordova-plugin-chrome-apps-system-cpu',
    'cordova-plugin-chrome-apps-system-display',
    'cordova-plugin-chrome-apps-system-memory',
    'cordova-plugin-chrome-apps-system-network',
    'cordova-plugin-chrome-apps-system-storage',
    'cordova-plugin-chrome-apps-test-framework',
    'cordova-plugin-chrome-apps-usb',
    'cordova-plugin-chrome-apps-videoCapture',
    'cordova-plugin-background-app',
    'cordova-plugin-blob-constructor-polyfill',
    'cordova-plugin-customevent-polyfill',
    'cordova-plugin-google-payments',
    'cordova-plugin-google-sign-in-ios',
    'cordova-plugin-xhr-blob-polyfill',
    ];
  shelljs.mkdir('-p', ccaPluginsRoot);

  return plugins.map(function(plugin) {
    // Run in parallel on purpose
    console.log('## Updating ' + plugin);
    return cloneOrUpdateGitRepo('https://github.com/MobileChromeApps/' + plugin + '.git', path.join(ccaPluginsRoot, plugin));
  }).reduce(Q.when, Q.when());
}

// Returns a promise.
function initCommand() {
  process.chdir(ccaRoot);
  return checkForGit()
  .then(function() {
    console.log('## Updating mobile-chrome-apps');
    return updateGitRepoInCwd();
  }).then(function() {
    return spawn('npm', ['link', './cca-manifest-logic']);
  }).then(function() {
    return spawn('npm', ['install']);
  }).then(function() {
    return updateAllPlugins();
  }).done();
}

initCommand();

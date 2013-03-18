// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var argscheck = cordova.require('cordova/argscheck');
var Event = require('chrome.common.events');
var stubs = require('chrome.helpers.stubs');
var mobile = require('chrome.mobile.impl');
var manifestJson = null;

exports.onSuspend = new Event('onSuspend');
exports.onInstalled = new Event('onInstalled');
exports.onStartup = new Event('onStartup');
exports.onSuspendCanceled = new Event('onSuspendCanceled');
exports.onUpdateAvailable = new Event('onUpdateAvailable');

var original_addListener = exports.onSuspend.addListener;

// Uses a trampoline to bind the Cordova pause event on the first call.
exports.onSuspend.addListener = function(f) {
  window.document.addEventListener('pause', exports.onSuspend.fire, false);
  exports.onSuspend.addListener = original_addListener;
  exports.onSuspend.addListener(f);
};

exports.getManifest = function() {
  if (!manifestJson) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'manifest.json', false /* sync */);
    xhr.send(null);
    manifestJson = eval('(' + xhr.responseText + ')'); //JSON.parse(xhr.responseText);
  }
  return manifestJson;
};

exports.getBackgroundPage = function(callback) {
  argscheck.checkArgs('f', 'chrome.runtime.getBackgroundPage', arguments);
  setTimeout(function() {
    callback(mobile.bgWindow);
  }, 0);
};

exports.getURL = function(subResource) {
  argscheck.checkArgs('s', 'chrome.runtime.getURL', arguments);
  if (subResource.charAt(0) == '/') {
    subResource = subResource.slice(1);
  }
  var prefix = location.href.replace(/[^\/]*$/, '');
  return prefix + subResource;
};

exports.reload = function() {
  location.reload();
};

stubs.createStub(exports, 'id', '{appId}');
stubs.createStub(exports, 'requestUpdateCheck', function(){});

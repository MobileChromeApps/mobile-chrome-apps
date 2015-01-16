// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Distinguish between having the plugin loaded vs. being run using chromeapp.html.
var isChromeApp = /chromeapp.html$/.exec(location.href) ? true : false;
var channel = require('cordova/channel');

function getChromeAppFlag() {
  return isChromeApp;
}

// TODO: Delete this method if favour of delayDeviceReadyUntil.
exports.runAtStartUp = function(func) {
  if (isChromeApp) {
    // TODO: Implement done() call back for chrome app case.
    var mobile = require('org.chromium.bootstrap.mobile.impl');
    mobile.onBackgroundPageLoaded.subscribe(func);
  } else {
    channel.onCordovaReady.subscribe(func);
  }
};

// TODO: Add this to cordova-js.
// Executes func after onCordovaReady fires, and delays deviceready until done() is called.
exports.delayDeviceReadyUntil = function(func) {
  channel.onCordovaReady.subscribe(function() {
    var newChannel = channel.createSticky('cca-delay-device-ready');
    channel.deviceReadyChannelsArray.push(newChannel);
    func(function done() {
      newChannel.fire();
    });
  });
};

// For Chrome Apps:
//  - Call func after background page is loaded.
//  - Prevents onLaunched from being fired
//  - func() called immeditately if start-up sequence has already completed.
// For vanilla Cordova:
//  - Call func after deviceready has been fired.
//  - func() called immeditately if deviceready has already fired.
exports.queueLifeCycleEvent = function(func) {
  if (isChromeApp) {
    var mobile = require('org.chromium.bootstrap.mobile.impl');
    if (mobile.lifeCycleEventFuncs) {
      mobile.lifeCycleEventFuncs.push(func);
    } else {
      // Initial events have already occurred.
      func();
    }
  } else {
    if (channel.onDeviceReady.state == 1) {
      // Fire after deviceready, and within a setTimeout to allow
      // user code to register listeners.
      channel.onDeviceReady.subscribe(function() {
        setTimeout(func, 0);
      });
    } else {
      func();
    }
  }
};

exports.__defineGetter__("isChromeApp", getChromeAppFlag);

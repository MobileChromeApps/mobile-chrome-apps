// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec');
var Event = require('org.chromium.common.events');
var channel = require('cordova/channel');
var helpers = require('org.chromium.common.helpers');
var eventsToFireOnStartUp = [];

exports.getInfo = function(callback) {
  exec(callback, callback, 'ChromeSystemStorage', 'getInfo', []);
};

exports.ejectDevice = function(id, callback) {
  exec(callback, callback, 'ChromeSystemStorage', 'ejectDevice', [id]);
};

exports.getAvailableCapacity = function(id, callback) {
  var convertResult = callback && function(info) {
    if (info === null) {
      info = undefined;
    }
    callback(info);
  };

  exec(convertResult, convertResult, 'ChromeSystemStorage', 'getAvailableCapacity', [id]);
};

exports.onAttached = new Event('onAttached');
exports.onDetached = new Event('onDetached');

function firePendingEvents() {
    var msg;
    while (msg = eventsToFireOnStartUp.shift()) {
        processMessage(msg);
    }
    eventsToFireOnStartUp = null;
}

function onMessageFromNative(msg) {
    if (eventsToFireOnStartUp) {
        eventsToFireOnStartUp.push(msg);
    } else {
        processMessage(msg);
    }
}

function processMessage(msg) {
    var action = msg.action;
    if (action == 'attached') {
        exports.onAttached.fire(msg.info);
    } else if (action == 'detached') {
        exports.onDetached.fire(msg.id);
    } else {
        throw new Error('Unknown system storage action' + msg.action);
    }
}

channel.createSticky('onChromeSystemStorageReady');
channel.waitForInitialization('onChromeSystemStorageReady');
channel.onCordovaReady.subscribe(function() {
  exec(onMessageFromNative, undefined, 'ChromeSystemStorage', 'messageChannel', []);
  helpers.runAtStartUp(function() {
      if (eventsToFireOnStartUp.length) {
          helpers.queueLifeCycleEvent(firePendingEvents);
      } else {
          eventsToFireOnStartUp = null;
      }
  });
  channel.initializationComplete('onChromeSystemStorageReady');
});

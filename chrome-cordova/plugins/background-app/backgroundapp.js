// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* global cordova */

// TODO: no-op all of these when on iOS
var platform = cordova.require('cordova/platform');

var Event = require('org.chromium.common.events');
var exec = require('cordova/exec');
var channel = require('cordova/channel');
var helpers = require('org.chromium.common.helpers');
var eventsToFireOnStartUp = [];


exports.onSwitchToForeground = new Event('onSwitchToForeground');

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
    if (action == 'switchforeground') {
        exports.onSwitchToForeground.fire();
    } else {
        throw new Error('Unknown background app action: ' + msg.action);
    }
}

if (platform.id == 'android') {
  channel.createSticky('onBackgroundAppReady');
  channel.waitForInitialization('onBackgroundAppReady');
  channel.onCordovaReady.subscribe(function() {
    exec(onMessageFromNative, undefined, 'BackgroundPlugin', 'messageChannel', []);
    helpers.runAtStartUp(function() {
        if (eventsToFireOnStartUp.length) {
            helpers.queueLifeCycleEvent(firePendingEvents);
        } else {
            eventsToFireOnStartUp = null;
        }
    });
    channel.initializationComplete('onBackgroundAppReady');
  });
}

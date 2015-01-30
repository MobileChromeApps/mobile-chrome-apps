// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');
var exec = require('cordova/exec');
var channel = require('cordova/channel');
var helpers = require('org.chromium.common.helpers');
var eventsToFireOnStartUp = [];

exports.getChannelId = function(interactive, callback) {
  var outstandingCallbacks = 2;
  var result = {};
  checkToIssueCallback = function() {
    outstandingCallbacks--;
    if (outstandingCallbacks === 0) {
      callback(result);
    }
  };

  chrome.identity.getAuthToken({interactive:true}, function(token) {
    var channelApiUrl = 'https://www.googleapis.com/gcm_for_chrome/v1/channels/id';
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
      if (req.readyState == 4) {
        if (req.status == 200) {
          var response = JSON.parse(req.responseText);
          result['channelId'] = response.id + '/' + chrome.runtime.id;
        } else {
          console.error('Error sending channel ID request, server returned with status ' + req.status);
        }
        checkToIssueCallback();
      }
    };
    req.open('GET', channelApiUrl + '?access_token=' + token, true);
    req.send(null);
  });

  var win = function(registrationId) {
    if(require('cordova/platform').id == "ios"){
      result['deviceToken'] = registrationId;
    } else {
      result['registrationId'] = registrationId;
    }
    checkToIssueCallback();
  };
  exec(win, checkToIssueCallback, 'ChromePushMessaging', 'getRegistrationId', [ chrome.runtime.getManifest().senderId ]);
};


exports.onMessage = new Event('onMessage');

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
  exports.onMessage.fire(msg);
}

channel.createSticky('onChromePushMessagingReady');
channel.waitForInitialization('onChromePushMessagingReady');
channel.onCordovaReady.subscribe(function() {
  exec(onMessageFromNative, undefined, 'ChromePushMessaging', 'messageChannel', []);
  helpers.runAtStartUp(function() {
      if (eventsToFireOnStartUp.length) {
          helpers.queueLifeCycleEvent(firePendingEvents);
      } else {
          eventsToFireOnStartUp = null;
      }
  });
  channel.initializationComplete('onChromePushMessagingReady');
});

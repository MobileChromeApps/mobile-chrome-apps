// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* global cordova */
/* global chrome */

// TODO: no-op all of these when on iOS
var platform = cordova.require('cordova/platform');

var GCM_STORAGE_PREFIX = 'gcm-';
var GCM_REGKEY = GCM_STORAGE_PREFIX + 'RegID';

var Event = require('org.chromium.common.events');
var exec = require('cordova/exec');

exports.MAX_MESSAGE_SIZE = 4096;

exports.send = function(message, callback) {
  var win = function(msgid) {
    callback(msgid);
  };
  var fail = function() {
    chrome.runtime.lastError = '[chrome.gcm] Send failed.';
    callback();
  };

  var keys = Object.keys(message);
  ['destinationId','messageId','data'].forEach(function(required_key) {
    if (keys.indexOf(required_key) == -1) {
      throw(new Error("Missing key: " + required_key));
    }
  });

  var datakeys = Object.keys(message.data).map(function(key) { return key.toLowerCase(); });
  ['goog','google','collapse_key'].forEach(function(banned_key) {
    if (datakeys.indexOf(banned_key) != -1) {
      throw(new Error("Invalid data key: " + banned_key));
    }
  });

  var n = JSON.stringify(message.data).length;
  if (n > 4096) {
    throw(new Error("Payload exceeded allowed size limit. Payload size is: " + n));
  }

  exec(win, fail, 'ChromeGcm', 'send', [message]);
};

exports.register = function(senderids, callback) {
  var win = function(registrationId) {
    setRegistrationID(registrationId);
    callback(registrationId);
  };
  var fail = function(msg) {
    chrome.runtime.lastError = '[chrome.gcm] Registration failed: ' + msg;
    callback();
  };
  if (!Array.isArray(senderids) || typeof senderids[0] !== "string" || senderids[0].length == 0) {
    throw(new Error("Invalid senderids.  Must be an array with 1 non empty string."));
  }
  getRegistrationID(function(regid) {
    if (regid) {
      return callback(regid);
    }
    exec(win, fail, 'ChromeGcm', 'getRegistrationId', senderids);
  });
};

exports.unregister = function(callback) {
  var win = function() {
    setRegistrationID('');
    chrome.runtime.lastError = undefined;
    callback();
  };
  var fail = function(msg) {
    chrome.runtime.lastError = '[chrome.gcm] Unregistration failed:';
    callback();
  };
  getRegistrationID(function(regid) {
    if (!regid) {
      return;
    }
    exec(win, fail, 'ChromeGcm', 'unregister', []);
  });
};

function setRegistrationID(regid) {
  var regidObject = {};
  regidObject[GCM_REGKEY] = regid;
  chrome.storage.internal.set(regidObject);
}

function getRegistrationID(callback) {
  chrome.storage.internal.get(GCM_REGKEY, function(items) {
    callback(items[GCM_REGKEY]);
  });
}

function fireQueuedMessages() {
  exec(undefined, undefined, 'ChromeGcm', 'fireQueuedMessages', []);
}

exports.onMessage = new Event('onMessage');
exports.onMessagesDeleted = new Event('onMessagesDeleted');
exports.onSendError = new Event('onSendError');

if (platform.id == 'android') {
  require('org.chromium.common.helpers').runAtStartUp(fireQueuedMessages);
}

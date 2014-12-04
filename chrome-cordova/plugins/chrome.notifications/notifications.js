// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');
var storage = require('org.chromium.storage.Storage');
var exec = require('cordova/exec');
var channel = require('cordova/channel');
var runtime = require('org.chromium.runtime.runtime');
var helpers = require('org.chromium.common.helpers');
var eventsToFireOnStartUp = [];
var notifications = null;

function resolveUri(uri) {
    if (uri.indexOf('chrome-extension') === 0) {
        return uri;
    } else {
        return runtime.getURL(uri);
    }
}

function checkNotificationOptions(options, isCreate) {
    // For create, there are some required properties, all others are optional
    // For update, all properties are optional
    // Required properties must exist, and must be valid.  Optional properties
    // can be omitted, but must be valid if present.
    // For consistency with the desktop API, varying validation behaviour is
    // required:
    // - Required options that are missing should still invoke the callback,
    //   but chrome.runtime.lastError needs to be set
    // - Options provided with invalid values (i.e. type), should raise an error
    if (isCreate) {
      var requiredOptions = [ 'type', 'iconUrl', 'title', 'message' ];
      for (var i = 0; i < requiredOptions.length; i++) {
          if (!(requiredOptions[i] in options)) {
              console.error('Some of the required properties are missing: type, iconUrl, title and message.');
              return false;
          }
      }
    }
    if (isCreate || 'type' in options) {
      var permittedTypes = [ 'basic', 'image', 'list', 'progress' ];
      if (permittedTypes.indexOf(options.type) == -1) {
          var invalidType = 'Property \'type\': Value must be one of: ' +
                        JSON.stringify(permittedTypes) + '.';
          console.error('Error: Invalid notification options.' + invalidType);
          throw new Error(invalidType);
      }
    }
    if (isCreate || 'iconUrl' in options) {
      options.iconUrl = resolveUri(options.iconUrl);
    }
    if ('buttons' in options) {
        for (var i = 0; i < options.buttons.length; i++) {
            if (!('title' in options.buttons[i])) {
                console.error('Error: Invalid notification options. Buttons must specify a title.');
                return false;
            } else if ('iconUrl' in options.buttons[i]) {
                options.buttons[i].iconUrl = resolveUri(options.buttons[i].iconUrl);
            }
        }
    }
    if ('imageUrl' in options && options.type != 'image') {
        console.error('Error: Invalid notification options. ' +
                      'Property \'imageUrl\' may only be in notifications of type \'image\'.');
        return false;
    } else if ('imageUrl' in options) {
        options.imageUrl = resolveUri(options.imageUrl);
    }
    if ('items' in options && options.type != 'list') {
        console.error('Error: Invalid notification options. ' +
                      'Property \'items\' may only be in notifications of type \'list\'.');
        return false;
    }
    if ('items' in options) {
        for (var i = 0; i < options.items.length; i++) {
            var item = options.items[i];
            if (!('title' in item)) {
                console.error('Error: Invalid notification options. List items must specify a title.');
                return false;
            } else if (!('message' in item)) {
                console.error('Error: Invalid notification options. List items must contain a message.');
                return false;
            }
        }
    }
    if ('progress' in options && options.type != 'progress') {
        console.error('Error: Invalid notification options. ' +
                      'Property \'progress\' may only be in notifications of type \'progress\'.');
        return false;
    }
    return true;
}

exports.create = function(notificationId, options, callback) {
    if (!checkNotificationOptions(options, true)) {
      // For consistency with desktop, invoke the callback even if the options
      // are invalid
      // - The validation will raise/log errors as appropriate
      setTimeout(function() {
          callback(notificationId);
      }, 0);
      return;
    }
    if (notificationId === '') {
        notificationId = Math.floor(Math.random()*10000000000).toString();
    }
    notifications[notificationId] = true;
    storage.internal.set({'notifications':notifications});
    var win = function() {
        callback(notificationId);
    };
    exec(win, undefined, 'ChromeNotifications', 'create', [notificationId, options]);
};

exports.update = function(notificationId, options, callback) {
    if (!checkNotificationOptions(options, false)) {
        // For consistency with desktop, invoke the callback even if the options
        // are invalid
        // - The validation will raise/log errors as appropriate
        setTimeout(function() {
            callback(false);
        }, 0);
        return;
    }
    var win = function(wasUpdated) {
        callback(!!wasUpdated);
    };
    var fail = function() {
      // How to set last error?
        callback(false);
    };
    exec(win, fail, 'ChromeNotifications', 'update', [notificationId, options]);
};

exports.clear = function(notificationId, callback) {
    delete notifications[notificationId];
    storage.internal.set({'notifications':notifications});
    var win = function(wasCleared) {
        callback(!!wasCleared);
    };
    exec(win, undefined, 'ChromeNotifications', 'clear', [notificationId]);
};

exports.getAll = function(callback) {
    setTimeout(function() {
        callback(notifications);
    }, 0);
};

exports.onClosed = new Event('onClosed');
exports.onClicked = new Event('onClicked');
exports.onButtonClicked = new Event('onButtonClicked');

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
    var notificationId = msg.id;
    var buttonIndex = msg.buttonIndex;
    if (action == 'Click') {
        exports.onClicked.fire(notificationId);
    } else if (action == 'Close') {
        delete notifications[notificationId];
        storage.internal.set({'notifications':notifications});
        exports.onClosed.fire(notificationId, true);
    } else if (action == 'ButtonClick') {
        exports.onButtonClicked.fire(notificationId, buttonIndex);
    } else {
        throw new Error('Unknown notification action' + msg.action);
    }
}

channel.createSticky('onChromeNotificationsReady');
channel.waitForInitialization('onChromeNotificationsReady');
channel.onCordovaReady.subscribe(function() {
    storage.internal.get('notifications', function(values) {
        notifications = values.notifications || {};
        notifications.__proto__ = null;
        exec(onMessageFromNative, undefined, 'ChromeNotifications', 'messageChannel', []);
        helpers.runAtStartUp(function() {
            if (eventsToFireOnStartUp.length) {
                helpers.queueLifeCycleEvent(firePendingEvents);
            } else {
                eventsToFireOnStartUp = null;
            }
        });
        channel.initializationComplete('onChromeNotificationsReady');
    });
});

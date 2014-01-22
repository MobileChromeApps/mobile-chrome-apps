// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');
var storage = require('org.chromium.storage.Storage');
var exec = require('cordova/exec');
var channel = require('cordova/channel');
var runtime = require('org.chromium.runtime.runtime');

var notifications = Object.create(null);

function resolveUri(uri) {
    if (uri.indexOf('chrome-extension') == 0) {
        return uri;
    } else {
        return runtime.getURL(uri);
    }
}

function checkNotificationOptions(options) {
    var requiredOptions = [ 'type', 'iconUrl', 'title', 'message' ];
    var permittedTypes = [ 'basic', 'image', 'list' ];
    for (var i = 0; i < requiredOptions.length; i++) {
        if (!(requiredOptions[i] in options)) {
            console.error('Error: Invalid notification options. Property \'' + requiredOptions[i] + '\' is required.');
            return false;
        }
    }
    if (permittedTypes.indexOf(options.type) == -1) {
        console.error('Error: Invalid notification options. Property \'type\' must be one of ' +
                      JSON.stringify(permittedTypes) + '.');
        return false;
    }
    options.iconUrl = resolveUri(options.iconUrl);
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
    return true;
}

exports.create = function(notificationId, options, callback) {
    if (!checkNotificationOptions(options)) {
        return;
    }
    if (notificationId == '') {
        notificationId = Math.floor(Math.random()*10000000000).toString();
    }
    notifications[notificationId] = true;
    storage.internal.set({'notifications':notifications});
    var win = function() {
        callback(notificationId);
    }
    exec(win, undefined, 'ChromeNotifications', 'create', [notificationId, options]);
}

exports.update = function(notificationId, options, callback) {
    if (!checkNotificationOptions(options)) {
        return;
    }
    var win = function(wasUpdated) {
        callback(!!wasUpdated);
    }
    exec(win, undefined, 'ChromeNotifications', 'update', [notificationId, options]);
}

exports.clear = function(notificationId, callback) {
    delete notifications[notificationId];
    storage.internal.set({'notifications':notifications});
    var win = function(wasCleared) {
        callback(!!wasCleared);
    }
    exec(win, undefined, 'ChromeNotifications', 'clear', [notificationId]);
}

exports.getAll = function(callback) {
    setTimeout(function() {
        callback(notifications);
    }, 0);
}

exports.triggerOnClicked = function(notificationId) {
    exports.onClicked.fire(notificationId);
}

exports.triggerOnClosed = function(notificationId) {
    delete notifications[notificationId];
    storage.internal.set({'notifications':notifications});
    exports.onClosed.fire(notificationId, true);
}

exports.triggerOnButtonClicked = function(notificationId, buttonIndex) {
    exports.onButtonClicked.fire(notificationId, buttonIndex);
}

exports.onClosed = new Event('onClosed');
exports.onClicked = new Event('onClicked');
exports.onButtonClicked = new Event('onButtonClicked');

function fireStartupEvents() {
    exec(undefined, undefined, 'ChromeNotifications', 'fireStartupEvents', []);
}

channel.createSticky('onChromeNotificationsReady');
channel.waitForInitialization('onChromeNotificationsReady');
channel.onCordovaReady.subscribe(function() {
    storage.internal.get('notifications', function(values) {
        if (values.notifications) {
            notifications = values.notifications;
            notifications.__proto__ = null;
        }
        channel.initializationComplete('onChromeNotificationsReady');
        require('org.chromium.common.helpers').runAtStartUp(fireStartupEvents);
    });
});

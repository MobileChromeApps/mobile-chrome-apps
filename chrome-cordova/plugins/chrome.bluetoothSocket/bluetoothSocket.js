// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('org.chromium.common.events');
var exec = require('cordova/exec');
var callbackWithError = require('org.chromium.common.errors').callbackWithError;

var fail = function(callback) {
    return callback && function(msg) {
        callbackWithError(msg, callback);
    };
};

exports.create = function(properties, callback) {
    if (typeof properties == 'function') {
        callback = properties;
        properties = {};
    }
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'create', [properties]);
};

exports.update = function(socketId, properties, callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'update', [socketId, properties]);
};

exports.setPaused = function(socketId, paused, callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'setPaused', [socketId, paused]);
};

exports.listenUsingRfcomm = function(socketId, uuid, options, callback) {
    if (typeof options == 'function') {
        callback = options;
        options = {};
    }
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'listenUsingRfcomm', [socketId, uuid, options]);
};

exports.listenUsingL2cap = function(socketId, uuid, options, callback) {
    console.warn('chrome.bluetoothSocket.listenUsingL2cap is not implemented');
};

exports.connect = function(socketId, address, uuid, callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'connect', [socketId, address, uuid]);
};

exports.disconnect = function(socketId, callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'disconnect', [socketId]);
};

exports.close = function(socketId, callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'close', [socketId]);
};

exports.send = function(socketId, data, callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'send', [socketId, data]);
};

exports.getInfo = function(socketId, callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'getInfo', [socketId]);
};

exports.getSockets = function(callback) {
    exec(callback, fail(callback), 'ChromeBluetoothSocket', 'getSockets', []);
};

exports.onAccept = new Event('onAccept');
exports.onAcceptError = new Event('onAcceptError');
exports.onReceive = new Event('onReceive');
exports.onReceiveError = new Event('onReceiveError');

function registerEvents() {

    var onEventsSuccess = function(eventType) {
        switch (eventType) {
        case 'onAccept':
            exports.onAccept.fire(arguments[1]);
            break;
        case 'onReceive':
            var info = {
                socketId: arguments[1],
                data: arguments[2]
            };
            exports.onReceive.fire(info);
            break;
        }
    };

    var onEventsError = function(eventType) {
        switch (eventType) {
        case 'onAccept':
            exports.onAcceptError.fire(arguments[1]);
            break;
        case 'onReceive':
            exports.onReceiveError.fire(arguments[1]);
            break;
        }
    };

    exec(onEventsSuccess, onEventsError, 'ChromeBluetoothSocket', 'registerBluetoothSocketEvents', []);
}

require('org.chromium.common.helpers').runAtStartUp(registerEvents);

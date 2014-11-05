// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var Event = require('org.chromium.common.events');
var exec = cordova.require('cordova/exec');
var callbackWithError = require('org.chromium.common.errors').callbackWithError;

exports.create = function(properties /** optional */, callback) {
    if (typeof properties == 'function') {
        callback = properties;
        properties = {};
    }
    var win = callback && function(socketId) {
        var createInfo = {
            socketId: socketId
        };
        callback(createInfo);
    };
    exec(win, null, 'ChromeSocketsTcpServer', 'create', [properties]);
};

exports.update = function(socketId, properties, callback) {
    exec(callback, null, 'ChromeSocketsTcpServer', 'update', [socketId, properties]);
};

exports.setPaused = function(socketId, paused, callback) {
    exec(callback, null, 'ChromeSocketsTcpServer', 'setPaused', [socketId, paused]);
};

exports.listen = function(socketId, address, port, backlog /** optional */, callback) {
    if (typeof backlog == 'function') {
        callback = backlog;
        backlog = null; /** Use SOMAXCONN */
    }

    var win = callback && function() {
        callback(0);
    };

    var fail = callback && function(error) {
        callbackWithError(error.message, callback, error.resultCode);
    };
    exec(win, fail, 'ChromeSocketsTcpServer', 'listen', [socketId, address, port, backlog]);
};

exports.disconnect = function(socketId, callback) {
    exec(callback, null, 'ChromeSocketsTcpServer', 'disconnect', [socketId]);
};

exports.close = function(socketId, callback) {
    exec(callback, null, 'ChromeSocketsTcpServer', 'close', [socketId]);
};

exports.getInfo = function(socketId, callback) {
    var win = callback && function(result) {
        result.persistent = !!result.persistent;
        result.paused = !!result.paused;
        callback(result);
    };
    exec(win, null, 'ChromeSocketsTcpServer', 'getInfo', [socketId]);
};

exports.getSockets = function(callback) {
    var win = callback && function(results) {
        for (var result in results) {
            result.persistent = !!result.persistent;
            result.paused = !!result.paused;
        }
        callback(results);
    };
    exec(win, null, 'ChromeSocketsTcpServer', 'getSockets', []);
};

exports.onAccept = new Event('onAccept');
exports.onAcceptError = new Event('onAcceptError');

function registerAcceptEvents() {
    var win = function(info) {
        exports.onAccept.fire(info);
    };

    var fail = function(info) {
        var error = function() {
            exports.onAcceptError.fire(info);
        };
        callbackWithError(info.message, error);
    };

    exec(win, fail, 'ChromeSocketsTcpServer', 'registerAcceptEvents', []);
}

require('org.chromium.common.helpers').runAtStartUp(registerAcceptEvents);

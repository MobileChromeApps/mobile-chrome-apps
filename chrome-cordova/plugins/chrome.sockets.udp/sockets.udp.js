// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var Event = require('org.chromium.common.events');
var platform = cordova.require('cordova/platform');
var exec = cordova.require('cordova/exec');

exports.create = function(properties, callback) {
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
    exec(win, null, 'ChromeSocketsUdp', 'create', [properties]);
};

exports.update = function(socketId, properties, callback) {
    console.warn('not implemented yet');
};

exports.setPaused = function(socketId, paused, callback) {
    console.warn('not implemented yet');
};

exports.bind = function(socketId, address, port, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function(errCode) {
        callback(errCode);
    };
    exec(win, fail, 'ChromeSocketsUdp', 'bind', [socketId, address, port]);
};

exports.send = function(socketId, data, address, port, callback) {
    var type = Object.prototype.toString.call(data).slice(8, -1);
    if (type != 'ArrayBuffer') {
        throw new Error('chrome.socket.write - data is not an ArrayBuffer! (Got: ' + type + ')');
    }
    var win = callback && function(bytesSent) {
        var sendInfo = {
            bytesSent: bytesSent,
            resultCode: 0
        };
        callback(sendInfo);
    };
    var fail = callback && function(errCode) {
        var sendInfo = {
            bytesSent: 0,
            resultCode: errCode
        };
        callback(sendInfo);
    };
    exec(win, fail, 'ChromeSocketsUdp', 'send', [socketId, address, port, data]);
};

exports.close = function(socketId, callback) {
    exec(callback, null, 'ChromeSocketsUdp', 'close', [socketId]);
};

exports.getInfo = function(socketId, callback) {
    var win = callback && function(result) {
        result.persistent = !!result.persistent;
        result.paused = !!result.paused;
        callback(result);
    };
    exec(win, null, 'ChromeSocketsUdp', 'getInfo', [socketId]);
};

exports.getSockets = function(callback) {
    var win = callback && function(results) {
        for (var result in results) {
            result.persistent = !!result.persistent;
            result.paused = !!result.paused;
        };
        callback(results);
    };
    exec(win, null, 'ChromeSocketsUdp', 'getSockets', []);
};

exports.onReceive = new Event('onReceive');
exports.onReceiveError = new Event('onReceiveError');

function registerReceiveEvents() {

    var win = function() {
        info = {
            socketId: arguments[0],
            data: arguments[1],
            remoteAddress: arguments[2],
            remotePort: arguments[3]
        };
        exports.onReceive.fire(info);
    };

    var fail = function(info) {
        exports.onReceiveError.fire(info);
    };
    exec(win, fail, 'ChromeSocketsUdp', 'registerReceiveEvents', []);
}

require('org.chromium.common.helpers').runAtStartUp(registerReceiveEvents);

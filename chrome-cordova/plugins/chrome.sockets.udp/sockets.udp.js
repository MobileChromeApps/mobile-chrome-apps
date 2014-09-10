// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var Event = require('org.chromium.common.events');
var exec = cordova.require('cordova/exec');

var checkBufferSize = function(bufferSize) {

    if (bufferSize === null)
        return;

    if (bufferSize > 65535) {
        console.warn('The theoretical maximum size of any IPv4 UDP packet is UINT16_MAX = 65535.');
    }

    if (bufferSize > 4294967295) {
        console.warn('The theoretical maximum size of any IPv6 UDP packet is UINT32_MAX = 4294967295');
    }
};

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
    checkBufferSize(properties.bufferSize);
    exec(win, null, 'ChromeSocketsUdp', 'create', [properties]);
};

exports.update = function(socketId, properties, callback) {
    checkBufferSize(properties.bufferSize);
    exec(callback, null, 'ChromeSocketsUdp', 'update', [socketId, properties]);
};

exports.setPaused = function(socketId, paused, callback) {
    exec(callback, null, 'ChromeSocketsUdp', 'setPaused', [socketId, paused]);
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
        }
        callback(results);
    };
    exec(win, null, 'ChromeSocketsUdp', 'getSockets', []);
};

exports.joinGroup = function(socketId, address, callback) {
    var win = callback && function() {
        callback(0);
    };
    exec(win, callback, 'ChromeSocketsUdp', 'joinGroup', [socketId, address]);
};

exports.leaveGroup = function(socketId, address, callback) {
    var win = callback && function() {
        callback(0);
    };
    exec(win, callback, 'ChromeSocketsUdp', 'leaveGroup', [socketId, address]);
};

exports.setMulticastTimeToLive = function(socketId, ttl, callback) {
    var win = callback && function() {
        callback(0);
    };
    exec(win, callback, 'ChromeSocketsUdp', 'setMulticastTimeToLive', [socketId, ttl]);
};

exports.setMulticastLoopbackMode = function(socketId, enabled, callback) {
    var win = callback && function() {
        callback(0);
    };
    exec(win, callback, 'ChromeSocketsUdp', 'setMulticastLoopbackMode', [socketId, enabled]);
};

exports.getJoinedGroups = function(socketId, callback) {
    exec(callback, null, 'ChromeSocketsUdp', 'getJoinedGroups', [socketId]);
};

exports.onReceive = new Event('onReceive');
exports.onReceiveError = new Event('onReceiveError');

function registerReceiveEvents() {

    var win = function() {
        var info = {
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

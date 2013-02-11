// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.socket', function(require, module) {

var exports = module.exports;
var platform = cordova.require('cordova/platform').id;

exports.create = function(socketMode, stuff, callback) {
    if (typeof stuff == 'function') {
        callback = stuff;
        stuff = {};
    }
    var win = callback && function(socketId) {
        var socketInfo = {
            socketId: socketId
        };
        callback(socketInfo);
    };
    cordova.exec(win, null, 'ChromeSocket', 'create', [socketMode]);
};

exports.destroy = function(socketId) {
    cordova.exec(null, null, 'ChromeSocket', 'destroy', [socketId]);
};


exports.connect = function(socketId, address, port, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1);
    };
    cordova.exec(win, fail, 'ChromeSocket', 'connect', [socketId, address, port]);
};

exports.bind = function(socketId, address, port, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1);
    };
    cordova.exec(win, fail, 'ChromeSocket', 'bind', [socketId, address, port]);
};

exports.disconnect = function(socketId) {
    cordova.exec(null, null, 'ChromeSocket', 'disconnect', [socketId]);
};


exports.read = function(socketId, bufferSize, callback) {
    if (typeof bufferSize == 'function') {
        callback = bufferSize;
        bufferSize = 0;
    }
    var win = callback && function(data) {
        var readInfo = {
            resultCode: data.byteLength || 1,
            data: data
        };
        callback(readInfo);
    };
    var fail = callback && function() {
        var readInfo = {
            resultCode: 0
        };
        callback(readInfo);
    };
    cordova.exec(win, fail, 'ChromeSocket', 'read', [socketId, bufferSize]);
};

exports.write = function(socketId, data, callback) {
    var type = Object.prototype.toString.call(data).slice(8, -1);
    if (type != 'ArrayBuffer') {
        throw new Error('chrome.socket.write - data is not an ArrayBuffer! (Got: ' + type + ')');
    }
    var win = callback && function(bytesWritten) {
        var writeInfo = {
            bytesWritten: bytesWritten
        };
        callback(writeInfo);
    };
    var fail = callback && function() {
        var writeInfo = {
            bytesWritten: 0
        };
        callback(writeInfo);
    };
    cordova.exec(win, fail, 'ChromeSocket', 'write', [socketId, data]);
};


exports.recvFrom = function(socketId, bufferSize, callback) {
    if (typeof bufferSize == 'function') {
        callback = bufferSize;
        bufferSize = 0;
    }
    var win;
    if (platform == 'android') {
        win = callback && (function() {
            var data;
            var call = 0;
            return function(arg) {
                if (call === 0) {
                    data = arg;
                    call++;
                } else {
                    var recvFromInfo = {
                        resultCode: data.byteLength || 1,
                        data: data,
                        address: arg.address,
                        port: arg.port
                    };

                    callback(recvFromInfo);
                }
            };
        })();
    } else {
        win = callback && function(data) {
            var recvFromInfo = {
                resultCode: data.byteLength || 1,
                data: data,
                address: 0, // TODO
                port: 0 // TODO
            };

            callback(recvFromInfo);
        };
    }

    var fail = callback && function() {
        var readInfo = {
            resultCode: 0
        };
        callback(readInfo);
    };
    cordova.exec(win, fail, 'ChromeSocket', 'recvFrom', [socketId, bufferSize]);
};

exports.sendTo = function(socketId, data, address, port, callback) {
    var type = Object.prototype.toString.call(data).slice(8, -1);
    if (type != 'ArrayBuffer') {
        throw new Error('chrome.socket.write - data is not an ArrayBuffer! (Got: ' + type + ')');
    }
    var win = callback && function(bytesWritten) {
        var writeInfo = {
            bytesWritten: bytesWritten
        };
        callback(writeInfo);
    };
    var fail = callback && function() {
        var writeInfo = {
            bytesWritten: 0
        };
        callback(writeInfo);
    };
    cordova.exec(win, fail, 'ChromeSocket', 'sendTo', [{ socketId: socketId, address: address, port: port }, data]);
};


exports.listen = function(socketId, address, port, backlog, callback) {
    if (typeof backlog == 'function') {
        callback = backlog;
        backlog = 0;
    }
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1);
    };
    cordova.exec(win, fail, 'ChromeSocket', 'listen', [socketId, address, port, backlog]);
};

exports.accept = function(socketId, callback) {
    var win = callback && function(acceptedSocketId) {
        var acceptInfo = {
            resultCode: 0,
            socketId: acceptedSocketId
        };
        callback(acceptInfo);
    };
    cordova.exec(win, null, 'ChromeSocket', 'accept', [socketId]);
};


exports.setKeepAlive = function() {
  console.warn('chrome.socket.setKeepAlive not implemented yet');
};

exports.setNoDelay = function() {
  console.warn('chrome.socket.setNoDelay not implemented yet');
};

exports.getInfo = function() {
  console.warn('chrome.socket.getInfo not implemented yet');
};

exports.getNetworkList = function() {
  console.warn('chrome.socket.getNetworkList not implemented yet');
};

});

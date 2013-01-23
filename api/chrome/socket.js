define('chrome.socket', function(require, module) {

var exports = module.exports;

exports.create = function(socketMode, stuff, callback) {
    var win = callback && function(socketId) {
        var socketInfo = {
            socketId: socketId
        };
        callback(socketInfo);
    };
    cordova.exec(win, null, 'ChromeSocket', 'create', [socketMode]);
};

exports.connect = function(socketId, address, port, callback) {
    cordova.exec(callback, null, 'ChromeSocket', 'connect', [socketId, address, port]);
};

exports.listen = function(socketId, address, port, backlog, callback) {
    if (typeof backlog == 'function') {
        callback = backlog;
        backlog = 0;
    }
    cordova.exec(callback, null, 'ChromeSocket', 'listen', [socketId, address, port, backlog]);
};

exports.accept = function(socketId, callback) {
    var win = callback && function() {
        var acceptInfo = {
            resultCode: 0,
            socketId: socketId
        };
        callback(acceptInfo);
    };
    cordova.exec(win, null, 'ChromeSocket', 'accept', [socketId]);
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
    cordova.exec(win, null, 'ChromeSocket', 'write', [socketId, data]);
};

exports.read = function(socketId, bufferSize, callback) {
    if (typeof bufferSize == 'function') {
        callback = bufferSize;
        bufferSize = 0;
    }
    var win = callback && function(data) {
        var readInfo = {
            resultCode: 1,
            data: data
        };
        callback(readInfo);
    };
    cordova.exec(win, null, 'ChromeSocket', 'read', [socketId, bufferSize]);
};

exports.disconnect = function(socketId) {
    cordova.exec(null, null, 'ChromeSocket', 'disconnect', [socketId]);
};

exports.destroy = function(socketId) {
    cordova.exec(null, null, 'ChromeSocket', 'destroy', [socketId]);
};

});

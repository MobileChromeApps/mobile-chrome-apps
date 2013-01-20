define('chrome.socket', function(require, module) {

var exports = module.exports;

exports.create = function(socketMode, stuff, callback) {
    cordova.exec(function(socketId) {
        var socketInfo = {};
        socketInfo.socketId = socketId;
        if (!!callback && typeof callback == 'function') {
            callback(socketInfo);
        }
    }, null, 'ChromeSocket', 'create', [{ socketMode: socketMode }]);
};

exports.connect = function(socketId, address, port, callback) {
    cordova.exec(function(result) {
        if (!!callback && typeof callback == 'function') {
            callback(result);
        }
    }, null, 'ChromeSocket', 'connect', [{ socketId: socketId, address: address, port: port }]);
};

exports.listen = function(socketId, address, port, backlog, callback) {
    if (typeof backlog == 'function') {
      callback = backlog;
      backlog = 0;
    }
    cordova.exec(function(result) {
        if (!!callback && typeof callback == 'function') {
            callback(result);
        }
    }, null, 'ChromeSocket', 'listen', [{ socketId: socketId, address: address, port: port, backlog: backlog }]);
};

exports.accept = function(socketId, callback) {
    console.log('accept');
    cordova.exec(function(socketId) {
        var acceptInfo = {};
        acceptInfo.resultCode = 0;
        acceptInfo.socketId = socketId;
        if (!!callback && typeof callback == 'function') {
            callback(acceptInfo);
        }
    }, null, 'ChromeSocket', 'accept', [{ socketId: socketId }]);
};

exports.write = function(socketId, data, callback) {
    var type = Object.prototype.toString.call(data).slice(8, -1);
    if (type != 'ArrayBuffer') {
      throw 'chrome.socket.write - data is not an ArrayBuffer! (Got: ' + type + ')';
    }

    cordova.exec(function(bytesWritten) {
        var writeInfo = {};
        writeInfo.bytesWritten = bytesWritten;
        if (!!callback && typeof callback == 'function') {
            callback(writeInfo);
        }
    }, null, 'ChromeSocket', 'write', [{ socketId: socketId }, data]);
};

exports.read = function(socketId, bufferSize, callback) {
    if (!callback) {
        callback = bufferSize;
        bufferSize = 0;
    }
    cordova.exec(function(data) {
        var readInfo = {};
        readInfo.resultCode = 1;
        readInfo.data = data;
        if (!!callback && typeof callback == 'function') {
            callback(readInfo);
        }
    }, null, 'ChromeSocket', 'read', [{ socketId: socketId, bufferSize: bufferSize }]);
};

exports.disconnect = function(socketId) {
    cordova.exec(null, null, 'ChromeSocket', 'disconnect', [{ socketId: socketId }]);
};

exports.destroy = function(socketId) {
    cordova.exec(null, null, 'ChromeSocket', 'destroy', [{ socketId: socketId }]);
};

});

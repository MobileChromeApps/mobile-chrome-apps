define('chrome.socket', function(require, module) {

var stringToArrayBuffer = function(str) {
    var ret = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
        ret[i] = str.charCodeAt(i);
    }
    return ret;
};

var decodeUint8ArrayFromBase64 = function(b64) {
    var decoded = atob(b64);
    return stringToArrayBuffer(decoded);
};

var exports = module.exports;

exports.create = function(socketMode, stuff, callback) {
    cordova.exec(function(socketId) {
        var socketInfo = {};
        socketInfo.socketId = socketId;
        if (!!callback && typeof callback == 'function') {
            callback(socketInfo);
        }
    }, null, 'Socket', 'create', [{ socketMode: socketMode }]);
};

exports.connect = function(socketId, address, port, callback) {
    cordova.exec(function(result) {
        if (!!callback && typeof callback == 'function') {
            callback(result);
        }
    }, null, 'Socket', 'connect', [{ socketId: socketId, address: address, port: port }]);
};

exports.write = function(socketId, data, callback) {
    if (typeof data == 'string') {
        data = stringToArrayBuffer(data).buffer;
    }

    cordova.exec(function(bytesWritten) {
        var writeInfo = {};
        writeInfo.bytesWritten = bytesWritten;
        if (!!callback && typeof callback == 'function') {
            callback(writeInfo);
        }
    }, null, 'Socket', 'write', [{ socketId: socketId }, data]);
};

exports.read = function(socketId, bufferSize, callback) {
    if (!callback) {
        callback = bufferSize;
        bufferSize = 0;
    }
    cordova.exec(function(base64data) {
        var readInfo = {};
        readInfo.resultCode = 1;
        readInfo.data = decodeUint8ArrayFromBase64(base64data).buffer;
        if (!!callback && typeof callback == 'function') {
            callback(readInfo);
        }
    }, null, 'Socket', 'read', [{ socketId: socketId, bufferSize: bufferSize }]);
};

exports.disconnect = function(socketId) {
    cordova.exec(null, null, 'Socket', 'disconnect', [{ socketId: socketId }]);
};

exports.destroy = function(socketId) {
    cordova.exec(null, null, 'Socket', 'destroy', [{ socketId: socketId }]);
};

});

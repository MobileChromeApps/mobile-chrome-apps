// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exports = module.exports;
var exec = cordova.require('cordova/exec');

function bigfail(errorMessage, callback) {
  return function() {
    console.log(errorMessage);
    chrome.runtime.lastError = { 'message': errorMessage };
    callback && callback();
  }
}

function _jsonReplacer(key) {
    // Don't use the value passed in since it has already gone through toJSON().
    var value = this[key];
    // Refer to:
    // chrome/src/content/renderer/v8_value_converter_impl.cc&l=165
    if (value && (typeof value == 'object' || typeof value == 'function')) {
        var typeName = Object.prototype.toString.call(value).slice(8, -1);
        if (typeName != 'Array' && typeName != 'Object') {
            // this is a hack. It will catch DOm things, but also custom classes
            // if you have a better way to detect native DOM classes...
            if(typeName.slice(0,4)=='HTML'){
                value=undefined;
            } else {
                value = {};
            }
        }
    }
    return value;
}

function _scrubValues(o) {
    if (typeof o != 'undefined') {
        var t = JSON.stringify(o, _jsonReplacer);
        return JSON.parse(t);
    }
}

function _calculateChanges(oldKeyVals, newKeyVals) {
    var ret = {};
    for(var key in newKeyVals) {
        if (newKeyVals.hasOwnProperty(key)) {
            ret[key] = {};
            if( typeof(oldKeyVals[key]) != 'undefined' ) ret[key].oldValue = oldKeyVals[key];
            if( typeof(newKeyVals[key]) != 'undefined' ) ret[key].newValue = newKeyVals[key];
        }
    }
    return ret;
}

function _convertToObject(obj) {
    var ret;
    if (Array.isArray(obj)) {
        ret = {};
        for(var i = 0; i < obj.length; i++) {
            ret[obj[i]] = undefined;
        }
    } else if (typeof obj == 'object') {
        ret = obj;
    } else if (typeof obj === 'string') {
        ret = {};
        ret[obj] = undefined;
    }
    return ret;
}

function StorageArea(namespace, changedEvent) {
    this._namespace = namespace;
    this._changedEvent = changedEvent;
}

StorageArea.prototype._getAreaName = function() {
    return this._namespace;
};

StorageArea.prototype.get = function(keys, callback) {
    if (typeof keys == 'function') {
        callback = keys;
        keys = null;
    } else if (typeof keys === 'string') {
        keys = [keys];
    }
    var win = callback && function(args) {
        callback(args);
    };
    var fail = callback && function() {
        callback();
    };
    var param = _scrubValues(keys);
    exec(win, fail, 'ChromeStorage', 'get', [this._namespace, param]);
};

StorageArea.prototype.getBytesInUse = function(keys, callback) {
    if (typeof keys == 'function') {
        callback = keys;
        keys = null;
    } else if (typeof keys === 'string') {
        keys = [keys];
    }
    var win = callback && function(bytes) {
        callback(bytes);
    };
    var fail = callback && function() {
        callback(-1);
    };
    var param = _scrubValues(keys);
    exec(win, fail, 'ChromeStorage', 'getBytesInUse', [this._namespace, param]);
};

StorageArea.prototype.set = function(keyVals, callback) {
    if (typeof keyVals == 'function') {
        callback = keyVals;
        keyVals = null;
    }
    var self = this;
    var param = _scrubValues(keyVals);
    var fail = callback && function(err) {
        bigfail(err,callback());
    };
    var win;
    if(self._changedEvent && self._changedEvent.hasListeners()) {
        win = function(oldKeyVals) {
            if(callback) {
                callback(0);
            }
            var newKeyVals = _convertToObject(param);
            var storageChanges = _calculateChanges(oldKeyVals, newKeyVals);
            self._changedEvent.fire(storageChanges, self._getAreaName());
        };
    } else {
        win = callback && function() {
            callback(0);
        };
    }
    exec(win, fail, 'ChromeStorage', 'set', [self._namespace, param]);
};

StorageArea.prototype.remove = function(keys, callback) {
    if (typeof keys == 'function') {
        callback = keys;
        keys = null;
    } else if (typeof keys === 'string') {
        keys = [keys];
    }
    var self = this;
    var param = _scrubValues(keys);
    var fail = callback && function() {
        callback(-1);
    };
    var win;
    if(self._changedEvent && self._changedEvent.hasListeners()) {
        win = function(oldKeyVals) {
            if(callback) {
                callback(0);
            }
            var newKeyVals = _convertToObject(Object.keys(oldKeyVals));
            var storageChanges = _calculateChanges(oldKeyVals, newKeyVals);
            self._changedEvent.fire(storageChanges, self._getAreaName());
        };
    } else {
        win = callback && function() {
            callback(0);
        };
    }
    exec(win, fail, 'ChromeStorage', 'remove', [self._namespace, param]);
};

StorageArea.prototype.clear = function(callback) {
    var self = this;
    var fail = callback && function() {
        callback(-1);
    };
    var win;
    if(self._changedEvent && self._changedEvent.hasListeners()) {
       win = function(oldKeyVals) {
           if(callback) {
               callback(0);
           }
           var newKeyVals = _convertToObject(Object.keys(oldKeyVals));
           var storageChanges = _calculateChanges(oldKeyVals, newKeyVals);
           self._changedEvent.fire(storageChanges, self._getAreaName());
       };
    } else {
        win = callback && function() {
            callback(0);
        };
    }
    exec(win, fail, 'ChromeStorage', 'clear', [self._namespace]);
};

var Event = require('org.chromium.common.events');
exports.onChanged = new Event('onChanged');

var local = new StorageArea('local', exports.onChanged);
local.QUOTA_BYTES = 5242880;
exports.local = local;

var sync = new StorageArea('sync', exports.onChanged);
sync.MAX_ITEMS = 512;
sync.MAX_WRITE_OPERATIONS_PER_HOUR = 1000;
sync.QUOTA_BYTES_PER_ITEM = 4096;
sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 10;
sync.QUOTA_BYTES = 102400;
exports.sync = sync;

var internal = new StorageArea('internal', null);
exports.internal = internal;

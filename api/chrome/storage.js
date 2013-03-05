// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.storage', function(require, module) {

var exports = module.exports;

function StorageChange(oldValue, newValue) {
    this.oldValue = oldValue;
    this.newValue = newValue;
}

function _jsonReplacer(key) {
    // Don't use the value passed in since it has already gone through toJSON().
    var value = this[key];
    // Refer to:
    // chrome/src/content/renderer/v8_value_converter_impl.cc&l=165
    if (value && (typeof value == 'object' || typeof value == 'function')) {
        var typeName = Object.prototype.toString.call(value).slice(8, -1);
        if (typeName != 'Array' && typeName != 'Object') {
            value = {};
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
            ret[key] = new StorageChange(oldKeyVals[key], newKeyVals[key]);
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

function StorageArea(syncStorage, changedEvent) {
    this._sync = syncStorage;
    this._changedEvent = changedEvent;
}

StorageArea.prototype._getAreaName = function() {
    return (this._sync? 'sync' : 'local');
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
    cordova.exec(win, fail, 'ChromeStorage', 'get', [this._sync, param]);
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
    cordova.exec(win, fail, 'ChromeStorage', 'getBytesInUse', [this._sync, param]);
};

StorageArea.prototype.set = function(keyVals, callback) {
    if (typeof keyVals == 'function') {
        callback = keyVals;
        keyVals = null;
    }
    var self = this;
    var param = _scrubValues(keyVals);
    var fail = callback && function() {
        callback(-1);
    };
    var win;
    if(self._changedEvent.hasListeners()) {
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
    cordova.exec(win, fail, 'ChromeStorage', 'set', [self._sync, param]);
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
    if(self._changedEvent.hasListeners()) {
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
    cordova.exec(win, fail, 'ChromeStorage', 'remove', [self._sync, param]);
};

StorageArea.prototype.clear = function(callback) {
    var self = this;
    var fail = callback && function() {
        callback(-1);
    };
    var win;
    if(self._changedEvent.hasListeners()) {
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
    cordova.exec(win, fail, 'ChromeStorage', 'clear', [self._sync]);
};

var Event = require('chrome.Event');
exports.onChanged = new Event('onChanged');

var local = new StorageArea(false, exports.onChanged);
local.QUOTA_BYTES = 5242880;
var sync = new StorageArea(true, exports.onChanged);
sync.MAX_ITEMS = 512;
sync.MAX_WRITE_OPERATIONS_PER_HOUR = 1000;
sync.QUOTA_BYTES_PER_ITEM = 4096;
sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 10;
sync.QUOTA_BYTES = 102400;

exports.local = local;
exports.sync = sync;
});

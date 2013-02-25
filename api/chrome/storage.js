// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.storage', function(require, module) {

var exports = module.exports;

function StorageArea(syncStorage) {
    this._sync = syncStorage;
}

StorageArea.prototype._jsonReplacer = function(key) {
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
};

StorageArea.prototype._scrubValues = function(o) {
    if (typeof o != 'undefined') {
        var t = JSON.stringify(o, this._jsonReplacer);
        return JSON.parse(t);
    }
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
    var param = this._scrubValues(keys);
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
    var param = this._scrubValues(keys);
    cordova.exec(win, fail, 'ChromeStorage', 'getBytesInUse', [this._sync, param]);
};

StorageArea.prototype.set = function(keyVals, callback) {
    if (typeof keyVals == 'function') {
        callback = keyVals;
        keyVals = null;
    }
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1);
    };
    var param = this._scrubValues(keyVals);
    cordova.exec(win, fail, 'ChromeStorage', 'set', [this._sync, param]);
};

StorageArea.prototype.remove = function(keys, callback) {
    if (typeof keys == 'function') {
        callback = keys;
        keys = null;
    } else if (typeof keys === 'string') {
        keys = [keys];
    }
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1);
    };
    var param = this._scrubValues(keys);
    cordova.exec(win, fail, 'ChromeStorage', 'remove', [this._sync, param]);
};

StorageArea.prototype.clear = function(callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1);
    };
    cordova.exec(win, fail, 'ChromeStorage', 'clear', [this._sync]);
};

var local = new StorageArea(false);
local.QUOTA_BYTES = 5242880;
var sync = new StorageArea(true);
sync.MAX_ITEMS = 512;
sync.MAX_WRITE_OPERATIONS_PER_HOUR = 1000;
sync.QUOTA_BYTES_PER_ITEM = 4096;
sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 10;
sync.QUOTA_BYTES = 102400;

exports.local = local;
exports.sync = sync;

var Event = require('chrome.Event');
exports.onChanged = new Event('onChanged');
});

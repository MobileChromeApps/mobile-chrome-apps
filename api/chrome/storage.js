// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.storage', function(require, module) {

  function jsonReplacer(key) {
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

  function StorageArea() {
  }

  StorageArea.prototype.getBytesInUse = unsupportedApi('StorageArea.getBytesInUse');

  StorageArea.prototype.clear = function() {
    localStorage.clear();
  };

  StorageArea.prototype.set = function(items) {
    for (var key in items) {
      if (items.hasOwnProperty(key)) {
        if (typeof items[key] != 'undefined') {
          var value = JSON.stringify(items[key], jsonReplacer);
          localStorage.setItem(key, value);
        }
      }
    }
  };

  StorageArea.prototype.remove = function(keys) {
    if (typeof keys == 'string') {
      keys = [keys];
    }
    for (var i = 0; i < keys.length; ++i) {
      localStorage.removeItem(keys[i]);
    }
  };

  StorageArea.prototype.get = function(items, callback) {
    var ret = {};

    if (typeof items == 'function') {
      callback = items;
      items = null;
    }
    if (typeof callback != 'function') {
      throw 'callback must be a function';
    }

    var getLocalStorageValuesForKeys = function(keys) {
      var ret = {};
      keys.forEach(function(key) {
        var item = localStorage.getItem(key);
        if (item != null) {
          ret[key] = JSON.parse(item);
        }
      });
      return ret;
    };


    if (items == null) {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      ret = getLocalStorageValuesForKeys(keys);
    } else if (typeof items == 'string') {
      ret = getLocalStorageValuesForKeys([items]);
    } else if (Object.prototype.toString.call(items) == Object.prototype.toString.call([])) {
      ret = getLocalStorageValuesForKeys(items);
    } else {
      ret = items; // assign defaults
      var o = getLocalStorageValuesForKeys(Object.keys(items));
      Object.keys(o).forEach(function(key) {
          ret[key] = o[key];
      });
    }
    callback(ret);
    return;
  };
/*
  function StorageChange(oldValue, newValue) {
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
*/
  var local = new StorageArea();
  local.QUOTA_BYTES = 5242880;

  var sync = new StorageArea();
  sync.MAX_ITEMS = 512;
  sync.MAX_WRITE_OPERATIONS_PER_HOUR = 1000;
  sync.QUOTA_BYTES_PER_ITEM = 4096;
  sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 10;
  sync.QUOTA_BYTES = 102400;

  var exports = module.exports;
  exports.local = local;
  exports.sync = sync;

  // TODO(mmocny): Hook up this event so it actually gets called(?)
  var Event = require('chrome.Event');
  exports.onChanged = new Event('onChanged');
  //chrome.storage.onChanged.addListener(function(object changes, string areaName) {...});

});

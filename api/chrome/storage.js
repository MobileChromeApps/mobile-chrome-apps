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

  function StorageArea(namespaceChar) {
    this._namespace = '_%_' + namespaceChar;
  }

  StorageArea.prototype.getBytesInUse = unsupportedApi('StorageArea.getBytesInUse');

  StorageArea.prototype.clear = function() {
    var toRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.slice(0, 4) == this._namespace) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(localStorage.removeItem, localStorage);
  };

  StorageArea.prototype.set = function(items) {
    for (var key in items) {
      if (items.hasOwnProperty(key)) {
        if (typeof items[key] != 'undefined') {
          var value = JSON.stringify(items[key], jsonReplacer);
          localStorage.setItem(this._namespace + key, value);
        }
      }
    }
  };

  StorageArea.prototype.remove = function(keys) {
    if (typeof keys == 'string') {
      keys = [keys];
    }
    for (var i = 0; i < keys.length; ++i) {
      localStorage.removeItem(this._namespace + keys[i]);
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

    var namespace = this._namespace;
    function getLocalStorageValuesForKeys(keys) {
      var ret = {};
      keys.forEach(function(key) {
        var item = localStorage.getItem(namespace + key);
        if (item !== null) {
          ret[key] = JSON.parse(item);
        }
      });
      return ret;
    }


    if (items == null) {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i).slice(4));
      }
      ret = getLocalStorageValuesForKeys(keys);
    } else if (typeof items == 'string') {
      ret = getLocalStorageValuesForKeys([items]);
    } else if (Object.prototype.toString.call(items).slice(8, -1) == 'Array') {
      ret = getLocalStorageValuesForKeys(items);
    } else {
      ret = items; // assign defaults
      var o = getLocalStorageValuesForKeys(Object.keys(items));
      Object.keys(o).forEach(function(key) {
          ret[key] = o[key];
      });
    }
    callback(ret);
  };
/*
  function StorageChange(oldValue, newValue) {
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
*/
  var local = new StorageArea('l');
  local.QUOTA_BYTES = 5242880;

  var sync = new StorageArea('s');
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

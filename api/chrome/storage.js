define('chrome.storage', function(require, module) {
  function StorageArea() {
  }

  StorageArea.prototype = {
      getBytesInUse: unsupportedApi('StorageArea.getBytesInUse')
  };

  StorageArea.prototype.clear = function(callback) {
    localStorage.clear();
    if (callback) {
      callback();
    }
  };
  
  StorageArea.prototype.set = function(items, callback) {
    for (var key in items) {
      localStorage.setItem(key, JSON.stringify(items[key]));
    }
    if (callback) {
      callback();
    }
  };
  
  StorageArea.prototype.remove = function(keys, callback) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    for (var key in keys) {
      localStorage.removeItem(key);
    }
    if (callback) {
      callback();
    }
  };

  StorageArea.prototype.get = function(items, callback) {
    if (typeof items === 'function') {
      callback = items;
      items = {};
      for (var i = 0; i < localStorage.length; i++) {
        items[localStorage.key(i)] = null;
      }
    } else if (typeof items === 'string') {
      var tmp = items;
      items = {};
      items[tmp] = null;
    } else if (Object.prototype.toString.call(items) === '[object Array]') {
        var newItems = {};
        items.forEach(function(e) {
            newItems[e] = null;
        });
        items = newItems;
    }
    for (var key in items) {
      var item = localStorage.getItem(key);
      if (item != null) {
        items[key] = JSON.parse(item);
      }
    }
    if (callback) {
      callback(items);
    }
  };

  function StorageChange() {
      this.newValue = null;
      this.oldValue = null;
  }

  StorageChange.prototype = {
  };

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
});

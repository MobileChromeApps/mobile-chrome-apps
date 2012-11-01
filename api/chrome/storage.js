define('chrome.storage', function(require, module, chrome) {
  chrome.storage = {};

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
      items = { items: null };
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

  chrome.storage.local = new StorageArea();
  chrome.storage.local.QUOTA_BYTES = 5242880;

  chrome.storage.sync = new StorageArea();
  chrome.storage.sync.MAX_ITEMS = 512;
  chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_HOUR = 1000;
  chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 4096;
  chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 10;
  chrome.storage.sync.QUOTA_BYTES = 102400;

  var events = require('helpers.events');
  chrome.storage.onChanged = {}; // TODO(mmocny)
  chrome.storage.onChanged.addListener = events.addListener('onChanged');
  chrome.storage.onChanged.fire = events.fire('onChanged');
});

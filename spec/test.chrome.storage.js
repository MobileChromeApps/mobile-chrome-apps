// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec(function(runningInBackground) {
  describe('chrome.storage', function() {
    it('should contain definitions', function() {
      expect(chrome.storage).toBeDefined();
      expect(chrome.storage.local).toBeDefined();
      expect(chrome.storage.sync).toBeDefined();
      expect(chrome.storage.onChanged).toBeDefined();

      [chrome.storage.local, chrome.storage.sync].forEach(function(store) {
        expect(store.get).toBeDefined();
        expect(store.getBytesInUse).toBeDefined();
        expect(store.set).toBeDefined();
        expect(store.remove).toBeDefined();
        expect(store.clear).toBeDefined();
      });
    });

    it('should have properties', function() {
      expect(chrome.storage.sync.QUOTA_BYTES).toEqual(102400);
      expect(chrome.storage.sync.QUOTA_BYTES_PER_ITEM).toEqual(4096);
      expect(chrome.storage.sync.MAX_ITEMS).toEqual(512);
      expect(chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_HOUR).toEqual(1000);
      expect(chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE).toEqual(10);

      expect(chrome.storage.local.QUOTA_BYTES).toEqual(5242880);
    });

    function test_storagearea(type, storagearea) {
      var obj = {
        'a': 1,
        'b': 2.345,
        'c': 'test',
        'd': [1,2,3],
        'e': {'a':1,'b':'2','c':3.456}
      };

      describe('chrome.storage.' + type, function() {
        describe('testing set', function() {
          beforeEach(function() {
            storagearea.clear();
          });

          Object.keys(obj).forEach(function(key) {
            it('set(object) with single value of type: ' + typeof obj[key], function() {
              storagearea.get(function(items) {
                expect(Object.keys(items).length).toEqual(0);
              });

              var temp = {};
              temp[key] = obj[key];
              storagearea.set(temp);
              storagearea.get(key, function(items) {
                expect(items[key]).toEqual(obj[key]);
              });

              storagearea.get(function(items) {
                expect(Object.keys(items).length).toEqual(1);
              });
            });
          });

          it('set(object) with multiple values', function() {
            storagearea.get(function(items) {
              expect(Object.keys(items).length).toEqual(0);
            });

            storagearea.set(obj);
            Object.keys(obj).forEach(function(key) {
              storagearea.get(key, function(items) {
                expect(items[key]).toEqual(obj[key]);
              });
            });

            storagearea.get(function(items) {
              expect(Object.keys(items).length).toBeGreaterThan(0);
            });
          });
        });

        describe('testing get', function() {
          beforeEach(function() {
            storagearea.clear();
            storagearea.set(obj);
          });

          it('get() should return all items', function() {
            storagearea.get(function(items) {
              expect(items).toEqual(obj);
            });
          });
          it('get(null) should return all items', function() {
            storagearea.get(null, function(items) {
              expect(items).toEqual(obj);
            });
          });
          it('get(string) should return item with that key', function() {
            storagearea.get('a', function(items) {
              var temp = {'a': obj.a};
              expect(items).toEqual(temp);
            });
          });
          it('get(object) should return all items with those keys, or items with default values provided', function() {
            storagearea.get({'a':'should ignore','z':'should not ignore'}, function(items) {
              var temp = {'a': obj.a, 'z':'should not ignore'};
              expect(items).toEqual(temp);
            });
          });
          it('get([string, ...]) should return items with those keys, ignoring keys that arent found', function() {
            storagearea.get(['a','b','c','d','e','x','y','z'], function(items) {
              expect(items).toEqual(obj);
            });
            storagearea.get(['a','b','c'], function(items) {
              expect(items).toNotEqual(obj);
            });
          });
        });

        describe('testing clear', function() {
          it('should delete all items', function() {
            storagearea.clear();
            storagearea.get(function(items) {
              expect(Object.keys(items).length).toEqual(0);
            });

            storagearea.set(obj);
            storagearea.get(function(items) {
              expect(Object.keys(items).length).toBeGreaterThan(0);
            });

            storagearea.clear();
            storagearea.get(function(items) {
              expect(Object.keys(items).length).toEqual(0);
            });
          });
        });

        describe('testing remove', function() {
          it('remove(string)', function() {
          });

          it('remove([string, ...])', function() {
          });
        });

        describe('testing getBytesInUse', function() {
          it('getBytesInUse(string)', function() {
          });

          it('getBytesInUse([string, ...])', function() {
          });
        });
      });
    }

    test_storagearea('local', chrome.storage.local);
    test_storagearea('sync', chrome.storage.sync);
  });
});

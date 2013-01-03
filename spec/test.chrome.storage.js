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

    it('onChanged() Event', function() {
      // TODO
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
              storagearea.get(waitUntil(function(items) {
                expect(Object.keys(items).length).toEqual(0);
              }));

              var temp = {};
              temp[key] = obj[key];
              storagearea.set(temp);
              storagearea.get(key, waitUntil(function(items) {
                expect(items[key]).toEqual(obj[key]);
              }));

              storagearea.get(waitUntil(function(items) {
                expect(Object.keys(items).length).toEqual(1);
              }));
            });
          });

          it('set(object) with multiple values', function() {
            storagearea.get(waitUntil(function(items) {
              expect(Object.keys(items).length).toEqual(0);
            }));

            storagearea.set(obj);
            Object.keys(obj).forEach(function(key) {
              storagearea.get(key, waitUntil(function(items) {
                expect(items[key]).toEqual(obj[key]);
              }));
            });

            storagearea.get(waitUntil(function(items) {
              expect(Object.keys(items).length).toBeGreaterThan(0);
            }));
          });
        });

        describe('testing get', function() {
          beforeEach(function() {
            storagearea.clear();
            storagearea.set(obj);
          });

          it('get() should return all items', function() {
            storagearea.get(waitUntil(function(items) {
              expect(items).toEqual(obj);
            }));
          });

          it('get(null) should return all items', function() {
            storagearea.get(null, waitUntil(function(items) {
              expect(items).toEqual(obj);
            }));
          });

          it('get(string) should return item with that key', function() {
            storagearea.get('a', waitUntil(function(items) {
              var temp = {'a': obj.a};
              expect(items).toEqual(temp);
            }));
          });

          it('get(object) should return all items with those keys, or items with default values provided', function() {
            var request = {
              'a': 'should ignore',
              'b': 'also ignore',
              'z': 'should not ignore'
            };
            var expected = {
              'a': obj.a,
              'b': obj.b,
              'z': request.z
            };
            storagearea.get(request, waitUntil(function(items) {
              expect(items).toEqual(expected);
            }));
          });

          it('get([string, ...]) should return items with those keys, ignoring keys that arent found', function() {
            storagearea.get(['a','b','c','d','e','x','y','z'], waitUntil(function(items) {
              expect(items).toEqual(obj);
            }));
            storagearea.get(['a','b','c'], waitUntil(function(items) {
              expect(items).toNotEqual(obj);
            }));
            storagearea.get([], waitUntil(function(items) {
              expect(items).toEqual({});
            }));
          });
        });

        describe('testing clear', function() {
          beforeEach(function() {
            storagearea.clear();
          });

          it('should delete all items', function() {
            storagearea.get(waitUntil(function(items) {
              expect(Object.keys(items).length).toEqual(0);
            }));

            storagearea.set(obj);
            storagearea.get(waitUntil(function(items) {
              expect(Object.keys(items).length).toBeGreaterThan(0);
            }));

            storagearea.clear();
            storagearea.get(waitUntil(function(items) {
              expect(Object.keys(items).length).toEqual(0);
            }));
          });
        });

        describe('testing remove', function() {
          beforeEach(function() {
            storagearea.clear();
            storagearea.set(obj);
          });

          it('remove(string) should remove item with key', function() {
            storagearea.get(waitUntil(function(items) {
              expect(items).toEqual(obj);
            }));
            storagearea.remove('a');
            var expected = {
              'b': obj.b,
              'c': obj.c,
              'd': obj.d,
              'e': obj.e
            };
            storagearea.get(waitUntil(function(items) {
              expect(items).not.toEqual(obj);
              expect(items).toEqual(expected);
            }));
          });

          it('remove(string) with invalid key should be ignored', function() {
            storagearea.get(waitUntil(function(items) {
              expect(items).toEqual(obj);
            }));
            storagearea.remove('z');
            storagearea.get(waitUntil(function(items) {
              expect(items).toEqual(obj);
            }));
          });

          it('remove([string, ...]) should remove item with key, ignoring invalid keys', function() {
            storagearea.get(waitUntil(function(items) {
              expect(items).toEqual(obj);
            }));
            storagearea.remove(['a','b','z']);
            var expected = {
              'c': obj.c,
              'd': obj.d,
              'e': obj.e
            };
            storagearea.get(waitUntil(function(items) {
              expect(items).toEqual(expected);
            }));
          });
        });

        describe('testing getBytesInUse', function() {
          // TODO
          it('getBytesInUse()', function() {
          });

          it('getBytesInUse(null)', function() {
          });

          it('getBytesInUse(string)', function() {
          });

          it('getBytesInUse([string, ...])', function() {
            // note: dont forget that [] should return 0
          });
        });
      });
    }

    test_storagearea('local', chrome.storage.local);
    //test_storagearea('sync', chrome.storage.sync);
  });
});

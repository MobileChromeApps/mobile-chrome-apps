// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.storage', function(runningInBackground) {
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
      'int': 1,
      'double': 2.345,
      'string': 'test',
// TODO(agrieve): Uncomment these tests if http://crbug.com/169397 gets fixed.
//        'String': Object('test'),
//        'object_with_window': {'':window},
      'Array': [1,2,3],
      'object': {'':'','a':1,'b':'2','c':3.456},
      'object_with_toJSON': {'a':1, 'toJSON': function() { return 'foo'; }},
      'Window': window,
      'RegExp': /hello/,
      'date': new Date(1000),
      'undefined': undefined, // This gets ignored by .set().
      'null': null,
      'function': function hello() { return 1; },
      'DivElement': document.createElement('div'),
      'Document': document,
      'proto': { __proto__: {a:1}, b:2 }
    };

    var expected = {
      'int': 1,
      'double': 2.345,
      'string': 'test',
//        'String': {'0': 't', '1': 'e', '2': 's', '3': 't'},
//        'object_with_window': {'':{}},
      'Array': [1,2,3],
      'object': {'':'','a':1,'b':'2','c':3.456},
      'object_with_toJSON': {'a':1, 'toJSON': {}},
      'Window': {},
      'RegExp': {},
      'date': {},
      'null': null,
      'function': {},
      'DivElement': {},
      'Document': {},
      'proto': { b:2 }
    };

    describe('chrome.storage.' + type, function() {
      describe('testing set', function() {
        beforeEach(function() {
          storagearea.clear();
        });

        Object.keys(obj).forEach(function(key) {
          it('set(object) with single value of type: ' + key, function() {
            var temp = {};
            temp[key] = obj[key];
            storagearea.set(temp);
            storagearea.get(key, waitUntilCalled(function(items) {
              expect(items[key]).toEqual(expected[key]);

              storagearea.get(waitUntilCalled(function(items) {
                expect(Object.keys(items).length).toEqual(+(key in expected));
              }));
            }));
          });
        });

        it('set(object) with multiple values', function() {
          storagearea.set(obj);
          storagearea.get(Object.keys(obj), waitUntilCalled(function(items) {
            expect(items).toEqual(expected);

            storagearea.get(waitUntilCalled(function(items) {
              expect(items).toEqual(expected);
            }));
          }));
        });
      });

      describe('testing get', function() {
        beforeEach(function() {
          storagearea.clear();
          storagearea.set(obj);
        });

        it('get() should return all items', function() {
          storagearea.get(waitUntilCalled(function(items) {
            expect(items).toEqual(expected);
          }));
        });

        it('get(null) should return all items', function() {
          storagearea.get(null, waitUntilCalled(function(items) {
            expect(items).toEqual(expected);
          }));
        });

        it('get(string) should return item with that key', function() {
          storagearea.get('int', waitUntilCalled(function(items) {
            expect(items).toEqual({'int': expected.int});
          }));
        });

        it('get(object) should return all items with those keys, or items with default values provided', function() {
          var request = {
            'int': 'should ignore',
            'double': 'also ignore',
            'z': 'should not ignore'
          };
          var answer = {
            'int': expected.int,
            'double': expected.double,
            'z': request.z
          };
          storagearea.get(request, waitUntilCalled(function(items) {
            expect(items).toEqual(answer);
          }));
        });

        it('get([string, ...]) should return items with those keys, ignoring keys that arent found', function() {
          var answer = {
            'int': expected.int,
            'double': expected.double
          };
          storagearea.get(['int','double','x','y','z'], waitUntilCalled(function(items) {
            expect(items).toEqual(answer);
          }));
          storagearea.get([], waitUntilCalled(function(items) {
            expect(items).toEqual({});
          }));
        });
      });

      describe('testing clear', function() {
        beforeEach(function() {
          storagearea.clear();
        });

        it('should delete all items', function() {
          storagearea.set(obj);
          storagearea.get(waitUntilCalled(function(items) {
            expect(Object.keys(items).length).toEqual(Object.keys(expected).length);

            storagearea.clear();
            storagearea.get(waitUntilCalled(function(items) {
              expect(Object.keys(items).length).toEqual(0);
            }));
          }));
        });
      });

      describe('testing remove', function() {
        beforeEach(function() {
          storagearea.clear();
          storagearea.set(obj);
        });

        it('remove(string) should remove item with key', function() {
          storagearea.remove('int');
          storagearea.get(waitUntilCalled(function(items) {
            expect(items.int).toBeUndefined();
            expect(Object.keys(items).length).toEqual(Object.keys(expected).length - 1);
          }));
        });

        it('remove(string) with invalid key should be ignored', function() {
          storagearea.remove('z');
          storagearea.get(waitUntilCalled(function(items) {
            expect(items).toEqual(expected);
          }));
        });

        it('remove([string, ...]) should remove item with key, ignoring invalid keys', function() {
          storagearea.remove(['int','string','z']);
          storagearea.get(waitUntilCalled(function(items) {
            expect(items.int).toBeUndefined();
            expect(items.string).toBeUndefined();
            expect(Object.keys(items).length).toEqual(Object.keys(expected).length - 2);
          }));
        });
      });

      describe('testing getBytesInUse', function() {
        beforeEach(function() {
          storagearea.clear();
          storagearea.set(obj);
        });

        // Size depends on storage format. Thus use a range of acceptable values
        // Use JSON notation length as estimate along with 100 bytes of overhead
        it('getBytesInUse() should return size of all items', function() {
           var answer = expected;
           storagearea.getBytesInUse(waitUntilCalled(function(bytes) {
             var approxSize = JSON.stringify(answer).length;
             expect(bytes).toBeGreaterThan(0.5 * approxSize);
             expect(bytes).toBeLessThan(1.5 * approxSize + 100);
           }));
        });

        it('getBytesInUse(null) should return size of all items', function() {
           var answer = expected;
           storagearea.getBytesInUse(null, waitUntilCalled(function(bytes) {
             var approxSize = JSON.stringify(answer).length;
             expect(bytes).toBeGreaterThan(0.5 * approxSize);
             expect(bytes).toBeLessThan(1.5 * approxSize + 100);
           }));
        });

        it('getBytesInUse(string)', function() {
           var request = 'int';
           var answer = { request : expected[request]};
           storagearea.getBytesInUse(request, waitUntilCalled(function(bytes) {
             var approxSize = JSON.stringify(answer).length;
             expect(bytes).toBeGreaterThan(0.5 * approxSize);
             expect(bytes).toBeLessThan(1.5 * approxSize + 100);
           }));
        });

        it('getBytesInUse([string, ...])', function() {
          // note: dont forget that [] should return 0
           var request = ['int', 'string'];
           var answer = {};
           for(var i =0; i < request.length; i++) {
             answer[request[i]] = expected[request[i]];
           }
           storagearea.getBytesInUse(request, waitUntilCalled(function(bytes) {
             var approxSize = JSON.stringify(answer).length;
             expect(bytes).toBeGreaterThan(0.5 * approxSize);
             expect(bytes).toBeLessThan(1.5 * approxSize + 100);
           }));
        });
      });

      describe('testing onChanged', function() {
        beforeEach(function() {
          storagearea.clear();
          storagearea.set(obj);
        });

        it('should alert for a single change', function() {
          var request = {
            'int': 5
          };
          var answer = {
            'int': { 'oldValue' : 1, 'newValue' : 5}
          };
          var callback = function(items, areaName) {
            expect(items).toEqual(answer);
            expect(areaName).toEqual(type);
            chrome.storage.onChanged.removeListener(wrappedCallback);
          };
          var wrappedCallback = waitUntilCalled(callback);
          chrome.storage.onChanged.addListener(wrappedCallback);
          storagearea.set(request);
        });

        it('should alert for multiple changes', function() {
          var request = {
            'int': 5,
            'string': 'test123'
          };
          var answer = {
            'int': { 'oldValue' : 1, 'newValue' : 5},
            'string': { 'oldValue' : 'test', 'newValue' : 'test123'}
          };
          var callback = function(items, areaName) {
            expect(items).toEqual(answer);
            expect(areaName).toEqual(type);
            chrome.storage.onChanged.removeListener(wrappedCallback);
          };
          var wrappedCallback = waitUntilCalled(callback);
          chrome.storage.onChanged.addListener(wrappedCallback);
          storagearea.set(request);
        });

        it('should alert on remove', function() {
          var request = [
            'int',
            'string'
          ];
          var answer = {
            'int': { 'oldValue' : 1, 'newValue' : undefined},
            'string': { 'oldValue' : 'test', 'newValue' : undefined}
          };
          var callback = function(items, areaName) {
            expect(items).toEqual(answer);
            expect(areaName).toEqual(type);
            chrome.storage.onChanged.removeListener(wrappedCallback);
          };
          var wrappedCallback = waitUntilCalled(callback);
          chrome.storage.onChanged.addListener(wrappedCallback);
          storagearea.remove(request);
        });

        it('should alert on clear', function() {
          var request = obj;
          var answer = {
            'int': { 'oldValue' : 1, 'newValue' : undefined},
            'double': { 'oldValue' :  2.345, 'newValue' : undefined},
            'string': { 'oldValue' : 'test', 'newValue' : undefined},
//            'String': {'0': 't', '1': 'e', '2': 's', '3': 't'},
//            'object_with_window': {'':{}},
            'Array':  { 'oldValue' : [1,2,3], 'newValue' : undefined},
            'object':  { 'oldValue' : {'':'','a':1,'b':'2','c':3.456}, 'newValue' : undefined},
            'object_with_toJSON':  { 'oldValue' : {'a':1, 'toJSON': {}}, 'newValue' : undefined},
            'Window':  { 'oldValue' : {}, 'newValue' : undefined},
            'RegExp':  { 'oldValue' : {}, 'newValue' : undefined},
            'date':  { 'oldValue' : {}, 'newValue' : undefined},
            'null':  { 'oldValue' : null, 'newValue' : undefined},
            'function':  { 'oldValue' : {}, 'newValue' : undefined},
            'DivElement':  { 'oldValue' : {}, 'newValue' : undefined},
            'Document':  { 'oldValue' : {}, 'newValue' : undefined},
            'proto':  { 'oldValue' : { b:2 }, 'newValue' : undefined}
          };
          var callback = function(items, areaName) {
            expect(items).toEqual(answer);
            expect(areaName).toEqual(type);
            chrome.storage.onChanged.removeListener(wrappedCallback);
          };
          var wrappedCallback = waitUntilCalled(callback);
          chrome.storage.onChanged.addListener(wrappedCallback);
          storagearea.clear();
        });
      });
    });
  }

  test_storagearea('local', chrome.storage.local);
  test_storagearea('sync', chrome.storage.sync);

  describe('testing storage areas are distinct', function() {
    beforeEach(function() {
      chrome.storage.local.clear();
      chrome.storage.sync.clear();
    });
    it('Value set in local should not be fetched by sync', function() {
      chrome.storage.local.set({a:1});
      chrome.storage.sync.get(waitUntilCalled(function(items) {
        expect(items.a).toBeUndefined();
      }));
    });
    it('Value set in sync should not be fetched by local', function() {
      chrome.storage.sync.set({a:1});
      chrome.storage.local.get(waitUntilCalled(function(items) {
        expect(items.a).toBeUndefined();
      }));
    });
    it('Clearing local should not clear sync', function() {
      chrome.storage.sync.set({a:1});
      chrome.storage.local.clear();
      chrome.storage.sync.get(waitUntilCalled(function(items) {
        expect(items.a).toBe(1);
      }));
    });
    it('Clearing sync should not clear local', function() {
      chrome.storage.local.set({a:1});
      chrome.storage.sync.clear();
      chrome.storage.local.get(waitUntilCalled(function(items) {
        expect(items.a).toBe(1);
      }));
    });
  });
});

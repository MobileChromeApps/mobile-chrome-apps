// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.storage", function() {
  'use strict';

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
      'Array': [1,2,3],
      'object': {'':'','a':1,'b':'2','c':3.456},
      'object_with_toJSON': {'a':1, 'toJSON': function() { return 'foo'; }},
      'Window': window,
      'RegExp': /hello/,
      'date': new Date(1000),
      'undefined': undefined, // This gets ignored by .set().
      'null': null,
      'function': function hello() { return 1; },
      'proto': { __proto__: {a:1}, b:2 }
    };

    var expected = {
      'int': 1,
      'double': 2.345,
      'string': 'test',
      'Array': [1,2,3],
      'object': {'':'','a':1,'b':'2','c':3.456},
      'object_with_toJSON': {'a':1, 'toJSON': {}},
      'Window': {},
      'RegExp': {},
      'date': {},
      'null': null,
      'function': {},
      'proto': { b:2 }
    };

    describe('chrome.storage.' + type, function() {
      describe('testing set', function() {

  it('set(object) with single values ', function(outer_done) {
         storagearea.clear(function(){
     Object.keys(obj).forEach(function(key) {
       /*
      it(' type: ' + key, function(done) {  // TODO: This is not binding to outer describe for some reason
        var temp = {};
        temp[key] = obj[key];
        storagearea.set(temp,function(){
          storagearea.get(key, function(items) {
      expect(items[key]).toEqual(expected[key]);

      storagearea.get(function(items) {
        expect(Object.keys(items).length).toEqual(+(key in expected));
                    done();
      });
          });
              });
              });*/
            });
          });
          outer_done();
        });

  it('set(object) with multiple values', function(done) {
          storagearea.clear(function(){
      storagearea.set(obj,function(){
        storagearea.get(Object.keys(obj), function(items) {
          expect(items).toEqual(expected);

          storagearea.get(function(items) {
      expect(items).toEqual(expected);
                    done();
          });
        });
            });
    });
        });
      });

      describe('testing get', function() {
        it('get() should return all items', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
              storagearea.get(function(items) {
                expect(items).toEqual(expected);
                    done();
              });
            });
          });
        });

  it('get(null) should return all items', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
        storagearea.get(null,function(items) {
    expect(items).toEqual(expected);
                    done();
        });
      });
          });
        });

  it('get(string) should return item with that key', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
        storagearea.get('int', function(items) {
    expect(items).toEqual({'int': expected.int});
                    done();
        });
      });
          });
        });

  it('get(object) should return all items with those keys, or items with default values provided', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
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
        storagearea.get(request,function(items) {
    expect(items).toEqual(answer);
                    done();
        });
      });
          });
        });

  it('get([string, ...]) should return items with those keys, ignoring keys that arent found', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
        var answer = {
    'int': expected.int,
    'double': expected.double
        };
        storagearea.get(['int','double','x','y','z'], function(items) {
    expect(items).toEqual(answer);
          storagearea.get([], function(items) {
      expect(items).toEqual({});
                    done();
          });
        });
      });
    });
  });
      });

      describe('testing clear', function() {
  it('should delete all items', function(done) {
          storagearea.clear( function(){
      storagearea.set(obj,function(){
        storagearea.get(function(items) {
          expect(Object.keys(items).length).toEqual(Object.keys(expected).length);

          storagearea.clear(function(){
            storagearea.get(function(items) {
        expect(Object.keys(items).length).toEqual(0);
                    done();
            });
                });
        });
            });
    });
  });
      });

      describe('testing remove', function() {

        it('remove(string) should remove item with key', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
        storagearea.remove('int', function(){
          storagearea.get(function(items) {
      expect(items.int).toBeUndefined();
      expect(Object.keys(items).length).toEqual(Object.keys(expected).length - 1);
                    done();
          });
              })
      });
          });
        });

  it('remove(string) with invalid key should be ignored', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
        storagearea.remove('z',function(){
          storagearea.get(function(items) {
        expect(items).toEqual(expected);
                    done();
          });
              });
      });
          });
        });

  it('remove([string, ...]) should remove item with key, ignoring invalid keys', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
        storagearea.remove(['int','string','z'], function(){
          storagearea.get(function(items) {
      expect(items.int).toBeUndefined();
      expect(items.string).toBeUndefined();
      expect(Object.keys(items).length).toEqual(Object.keys(expected).length - 2);
                    done();
          });
              });
      });
          });
        });
      });


      describe('testing getBytesInUse', function() {

        // Size depends on storage format. Thus use a range of acceptable values
        // Use JSON notation length as estimate along with 100 bytes of overhead
  it('getBytesInUse() should return size of all items', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
         var answer = expected;
         storagearea.getBytesInUse(function(bytes) {
     var approxSize = JSON.stringify(answer).length;
     expect(bytes).toBeGreaterThan(0.5 * approxSize);
     expect(bytes).toBeLessThan(1.5 * approxSize + 100);
                    done();
         });
      });
          });
        });

  it('getBytesInUse(null) should return size of all items', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
         var answer = expected;
         storagearea.getBytesInUse(null, function(bytes) {
     var approxSize = JSON.stringify(answer).length;
     expect(bytes).toBeGreaterThan(0.5 * approxSize);
     expect(bytes).toBeLessThan(1.5 * approxSize + 100);
                    done();
         });
      });
          });
        });

  it('getBytesInUse([string, ...])', function(done) {
          storagearea.clear( function(){
            storagearea.set(obj,function(){
        // note: dont forget that [] should return 0
         var request = ['int', 'string'];
         var answer = {};
         for(var i =0; i < request.length; i++) {
     answer[request[i]] = expected[request[i]];
         }
         storagearea.getBytesInUse(request, function(bytes) {
     var approxSize = JSON.stringify(answer).length;
     expect(bytes).toBeGreaterThan(0.5 * approxSize);
     expect(bytes).toBeLessThan(1.5 * approxSize + 100);
                    done();
         });
      });
    });
        });
      });

      describe('testing onChanged', function() {

        it('should alert for a single change', function(done) {
          var request = {
            'int': 5
          };
          var answer = {
            'int': { 'oldValue' : 1, 'newValue' : 5}
          };
          var callback = function(items, areaName) {
            expect(items).toEqual(answer);
//            expect(items===answer).toEqual(true);
            expect(areaName).toEqual(type);
            chrome.storage.onChanged.removeListener(callback);
            done();
          };
          storagearea.clear(function(){
            storagearea.set(obj,function(){
        chrome.storage.onChanged.addListener(callback);
              storagearea.set(request);
            });
          });
        });

        it('should alert for multiple changes', function(done) {
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
            chrome.storage.onChanged.removeListener(callback);
            done();
          };
          storagearea.clear(function(){
            storagearea.set(obj,function(){
              chrome.storage.onChanged.addListener(callback);
              storagearea.set(request);
            });
          });
        });

        it('should alert on remove', function(done) {
          var request = [
            'int',
            'string'
          ];
          var answer = {
            'int': { 'oldValue' : 1 /*, 'newValue' : undefined*/},
            'string': { 'oldValue' : 'test' /*, 'newValue' : undefined*/}
          };
          var callback = function(items, areaName) {
            expect(items).toEqual(answer);
            expect(areaName).toEqual(type);
            chrome.storage.onChanged.removeListener(callback);
            done();
          };
          storagearea.clear(function(){
            storagearea.set(obj,function(){
              chrome.storage.onChanged.addListener(callback);
              storagearea.remove(request,function(){
              });
            });
          });
        });

        it('should alert on clear', function(done) {
          var request = obj;
          var answer = {
            'int': { 'oldValue' : 1},
            'double': { 'oldValue' :  2.345},
            'string': { 'oldValue' : 'test'},
            'Array':  { 'oldValue' : [1,2,3]},
            'object':  { 'oldValue' : {'':'','a':1,'b':'2','c':3.456}},
            'object_with_toJSON':  { 'oldValue' : {'a':1, 'toJSON': {}}},
            'Window':  { 'oldValue' : {}},
            'RegExp':  { 'oldValue' : {}},
            'date':  { 'oldValue' : {}},
            'null':  { 'oldValue' : null},
            'function':  { 'oldValue' : {}},
            'proto':  { 'oldValue' : { b:2 }}
          };
          var callback = function(items, areaName) {
            expect(items).toEqual(answer);
            expect(areaName).toEqual(type);
            chrome.storage.onChanged.removeListener(callback);
            done();
          };
          storagearea.clear(function(){
            storagearea.set(obj,function(){
              chrome.storage.onChanged.addListener(callback);
              storagearea.clear();
            });
          });
        });

      });
    });
  }

  test_storagearea('local', chrome.storage.local);
  test_storagearea('sync', chrome.storage.sync);

  describe('testing storage areas are distinct', function(done) {
    it('Value set in local should not be fetched by sync', function(done) {
      chrome.storage.local.clear(function(){
        chrome.storage.sync.clear(function(){
          chrome.storage.local.set({a:1}, function(){
            chrome.storage.sync.get(function(items) {
              expect(items.a).toBeUndefined();
            done();
            });
          });
        });
      });
    });
    it('Value set in sync should not be fetched by local', function(done) {
      chrome.storage.local.clear(function(){
        chrome.storage.sync.clear(function(){
          chrome.storage.sync.set({a:1}, function(){
            chrome.storage.local.get(function(items) {
              expect(items.a).toBeUndefined();
            done();
            });
          });
        });
      });
    });
    it('Clearing local should not clear sync', function(done) {
      chrome.storage.local.clear(function(){
        chrome.storage.sync.clear(function(){
          chrome.storage.sync.set({a:1}, function(){
            chrome.storage.local.clear(function(){
              chrome.storage.sync.get(function(items) {
                expect(items.a).toBe(1);
            done();
              });
            });
          });
        });
      });
    });
    it('Clearing sync should not clear local', function(done) {
      chrome.storage.local.clear(function(){
        chrome.storage.sync.clear(function(){
          chrome.storage.local.set({a:1},function(){
            chrome.storage.sync.clear(function(){
              chrome.storage.local.get(function(items) {
                expect(items.a).toBe(1);
            done();
              });
            });
          });
        });
      });
    });
  });
});


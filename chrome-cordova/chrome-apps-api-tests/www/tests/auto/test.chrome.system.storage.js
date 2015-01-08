// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.system.storage', function() {
  'use strict';

  var customMatchers = {

    toHaveProperty : function(util, customEqualityTesters) {
      return {
        compare : function(actual, propName, propType){
          var result = {};
          result.pass = ((void 0 !== actual[propName]) && (propType ? (typeof actual[propName] === propType) : true));
          result.message = 'Expected ' + actual + ' to have property ' + propName + (propType ? ' of type ' + propType : '');
          return result;
        }
      };
    },

    toBeArray : function(util, customEqualityTesters) {
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (actual instanceof Array);
          result.message = 'Expected ' + actual + ' to be an array.';
          return result;
        }
      };
    },

    toBeValidEnum : function(util, customEqualityTesters) {
      return {
        compare : function(actual, permittedValues){
          var result = {};
          result.pass = (permittedValues.indexOf(actual) >= 0);
          result.message = 'Expected ' + actual + ' to be one of ' + JSON.stringify(permittedValues) + '.';
          return result;
        }
      };
    },
  };

  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });

  describe('getInfo', function() {
    it('should exist', function() {
      expect(chrome.system.storage.getInfo).toBeDefined();
    });

    it('should return an array of StorageUnitInfo', function(done) {
      chrome.system.storage.getInfo(function(storageUnits) {
        expect(storageUnits).toBeDefined();
        expect(storageUnits).not.toBe(null);
        expect(storageUnits).toBeArray();
        expect(storageUnits.length).toBeGreaterThan(0);

        done();
      });
    });

    it('should report unit info', function(done) {
      chrome.system.storage.getInfo(function(storageUnits) {

        storageUnits.forEach(function(unit) {
          expect(unit).toHaveProperty('id', 'string');
          expect(unit.id.length).toBeGreaterThan(0);

          expect(unit).toHaveProperty('name', 'string');
          expect(unit.name.length).toBeGreaterThan(0);

          expect(unit).toHaveProperty('type', 'string');
          expect(unit.type).toBeValidEnum(['fixed','removable','unknown']);

          expect(unit).toHaveProperty('capacity', 'number');
          expect(unit.capacity).toBeGreaterThan(0);
        });
        done();
      });
    });

  });

  describe('ejectDevice', function() {
    it('should exist', function() {
      expect(chrome.system.storage.ejectDevice).toBeDefined();
    });

    it('should return no_such_device for an empty id', function(done) {
      chrome.system.storage.ejectDevice('', function(result) {
        expect(result).toBe('no_such_device');

        done();
      });
    });

    it('should return no_such_device for a non-existent id', function(done) {
      chrome.system.storage.ejectDevice('this is not a valid unit id', function(result) {
        expect(result).toBe('no_such_device');

        done();
      });
    });

    it('should return in_use for built-in storage', function(done) {
      chrome.system.storage.getInfo(function(storageUnits) {
        var builtin = null;
        storageUnits.forEach(function(unit) {
          if (unit.type === 'fixed')
          {
            builtin = unit;
          }
        });

        expect(builtin).not.toBeNull();
        if (builtin) {
          chrome.system.storage.ejectDevice(builtin.id, function(result) {
            expect(result).toBe('in_use');
            done();
          });
        }
        else {
          done();
        }
      });
    });

  });

  describe('getAvailableCapacity', function() {
    it('should exist', function() {
      expect(chrome.system.storage.getAvailableCapacity).toBeDefined();
    });

    it('should return undefined for an empty id', function(done) {
      chrome.system.storage.getAvailableCapacity('', function(info) {
        expect(info).toBeUndefined();

        done();
      });
    });

    it('should return undefined for a non-existent id', function(done) {
      chrome.system.storage.getAvailableCapacity('this is not a valid unit id', function(info) {
        expect(info).toBeUndefined();

        done();
      });
    });

    it('should report available > 0 for built-in storage', function(done) {
      chrome.system.storage.getInfo(function(storageUnits) {
        var builtin = null;
        storageUnits.forEach(function(unit) {
          if (unit.type === 'fixed')
          {
            builtin = unit;
          }
        });

        expect(builtin).not.toBeNull();
        if (builtin) {
          chrome.system.storage.getAvailableCapacity(builtin.id, function(info) {
            expect(info).toHaveProperty('id', 'string');
            expect(info.id).toEqual(builtin.id);

            expect(info).toHaveProperty('availableCapacity', 'number');
            expect(info.availableCapacity).toBeGreaterThan(0);

            done();
          });
        }
        else {
          done();
        }
      });
    });

  });

  itShouldHaveAnEvent(chrome.system.storage, 'onAttached');
  itShouldHaveAnEvent(chrome.system.storage, 'onDetached');
});

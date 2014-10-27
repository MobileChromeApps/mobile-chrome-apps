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
    addMatchers(customMatchers);
    done();
  });

  describeAndroidOnly('getInfo', function() {
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
});

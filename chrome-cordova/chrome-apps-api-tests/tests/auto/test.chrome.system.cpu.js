// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.system.cpu', function() {
  'use strict';
  
  var customMatchers = {
    toBeString : function(util, customEqualityTesters) {
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (typeof actual === 'string');
          result.message = 'Expected ' + actual + ' to be a string.'; 
          return result;
        }
      };
    },

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
    }
  };
  
  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });
  
  describe('getInfo', function() {
    it('should exist', function() {
      expect(chrome.system.cpu.getInfo).toBeDefined();
    });

    it('should return an info object', function(done) {
      chrome.system.cpu.getInfo(function(info) {
        expect(info).toBeDefined();
        expect(info).not.toBe(null);
      
        done();
      });
    });
  
    it('should report the number of processors', function(done) {
      chrome.system.cpu.getInfo(function(info) {
    
        // integer: numOfProcessors
        expect(info).toHaveProperty('numOfProcessors', 'number');
        expect(info.numOfProcessors).toBeGreaterThan(0);
    
        done();
      });
    });

    it('should report the architecture name', function(done) {
      chrome.system.cpu.getInfo(function(info) {
    
        // string: archName
        expect(info).toHaveProperty('archName', 'string');
        expect(info.archName.length).toBeGreaterThan(0);
    
        done();
      });
    });

    it('should report the model name', function(done) {
      chrome.system.cpu.getInfo(function(info) {
    
        // string: modelName
        expect(info).toHaveProperty('modelName', 'string');
        expect(info.modelName.length).toBeGreaterThan(0);
    
        done();
      });
    });

    it('should report the features', function(done) {
      chrome.system.cpu.getInfo(function(info) {
    
        // array of string: features
        expect(info.features).toBeDefined();
        expect(info.features).toBeArray();
        info.features.forEach(function(element) {
          expect(element).toBeString();
          expect(element.length).toBeGreaterThan(0);
        });
  
        done();
      });
    });

    it('should report the usage for the processors', function(done) {
      chrome.system.cpu.getInfo(function(info) {

        // array of object:	processors
        expect(info.processors).toBeDefined();
        expect(info.processors).toBeArray();
        expect(info.processors.length).toBe(info.numOfProcessors);
        info.processors.forEach(function(proc) {
          expect(proc).toHaveProperty('usage');
          
          var statNames = ['total', 'kernel', 'idle', 'user'];
          var totalUsage = 0;
          statNames.forEach(function(stat) {
            expect(proc.usage).toHaveProperty(stat, 'number');
            if (stat !== 'kernel') {
              // On ios, it seems that kernel usage is always 0
              expect(proc.usage[stat]).toBeGreaterThan(0);
            }
            if (stat !== 'total') {
              totalUsage += proc.usage[stat];
            }
          });
          
          expect(proc.usage.total).toEqual(totalUsage);
        });

        done();
      });
    });
  });
});

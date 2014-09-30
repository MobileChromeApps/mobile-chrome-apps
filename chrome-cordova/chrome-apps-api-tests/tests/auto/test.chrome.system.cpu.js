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

    toBeNumber : function(util, customEqualityTesters) {
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (typeof actual === 'number');
          result.message = 'Expected ' + actual + ' to be a number.'; 
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
    addMatchers(customMatchers);
    done();
  });
  
  it('should have getInfo exist', function() {
    expect(chrome.system.cpu.getInfo).not.toBeUndefined();
  });

  describe('getInfo', function() {
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
        expect(info.numOfProcessors).toBeDefined();
        expect(info.numOfProcessors).toBeNumber();
        expect(info.numOfProcessors).toBeGreaterThan(0);
    
        done();
      });
    });

    it('should report the architecture name', function(done) {
      chrome.system.cpu.getInfo(function(info) {
    
        // string: archName
        expect(info.archName).toBeDefined();
        expect(info.archName).toBeString();
        expect(info.archName.length).toBeGreaterThan(0);
    
        done();
      });
    });

    it('should report the model name', function(done) {
      chrome.system.cpu.getInfo(function(info) {
    
        // string: modelName
        expect(info.modelName).toBeDefined();
        expect(info.modelName).toBeString();
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
          //expect(proc).toBeString();
        });

        done();
      });
    });
  });
});

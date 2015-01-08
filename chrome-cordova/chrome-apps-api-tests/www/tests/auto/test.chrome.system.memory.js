// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.system.memory', function() {
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
    }
  };
  
  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });
  
  describe('getInfo', function() {
    it('should exist', function() {
      expect(chrome.system.memory.getInfo).toBeDefined();
    });

    it('should return an info object', function(done) {
      chrome.system.memory.getInfo(function(info) {
        expect(info).toBeDefined();
        expect(info).not.toBe(null);
      
        done();
      });
    });
  
    it('should report the physical capacity', function(done) {
      chrome.system.memory.getInfo(function(info) {
    
        expect(info).toHaveProperty('capacity', 'number');
        expect(info.capacity).toBeGreaterThan(0);
    
        done();
      });
    });
  
    it('should report the available capacity', function(done) {
      chrome.system.memory.getInfo(function(info) {
    
        expect(info).toHaveProperty('availableCapacity', 'number');
        expect(info.availableCapacity).toBeGreaterThan(0);
    
        done();
      });
    });

    it('should report physical > available capacity', function(done) {
      chrome.system.memory.getInfo(function(info) {
    
        expect(info.capacity).toBeGreaterThan(info.availableCapacity);
    
        done();
      });
    });
  
  });
});

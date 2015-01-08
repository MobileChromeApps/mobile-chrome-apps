// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.system.display', function() {
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
    }
  };
  
  function checkBounds(bounds) {
    expect(bounds).toHaveProperty('left', 'number');

    expect(bounds).toHaveProperty('top', 'number');

    expect(bounds).toHaveProperty('height', 'number');
    expect(bounds.height).toBeGreaterThan(0);

    expect(bounds).toHaveProperty('width', 'number');
    expect(bounds.width).toBeGreaterThan(0);
  }
  
  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });
  
  describe('getInfo', function() {
    it('should exist', function() {
      expect(chrome.system.display.getInfo).toBeDefined();
    });

    it('should return an array of displays', function(done) {
      chrome.system.display.getInfo(function(displays) {
        expect(displays).toBeDefined();
        expect(displays).not.toBe(null);
        expect(displays).toBeArray();
        expect(displays.length).toBeGreaterThan(0);
      
        done();
      });
    });
  
    it('should report basic details', function(done) {
      chrome.system.display.getInfo(function(displays) {
    
        displays.forEach(function(display) {
          expect(display).toHaveProperty('id', 'string');
          expect(display.id.length).toBeGreaterThan(0);

          expect(display).toHaveProperty('name', 'string');
          expect(display.name.length).toBeGreaterThan(0);

          expect(display).toHaveProperty('isPrimary', 'boolean');
        });
        done();
      });
    });

    it('should report dpi', function(done) {
      chrome.system.display.getInfo(function(displays) {
    
        displays.forEach(function(display) {
          expect(display).toHaveProperty('dpiX', 'number');
          expect(display.dpiX).toBeGreaterThan(0);

          expect(display).toHaveProperty('dpiY', 'number');
          expect(display.dpiY).toBeGreaterThan(0);
        });
        done();
      });
    });

    it('should report the bounds', function(done) {
      chrome.system.display.getInfo(function(displays) {
    
        displays.forEach(function(display) {
          checkBounds(display.bounds);
        });
        done();
      });
    });

    it('should report the workArea', function(done) {
      chrome.system.display.getInfo(function(displays) {
    
        displays.forEach(function(display) {
          checkBounds(display.workArea);
        });
        done();
      });
    });

    it('should report the overscan', function(done) {
      chrome.system.display.getInfo(function(displays) {
    
        displays.forEach(function(display) {
          expect(display.overscan).toBeDefined();
          expect(display.overscan).toHaveProperty('left', 'number');
          expect(display.overscan).toHaveProperty('top', 'number');
          expect(display.overscan).toHaveProperty('right', 'number');
          expect(display.overscan).toHaveProperty('bottom', 'number');
        });
        done();
      });
    });
    
  });
});

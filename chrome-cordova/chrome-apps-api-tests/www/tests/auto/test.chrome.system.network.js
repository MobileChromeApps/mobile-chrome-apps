// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.system.network', function() {
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
  
  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });
  
  describe('getNetworkInterfaces', function() {
    it('should exist', function() {
      expect(chrome.system.network.getNetworkInterfaces).toBeDefined();
    });

    it('should return an array of networkInterfaces', function(done) {
      chrome.system.network.getNetworkInterfaces(function(networkInterfaces) {
        expect(networkInterfaces).toBeDefined();
        expect(networkInterfaces).not.toBe(null);
        expect(networkInterfaces).toBeArray();
        // NOTE: If wifi is disabled, the array of interfaces will be empty,
        //       even if the device has wifi capability
      
        done();
      });
    });
  
    it('should report details', function(done) {
      chrome.system.network.getNetworkInterfaces(function(networkInterfaces) {
    
        networkInterfaces.forEach(function(netInterface) {
          expect(netInterface).toHaveProperty('name', 'string');
          expect(netInterface.name.length).toBeGreaterThan(0);

          expect(netInterface).toHaveProperty('address', 'string');
          expect(netInterface.address.length).toBeGreaterThan(0);

          expect(netInterface).toHaveProperty('prefixLength', 'number');
          expect(netInterface.prefixLength).toBeGreaterThan(0);
        });
        done();
      });
    });

  });
});

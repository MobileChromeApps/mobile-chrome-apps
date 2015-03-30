// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.usb", function() {
  'use strict';

  var customMatchers = {
    toBeString : function(util, customEqualityTesters){
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (typeof actual == 'string');
          result.message = 'Expected ' + actual + ' to be a string.';
          return result;
        }
      }
    }
  }

  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });

  it('should contain definitions', function() {
    expect(chrome.usb).toBeDefined();
    expect(chrome.usb.getDevices).toBeDefined();
    expect(chrome.usb.openDevice).toBeDefined();
    expect(chrome.usb.closeDevice).toBeDefined();
    expect(chrome.usb.listInterfaces).toBeDefined();
    expect(chrome.usb.claimInterface).toBeDefined();
    expect(chrome.usb.releaseInterface).toBeDefined();
  });

  it('should getDevices and open & close a device if present', function(done) {
    chrome.usb.getDevices({} /* Get all devices */, function(devices) {
      expect(chrome.runtime.lastError).not.toBeDefined();
      if (devices.length > 0) {
        chrome.usb.openDevice(devices[0], function(handle) {
          expect(chrome.runtime.lastError).not.toBeDefined();
          chrome.usb.closeDevice(handle);
          done();
        });
      } else {
        done();
      }
    });
  });

  it('should write and read to a fake device instance', function(done) {
    chrome.usb.getDevices({appendFakeDevice:true, productId: 0x2001},
        function(devices) {
      expect(chrome.runtime.lastError).not.toBeDefined();
      expect(devices.length).toBe(1);
      chrome.usb.openDevice(devices[0], function(handle) {
        expect(chrome.runtime.lastError).not.toBeDefined();
        chrome.usb.listInterfaces(handle, function(ifs) {
          var iface = ifs[0];
          expect(iface).toBeDefined();
          var inEp = iface.endpoints[0];
          var outEp = iface.endpoints[1];
          expect(inEp.direction).toBe("in");
          expect(outEp.direction).toBe("out");
          chrome.usb.claimInterface(handle, iface.interfaceNumber, function() {
            // Do an 'IN' control transfer
            chrome.usb.controlTransfer(handle, {
              direction: "in",
              recipient: "interface",
              requestType: "standard",
              request: 66,
              value: 77,
              index: 88,
              length: 10
            }, function(info) {
              expect(chrome.runtime.lastError).not.toBeDefined();
              expect(info.resultCode).toBeDefined();
              expect(info.resultCode).toBe(0);
              expect(info.data).toBeDefined();
              var r = new Uint8Array(info.data);
              expect(r.length).toBe(3);
              expect(r[0]).toBe(66);
              expect(r[1]).toBe(77);
              expect(r[2]).toBe(88);
            });
            // Do a pair of bulk transfers, asserting the payload is echoed.
            chrome.usb.bulkTransfer(handle, {
              direction: "out",
              endpoint: outEp.address,
              data: (new Uint8Array([42, 43])).buffer
            }, function(outResult) {
              expect(chrome.runtime.lastError).not.toBeDefined();
              expect(outResult.resultCode).toBeDefined();
              expect(outResult.resultCode).toBe(0);
              chrome.usb.bulkTransfer(handle, {
                direction: "in",
                endpoint: inEp.address,
                length: 10
              }, function(inResult) {
                expect(chrome.runtime.lastError).not.toBeDefined();
                expect(inResult.resultCode).toBeDefined();
                expect(inResult.resultCode).toBe(0);
                var r = new Uint8Array(inResult.data);
                expect(r.length).toBe(2);
                expect(r[0]).toBe(42);
                expect(r[1]).toBe(43);

                chrome.usb.closeDevice(handle);
                done();
              });
            });
          });
        });
      });
    });
  });

});

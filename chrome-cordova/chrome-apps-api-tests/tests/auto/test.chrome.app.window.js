// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.app.window', function() {
  'use strict';

  var customMatchers = {
    toBeArray : function(util, customEqualityTesters){
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = Array.isArray(actual);
          result.message = 'Expected ' + actual + ' to be an Array.';
          return result;
        }
      }
    },
  }

  beforeEach(function(done) {
    addMatchers(customMatchers);
    done();
  });

  // TODO: implement runningInBackground
  var runningInBackground = false;
  if (runningInBackground) {
    it('current() should return null', function() {
      expect(chrome.app.window.current()).toBeNull();
    });
    it('getAll() should return an empty array', function() {
      var windows = chrome.app.window.getAll();
      expect(windows).toBeArray();
      expect(windows.length).toEqual(0);
    });
  } else {
    it('current() should return an AppWindow', function() {
      var wnd = chrome.app.window.current();
      expect(wnd).not.toBeNull();
      expect(wnd.onClosed).not.toBeUndefined();
    });
    it('getAll() should return an array containing one AppWindow', function() {
      var windows = chrome.app.window.getAll();
      expect(windows).toBeArray();
      expect(windows.length).toEqual(1);
      expect(windows[0]).not.toBeNull();
      expect(windows[0].onClosed).not.toBeUndefined();
    });
  }
  describe('window.opener', function() {
    if (runningInBackground) {
      it ('should return null', function() {
        expect(window.opener).toBeNull();
      });
//    } else {
//      it ('should return the background window', function() {
//        expect(window.opener).toEqual(chromespec.bgWnd);
//      });
    }
  });
});

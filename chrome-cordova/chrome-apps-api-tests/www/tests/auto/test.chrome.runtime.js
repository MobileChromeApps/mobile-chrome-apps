// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.runtime", function() {
  'use strict';

  it('getManifest() should have a name that is a string', function() {
    var manifest = chrome.runtime.getManifest();
    expect(typeof manifest.name).toBe('string'); // .isEqual(jasmine.any(String)) seems to not work
  });
  it('getBackgroundPage() should throw when args are invalid', function() {
    expect(function() {chrome.runtime.getBackgroundPage();}).toThrow();
    expect(function() {chrome.runtime.getBackgroundPage(1);}).toThrow();
  });
  it('getBackgroundPage() should provide a window object asynchronously.', function(done) {
    var bgPage = null;
    chrome.runtime.getBackgroundPage(function(wnd) {
      bgPage = wnd;
      // TODO: implement runningInBackground
      var runningInBackground = false;
      if (runningInBackground) {
        expect(window == bgPage).toBe(true, 'window should == bgPage');
      } else {
        expect(window == bgPage).toBe(false, 'window should != bgPage');
      }
      done();
    });
    expect(bgPage).toBeNull();
  });
  describe('getURL()', function() {
    var prefix;
    beforeEach(function(done) {
      prefix = location.href.replace(/[^\/]*$/, '');
      done();
    });

    it('should throw when args are missing', function() {
      expect(function() {chrome.runtime.getURL();}).toThrow();
    });
    it('should throw when args are invalid', function() {
      expect(function() {chrome.runtime.getURL(3);}).toThrow();
    });
    it('should work for empty path', function() {
      expect(chrome.runtime.getURL('')).toBe(prefix);
    });
    it('should work', function() {
      expect(chrome.runtime.getURL('b')).toBe(prefix + 'b');
    });
    it('should work for root-relative path', function() {
      expect(chrome.runtime.getURL('/b')).toBe(prefix + 'b');
    });
    it('should not change paths that already have the root prefix', function() {
      var fullUrl = location.href;
      expect(chrome.runtime.getURL(fullUrl)).toBe(fullUrl);
    });
  });
  itShouldHaveAnEvent(chrome.runtime, 'onInstalled');
  itShouldHaveAnEvent(chrome.runtime, 'onStartup');
  itShouldHaveAnEvent(chrome.runtime, 'onSuspend');
  itShouldHaveAnEvent(chrome.runtime, 'onSuspendCanceled');
  itShouldHaveAnEvent(chrome.runtime, 'onUpdateAvailable');
  itShouldHaveAPropertyOfType(chrome.runtime, 'id', 'string');
  itShouldHaveAPropertyOfType(chrome.runtime, 'reload', 'function');
  itShouldHaveAPropertyOfType(chrome.runtime, 'requestUpdateCheck', 'function');
});

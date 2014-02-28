// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.runtime", function(runningInBackground) {
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
      if (runningInBackground) {
        expect(window == bgPage).toBe(true, 'window should == bgPage');
      } else {
        expect(window == bgPage).toBe(false, 'window should != bgPage');
      }
      done();
    });
    expect(bgPage).toBeNull();
  });
  it('getURL() should throw when not args are invalid.', function() {
    expect(function() {chrome.runtime.getURL();}).toThrow();
    expect(function() {chrome.runtime.getURL(3);}).toThrow();
  });
  it('getURL() should work', function() {
    var prefix = location.href.replace(/[^\/]*$/, '');
    expect(chrome.runtime.getURL('')).toBe(prefix);
    expect(chrome.runtime.getURL('b')).toBe(prefix + 'b');
    expect(chrome.runtime.getURL('/b')).toBe(prefix + 'b');
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

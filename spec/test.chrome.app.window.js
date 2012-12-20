// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec(function(runningInBackground) {
  describe('chrome.app.window', function() {
    if (runningInBackground) {
      it('current() should return null', function() {
        expect(chrome.app.window.current()).toBeNull();
      });
    } else {
      it('current() should return an AppWindow', function() {
        var wnd = chrome.app.window.current();
        expect(wnd).not.toBeNull();
        expect(wnd.onClosed).not.toBeUndefined();
      });
    }
  });
  describe('window', function() {
    describe('opener', function() {
      if (runningInBackground) {
        it ('should return null', function() {
          expect(window.opener).toBeNull();
        });
      } else {
        it ('should return the background window', function() {
          expect(window.opener).toEqual(window.bgWindow);
        });
      }
    });
  });
});


// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec(function(runningInBackground) {
  describe('chrome.runtime', function() {
    it('should have onSuspend exist', function() {
      expect(chrome.runtime.onSuspend).not.toBeUndefined();
    });
    it('getManifest() should have a name that is a string', function() {
      var manifest = chrome.runtime.getManifest();
      expect(typeof manifest.name).toBe('string');
    });
  });
});


// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec(function(runningInBackground) {
  describe('chrome.app.runtime', function() {
    it('should have onLaunched exist', function() {
      expect(chrome.app.runtime.onLaunched).not.toBeUndefined();
    });
  });
});

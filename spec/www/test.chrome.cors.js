// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.cors', function(runningInBackground) {
  var testNode = null;
  var langEnUs = navigator.language.toLowerCase() == 'en-us';

  describe('CORS', function() {
    it('should work', function() {
      expect(navigator.language.toLowerCase()).toBe('en-us');
    });
  });
});

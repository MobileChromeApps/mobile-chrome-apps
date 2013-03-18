// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('pageload', function(runningInBackground) {
  if (!runningInBackground) {
    describe('page loading', function() {
      // Attributes are stripped off of the head tag in desktop Chrome, so don't test that.
      it('should maintain attributes on html tag', function() {
        expect(document.documentElement.getAttribute('testattr')).toBe('foo');
      });
      it('should maintain attributes on body tag', function() {
        expect(document.body.getAttribute('testattr')).toBe('foo');
      });
      it('should include dont-forget1 in the head.', function() {
        var n = document.getElementById('dont-forget1');
        expect(n.parentNode).toBe(document.querySelector('head'));
      });
      it('should include dont-forget2 in the head.', function() {
        var n = document.getElementById('dont-forget2');
        expect(n.parentNode).toBe(document.querySelector('head'));
      });
      it('should include dont-forget3 in the body.', function() {
        var n = document.getElementById('dont-forget3');
        expect(n.parentNode).toBe(document.body);
      });
      it('should maintain text in script nodes.', function() {
        var n = document.querySelector('script[type=foo]');
        expect(n.innerHTML).toBe('Some data', 'Some data');
        n = document.getElementById('dont-execute');
        expect(n.innerHTML).toBe('shouldNotExecute=1', 'shouldNotExecute=1');
      });
      it('should not have executed inline scripts', function() {
        expect(window.shouldNotExecute).toBeUndefined();
      });
    });
  }
});

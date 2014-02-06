// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('pageload', function(runningInBackground) {
  'use strict';
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
      it('should have executed scripts in order', function() {
        expect(scriptExec1).toBe(1);
        expect(scriptExec2).toBe(2);
        expect(scriptExec3).toBe(3);
        expect(scriptExec4).toBe(4);
        expect(scriptExec5).toBe(5);
        expect(scriptExec6).toBe(6);
        expect(scriptExec7).toBe(7);
        expect(scriptExec8).toBe(8);
      });
      it('should properly resolve root-relative script URL', function() {
        expect(scriptExec9).toBe(9);
      });
      it('should have platform CSS applied', function() {
        expect(window.getComputedStyle(document.body)['WebkitUserSelect']).toBe('none');
      });
    });
  }
});

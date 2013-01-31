// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.i18n', function(runningInBackground) {
  if (!runningInBackground) {
    it('should not replace placeholders in html', function() {
      expect(document.getElementById('i18n-html-test').innerHTML).toBe('__MSG_appname__');
    });

    it('should replace placeholders within CSS', function() {
      // TODO
    });

    it('should replace placeholders within manifest.json', function() {
      // TODO
    });
  }

  describe('getMessage()', function() {
    it('should handle dollar signs', function() {
      expect(chrome.i18n.getMessage('test3')).toBe('_$_');
    });
    it('should ignore extra params', function() {
      expect(chrome.i18n.getMessage('test3', 'A')).toBe('_$_');
      expect(chrome.i18n.getMessage('test3', ['A', 'B'])).toBe('_$_');
      expect(chrome.i18n.getMessage('test3', {a:1})).toBe('_$_');
      expect(chrome.i18n.getMessage('test3', null)).toBe('_$_');
    });
    it('should be case insensitive', function() {
      expect(chrome.i18n.getMessage('TeSt3', 'A')).toBe('_$_');
    });
  });

  describe('getAcceptLanguages()', function() {
    it('should return a list', function() {
      chrome.i18n.getAcceptLanguages(waitUntilCalled(function(x) {
        expect(x.length).toBeGreaterThan(0);
      }));
    });
  });
});

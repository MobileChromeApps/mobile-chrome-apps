// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.i18n', function(runningInBackground) {
  if (!/^en/.exec(navigator.language)) {
    it('Tests require english locale to be set', function() {
      expect(true).toBe(false);
    });
    return;
  }

  var testNode = null;

  this.afterEach(function() {
    if (testNode) {
      testNode.parentNode.removeChild(testNode);
      testNode = null;
    }
  });

  if (!runningInBackground) {
    it('should not replace placeholders in html', function() {
      expect(document.getElementById('i18n-html-test').innerHTML).toBe('__MSG_appname__');
    });

    it('should replace placeholders within CSS', function() {
      testNode = document.createElement('div');
      testNode.className = 'i18n_test';
      document.body.appendChild(testNode);
      var computed = window.getComputedStyle(testNode, null);
      expect(computed.getPropertyValue('color')).toBe('rgb(204, 204, 204)');
      expect(computed.getPropertyValue('background-image')).toMatch(new RegExp('^url.*' + chrome.runtime.id + '.png\\)$'));
      expect(computed.getPropertyValue('padding-left')).toBe('2px');
      expect(computed.getPropertyValue('padding-right')).toBe('4px');
      expect(computed.getPropertyValue('direction')).toBe('ltr');
    });

    it('should replace placeholders within manifest.json', function() {
      var manifest = chrome.runtime.getManifest();
      expect(manifest.name).toBe('Chrome Spec');
    });
  }

  it('should not replace placeholders within style attributes', function() {
    testNode = document.createElement('div');
    testNode.style.backgroundImage = 'url(__MSG_@@extension_id__.png)';
    document.body.appendChild(testNode);
    var computed = window.getComputedStyle(testNode, null);
    expect(computed.getPropertyValue('background-image')).toMatch(/^url.*__MSG_.*.png\)$/);
  });

  it('should not replace placeholders within injected style tags', function() {
    var styleNode = document.createElement('style');
    styleNode.innerHTML = '.asdf { padding-__MSG_@@bidi_start_edge__: 2px; }';
    document.querySelector('head').appendChild(styleNode);

    this.after(function() {
      styleNode.parentNode.removeChild(styleNode);
    });
    testNode = document.createElement('div');
    testNode.className = 'asdf';
    document.body.appendChild(testNode);
    var computed = window.getComputedStyle(testNode, null);
    expect(computed.getPropertyValue('padding-left')).toBe('0px');
  });

  describe('getMessage()', function() {
    it('should handle named placeholders', function() {
      expect(chrome.i18n.getMessage('@test1', ['foo', 'bar'])).toBe('Welcome foo. foo, would you like some fun bar NaMe $?');
    });
    it('should use blank for missing named placeholders', function() {
      expect(chrome.i18n.getMessage('@test1')).toBe('Welcome . , would you like some fun  NaMe $?');
    });
    it('should handle inline placeholders', function() {
      expect(chrome.i18n.getMessage('test2', ['foo', 'bar', 'baz', 'a'])).toBe('foo, bar, and baz');
    });
    it('should use blank for missing inline placeholders', function() {
      expect(chrome.i18n.getMessage('test2', ['foo'])).toBe('foo, , and ');
    });
    it('should toString placeholder values', function() {
      expect(chrome.i18n.getMessage('test2', [{}, 3, /a/])).toBe('[object Object], 3, and /a/');
    });
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
        for (var i = 0; i < x.length; ++i) {
          expect(x[i]).toMatch(/^en/);
        }
      }));
    });
  });
});

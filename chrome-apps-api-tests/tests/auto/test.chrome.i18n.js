// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.i18n', function(runningInBackground) {
  'use strict';
  var testNode = null;
  var langEnUs = navigator.language.toLowerCase() == 'en-us';

  afterEach(function() {
    if (testNode) {
      testNode.parentNode.removeChild(testNode);
      testNode = null;
    }
  });

  it('language should be set to en-US', function() {
    expect(navigator.language.toLowerCase()).toBe('en-us');
  });

  if (!runningInBackground) {
    it('should not replace placeholders in html', function() {
      expect(document.getElementById('i18n-html-test').innerHTML).toBe('__MSG_description__');
    });

    describe('CSS', function() {
/* Not yet.
      it('should replace placeholders within CSS', function() {
        testNode = document.createElement('img');
        testNode.className = 'i18n_test';
        document.body.appendChild(testNode);
        var computed = window.getComputedStyle(testNode, null);
        expect(computed.getPropertyValue('color')).toBe('rgb(204, 204, 204)');
        expect(computed.getPropertyValue('background-image')).toMatch(new RegExp('^url.*' + chrome.runtime.id + '.png\\)$'));
        expect(computed.getPropertyValue('margin-left')).toBe('2px');
        expect(computed.getPropertyValue('margin-right')).toBe('4px');
        expect(computed.getPropertyValue('direction')).toBe('ltr');
        expect(testNode.offsetWidth).toBe(5);
      });
*/

      it('should not replace placeholders within style attributes', function() {
        testNode = document.createElement('div');
        testNode.style.backgroundImage = 'url(__MSG_@@extension_id__.png)';
        document.body.appendChild(testNode);
        var computed = window.getComputedStyle(testNode, null);
        expect(computed.getPropertyValue('background-image')).toMatch(/^url.*__MSG_.*.png\)$/);
      });
    });
    describe('CSS', function() {
      var styleNode;
      afterEach(function() {
          styleNode.parentNode.removeChild(styleNode);
      });
      it('should not replace placeholders within injected style tags', function() {
        styleNode = document.createElement('style');
        styleNode.innerHTML = '.asdf { height: 2px; width: __MSG_testwidth__; }';
        document.querySelector('head').appendChild(styleNode);

        testNode = document.createElement('img');
        testNode.className = 'asdf';
        document.body.appendChild(testNode);
        expect(testNode.offsetHeight).toBe(2);
        expect(testNode.offsetWidth).toBe(0);
      });
    });
    describe('CSS', function() {
      var linkNode;
      var URL_;
      var url;
      afterEach(function() {
          linkNode.parentNode.removeChild(linkNode);
          URL_.revokeObjectURL(url);
      });
      it('should not replace placeholders within Blob URL style tags', function(done) {
        URL_ = window.URL || window.webkitURL;
        linkNode = document.createElement('link');
        var blob = new Blob(['.asdf { height:1px; width: __MSG_testwidth__; }'], {'type' : 'text/css'});
        url = URL_.createObjectURL(blob);
        linkNode.rel = 'stylesheet';
        linkNode.href = url;
        document.querySelector('head').appendChild(linkNode);

        testNode = document.createElement('img');
        testNode.className = 'asdf';
        document.body.appendChild(testNode);
        setTimeout(function() {
          if (testNode.offsetHeight == 1) {
            expect(testNode.offsetWidth).toBe(0);
            done();
          }
        }, 100);
      });
    });
    describe('CSS', function() {
      it('should not replace placeholders XHR\'d text files', function(done) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'assets/i18n_test.txt', true);
        // Even with Mime-type set, it's not processed.
        xhr.overrideMimeType('text/css');
        xhr.onload = function() {
          expect(xhr.responseText).toMatch(/@@/);
          done();
        };
        xhr.send();
      });
/* Not yet.
      it('should replace placeholders XHR\'d CSS files', function(done) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'assets/i18n_test.css', true);
        xhr.onload = function() {
          expect(xhr.responseText).toMatch(chrome.runtime.id);
          done();
        };
        xhr.send();
      });
*/
    });
  }

  describe('getMessage()', function() {
    it('should handle named placeholders', function() {
      expect(chrome.i18n.getMessage('@test1', ['foo', 'bar'])).toBe('Bonjour foo. foo, voulez-vous des fun bar NaMe $?');
    });
    it('should use blank for missing named placeholders', function() {
      expect(chrome.i18n.getMessage('@test1')).toBe('Bonjour . , voulez-vous des fun  NaMe $?');
    });
    it('should handle inline placeholders', function() {
      expect(chrome.i18n.getMessage('test2', ['foo', 'bar', 'baz', 'a'])).toBe('foo, bar, et baz');
    });
    it('should use blank for missing inline placeholders', function() {
      expect(chrome.i18n.getMessage('test2', ['foo'])).toBe('foo, , et ');
    });
    it('should toString placeholder values', function() {
      expect(chrome.i18n.getMessage('test2', [{}, 3, /a/])).toBe('[object Object], 3, et /a/');
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
    it('should handle unicode characters', function() {
      expect(chrome.i18n.getMessage('extended_char')).toBe('\u1800\x01\u1801');
    });
    if (langEnUs) {
      it('should override to values in en/messages.json', function() {
        expect(chrome.i18n.getMessage('override2')).toBe('Hurray');
      });
      it('should override to values in en-US/messages.json', function() {
        expect(chrome.i18n.getMessage('override3')).toBe('win');
      });
    }
  });

  if (langEnUs) {
    it('should replace placeholders within manifest.json', function(done) {
      var manifest = chrome.runtime.getManifest();
      expect(manifest.name).toBe('Chrome Apps Api Tests');
      done();
    });

    describe('getAcceptLanguages()', function() {
      it('should return a list', function(done) {
        chrome.i18n.getAcceptLanguages(function(x) {
          expect(x).toEqual(jasmine.any(Array));
          expect(x.some(function(lang) { return /^en/.test(lang); })).toBe(true);
          done();
        });
      });
    });
  }
});

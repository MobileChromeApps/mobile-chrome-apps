// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('xhr', function(runningInBackground) {
  'use strict';
  describe('CORS XHR', function() {
    it('should xhr to apache.org', function(done) {
      var win = jasmine.createSpy('win');
      var lose = jasmine.createSpy('lose');
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://www.apache.org/');
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            win();
          } else {
            lose();
          }
          expect(win).toHaveBeenCalled();
          expect(lose).not.toHaveBeenCalled();
          done();
        }
      };
      xhr.send();
    });

    it('should not xhr to google.com', function(done) {
      var win = jasmine.createSpy('win');
      var lose = jasmine.createSpy('lose');
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://www.google.com/');
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            lose();
          } else {
            win();
          }
          expect(win).toHaveBeenCalled();
          expect(lose).not.toHaveBeenCalled();
          done();
        }
      };
      xhr.send();
    });

  });
  describe('Blob XHR', function() {

    it('should support Blob return types', function(done) {
      var win = jasmine.createSpy('win');
      var lose = jasmine.createSpy('lose');
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://www.apache.org/images/feather-small.gif', true);
      xhr.responseType = 'blob';
      xhr.onerror = lose;
      xhr.onload = function(e) {
        if (this.response instanceof Blob) {
         // if ((this.response instanceof chromespec.fgWnd.Blob) || (this.response instanceof chromespec.bgWnd.Blob)) {
          win();
        } else {
          lose();
        }
        expect(win).toHaveBeenCalled();
        expect(lose).not.toHaveBeenCalled();
        done();
      };
      xhr.send();
    });

  });
  describe('XHR: Embed', function() {

    it('should XHR an image back from apache.org', function(done) {
      var win = jasmine.createSpy('win');
      var lose = jasmine.createSpy('lose');
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://www.apache.org/images/feather-small.gif', true);
      xhr.responseType = 'blob';
      xhr.onerror = lose;
      xhr.onload = function(e) {
        var img = document.createElement('img');
        img.src = window.webkitURL.createObjectURL(this.response);
        win();
        expect(win).toHaveBeenCalled();
        expect(lose).not.toHaveBeenCalled();
        done();
      };
      xhr.send();
    });
  });
});

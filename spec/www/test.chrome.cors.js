// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.cors', function(runningInBackground) {

  describe('CORS', function() {
    it('should xhr to apache.org', function() {
      var win = jasmine.createSpy('win');
      var lose = jasmine.createSpy('lose');
      runs(function() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://www.apache.org/');
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            if (xhr.status == 200) {
              win();
            } else {
              lose();
            }
          }
        };
        xhr.send();
      });
      waitsFor(function() { return win.calls.length > 0 || lose.calls.length > 0 }, 10000);
      runs(function() { expect(win).toHaveBeenCalled();
        expect(lose).not.toHaveBeenCalled();
      });
    });

    it('should not xhr to google.com', function() {
      var win = jasmine.createSpy('win');
      var lose = jasmine.createSpy('lose');
      runs(function() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://www.google.com/');
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            if (xhr.status == 200) {
              lose();
            } else {
              win();
            }
          }
        };
        xhr.send();
      });
      waitsFor(function() { return win.calls.length > 0 || lose.calls.length > 0 }, 10000);
      runs(function() { expect(win).toHaveBeenCalled();
        expect(lose).not.toHaveBeenCalled();
      });
    });

  });
});

// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('symlinks', function(runningInBackground) {
  // No value in running this twice.
  if (runningInBackground) {
    return;
  }

  function fail(msg, done) {
    expect(msg).toBe('');
    done();
  }

  function xhrTest(src, shouldFail, done) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', src);
    xhr.onload = function() {
      if (xhr.status && xhr.status != 200) {
        fail('XHR status was ' + xhr.status, done);
      } else {
        if (shouldFail) {
          fail('fetch should have failed.');
        } else {
          done();
        }
      }
    };
    xhr.onerror = function() {
      if (shouldFail) {
        done();
      } else {
        fail('onerror called.', done);
      }
    };
    xhr.send();
  }

  // Important note: When running these tests on IOS, scrolling the display while a test is running can cause alarms to
  // be delayed and can introduce flakiness.
  describe('symlinks', function() {
    itWaitsForDone('symlinked local file', function(done) {
      xhrTest('symlinks/symlink-local-file.txt', false, done);
    });
    itWaitsForDone('symlinked local file 2', function(done) {
      xhrTest('symlinks/symlink-local-file2.txt', false, done);
    });
    itWaitsForDone('symlinked local dir', function(done) {
      xhrTest('symlinks/symlink-local-dir/i18n_test.txt', false, done);
    });
    itWaitsForDone('symlinked external file', function(done) {
      var src = chrome.mobile ? 'symlinks/symlink-external-file2.txt' : 'symlinks/symlink-external-file.txt';
      xhrTest(src, true, done);
    });
    itWaitsForDone('symlinked external dir 1', function(done) {
      var src = chrome.mobile ? 'symlinks/symlink-external-dir2' : 'symlinks/symlink-external-dir';
      xhrTest(src + '/plugin.xml', true, done);
    });
  });
});

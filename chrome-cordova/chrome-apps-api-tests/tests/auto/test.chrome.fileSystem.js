// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.fileSystem', function(runningInBackground) {
  'use strict';
  describeCordovaOnly('chrome.fileSystem', function() {
    // Create a file entry for testing.
    var fileEntry = new FileEntry('filename', 'fullpath');

    describe('getDisplayPath()', function() {
      it('returns the full path of the given file entry', function() {
        // Create the callback.
        var getDisplayPathCallback = function(displayPath) {
          expect(displayPath).toEqual(fileEntry.fullPath);
        };

        // Get the display path.
        chrome.fileSystem.getDisplayPath(fileEntry, getDisplayPathCallback);
      });
    });
    describe('getWritableEntry()', function() {
      it('returns a writable file entry', function() {
        // Create the callback.
        var getWritableEntryCallback = function(writableFileEntry) {
          expect(writableFileEntry).not.toBeNull();
        };

        // Get the writable file entry.
        chrome.fileSystem.getWritableEntry(fileEntry, getWritableEntryCallback);
      });
    });
    describe('isWritableEntry()', function() {
      it('returns true', function() {
        // Create the callback.
        var isWritableEntryCallback = function(isWritable) {
          expect(isWritable).toBeTruthy();
        };

        // Get whether the file entry is writable.
        chrome.fileSystem.isWritableEntry(fileEntry, isWritableEntryCallback);
      });
    });
  });

  describeChromeRuntimeOnly('chrome.fileSystem', function() {
  });
});

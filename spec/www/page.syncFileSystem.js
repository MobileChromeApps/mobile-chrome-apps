// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.syncFileSystem', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('requestFileSystem', function() {
    // Request the file system, create a file, and write to it.
    var requestFileSystemCallback = function(fileSystem) {
      var onCreateWriterSuccess = function(fileWriter) {
        fileWriter.onwrite = function(evt) {
          chromespec.log('Wrote to file!');
        };
        fileWriter.write('Mobile text!');
      };
      var onCreateWriterError = function(e) {
        chromespec.log('Error creating writer: ' + e.code);
      };

      var onGetFileSuccess = function(fileEntry) {
        chromespec.log("File created!");
        fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
      };
      var onGetFileError = function(e) {
        chromespec.log('Error getting file: ' + e.code);
      };
      
      fileSystem.root.getFile("mobileFoo.txt", { create: true }, onGetFileSuccess, onGetFileError);
    };

    chrome.syncFileSystem.requestFileSystem(requestFileSystemCallback);
  });
});


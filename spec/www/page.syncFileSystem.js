// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.syncFileSystem', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('requestFileSystem', function() {
    var requestFileSystemCallback = function(fileSystem) {
      var onGetFileSuccess = function(fileEntry) {

      };
      var onGetFileError = function(e) {
      	console.log('error: ' + e.code);
      };
      
      fileSystem.root.getFile("newFile.txt", { create: true }, onGetFileSuccess, onGetFileError);
    };

    chrome.syncFileSystem.requestFileSystem(requestFileSystemCallback);
  });
});


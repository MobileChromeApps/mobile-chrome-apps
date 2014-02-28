// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.syncFileSystem', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  var syncFileSystem;

  // Register a file status listener.
  var fileStatusListener = function(fileInfo) {
    chromespec.log('UPDATE: ' + fileInfo.fileEntry.name + ', ' + fileInfo.status + ', ' + fileInfo.action + ', ' + fileInfo.direction);
  };
  chrome.syncFileSystem.onFileStatusChanged.addListener(fileStatusListener);

  var requestFileSystem = function(callback) {
    var augmentedCallback = function(fileSystem) {
        syncFileSystem = fileSystem;
        callback(fileSystem);
    };

    if (syncFileSystem) {
      augmentedCallback(syncFileSystem);
    } else {
      chrome.syncFileSystem.requestFileSystem(augmentedCallback);
    }
  };

  addButton('Create foo.txt', function() {
    var onCreateWriterSuccess = function(fileWriter) {
      chromespec.log('FileEntry.createWriter success!');
      fileWriter.onwrite = function(evt) {
        chromespec.log('FileWriter.write success!');
      };
      fileWriter.write('Hello from syncFileSystem!');
    };
    var onCreateWriterError = function(e) {
      chromespec.log('FileEntry.createWriter error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      chromespec.log('FileSystem.getFile success!');
      fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
    };
    var onGetFileError = function(e) {
      chromespec.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      _syncFileSystem = fileSystem;
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('foo.txt', { create: true }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove foo.txt', function() {
    var onRemoveSuccess = function() {
      chromespec.log('FileEntry.remove success!');
    };
    var onRemoveError = function(e) {
      chromespec.log('FileEntry.remove error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      chromespec.log('FileSystem.getFile success!');
      fileEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetFileError = function(e) {
      chromespec.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('foo.txt', { create: false }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar directory', function() {
    var onGetDirectorySuccess = function(directoryEntry) {
      chromespec.log('FileSystem.getDirectory success!');
    };
    var onGetDirectoryError = function(e) {
      chromespec.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar', { create: true }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar directory', function() {
    var onRemoveSuccess = function() {
      chromespec.log('DirectoryEntry.remove success!');
    };
    var onRemoveError = function(e) {
      chromespec.log('DirectoryEntry.remove error: ' + e.code);
    };

    var onGetDirectorySuccess = function(directoryEntry) {
      chromespec.log('FileSystem.getDirectory success!');
      directoryEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetDirectoryError = function(e) {
      chromespec.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar', { create: false }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar/baz directory', function() {
    var onGetDirectorySuccess = function(directoryEntry) {
      chromespec.log('FileSystem.getDirectory success!');
    };
    var onGetDirectoryError = function(e) {
      chromespec.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar/baz', { create: true }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar/baz directory', function() {
    var onRemoveSuccess = function() {
      chromespec.log('DirectoryEntry.remove success!');
    };
    var onRemoveError = function(e) {
      chromespec.log('DirectoryEntry.remove error: ' + e.code);
    };

    var onGetDirectorySuccess = function(directoryEntry) {
      chromespec.log('FileSystem.getDirectory success!');
      directoryEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetDirectoryError = function(e) {
      chromespec.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar/baz', { create: false }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar/baz/foo.txt', function() {
    var onCreateWriterSuccess = function(fileWriter) {
      chromespec.log('FileEntry.createWriter success!');
      fileWriter.onwrite = function(evt) {
        chromespec.log('FileWriter.write success!');
      };
      fileWriter.write('Hello from syncFileSystem!');
    };
    var onCreateWriterError = function(e) {
      chromespec.log('FileEntry.createWriter error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      chromespec.log('FileSystem.getFile success!');
      fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
    };
    var onGetFileError = function(e) {
      chromespec.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('bar/baz/foo.txt', { create: true }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar/baz/foo.txt', function() {
    var onRemoveSuccess = function() {
      chromespec.log('FileEntry.remove success!');
    };
    var onRemoveError = function(e) {
      chromespec.log('FileEntry.remove error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      chromespec.log('FileSystem.getFile success!');
      fileEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetFileError = function(e) {
      chromespec.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      chromespec.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('bar/baz/foo.txt', { create: false }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Clear chrome.storage', function() {
    var clearCallback = function() {
      chromespec.log('chrome.storage cleared.');
    };
    chrome.storage.internal.clear(clearCallback);
  });
});


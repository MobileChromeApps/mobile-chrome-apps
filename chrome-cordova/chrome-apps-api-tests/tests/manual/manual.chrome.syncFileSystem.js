// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.syncFileSystem', function(rootEl, addButton) {
  var syncFileSystem;

  // Register a file status listener.
  var fileStatusListener = function(fileInfo) {
    console.log('UPDATE: ' + fileInfo.fileEntry.name + ', ' + fileInfo.status + ', ' + fileInfo.action + ', ' + fileInfo.direction);
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
      console.log('FileEntry.createWriter success!');
      fileWriter.onwrite = function(evt) {
        console.log('FileWriter.write success!');
      };
      fileWriter.write('Hello from syncFileSystem!');
    };
    var onCreateWriterError = function(e) {
      console.log('FileEntry.createWriter error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      console.log('FileSystem.getFile success!');
      fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
    };
    var onGetFileError = function(e) {
      console.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      _syncFileSystem = fileSystem;
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('foo.txt', { create: true }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove foo.txt', function() {
    var onRemoveSuccess = function() {
      console.log('FileEntry.remove success!');
    };
    var onRemoveError = function(e) {
      console.log('FileEntry.remove error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      console.log('FileSystem.getFile success!');
      fileEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetFileError = function(e) {
      console.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('foo.txt', { create: false }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar directory', function() {
    var onGetDirectorySuccess = function(directoryEntry) {
      console.log('FileSystem.getDirectory success!');
    };
    var onGetDirectoryError = function(e) {
      console.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar', { create: true }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar directory', function() {
    var onRemoveSuccess = function() {
      console.log('DirectoryEntry.remove success!');
    };
    var onRemoveError = function(e) {
      console.log('DirectoryEntry.remove error: ' + e.code);
    };

    var onGetDirectorySuccess = function(directoryEntry) {
      console.log('FileSystem.getDirectory success!');
      directoryEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetDirectoryError = function(e) {
      console.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar', { create: false }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar/baz directory', function() {
    var onGetDirectorySuccess = function(directoryEntry) {
      console.log('FileSystem.getDirectory success!');
    };
    var onGetDirectoryError = function(e) {
      console.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar/baz', { create: true }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar/baz directory', function() {
    var onRemoveSuccess = function() {
      console.log('DirectoryEntry.remove success!');
    };
    var onRemoveError = function(e) {
      console.log('DirectoryEntry.remove error: ' + e.code);
    };

    var onGetDirectorySuccess = function(directoryEntry) {
      console.log('FileSystem.getDirectory success!');
      directoryEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetDirectoryError = function(e) {
      console.log('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar/baz', { create: false }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar/baz/foo.txt', function() {
    var onCreateWriterSuccess = function(fileWriter) {
      console.log('FileEntry.createWriter success!');
      fileWriter.onwrite = function(evt) {
        console.log('FileWriter.write success!');
      };
      fileWriter.write('Hello from syncFileSystem!');
    };
    var onCreateWriterError = function(e) {
      console.log('FileEntry.createWriter error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      console.log('FileSystem.getFile success!');
      fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
    };
    var onGetFileError = function(e) {
      console.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('bar/baz/foo.txt', { create: true }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar/baz/foo.txt', function() {
    var onRemoveSuccess = function() {
      console.log('FileEntry.remove success!');
    };
    var onRemoveError = function(e) {
      console.log('FileEntry.remove error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      console.log('FileSystem.getFile success!');
      fileEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetFileError = function(e) {
      console.log('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      console.log('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('bar/baz/foo.txt', { create: false }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Clear chrome.storage', function() {
    var clearCallback = function() {
      console.log('chrome.storage cleared.');
    };
    chrome.storage.internal.clear(clearCallback);
  });
});


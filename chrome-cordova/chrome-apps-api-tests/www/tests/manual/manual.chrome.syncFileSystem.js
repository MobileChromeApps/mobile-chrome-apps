// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.syncFileSystem', function(rootEl, addButton) {
  var syncFileSystem;

  // Register a file status listener.
  var fileStatusListener = function(fileInfo) {
    logger('UPDATE: ' + fileInfo.fileEntry.name + ', ' + fileInfo.status + ', ' + fileInfo.action + ', ' + fileInfo.direction);
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
      logger('FileEntry.createWriter success!');
      fileWriter.onwrite = function(evt) {
        logger('FileWriter.write success!');
      };
      fileWriter.write('Hello from syncFileSystem!');
    };
    var onCreateWriterError = function(e) {
      logger('FileEntry.createWriter error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      logger('FileSystem.getFile success!');
      fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
    };
    var onGetFileError = function(e) {
      logger('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      _syncFileSystem = fileSystem;
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('foo.txt', { create: true }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove foo.txt', function() {
    var onRemoveSuccess = function() {
      logger('FileEntry.remove success!');
    };
    var onRemoveError = function(e) {
      logger('FileEntry.remove error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      logger('FileSystem.getFile success!');
      fileEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetFileError = function(e) {
      logger('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('foo.txt', { create: false }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar directory', function() {
    var onGetDirectorySuccess = function(directoryEntry) {
      logger('FileSystem.getDirectory success!');
    };
    var onGetDirectoryError = function(e) {
      logger('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar', { create: true }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar directory', function() {
    var onRemoveSuccess = function() {
      logger('DirectoryEntry.remove success!');
    };
    var onRemoveError = function(e) {
      logger('DirectoryEntry.remove error: ' + e.code);
    };

    var onGetDirectorySuccess = function(directoryEntry) {
      logger('FileSystem.getDirectory success!');
      directoryEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetDirectoryError = function(e) {
      logger('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar', { create: false }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar/baz directory', function() {
    var onGetDirectorySuccess = function(directoryEntry) {
      logger('FileSystem.getDirectory success!');
    };
    var onGetDirectoryError = function(e) {
      logger('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar/baz', { create: true }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar/baz directory', function() {
    var onRemoveSuccess = function() {
      logger('DirectoryEntry.remove success!');
    };
    var onRemoveError = function(e) {
      logger('DirectoryEntry.remove error: ' + e.code);
    };

    var onGetDirectorySuccess = function(directoryEntry) {
      logger('FileSystem.getDirectory success!');
      directoryEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetDirectoryError = function(e) {
      logger('getDirectory error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getDirectory('bar/baz', { create: false }, onGetDirectorySuccess, onGetDirectoryError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Create bar/baz/foo.txt', function() {
    var onCreateWriterSuccess = function(fileWriter) {
      logger('FileEntry.createWriter success!');
      fileWriter.onwrite = function(evt) {
        logger('FileWriter.write success!');
      };
      fileWriter.write('Hello from syncFileSystem!');
    };
    var onCreateWriterError = function(e) {
      logger('FileEntry.createWriter error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      logger('FileSystem.getFile success!');
      fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
    };
    var onGetFileError = function(e) {
      logger('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('bar/baz/foo.txt', { create: true }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Remove bar/baz/foo.txt', function() {
    var onRemoveSuccess = function() {
      logger('FileEntry.remove success!');
    };
    var onRemoveError = function(e) {
      logger('FileEntry.remove error: ' + e.code);
    };

    var onGetFileSuccess = function(fileEntry) {
      logger('FileSystem.getFile success!');
      fileEntry.remove(onRemoveSuccess, onRemoveError);
    };
    var onGetFileError = function(e) {
      logger('getFile error: ' + e.code);
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
      logger('chrome.syncFileSystem.requestFileSystem success!');
      fileSystem.root.getFile('bar/baz/foo.txt', { create: false }, onGetFileSuccess, onGetFileError);
    };

    requestFileSystem(onRequestFileSystemSuccess);
  });

  addButton('Clear chrome.storage', function() {
    var clearCallback = function() {
      logger('chrome.storage cleared.');
    };
    chrome.storage.internal.clear(clearCallback);
  });
});


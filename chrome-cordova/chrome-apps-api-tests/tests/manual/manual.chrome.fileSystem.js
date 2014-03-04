// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.fileSystem', function(rootEl, addButton) {
  var FileReader = window.FileReader || cordova.require('cordova/plugin/FileReader');

  var onError = function(e) {
    console.error('Error: ' + e.code);
  };

  addButton('chooseEntry, readAsText', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
      fileEntry.file(onFileReceived, onError);
    };

    // This method is called when a file is received from a file entry.
    var onFileReceived = function(file) {
      var reader = new FileReader();
      reader.onload = function(evt) {
        logger('Text: ' + evt.target.result);
      };
      reader.onerror = function(evt) {
        logger('Error: ' + evt.target.error.code);
      };
      reader.readAsText(file);
    };

    chrome.fileSystem.chooseEntry({ }, chooseEntryCallback);
  });

  addButton('chooseEntry, readAsDataURL', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
      fileEntry.file(onFileReceived, onError);
    };

    // This method is called when a file is received from a file entry.
    // It reads the file as a data URL and logs it.
    var onFileReceived = function(file) {
      var reader = new FileReader();
      reader.onload = function(evt) {
        logger('Data URL: ' + evt.target.result.substring(0, 32) + '...');
      };
      reader.onerror = function(evt) {
        logger('Error: ' + evt.target.error.code);
      };
      reader.readAsDataURL(file);
    };

    chrome.fileSystem.chooseEntry({ }, chooseEntryCallback);
  });

  addButton('chooseEntry, upload (cordova only)', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
      fileEntry.file(onFileReceived, onError);
    };

    // This method is called when a file is uploaded.
    var onFileUploaded = function(response) {
      logger('Response code: ' + response.responseCode);
    };

    // This method is called when a file is received from a file entry.
    // It uploads the file to a server.
    var onFileReceived = function(file) {
      var FileTransfer = cordova.require('cordova/plugin/FileTransfer');
      var transfer = new FileTransfer();
      transfer.upload(file.fullPath, 'http://cordova-filetransfer.jitsu.com/upload', onFileUploaded, onError, { });
    };

    chrome.fileSystem.chooseEntry({ }, chooseEntryCallback);
  });

  addButton('chooseEntry, writable file', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
      if (fileEntry) {
        logger('Writable file entry non-null: ' + fileEntry.fullPath);
      } else {
        logger('Writable file entry null, as expected.');
      }
    };

    var chooseEntryOptions = { type: 'openWritableFile' };

    chrome.fileSystem.chooseEntry(chooseEntryOptions, chooseEntryCallback);
  });

  addButton('chooseEntry, save file', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
      if (fileEntry) {
        logger('Save file entry non-null: ' + fileEntry.fullPath);
      } else {
        logger('Save file entry null, as expected.');
      }
    };

    var chooseEntryOptions = { type: 'saveFile' };

    chrome.fileSystem.chooseEntry(chooseEntryOptions, chooseEntryCallback);
  });

  addButton('chooseEntry, images only', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
      logger('File entry path: ' + fileEntry.fullPath);
    };

    var chooseEntryOptions = { acceptsAllTypes: false,
                               accepts: [{ mimeTypes: ['image/*'] }] };

    chrome.fileSystem.chooseEntry(chooseEntryOptions, chooseEntryCallback);
  });

  addButton('chooseEntry, videos only', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
      logger('File entry path: ' + fileEntry.fullPath);
    };

    var chooseEntryOptions = { acceptsAllTypes: false,
                               accepts: [{ mimeTypes: ['video/*'] }] };

    chrome.fileSystem.chooseEntry(chooseEntryOptions, chooseEntryCallback);
  });
});

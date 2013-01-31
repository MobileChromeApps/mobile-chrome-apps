// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.fileSystem', function(require, module) {
  var exports = module.exports;
  var FileEntry = cordova.require('cordova/plugin/FileEntry');

  exports.getDisplayPath = function(fileEntry, callback) {
    callback(fileEntry.fullPath);
  };

  exports.getWritableEntry = function(fileEntry, callback) {
    callback(null);
  };

  exports.isWritableEntry = function(fileEntry, callback) {
    callback(false);
  };

  exports.chooseEntry = function(options, callback) {
    // Create the callback for getPicture.
    // It creates a file entry and passes it to the chooseEntry callback.
    var onPictureReceived = function(nativeUri) {
      var fileEntry = new FileEntry('image.png', nativeUri);
      callback(fileEntry);
    };

    // Prepare the options for getting the picture.
    var getPictureOptions = { destinationType: navigator.camera.DestinationType.NATIVE_URI,
                              sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY };

    // Get a picture.
    navigator.camera.getPicture(onPictureReceived, null, getPictureOptions);
  };
});

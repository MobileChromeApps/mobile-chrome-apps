// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

define('chrome.fileSystem', function(require, module) {
  var exports = module.exports;
  var platformId = cordova.require('cordova/platform').id;
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
    // Ensure that the type is either unspecified or specified as 'openFile', as nothing else is supported.
    if (options.type && options.type != 'openFile') {
      // TODO(maxw): Determine a "more correct" way to fail here.
      return;
    }

    // Create the callback for getFile.
    // It creates a file entry and passes it to the chooseEntry callback.
    var onFileReceived = function(nativeUri) {
      var fileEntry = new FileEntry('image.png', nativeUri);
      callback(fileEntry);
    };

    if (platformId == 'ios') {
      getFileIos(options, onFileReceived);
    } else if (platformId == 'android') {
      getFileAndroid(options, onFileReceived);
    }
  };

  function getFileIos(options, onFileReceivedCallback) {
    // Determine the media type.
    var mediaType = determineMediaType(options.accepts, options.acceptsAllTypes);

    // Prepare the options for getting the file.
    var getFileOptions = { destinationType: navigator.camera.DestinationType.NATIVE_URI,
                           sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
                           mediaType: mediaType };

    // Use the camera to get an image or video.
    navigator.camera.getPicture(onFileReceivedCallback, null, getFileOptions);
  }

  function getFileAndroid(options, onFileReceivedCallback) {
    var AndroidFileChooser = cordova.require('cordova/plugin/android/filechooser');

    // Determine the relevant mime types.
    var mimeTypes = determineMimeTypes(options.accepts, options.acceptsAllTypes);

    // Use the file chooser to get a file.
    AndroidFileChooser.chooseFile(onFileReceivedCallback, null, mimeTypes);
  }

  function determineMediaType(acceptOptions, acceptsAllTypes) {
    if (acceptsAllTypes) {
      return navigator.camera.MediaType.ALLMEDIA;
    }

    var imageMimeTypeRegex = /^image\//;
    var videoMimeTypeRegex = /^video\//;
    var imageExtensionRegex = /^(?:jpg|png)$/;
    var videoExtensionRegex = /^mov$/;
    var imagesAllowed = false;
    var videosAllowed = false;

    // Iterate through all accept options.
    // If we see anything image related, allow images.  If we see anything video related, allow videos.
    if (acceptOptions) {
      for (var i = 0; i < acceptOptions.length; i++) {
        if (acceptOptions[i].mimeTypes) {
          for (var j = 0; j < acceptOptions[i].mimeTypes.length; j++) {
            if (imageMimeTypeRegex.test(acceptOptions[i].mimeTypes[j])) {
              imagesAllowed = true;
            } else if (videoMimeTypeRegex.test(acceptOptions[i].mimeTypes[j])) {
              videosAllowed = true;
            }
          }
        }
        if (acceptOptions[i].extensions) {
          for (var k = 0; k < acceptOptions[i].extensions.length; k++) {
            if (imageExtensionRegex.test(acceptOptions[i].extensions[k])) {
              imagesAllowed = true;
            } else if (videoExtensionRegex.test(acceptOptions[i].extensions[k])) {
              videosAllowed = true;
            }
          }
        }
      }
    }

    if (imagesAllowed && !videosAllowed) {
      return navigator.camera.MediaType.PICTURE;
    } else if (!imagesAllowed && videosAllowed) {
      return navigator.camera.MediaType.VIDEO;
    }

    return navigator.camera.MediaType.ALLMEDIA;
  }

  function determineMimeTypes(acceptOptions, acceptsAllTypes) {
    if (acceptsAllTypes) {
      return [ '*/*' ];
    }

    // Pull out all the mime types.
    // TODO(maxw): Determine mime types from extensions and add them to the returned list.
    var mimeTypes = [ ];
    if (acceptOptions) {
      for (var i = 0; i < acceptOptions.length; i++) {
        if (acceptOptions[i].mimeTypes) {
          for (var j = 0; j < acceptOptions[i].mimeTypes.length; j++) {
            mimeTypes.push(acceptOptions[i].mimeTypes[j]);
          }
        }
      }
    }

    if (mimeTypes.length !== 0) {
      return mimeTypes;
    }

    return [ '*/*' ];
  }
});

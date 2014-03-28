// Copyright (c) 2012, 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var platformId = cordova.require('cordova/platform').id;
var exec = cordova.require('cordova/exec');

// Generate a failure function.
//
// The chrome.fileSystem API generally signals failure through the
// chrome.runtime.lastError object, and calls the single callback
// function regardless of whether the API call succeeded or not.
function fail(errorMessage, callback) {
  return function() {
    console.log(errorMessage);
    chrome.runtime.lastError = { 'message': errorMessage };
    callback && callback();
  }
}

exports.getDisplayPath = function(fileEntry, callback) {
  callback(fileEntry.fullPath);
};

exports.getWritableEntry = function(fileEntry, callback) {
  //TODO: Check whether fileEntry is / can be writable. (Chrome does not do this)
  //TODO: Check whether this is required to return a new FileEntry object
  tagFileEntryWritable(fileEntry, true);
  callback && callback(fileEntry);
};

exports.isWritableEntry = function(fileEntry, callback) {
  //TODO: Check whether fileEntry is / can be writable. (Chrome does not do this)
  callback && callback(fileEntry.__chrome_is_writable);
};

function tagFileEntryWritable(fileEntry, isWritable) {
  Object.defineProperty(fileEntry, '__chrome_is_writable', {
    value: isWritable,
    writable: false
  });
}

exports.chooseEntry = function(options, callback) {
  // Ensure that the type is either unspecified or one of the valid values
  if (options.type && options.type != 'openFile' &&
                      options.type != 'openWritableFile' &&
                      options.type != 'saveFile') {
    fail("Unsupported type for chooseEntry", callback);
    return;
  }

  if (platformId == 'ios') {
    getFileIos(options, callback);
  } else if (platformId == 'android') {
    getFileAndroid(options, callback);
  }
};

function getFileIos(options, callback) {
//  // Determine the media type.
//  var mediaType = determineMediaType(options.accepts, options.acceptsAllTypes);
//
//  // Prepare the options for getting the file.
//  var getFileOptions = { destinationType: navigator.camera.DestinationType.NATIVE_URI,
//                         sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
//                         mediaType: mediaType };
//
//  // Use the camera to get an image or video.
//  navigator.camera.getPicture(onFileReceivedCallback, null, getFileOptions);

  var onFileDetailsReceived = function(fileDetails) {
    // file details will be populated if the user selected a file, and false if
    // the user cancelled.
    if (!fileDetails) {
      fail('User cancelled', callback);
    } else {
      resolveLocalFileSystemURI(fileDetails.pathuri, function(dirEntry) {
        dirEntry.getFile(fileDetails.file, {create: options.type === 'saveFile'}, function(fileEntry) {
          // Set the writable bit and execute the callback
          tagFileEntryWritable(fileEntry, (options.type !== 'openFile'));
          callback && callback(fileEntry);
        }, fail("Unable to open file", callback));
      }, fail("Unable to open file", callback));
    }
  }

  fileChooserOptions = {
    title: options.type === 'saveFile' ? "Save File" : "Open File",
    canCreate: options.type === 'saveFile',
    needWritable: options.type !== 'openFile',
    includeTextInput: options.type === 'saveFile',
    accepts: options.accepts,
    acceptsAllTypes: !!(options.acceptsAllTypes) || !options.accepts || (options.accepts.length === 0)
  }
  exec(onFileDetailsReceived, fail("Error choosing file", callback), "ChromeFileSystem", "chooseEntry", [fileChooserOptions]);
}

function getFileAndroid(options, callback) {
  var AndroidFileChooser = cordova.require('org.chromium.FileChooser.FileChooser');

  // Determine the relevant mime types.
  var mimeTypes = determineMimeTypes(options.accepts, options.acceptsAllTypes);

  // Create the callback for getFile.
  // It creates a file entry and passes it to the chooseEntry callback.
  var onFileReceived = function(nativeUri) {

    var onUriResolveError = function(error) {
      fail(error.code);
    };

    if (!chrome.runtime.lastError) {
      resolveLocalFileSystemURL(nativeUri, callback, onUriResolveError);
    } else {
      callback && callback();
    }
  };

  // Use the file chooser to get a file.
  AndroidFileChooser.chooseFile(onFileReceived, null, [ mimeTypes ]);
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

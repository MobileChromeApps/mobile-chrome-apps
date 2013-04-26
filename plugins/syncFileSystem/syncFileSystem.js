// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

//-------
// Drive
//-------

// When we get an auth token string, we store it here.
var _tokenString;

// When we create or get the app's syncable Drive directory, we store its id here.
var _syncableDirectoryId;

// This function overrides the necessary functions on a given FileEntry to enable syncability.
// It also uploads the associated file to Drive.
function enableSyncabilityForFileEntry(fileEntry) {
    // TODO(maxw): Update the given FileEntry's functions for syncability.
}

// This function overrides the necessary functions on a given DirectoryEntry to enable syncability.
function enableSyncabilityForDirectoryEntry(directoryEntry) {
    directoryEntry.stdGetFile = directoryEntry.getFile;
    directoryEntry.getFile = function(path, options, successCallback, errorCallback) {
        // When a file is retrieved, enable syncability for it, sync it to Drive, and then call the given callback.
        // TODO(maxw): Only sync if you need to, not every time!
        var onSyncFileSuccess = function(fileEntry) {
            if (successCallback) {
                successCallback(fileEntry);
            }
        };
        var augmentedSuccessCallback = function(fileEntry) {
            enableSyncabilityForFileEntry(fileEntry);
            syncFile(fileEntry, onSyncFileSuccess);
        };

        directoryEntry.stdGetFile(path, options, augmentedSuccessCallback, errorCallback);
        // TODO(maxw): Get rid of the stdGetFile you've just added to directoryEntry.  Find, perhaps, a better way to do this.
    };
}

// This function creates a directory on the user's Drive.
function syncDirectory(directoryEntry, callback) {
    var onGetSyncableParentDirectoryIdSuccess = function(parentDirectoryId) {
        // Create the data to send.
        var data = { title: directoryEntry.name,
                     parents: [{ id: parentDirectoryId }],
                     mimeType: 'application/vnd.google-apps.folder' };

        // Send a request to upload the file.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Directory created!');

                    // Keep that directory id!  We'll need it.
                    _syncableDirectoryId = JSON.parse(xhr.responseText).id;

                    callback(directoryEntry);
                } else {
                    console.log('Failed to create directory with status ' + xhr.status + '.');
                }
            }
        };

        xhr.open('POST', 'https://www.googleapis.com/drive/v2/files', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + _tokenString);
        xhr.send(JSON.stringify(data));
    };
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Get the Drive "Chrome Syncable FileSystem" directory id.
        getSyncableParentDirectoryId(onGetSyncableParentDirectoryIdSuccess);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function uploads a file to Drive.
function syncFile(fileEntry, callback) {
    var onFileSuccess = function(file) {
        // Read the file and send its contents.
        var fileReader = new FileReader();
        fileReader.onloadend = function(evt) {
            // Create the data to send.
            var metadata = { title: fileEntry.name,
                             parents: [{ id: _syncableDirectoryId }] };
            var boundary = '2718281828459045';
            var body = [];
            body.push('--' + boundary);
            body.push('Content-Type: application/json');
            body.push('');
            body.push(JSON.stringify(metadata));
            body.push('');
            body.push('--' + boundary);
            // TODO(maxw): Use the correct content type.
            body.push('Content-Type: text/plain');
            body.push('');
            body.push(fileReader.result);
            body.push('');
            body.push('--' + boundary + '--');
            var bodyString = body.join('\r\n');

            // Send a request to upload the file.
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        console.log('File synced!');
                        callback(fileEntry);
                    } else {
                        console.log('File failed to sync with status ' + xhr.status + '.');
                    }
                }
            };

            xhr.open('POST', 'https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart', true);
            xhr.setRequestHeader('Content-Type', 'multipart/related; boundary=' + boundary);
            xhr.setRequestHeader('Content-Length', bodyString.length);
            xhr.setRequestHeader('Authorization', 'Bearer ' + _tokenString);
            xhr.send(bodyString);
        };
        fileReader.readAsArrayBuffer(file);
    };

    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Get the file.
        fileEntry.file(onFileSuccess);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function retrieves the Drive directory id of the "Chrome Syncable FileSystem" directory.
function getSyncableParentDirectoryId(callback) {
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Create a query that locates the desired directory.
        var query = 'mimeType = "application/vnd.google-apps.folder" and title = "Chrome Syncable FileSystem"';

        // Send a request to upload the file.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Successfully got directories.');

                    callback(JSON.parse(xhr.responseText).items[0].id);
                } else {
                    console.log('Failed to get directories with status ' + xhr.status + '.');
                }
            }
        };

        xhr.open('GET', 'https://www.googleapis.com/drive/v2/files?q=' + query, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + _tokenString);
        xhr.send();
    };

    getTokenString(onGetTokenStringSuccess);
}

//----------
// Identity
//----------

// This function initiates a web auth flow, eventually getting a token string and passing it to the given callback.
function getTokenString(callback) {
	// TODO(maxw): Handle this correctly.  Tokens expire!
	if (_tokenString) {
		callback(_tokenString);
		return;
	}

    // First, initiate the web auth flow.
    var webAuthDetails = new chrome.identity.WebAuthFlowDetails('https://accounts.google.com/o/oauth2/auth?client_id=95499094623-0kel3jp6sp8l5jrfm3m5873h493uupvr.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Fwww.google.ca&response_type=token&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive');
    chrome.identity.launchWebAuthFlow(webAuthDetails, function(url) {
        if (typeof url === 'undefined' || url === '') {
            console.log('Failed to complete web auth flow.');
            return;
        } else {
            // Extract the token string from the resulting URL.
            callback(extractTokenString(url));
        }
    });
}

// This function extracts a token string from a URL and returns it.
function extractTokenString(url) {
    var startIndex = url.indexOf('access_token=') + 13;
    var remainder = url.substring(startIndex); // This string starts with the token string.
    var endIndex = remainder.indexOf('&');
    if (endIndex < 0) {
        return remainder;
    }
    return remainder.substring(0, endIndex);
}

//-----------------------
// chrome.syncFileSystem
//-----------------------

exports.requestFileSystem = function(callback) {
    var onRequestFileSystemSuccess = function(fileSystem) {
        // Change the name of the file system.  This is a syncable file system!
        fileSystem.name = "syncable";

        // Create or get the subdirectory for this app.
        var getDirectoryFlags = { create: true, exclusive: false };
        var onSyncDirectorySuccess = function(directoryEntry) {
            // Set the root of the file system to the app subdirectory.
            fileSystem.root = directoryEntry;

            // Pass on the file system!
            callback(fileSystem);
        };
        var onGetDirectorySuccess = function(directoryEntry) {
            // We have to make some changes to this directory entry to enable syncability.
            // If a file is ever retrieved or created in this directory entry, we want to enable its syncability before passing it to a callback.
            enableSyncabilityForDirectoryEntry(directoryEntry);
            syncDirectory(directoryEntry, onSyncDirectorySuccess);
        };
        var onGetDirectoryFailure = function(e) {
            console.log('Failed to get directory.');
        };

        // TODO(maxw): Make the directory name app-specific.
        fileSystem.root.getDirectory('chrome-spec', getDirectoryFlags, onGetDirectorySuccess, onGetDirectoryFailure);
    };
    var onRequestFileSystemFailure = function(e) {
        console.log("Failed to get file system.");
    };

    // Request the file system.
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onRequestFileSystemSuccess, onRequestFileSystemFailure);
};

exports.setConflictResolutionPolicy = function(policy, callback) {
    // TODO(maxw): Implement this!
};

exports.getConflictResolutionPolicy = function(callback) {
    // TODO(maxw): Implement this!
};

exports.getUsageAndQuota = function(fileSystem, callback) {
    // TODO(maxw): Implement this!
};

exports.getFileStatus = function(fileEntry, callback) {
    // TODO(maxw): Implement this!
};

exports.getFileStatuses = function(fileEntries, callback) {
    // TODO(maxw): Implement this!
};

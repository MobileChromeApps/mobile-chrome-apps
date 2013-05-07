// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

//=======
// Drive
//=======

// The app's id is stored here.  It's used for the Drive syncable directory name.
var _appId = 'chrome-spec';

// When we get an auth token string, we store it here.
var _tokenString;

// When we create or get the app's syncable Drive directory, we store its id here.
var _syncableAppDirectoryId;

// Error codes.
var FILE_NOT_FOUND_ERROR = 1;
var MULTIPLE_FILES_FOUND_ERROR = 2;
var REQUEST_FAILED_ERROR = 3;

//----------------------------------
// FileSystem function augmentation
//----------------------------------

// This function overrides the necessary functions on a given DirectoryEntry to enable syncability.
function enableSyncabilityForDirectoryEntry(directoryEntry) {
    directoryEntry.getDirectory = function(path, options, successCallback, errorCallback) {
        // When a directory is retrieved, enable syncability for it, sync it to Drive, and then call the given callback.
        // TODO(maxw): Only sync if you need to, not every time (namely, when a directory is created rather than merely retrieved).
        var onSyncDirectorySuccess = function(directoryEntry) {
            if (successCallback) {
                successCallback(directoryEntry);
            }
        };
        var augmentedSuccessCallback = function(directoryEntry) {
            enableSyncabilityForDirectoryEntry(directoryEntry);
            syncDirectory(directoryEntry, onSyncDirectorySuccess);
        };

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        DirectoryEntry.prototype.getDirectory.call(directoryEntry, path, options, augmentedSuccessCallback, errorCallback);
    };

    directoryEntry.getFile = function(path, options, successCallback, errorCallback) {
        // When a file is retrieved, enable syncability for it, sync it to Drive, and then call the given callback.
        // TODO(maxw): Only sync if you need to, not every time (namely, when a file is created rather than merely retrieved).
        var onSyncFileSuccess = function(fileEntry) {
            if (successCallback) {
                successCallback(fileEntry);
            }
        };
        var augmentedSuccessCallback = function(fileEntry) {
            enableSyncabilityForFileEntry(fileEntry);
            syncFile(fileEntry, onSyncFileSuccess);
        };

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        DirectoryEntry.prototype.getFile.call(directoryEntry, path, options, augmentedSuccessCallback, errorCallback);
    };
}

// This function overrides the necessary functions on a given FileEntry to enable syncability.
// It also uploads the associated file to Drive.
function enableSyncabilityForFileEntry(fileEntry) {
    fileEntry.createWriter = function(successCallback, errorCallback) {
        var augmentedSuccessCallback = function(fileWriter) {
            enableSyncabilityForFileWriter(fileWriter, fileEntry);
            if (successCallback) {
                successCallback(fileWriter);
            }
        };

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        FileEntry.prototype.createWriter.call(fileEntry, augmentedSuccessCallback, errorCallback);
    };

    fileEntry.remove = function(successCallback, errorCallback) {
        var onRemoveFileSuccess = function() {
            if (successCallback) {
                successCallback();
            }
        };
        var augmentedSuccessCallback = function() {
            removeFile(fileEntry, onRemoveFileSuccess);
        };

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        FileEntry.prototype.remove.call(fileEntry, augmentedSuccessCallback, errorCallback);
    };
}

// This function overrides the necessary functions on a given FileWriter to enable syncability.
function enableSyncabilityForFileWriter(fileWriter, fileEntry) {
    fileWriter.write = function(data) {
        // We want to augment the `onwrite` and `onwriteend` listeners to add syncing.
        // TODO(maxw): Augment onwriteend.
        if (fileWriter.onwrite) {
            var originalOnwrite = fileWriter.onwrite;
            fileWriter.onwrite = function(evt) {
                var onSyncFileSuccess = function() {
                    originalOnwrite(evt);
                };
                syncFile(fileEntry, onSyncFileSuccess);
            };
        }

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        FileWriter.prototype.write.call(fileWriter, data);
    };
}

//------------------
// Syncing to Drive
//------------------

// This function creates an app-specific directory on the user's Drive.
function createAppDirectoryOnDrive(directoryEntry, callback) {
    var onGetSyncableAppDirectoryIdSuccess = function(syncableAppDirectoryId) {
        // Keep that directory id!  We'll need it.
        _syncableAppDirectoryId = syncableAppDirectoryId;
        callback(directoryEntry);
    };
    var onGetSyncableRootDirectoryIdSuccess = function(syncableRootDirectoryId) {
        // Get the app directory id.
        getDirectoryId(_appId /* directoryName */, syncableRootDirectoryId /* parentDirectoryId */, true /* shouldCreateDirectory */, onGetSyncableAppDirectoryIdSuccess);
    };
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Get the Drive "Chrome Syncable FileSystem" directory id.
        getDirectoryId('Chrome Syncable FileSystem', null /* parentDirectoryId */, false /* shouldCreateDirectory */, onGetSyncableRootDirectoryIdSuccess);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function syncs a directory to Drive, creating it if necessary.
function syncDirectory(directoryEntry, callback) {
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Drive, unfortunately, does not allow searching by path.
        // Begin the process of drilling down to find the correct directory.  We can start with the app directory.
        var pathRemainder = directoryEntry.fullPath;
        var appIdIndex = pathRemainder.indexOf(_appId);

        // If the app id isn't in the path, we can't sync it.
        if (appIdIndex < 0) {
            console.log("Directory cannot be synced because it is not a descendant of the app directory.");
            return;
        }

        // Using the remainder of the path, start the recursive process of drilling down.
        pathRemainder = pathRemainder.substring(appIdIndex + _appId.length + 1);
        syncDirectoryAtPath(directoryEntry, _syncableAppDirectoryId, pathRemainder, callback);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function syncs a directory to Drive, given its path, creating it if necessary.
function syncDirectoryAtPath(directoryEntry, currentDirectoryId, pathRemainder, callback) {
    var slashIndex = pathRemainder.indexOf('/');
    var nextDirectoryName;
    var shouldCreateDirectory;
    var onGetDirectorySuccess;

    // The existence of a slash in the path determines our route.
    // If there is no slash, we're ready to create or sync the directory with that name.
    // If there is still a slash, we dive one level deeper into the directory hierarchy.
    if (slashIndex < 0) {
        nextDirectoryName = pathRemainder;
        shouldCreateDirectory = true;
        onGetDirectoryIdSuccess = function(directoryId) {
            callback(directoryEntry);
        };
    } else {
        nextDirectoryName = pathRemainder.substring(0, slashIndex);
        shouldCreateDirectory = false;
        onGetDirectoryIdSuccess = function(directoryId) {
            syncDirectoryAtPath(directoryEntry, directoryId, pathRemainder.substring(slashIndex + 1), callback);
        };
    }

    getDirectoryId(nextDirectoryName, currentDirectoryId, shouldCreateDirectory, onGetDirectoryIdSuccess);
}

// This function uploads a file to Drive.
function syncFile(fileEntry, callback) {
    var onGetFileIdSuccess = function(fileId) {
        var onFileSuccess = function(file) {
            // Read the file and send its contents.
            var fileReader = new FileReader();
            fileReader.onloadend = function(evt) {
                // Create the data to send.
                var metadata = { title: fileEntry.name,
                                 parents: [{ id: _syncableAppDirectoryId }] };
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

                // If there's a file id, update the file.  Otherwise, upload it anew.
                if (fileId) {
                    xhr.open('PUT', 'https://www.googleapis.com/upload/drive/v2/files/' + fileId + '?uploadType=multipart', true);
                } else {
                    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart', true);
                }
                xhr.setRequestHeader('Content-Type', 'multipart/related; boundary=' + boundary);
                xhr.setRequestHeader('Content-Length', bodyString.length);
                xhr.setRequestHeader('Authorization', 'Bearer ' + _tokenString);
                xhr.send(bodyString);
            };
            fileReader.readAsBinaryString(file);
        };

        // Get the file.
        fileEntry.file(onFileSuccess);
    };
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Get the file id and pass it on.
        getFileId(fileEntry, onGetFileIdSuccess);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function removes a file from Drive.
function removeFile(fileEntry, callback) {
    var onGetFileIdSuccess = function(fileId) {
        // Delete the file.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 204) {
                    console.log('File removed!');
                    callback();
                } else {
                    console.log('Failed to remove file with status ' + xhr.status + '.');
                }
            }
        };

        xhr.open('DELETE', 'https://www.googleapis.com/drive/v2/files/' + fileId, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + _tokenString);
        xhr.send();
    };
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Get the file id and pass it on.
        getFileId(fileEntry, onGetFileIdSuccess);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function creates the app's syncable directory on Drive.
function createDirectory(directoryName, parentDirectoryId, callback) {
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Create the data to send.
        var data = { title: directoryName,
                     parents: [{ id: parentDirectoryId }],
                     mimeType: 'application/vnd.google-apps.folder' };

        // Send a request to upload the file.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Directory created!');
                    callback(JSON.parse(xhr.responseText).id);
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

    getTokenString(onGetTokenStringSuccess);
}

//----------------------------
// Retrieving data from Drive
//----------------------------

// This function gets the Drive file id using the given query.
function getDriveFileId(query, successCallback, errorCallback) {
    // If there's no error callback provided, make one.
    if (!errorCallback) {
        errorCallback = function(e) {
            console.log('Error: ' + e);
        };
    }
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Send a request to locate the directory.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Successfully searched for file using query: ' + query + '.');
                    var items = JSON.parse(xhr.responseText).items;
                    if (items.length == 0) {
                        console.log('  File not found.');
                        errorCallback(FILE_NOT_FOUND_ERROR);
                    } else if (items.length == 1) {
                        console.log('  File found with id: ' + items[0].id + '.');
                        successCallback(items[0].id);
                    } else {
                        console.log('  Multiple (' + items.length + ') copies found.');
                        errorCallback(MULTIPLE_FILES_FOUND_ERROR);
                    }
                } else {
                    console.log('  Search failed with status ' + xhr.status + '.');
                    errorCallback(REQUEST_FAILED_ERROR);
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

// This function gets the Drive file id for the directory with the given name and parent id.
function getDirectoryId(directoryName, parentDirectoryId, shouldCreateDirectory, successCallback) {
    var query = 'mimeType = "application/vnd.google-apps.folder" and title = "' + directoryName + '" and trashed = false';
    if (parentDirectoryId) {
        query += ' and "' + parentDirectoryId + '" in parents';
    }
    var errorCallback;

    if (shouldCreateDirectory) {
        errorCallback = function(e) {
            if (e === FILE_NOT_FOUND_ERROR) {
                // If the directory doesn't exist, create it.
                createDirectory(directoryName, parentDirectoryId, successCallback);
            } else {
                // If it's a different error, log it.
                console.log('Retrieval of directory "' + directoryName + '" failed with error ' + e);
            }
        };
    } else {
        errorCallback = function(e) {
            // Log an error.
            console.log('Retrieval of directory "' + directoryName + '" failed with error ' + e);
        };
    }
    getDriveFileId(query, successCallback, errorCallback);
}

// This function retrieves the Drive file id of the given file, if it exists.  Otherwise, it yields null.
function getFileId(fileEntry, callback) {
    var errorCallback = function(e) {
        // If the file doesn't exist, pass null to the callback.
        if (e === FILE_NOT_FOUND_ERROR) {
            callback(null);
        }
    };

    var query = 'title = "' + fileEntry.name + '" and "' + _syncableAppDirectoryId + '" in parents and trashed = false';
    getDriveFileId(query, callback, errorCallback);
}

//==========
// Identity
//==========

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

//=======================
// chrome.syncFileSystem
//=======================

exports.requestFileSystem = function(callback) {
    var onRequestFileSystemSuccess = function(fileSystem) {
        // Change the name of the file system.  This is a syncable file system!
        fileSystem.name = "syncable";

        // Create or get the subdirectory for this app.
        var getDirectoryFlags = { create: true, exclusive: false };
        var onCreateAppDirectoryOnDriveSuccess = function(directoryEntry) {
            // Set the root of the file system to the app subdirectory.
            fileSystem.root = directoryEntry;

            // Pass on the file system!
            callback(fileSystem);
        };
        var onGetDirectorySuccess = function(directoryEntry) {
            // We have to make some changes to this directory entry to enable syncability.
            // If a file is ever retrieved or created in this directory entry, we want to enable its syncability before passing it to a callback.
            enableSyncabilityForDirectoryEntry(directoryEntry);
            createAppDirectoryOnDrive(directoryEntry, onCreateAppDirectoryOnDriveSuccess);
        };
        var onGetDirectoryFailure = function(e) {
            console.log('Failed to get directory.');
        };

        // TODO(maxw): Make the directory name app-specific.
        fileSystem.root.getDirectory(_appId, getDirectoryFlags, onGetDirectorySuccess, onGetDirectoryFailure);
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


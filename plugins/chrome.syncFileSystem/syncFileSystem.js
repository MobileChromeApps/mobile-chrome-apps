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

// This maps file names to Drive file ids.
// TODO(maxw): Save this map to local storage.
var driveFileIdMap = { };

// This is the next Drive change id to be used to detect remote changes.
// TODO(maxw): Save the highest change id to local storage.
var nextChangeId = 1;

// These listeners are called when a file's status changes.
//REVIEW: Should we check somewhere to ensure that anything in this array is a callable function, so someone cant kill their entire app with an addListener(42);
var fileStatusListeners = [ ];

// The conflict resolution policy is used to determine how to handle file sync conflicts.
var conflictResolutionPolicy;

// This is used to schedule and batch local-to-remote file updates.
var scheduledUpdates = { };

//-----------
// Constants
//-----------

var SYNC_ACTION_ADDED = 'added';
var SYNC_ACTION_DELETED = 'deleted';
var SYNC_ACTION_UPDATED = 'updated';

var FILE_STATUS_CONFLICTING = 'conflicting';
var FILE_STATUS_PENDING = 'pending';
var FILE_STATUS_SYNCED = 'synced';

var SYNC_DIRECTION_LOCAL_TO_REMOTE = 'local_to_remote';
var SYNC_DIRECTION_REMOTE_TO_LOCAL = 'remote_to_local';

/* REVIEW: Unused? */
var CONFLICT_RESOLUTION_POLICY_LAST_WRITE_WIN = 'last_write_win';
var CONFLICT_RESOLUTION_POLICY_MANUAL = 'manual';

// Error codes.
var FILE_NOT_FOUND_ERROR = 1;
var MULTIPLE_FILES_FOUND_ERROR = 2;
var REQUEST_FAILED_ERROR = 3;

//----------------------------------
// FileSystem function augmentation
//----------------------------------

// This function overrides the necessary functions on a given Entry to enable syncability.
function enableSyncabilityForEntry(entry) {
    entry.remove = function(successCallback, errorCallback) {
//REVIEW: Add comment about valid parameters (ie, if no directories, then why not?) What's the actual error condition here?
        if (entry.isDirectory) {
            errorCallback(new FileError(FileError.INVALID_MODIFICATION_ERR));
        }

        var onRemoveSuccess = function() {
            // If a file was removed, fire the file status listener.
            if (entry.isFile) {
                var fileInfo = { fileEntry: entry, status: FILE_STATUS_SYNCED, action: SYNC_ACTION_DELETED, direction: SYNC_DIRECTION_LOCAL_TO_REMOTE };
                for (var i = 0; i < fileStatusListeners.length; i++) {
                    fileStatusListeners[i](fileInfo);
                }
            }

//REVIEW: Should there be a standard idiom here? ie. "successCallback && successCallback();"
            if (successCallback) {
                successCallback();
            }
        };
        var augmentedSuccessCallback = function() {
            scheduleUpdate(entry, SYNC_ACTION_DELETED, onRemoveSuccess);
        };

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        Entry.prototype.remove.call(entry, augmentedSuccessCallback, errorCallback);
    };
}

// This function overrides the necessary functions on a given DirectoryEntry to enable syncability.
function enableSyncabilityForDirectoryEntry(directoryEntry) {
    // First, enable syncability for Entry functions.
    enableSyncabilityForEntry(directoryEntry);

    directoryEntry.getDirectory = function(path, options, successCallback, errorCallback) {
        // This is disabled until efficient syncing is figured out.
        errorCallback(new FileError(FileError.INVALID_MODIFICATION_ERR));

        /*
        // When a directory is retrieved, enable syncability for it, sync it to Drive, and then call the given callback.
        // TODO(maxw): Handle syncing when a directory is dropped into the app directory; as of now, syncing only happens on creation and updating.
        // TODO(maxw): If a directory is intended to be created, it is synced whether it's actually created or it already existed.  Change this to sync only when truly created.
        var augmentedSuccessCallback = function(directoryEntry) {
            enableSyncabilityForDirectoryEntry(directoryEntry);

            // Only sync if the directory is being created and not merely retrieved.
            if (options.create) {
                var onSyncSuccess = function() {
                    if (successCallback) {
                        successCallback(directoryEntry);
                    }
                };
                sync(directoryEntry, onSyncSuccess);
            } else {
                if (successCallback) {
                    successCallback(directoryEntry);
                }
            }
        };

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        DirectoryEntry.prototype.getDirectory.call(directoryEntry, path, options, augmentedSuccessCallback, errorCallback);
        */
    };

    directoryEntry.getFile = function(path, options, successCallback, errorCallback) {
        // When a file is retrieved, enable syncability for it, sync it to Drive, and then call the given callback.
        // TODO(maxw): Handle syncing when a file is dropped into the app directory; as of now, syncing only happens on creation and updating.
        // TODO(maxw): If a file is intended to be created, it is synced whether it's actually created or it already existed.  Change this to sync only when truly created.
        var augmentedSuccessCallback = function(fileEntry) {
            enableSyncabilityForFileEntry(fileEntry);

            // Only sync if the file is being created and not merely retrieved.
            if (options.create) {
                var onSyncSuccess = function() {
                    if (successCallback) {
                        successCallback(fileEntry);
                    }
                };
                scheduleUpdate(fileEntry, SYNC_ACTION_ADDED, onSyncSuccess);
            } else {
                if (successCallback) {
                    successCallback(fileEntry);
                }
            }
        };

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        DirectoryEntry.prototype.getFile.call(directoryEntry, path, options, augmentedSuccessCallback, errorCallback);
    };
}

// This function overrides the necessary functions on a given FileEntry to enable syncability.
// It also uploads the associated file to Drive.
function enableSyncabilityForFileEntry(fileEntry) {
    // First, enable syncability for Entry functions.
    enableSyncabilityForEntry(fileEntry);

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
}

// This function overrides the necessary functions on a given FileWriter to enable syncability.
function enableSyncabilityForFileWriter(fileWriter, fileEntry) {
    fileWriter.write = function(data) {
        // We want to augment the `onwrite` and `onwriteend` listeners to add syncing.
        // TODO(maxw): Augment onwriteend.
//REVIEW: We should probably run scheduleUpdate even if there was no original onwrite handler
//REVIEW2: Even better would be to wrap the fileWriter object in a proxy, and call the user's events at the appropriate times.
        if (fileWriter.onwrite) {
            var originalOnwrite = fileWriter.onwrite;
            fileWriter.onwrite = function(evt) {
                scheduleUpdate(fileEntry, SYNC_ACTION_UPDATED, onSyncSuccess);
                originalOnwrite(evt);
            };
        }

        // Call the original function.  The augmented success callback will take care of the syncability addition work.
        FileWriter.prototype.write.call(fileWriter, data);
    };
}

//------------------
// Syncing to Drive
//------------------

// This function schedules an update to Drive.
function scheduleUpdate(entry, syncAction, callback) {
    console.log('Scheduling ' + entry.name + ' for \'' + syncAction + '\' action.');
    scheduledUpdates[entry.name] = { entry: entry, syncAction: syncAction, callback: callback };
}

// This function executes all scheduled updates to Drive.
// TODO(maxw): Ensure individual update failures are handled properly.
function executeScheduledUpdates(callback) {
    console.log('Executing ' + Object.keys(scheduledUpdates).length + ' scheduled update(s).');
    for (var fileName in scheduledUpdates) {
//REVIEW: Needs hasOwnProperty test, or iterate over Object.keys(scheduledUpdates)
        var scheduledUpdate = scheduledUpdates[fileName];
        var syncAction = scheduledUpdate.syncAction;
        if (syncAction === SYNC_ACTION_ADDED || syncAction === SYNC_ACTION_UPDATED) {
            console.log('Syncing ' + fileName + '.');
            sync(scheduledUpdate.entry, scheduledUpdate.callback);
        } else if (syncAction === SYNC_ACTION_DELETED) {
            console.log('Removing ' + fileName + '.');
            remove(scheduledUpdate.entry, scheduledUpdate.callback);
        } else {
            console.log('Invalid scheduled sync action!');
        }
    }
    scheduledUpdates = { };
    callback();
}

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

// This function syncs an entry to Drive, creating it if necessary.
function sync(entry, callback) {
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Drive, unfortunately, does not allow searching by path.
        // Begin the process of drilling down to find the correct parent directory.  We can start with the app directory.
        var pathRemainder = entry.fullPath;
        var appIdIndex = pathRemainder.indexOf(_appId);

        // If the app id isn't in the path, we can't sync it.
        if (appIdIndex < 0) {
            console.log("Entry cannot be synced because it is not a descendant of the app directory.");
            return;
        }

        // Augment the callback to fire the status listener, but only if we've synced a file, not a directory.
        var augmentedCallback = function(fileAction) {
            if (entry.isFile) {
                var fileInfo = { fileEntry: entry, status: FILE_STATUS_SYNCED, action: fileAction, direction: SYNC_DIRECTION_LOCAL_TO_REMOTE };
                for (var i = 0; i < fileStatusListeners.length; i++) {
                    fileStatusListeners[i](fileInfo);
                }
            }

            callback();
        };

        // Using the remainder of the path, start the recursive process of drilling down.
        pathRemainder = pathRemainder.substring(appIdIndex + _appId.length + 1);
        syncAtPath(entry, _syncableAppDirectoryId, pathRemainder, augmentedCallback);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function syncs an entry to Drive, given its path, creating it if necessary.
function syncAtPath(entry, currentDirectoryId, pathRemainder, callback) {
    var slashIndex = pathRemainder.indexOf('/');

    if (slashIndex < 0) {
        // We're done diving and can sync the entry.
        if (entry.isFile) {
            uploadFile(entry, currentDirectoryId /* parentDirectoryId */, callback);
        } else if (entry.isDirectory) {
            var nextDirectoryName = pathRemainder;
            var onGetDirectoryIdSuccess = function(directoryId) {
                callback();
            };
            getDirectoryId(nextDirectoryName, currentDirectoryId, true /* shouldCreateDirectory */, onGetDirectoryIdSuccess);
        } else {
            // Something's wrong!
            console.log('Attempted to sync entry that is neither a file nor a directory.');
        }
    } else {
        var nextDirectoryName = pathRemainder.substring(0, slashIndex);
        var onGetDirectoryIdSuccess = function(directoryId) {
            syncAtPath(entry, directoryId, pathRemainder.substring(slashIndex + 1), callback);
        };
        getDirectoryId(nextDirectoryName, currentDirectoryId, false /* shouldCreateDirectory */, onGetDirectoryIdSuccess);
    }
}

// This function uploads a file to Drive.
// TODO(maxw): Implement exponential backoff on 503 (and perhaps other?) responses.
function uploadFile(fileEntry, parentDirectoryId, callback) {
    var onGetFileIdSuccess = function(fileId) {
        var onFileSuccess = function(file) {
            // Read the file and send its contents.
            var fileReader = new FileReader();
//REVIEW: onloadend fires on success or failure; onload might be more appropriate
            fileReader.onloadend = function(evt) {
                // This is used to note whether a file was created or updated.
                var fileAction;

                // Create the data to send.
                var metadata = { title: fileEntry.name,
                                 parents: [{ id: parentDirectoryId }] };
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
                            callback(fileAction);
                        } else {
                            console.log('File failed to sync with status ' + xhr.status + '.');
                        }
                    }
                };

                // If there's a file id, update the file.  Otherwise, upload it anew.
                if (fileId) {
                    fileAction = SYNC_ACTION_UPDATED;
//REVIEW: Why hard-code the async default 'true' here?
                    xhr.open('PUT', 'https://www.googleapis.com/upload/drive/v2/files/' + fileId + '?uploadType=multipart', true);
                } else {
                    fileAction = SYNC_ACTION_ADDED;
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
        getFileId(fileEntry.name, parentDirectoryId, onGetFileIdSuccess);
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function removes a file or directory from Drive.
function remove(entry, callback) {
    var onGetIdSuccess = function(fileId) {
        // Delete the entry.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 204) {
                    console.log('File removed!');
                    callback();
                } else {
                    console.log('Failed to remove entry with status ' + xhr.status + '.');
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
        var appIdIndex = entry.fullPath.indexOf(_appId);

        // If the app id isn't in the path, we can't remove it.
        if (appIdIndex < 0) {
            console.log("Entry cannot be removed because it is not a descendant of the app directory.");
            return;
        }

        var relativePath = entry.fullPath.substring(appIdIndex + _appId.length + 1);
        if (entry.isFile) {
            getFileId(relativePath, _syncableAppDirectoryId, onGetIdSuccess);
        } else {
            getDirectoryId(relativePath, _syncableAppDirectoryId, false /* shouldCreateDirectory */, onGetIdSuccess);
        }
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

//--------------------
// Syncing from Drive
//--------------------

// This function checks for changes since the most recent change id.
function getDriveChanges(successCallback, errorCallback) {
    var onGetTokenStringSuccess = function(tokenString) {
        // Save the token string for later use.
        _tokenString = tokenString;

        // Send a request to retrieve the changes.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
//REVIEW: For robustness, there should probably be a lot more error checking here.
// JSON.parse could fail
// items, largestChangeId (int or string?) may not be present
// Is there a "successful request" key?
                    var responseJson = JSON.parse(xhr.responseText);
                    var numChanges = responseJson.items.length;
                    console.log('Successfully retrieved ' + numChanges + ' changes.');

                    // Record the new change id, incrementing it to avoid retrieving a duplicate change later.
//REVIEW: minor nit, but I always look for an explicit base in parseInt
                    nextChangeId = parseInt(responseJson.largestChangeId) + 1;

                    // Track the number of relevant changes, to be sent to the callback.
                    var numRelevantChanges = 0;

                    // For each change received, check whether it's on a file in the syncable app folder.  If so, download it.
                    // TODO(maxw): Include deletions.
                    for (var i = 0; i < numChanges; i++) {
                        var change = responseJson.items[i];
                        var changedFile = change.file;
                        var numParents = changedFile.parents.length;
                        for (var j = 0; j < numParents; j++) {
                            if (changedFile.parents[j].id === _syncableAppDirectoryId) {
                                console.log('Downloading ' + changedFile.title + '.');
                                numRelevantChanges++;
                                var onDownloadFileSuccess = function(fileEntry) {
                                    // TODO(maxw): Determine if the synced file has just been created.
                                    var syncAction = change.deleted ? SYNC_ACTION_DELETED : SYNC_ACTION_UPDATED;
                                    var fileInfo = { fileEntry: fileEntry, status: FILE_STATUS_SYNCED, action: syncAction, direction: SYNC_DIRECTION_REMOTE_TO_LOCAL };
                                    for (var i = 0; i < fileStatusListeners.length; i++) {
                                        fileStatusListeners[i](fileInfo);
                                    }
                                };
                                downloadFile(changedFile, onDownloadFileSuccess);
                            }
                        }
                    }
                    successCallback(numRelevantChanges);
                } else {
                    console.log('Change search failed with status ' + xhr.status + '.');
                    errorCallback();
                }
            }
        };

        // TODO(maxw): Use `nextLink` to get multiple pages of change results.
        xhr.open('GET', 'https://www.googleapis.com/drive/v2/changes?startChangeId=' + nextChangeId + '&includeDeleted=false&includeSubscribed=true&maxResults=1000', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + _tokenString);
        xhr.send();
    };

    getTokenString(onGetTokenStringSuccess);
}

// This function downloads the given Drive file.
function downloadFile(file, callback) {
    // Send a request to retrieve the changes.
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var onSaveDataSuccess = function(fileEntry) {
                    console.log('Download of ' + file.title + ' complete!');
                    callback(fileEntry);
                }
                saveData(file.title, xhr.responseText, onSaveDataSuccess);
            } else {
                console.log('Download failed with status ' + xhr.status + '.');
            }
        }
    };

    xhr.open('GET', file.downloadUrl, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + _tokenString);
    xhr.send();
}

function saveData(fileName, data, callback) {
    var onGetFileSuccess = function(fileEntry) {
        var onCreateWriterSuccess = function(fileWriter) {
            fileWriter.write(data);
            callback(fileEntry);
        };
        var onCreateWriterError = function(e) {
            console.log('Failed to create writer.');
        };
        fileEntry.createWriter(onCreateWriterSuccess, onCreateWriterError);
    };
    var onGetFileError = function(e) {
        console.log('Failed to get file.');
    };

    var onGetDirectorySuccess = function(directoryEntry) {
        var getFileFlags = { create: true, exclusive: false };
        directoryEntry.getFile(fileName, getFileFlags, onGetFileSuccess, onGetFileError);
    };
    var onGetDirectoryError = function(e) {
        console.log('Failed to get directory.');
    };

    var onRequestFileSystemSuccess = function(fileSystem) {
        // TODO(maxw): Make the directory name app-specific.
        var getDirectoryFlags = { create: false };
        fileSystem.root.getDirectory(_appId, getDirectoryFlags, onGetDirectorySuccess, onGetDirectoryError);
    };
    var onRequestFileSystemFailure = function(e) {
        console.log("Failed to get file system.");
    };

    // Request the file system.
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onRequestFileSystemSuccess, onRequestFileSystemFailure);
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
//REVIEW: These arguments are annotated every time this function is called. Should they be in an options object instead?
function getDirectoryId(directoryName, parentDirectoryId, shouldCreateDirectory, successCallback) {
    if (driveFileIdMap[directoryName]) {
        console.log('Drive file id for directory ' + directoryName + ' retrieved from cache.');
        successCallback(driveFileIdMap[directoryName]);
        return;
    }

    var query = 'mimeType = "application/vnd.google-apps.folder" and title = "' + directoryName + '" and trashed = false';
    if (parentDirectoryId) {
        query += ' and "' + parentDirectoryId + '" in parents';
    }
    var errorCallback;

    var augmentedSuccessCallback = function(fileId) {
        // Cache the file id, then pass it on to the callback.
        driveFileIdMap[directoryName] = fileId;
        console.log('Drive file id for directory ' + directoryName + ' saved to cache.');
        successCallback(fileId);
    };

    // Create the error callback based on whether we should create a directory if it doesn't exist.
    if (shouldCreateDirectory) {
        errorCallback = function(e) {
            if (e === FILE_NOT_FOUND_ERROR) {
                // If the directory doesn't exist, create it.
                createDirectory(directoryName, parentDirectoryId, augmentedSuccessCallback);
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
    getDriveFileId(query, augmentedSuccessCallback, errorCallback);
}

// This function retrieves the Drive file id of the given file, if it exists.  Otherwise, it yields null.
function getFileId(fileName, parentDirectoryId, successCallback) {
    if (driveFileIdMap[fileName]) {
        console.log('Drive file id for file ' + fileName + ' retrieved from cache.');
        successCallback(driveFileIdMap[fileName]);
        return;
    }

    // In order to support paths, we need to call this recursively.
    var slashIndex = fileName.indexOf('/');
    if (slashIndex < 0) {
        var query = 'title = "' + fileName + '" and "' + parentDirectoryId + '" in parents and trashed = false';
        var augmentedSuccessCallback = function(fileId) {
            // Cache the file id, then pass it on to the callback.
            driveFileIdMap[fileName] = fileId;
            console.log('Drive file id for file ' + fileName + ' saved to cache.');
            successCallback(fileId);
        };
        var errorCallback = function(e) {
            if (e === FILE_NOT_FOUND_ERROR) {
                successCallback(null);
            } else {
                // If it's a different error, log it.
                console.log('Retrieval of file "' + fileName + '" failed with error ' + e);
            }
        };
        getDriveFileId(query, augmentedSuccessCallback, errorCallback);
    } else {
        var nextDirectory = fileName.substring(0, slashIndex);
        var pathRemainder = fileName.substring(slashIndex + 1);
        var query = 'mimeType = "application/vnd.google-apps.folder" and title = "' + nextDirectory + '" and "' + parentDirectoryId + '" in parents and trashed = false';
        var onGetDriveFileIdSuccess = function(fileId) {
            getFileId(pathRemainder, fileId, successCallback);
        };
        var onGetDriveFileIdError = function(e) {
            console.log('Retrieval of directory "' + nextDirectory + '" failed with error ' + e);
        };
        getDriveFileId(query, onGetDriveFileIdSuccess, onGetDriveFileIdError);
    }
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
//REVIEW: Save _tokenString here, rather than in every callback function
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

        // Set the default conflict resolution policy.
        conflictResolutionPolicy = CONFLICT_RESOLUTION_POLICY_LAST_WRITE_WIN;

        // Create or get the subdirectory for this app.
        var getDirectoryFlags = { create: true, exclusive: false };
        var onCreateAppDirectoryOnDriveSuccess = function(directoryEntry) {
            // Set the root of the file system to the app subdirectory.
            fileSystem.root = directoryEntry;

            // Set up regular remote-to-local checks.
//REVIEW: Should these: 2000, 64000, 20000, etc be constants somewhere? Do they come from an API spec somewhere, or are they just heuristically set?
            var remoteToLocalDelay = 2000;
            var onGetDriveChangesError = function() {
                // Use the same timeout.
                window.setTimeout(getDriveChanges, remoteToLocalDelay, onGetDriveChangesSuccess, onGetDriveChangesError);
            };
            var onGetDriveChangesSuccess = function(numChanges) {
                console.log('Relevant changes: ' + numChanges + '.');
                if (numChanges === 0) {
                    if (remoteToLocalDelay < 64000) {
                        remoteToLocalDelay *= 2;
                        console.log('  Delay doubled.');
                    } else {
                        console.log('  Delay capped at ' + remoteToLocalDelay + 'ms.');
                    }
                } else {
                    remoteToLocalDelay = 2000;
                    console.log('  Delay reset.');
                }
                window.setTimeout(getDriveChanges, remoteToLocalDelay, onGetDriveChangesSuccess, onGetDriveChangesError);
            };
            window.setTimeout(getDriveChanges, remoteToLocalDelay, onGetDriveChangesSuccess, onGetDriveChangesError);

            // Set up regular local-to-remote checks.
            var localToRemoteDelay = 20000;
            var executeScheduledUpdatesCallback = function() {
                window.setTimeout(executeScheduledUpdates, localToRemoteDelay, executeScheduledUpdatesCallback);
            };
            window.setTimeout(executeScheduledUpdates, localToRemoteDelay, executeScheduledUpdatesCallback);

            // Pass on the file system!
            callback(fileSystem);
        };
        var onGetDirectorySuccess = function(directoryEntry) {
            // We have to make some changes to this directory entry to enable syncability.
            // If a file is ever retrieved or created in this directory entry, we want to enable its syncability before passing it to a callback.
            enableSyncabilityForDirectoryEntry(directoryEntry);
            createAppDirectoryOnDrive(directoryEntry, onCreateAppDirectoryOnDriveSuccess);
        };
//REVIEW: I think we should be setting chrome.runtime.lastError here to signal that something bad happened. Check with sync team?
        var onGetDirectoryFailure = function(e) {
            console.log('Failed to get directory.');
        };

        // TODO(maxw): Make the directory name app-specific.
        fileSystem.root.getDirectory(_appId, getDirectoryFlags, onGetDirectorySuccess, onGetDirectoryFailure);
    };
//REVIEW: I think we should be setting chrome.runtime.lastError here to signal that something bad happened.
    var onRequestFileSystemFailure = function(e) {
        console.log("Failed to get file system.");
    };

    // Request the file system.
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onRequestFileSystemSuccess, onRequestFileSystemFailure);
};

exports.setConflictResolutionPolicy = function(policy, callback) {
    conflictResolutionPolicy = policy;
    callback();
};

exports.getConflictResolutionPolicy = function(callback) {
    callback(conflictResolutionPolicy);
};

//REVIEW: Should we at least log something in case these are actually called?
exports.getUsageAndQuota = function(fileSystem, callback) {
    // TODO(maxw): Implement this!
};

exports.getFileStatus = function(fileEntry, callback) {
    // TODO(maxw): Implement this!
};

exports.getFileStatuses = function(fileEntries, callback) {
    // TODO(maxw): Implement this!
};

exports.onServiceStatusChanged = { };
exports.onServiceStatusChanged.addListener = function(listener) {
    // TODO(maxw): Implement this!
}

exports.onFileStatusChanged = { };
exports.onFileStatusChanged.addListener = function(listener) {
    fileStatusListeners.push(listener);
}

/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');
var DirectoryEntry = require('cordova/plugin/DirectoryEntry')

var DirectoryFinder = { };

// File system categories.
DirectoryFinder.Category = {
    APP : 0,
    DATA : 1,
    DOCUMENTS : 2
};

// File system persistence options.
DirectoryFinder.Persistence = {
    CACHE : 0,
    DEVICE_PERSISTENT : 1,
    PERSISTENT : 2,
    TEMPORARY : 3
};

/**
 * Supplies a DirectoryEntry that matches the given constraints to the given callback.
 */
DirectoryFinder.getDirectoryForPurpose = function(writable, sandboxed, category, persistence, successCallback, failureCallback) {
    var augmentedSuccessCallback = function(entryDictionary) {
        var directoryEntry = new DirectoryEntry(entryDictionary.name, entryDictionary.fullPath);
        successCallback(directoryEntry);
    };

    var options = [ writable, sandboxed, category, persistence ];
    exec(augmentedSuccessCallback, failureCallback, "DirectoryFinder", "getDirectoryForPurpose", options);
};

module.exports = DirectoryFinder;

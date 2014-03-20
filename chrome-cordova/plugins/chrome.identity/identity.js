// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec');
var callbackWithError = require('org.chromium.common.errors').callbackWithError;
try {
    var runtime = require('org.chromium.runtime.runtime');
} catch(e) {}

// Listeners

var accountAddedListeners = [];
var accountRemovedListeners = [];
var signInChangedListeners = [];

// Functions

exports.getAccounts = function(callback) {
    // TODO(maxw): Implement this.
};

exports.signIn = function(accounts) {
    // TODO(maxw): Implement this.
};

exports.getAccountAndAuthToken = function(callback) {
    var successCallback = function(tokenData) {
        callback(tokenData.account, tokenData.token);
    };

    var errorCallback = function(message) {
        // TODO(maxw): If the message says Google Play Services is unavailable, fall back to web auth.
        callbackWithError(message, callback);
    };

    // Fetch the OAuth details from the manifest.
    var oAuthDetails = runtime && runtime.getManifest().oauth2;

    // Call the native code.
    var args = [oAuthDetails];
    exec(successCallback, errorCallback, 'ChromeIdentity', 'getAccountAndAuthToken', args);
};

exports.getAuthToken = function(details, callback) {
    // TODO(maxw): Implement this.
};

// Events

exports.onAccountAdded = { };
exports.onAccountAdded.addListener = function(listener) {
    if (typeof(listener) === 'function') {
        accountAddedListeners.push(listener);
    } else {
        console.log('Attempted to add a non-function listener.');
    }
}

exports.onAccountRemoved = { };
exports.onAccountRemoved.addListener = function(listener) {
    if (typeof(listener) === 'function') {
        accountRemovedListeners.push(listener);
    } else {
        console.log('Attempted to add a non-function listener.');
    }
}

exports.onSignInChanged = { };
exports.onSignInChanged.addListener = function(listener) {
    if (typeof(listener) === 'function') {
        signInChangedListeners.push(listener);
    } else {
        console.log('Attempted to add a non-function listener.');
    }
}


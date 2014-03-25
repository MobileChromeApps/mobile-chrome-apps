// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec');
var callbackWithError = require('org.chromium.common.errors').callbackWithError;
var Event = require('org.chromium.common.events');
try {
    var runtime = require('org.chromium.runtime.runtime');
} catch(e) {}

// Listeners

var accountAddedListeners = [];
var accountRemovedListeners = [];
var signInChangedListeners = [];

// Cached Data

// We keep a map for multi-login apps.  However, we also need to keep a standalone cached token for use with single-login apps.
var cachedTokenMap = { };
var cachedToken;

// Functions

exports.getAccounts = function(callback) {
    // TODO(maxw): Implement this.
};

exports.signIn = function(accounts) {
    // TODO(maxw): Implement this.
};

exports.getAccountAndAuthToken = function(callback) {
    var successCallback = function(tokenData) {
        // Cache the token.
        cachedTokenMap[tokenData.account] = tokenData.token;
        cachedToken = tokenData.token;

        // Call the given callback.
        callback(tokenData.account, tokenData.token);
    };

    var errorCallback = function(message) {
        // TODO(maxw): If the message says Google Play Services is unavailable, fall back to web auth.
        callbackWithError(message, callback);
    };

    // Fetch the OAuth details from the manifest.
    var oAuthDetails = runtime && runtime.getManifest().oauth2;

    // Call the native code.
    // When this function is called, interactive is not specified, but we always act as though it's true.
    var args = [oAuthDetails, true];
    exec(successCallback, errorCallback, 'ChromeIdentity', 'getAccountAndAuthToken', args);
};

exports.getAuthToken = function(details, callback) {
    // If an account is specified, check the cached token map.
    // Otherwise, check the standalone cached token.
    var accountEmail;
    if (details.account && details.account.email) {
        accountEmail = details.account.email;
        if (cachedTokenMap[accountEmail]) {
            callback(cachedTokenMap[accountEmail]);
            return;
        }
    } else {
        if (cachedToken) {
            callback(cachedToken);
            return;
        }
    }

    var successCallback = function(tokenData) {
        // Cache the token.
        if (accountEmail) {
            cachedTokenMap[accountEmail] = tokenData.token;
        }
        cachedToken = tokenData.token;

        // Call the given callback.
        callback(tokenData.token);
    };

    var errorCallback = function(message) {
        // TODO(maxw): If the message says Google Play Services is unavailable, fall back to web auth.
        callbackWithError(message, callback);
    };

    // Fetch the OAuth details from the manifest.
    var oAuthDetails = runtime && runtime.getManifest().oauth2;

    // Call the native code.
    var args = [oAuthDetails, !!details.interactive];
    if (details.account && details.account.email) {
        args.push(details.account.email);
    }
    exec(successCallback, errorCallback, 'ChromeIdentity', 'getAuthToken', args);
};

// Events

exports.onAccountAdded = new Event('onAccountAdded');
exports.onAccountRemoved = new Event('onAccountRemoved');
exports.onAccountSignInChanged = new Event('onAccountSignInChanged');


// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
    // TODO(maxw): Implement this.
};

exports.getAuthToken = function(details, callback) {
    // TODO(maxw): Implement this.
}

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


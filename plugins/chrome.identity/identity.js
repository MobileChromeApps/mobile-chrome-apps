// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec');
var platformId = require('cordova/platform').id;
var callbackWithError = require('org.chromium.common.errors').callbackWithError;
try {
    var runtime = require('org.chromium.runtime.runtime');
} catch(e) {}

// TODO(maxw): Automatically handle expiration.
// TODO(maxw): Can multiple tokens be cached?
var cachedToken;

exports.getAuthToken = function(details, callback) {
    if (typeof details === 'function' && typeof callback === 'undefined') {
        callback = details;
        details = { interactive: false, useNativeAuth: true };
    }
    if (typeof callback !== 'function') {
        return callbackWithError('Callback function required');
    }
    if (typeof details !== 'object') {
        return callbackWithError('TokenDetails object required', callback);
    }
    var fail = function(msg) {
        callbackWithError(msg, callback);
    };

    // Use native auth by default.
    if (!details.useNativeAuth) {
        details.useNativeAuth = 'true';
    }

    // If we have a cached token, send it along.
    if (cachedToken) {
        callback(cachedToken);
        return;
    }

    // Augment the callback so that it caches a received token.
    var augmentedCallback = function(token) {
        if (token) {
            cachedToken = token;
        }
        callback(token);
    };

    if (platformId !== 'android' || details.useNativeAuth === 'false') {
        // Use web app oauth flow
        getAuthTokenJS(augmentedCallback, fail, details);
    } else {
        // If we are not using chrome.runtime, check for oauth2 args in the details map
        var oauthDetails = details.oauth2 || runtime && runtime.getManifest().oauth2;

        // Use native implementation for logging into google accounts
        exec(augmentedCallback, fail, 'ChromeIdentity', 'getAuthToken', [!!details.interactive, oauthDetails]);
    }
};

exports.removeCachedAuthToken = function(details, callback) {
    // Use native auth by default.
    if (!details.useNativeAuth) {
        details.useNativeAuth = 'true';
    }

    // First, remove the cached token locally.
    if (details && details.token === cachedToken) {
        cachedToken = null;
    }

    // If we're using native authentication, invalidate the token natively.  Otherwise, just call the callback.
    if (platformId === 'android' && details.useNativeAuth === 'true') {
        // Use native implementation for invalidating tokens
        exec(callback, null, 'ChromeIdentity', 'removeCachedAuthToken', [details]);
    } else {
        callback();
    }
}

exports.launchWebAuthFlow = function(details, callback) {
    if (typeof callback !== 'function') {
        return callbackWithError('Callback function required');
    }
    if (typeof details !== 'object') {
        return callbackWithError('WebAuthFlowDetails object required', callback);
    }

    launchInAppBrowser(details.url, details.interactive, callback);
};

function getAuthTokenJS(win, fail, details) {
    // If we are not using chrome.runtime, check for oauth2 args in the details map
    var manifestJson = (runtime) ? runtime.getManifest() : details;

    if (typeof manifestJson === 'undefined')
        return callbackWithError('manifest.json is not defined', fail);
    if (typeof manifestJson.oauth2 === 'undefined')
        return callbackWithError('oauth2 missing from manifest.json', fail);
    if (typeof manifestJson.oauth2.client_id === 'undefined')
        return callbackWithError('client_id missing from manifest.json', fail);
    if (typeof manifestJson.oauth2.scopes === 'undefined')
        return callbackWithError('scopes missing from manifest.json', fail);

    var authURLBase = 'https://accounts.google.com/o/oauth2/auth?response_type=token';
    var redirect_uri = 'http://www.google.com';
    var client_id = manifestJson.oauth2.client_id;
    var scope = manifestJson.oauth2.scopes;
    var finalURL = authURLBase + '&redirect_uri=' + encodeURIComponent(redirect_uri) + '&client_id=' + encodeURIComponent(client_id) + '&scope=' + encodeURIComponent(scope.join(' '));

    launchInAppBrowser(finalURL, details.interactive, function(newLoc) {
        var token = getAllParametersFromUrl(newLoc, '#')['access_token'];
        if (typeof token === 'undefined') {
            return callbackWithError('The redirect uri did not have the access token', fail);
        }
        win(token);
    });
}

function getAllParametersFromUrl(url, startString, endString) {
    if (typeof url !== 'undefined' && typeof startString !== 'undefined')
        url = url.split(startString)[1];
    if (typeof url !== 'undefined' && typeof endString !== 'undefined')
        url = url.split(endString)[0];
    if (typeof url === 'undefined')
        return {};

    var retObj = {};
    url.split('&').forEach(function(arg) {
        var pair = arg.split('=');
        retObj[pair[0]] = decodeURIComponent(pair[1]);
    });
    return retObj;
}

function launchInAppBrowser(authURL, interactive, callback) {
    // TODO: see what the termination conditions are for desktop's implementation.
    var oAuthBrowser = window.open(authURL, '_blank', 'hidden=yes');
    var success = false;
    var timeoutid;
    oAuthBrowser.addEventListener('loadstart', function(event) {
        if (success)
            return;
        if (timeoutid)
            timeoutid = clearTimeout(timeoutid);
        var newLoc = event.url;
        var paramsAfterQuestion = getAllParametersFromUrl(newLoc, "?", "#");
        var paramsAfterPound = getAllParametersFromUrl(newLoc, "#");
        var keys = Object.keys(paramsAfterQuestion).concat(Object.keys(paramsAfterPound));

        ['access_token', 'oauth_verifier', 'token'].forEach(function(breakKey) {
            if (keys.indexOf(breakKey) != -1) {
                success = true;
            }
        });

        if (success) {
            oAuthBrowser.close();
            callback(newLoc);
        }
    });
    oAuthBrowser.addEventListener('loadstop', function(event) {
        timeoutid = setTimeout(function() { // some sites use js redirects :(
            if (success)
                return;
            if (interactive)
                oAuthBrowser.show();
            else
                oAuthBrowser.close();
        }, 250);
    });
    oAuthBrowser.addEventListener('loaderror', function(event) {
        timeoutid = setTimeout(function() { // some sites use js redirects :(
            if (success)
                return;
            if (interactive)
                oAuthBrowser.show();
            else
                oAuthBrowser.close();
        }, 250);
    });
    oAuthBrowser.addEventListener('exit', function(event) {
        if (success)
            return;
        callback();
    });
}

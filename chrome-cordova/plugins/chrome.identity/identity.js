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
var cachedToken;

// This constant is used as an error message when Google Play Services is unavailable during an attempt to get an auth token natively.
var GOOGLE_PLAY_SERVICES_UNAVAILABLE = -1;

exports.getAuthToken = function(details, callback) {
    if (typeof details === 'function' && typeof callback === 'undefined') {
        callback = details;
        details = { interactive: false };
    }
    if (typeof callback !== 'function') {
        return callbackWithError('Callback function required');
    }
    if (typeof details !== 'object') {
        return callbackWithError('TokenDetails object required', callback);
    }

    // If we have a cached token, send it along.
    if (cachedToken) {
        callback(cachedToken);
        return;
    }

    // Fetch the OAuth details from either the passed-in `details` object or the manifest.
    var oAuthDetails = details.oauth2 || runtime && runtime.getManifest().oauth2;

    // Augment the callback so that it caches a received token.
    var augmentedCallback = function(token) {
        if (token) {
            cachedToken = token;
        }
        callback(token);
    };

    // This function extracts a token from a given URL and returns it.
    var extractToken = function(url) {
        // This function is only used when using web authentication as a fallback from native Google authentication.
        // As a result, it's okay to search for "access_token", since that's what Google puts in the resulting URL.
        // The regular expression looks for "access_token=", followed by a lazy capturing of some string (the token).
        // This lazy capturing ends when either an ampersand (followed by more stuff) is reached or the end of the string is reached.
        var match = /\baccess_token=(.+?)(?:&.*)?$/.exec(url);
        return match && match[1];
    };

    // If we failed because Google Play Services is unavailable, revert to the web auth flow.
    // Otherwise, just fail.
    var fail = function(msg) {
        if (msg === GOOGLE_PLAY_SERVICES_UNAVAILABLE) {
            console.warn('Google Play Services is unavailable; falling back to web authentication flow.');

            // Verify that oAuthDetails contains a client_id and scopes.
            if (!oAuthDetails.client_id) {
                callbackWithError('Client id missing from manifest.', callback);
                return;
            }
            if (!oAuthDetails.scopes) {
                callbackWithError('Scopes missing from manifest.', callback);
                return;
            }

            // Add the appropriate URL to the `details` object.
            var clientId = oAuthDetails.client_id;
            var scopes = encodeURIComponent(oAuthDetails.scopes.join(' '));
            details.url = 'https://accounts.google.com/o/oauth2/auth?client_id=' + clientId + '&redirect_uri=' + chrome.identity.getRedirectURL() + '&response_type=token&scope=' + scopes;

            // The callback needs to extract the access token from the returned URL and pass that on to the original callback.
            var launchWebAuthFlowCallback = function(responseUrl) {
                var token = extractToken(responseUrl);

                // If we weren't able to extract a token, error out.  Otherwise, call the callback.
                if (!token) {
                    callbackWithError('URL did not contain a token.', callback);
                    return;
                }
                augmentedCallback(token);
            };

            // Launch the web auth flow!
            exports.launchWebAuthFlow(details, launchWebAuthFlowCallback);
        } else {
            callbackWithError(msg, callback);
        }
    };

    // Use the native implementation for logging into Google accounts.
    exec(augmentedCallback, fail, 'ChromeIdentity', 'getAuthToken', [!!details.interactive, oAuthDetails]);
};

exports.removeCachedAuthToken = function(details, callback) {
    // Remove the cached token locally.
    if (details && details.token === cachedToken) {
        cachedToken = null;
    }

    // Invalidate the token natively.
    exec(callback, null, 'ChromeIdentity', 'removeCachedAuthToken', [details.token]);
}

exports.revokeAuthToken = function(details, callback) {
    // If a token has been passed, revoke it and remove it from the cache.
    // If not, call the callback with an error.
    if (details && details.token) {
        // Revoke the token!
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' + details.token);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status < 200 || xhr.status > 300) {
                    console.log('Could not revoke token; status ' + xhr.status + '.');
                } else {
                    exports.removeCachedAuthToken({ token: details.token }, callback);
                }
            }
        }
        xhr.send(null);
    } else {
        return callbackWithError('No token to revoke.', callback);
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

exports.getRedirectURL = function(path) {
    return 'https://' + chrome.runtime.id + '.chromiumapp.org/' + (path ? path : '');
};

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
    var oAuthBrowser = window.open(authURL, '_blank', 'hidden=yes');
    var success = false;
    var timeoutid;
    oAuthBrowser.addEventListener('loadstart', function(event) {
        if (success)
            return;
        if (timeoutid)
            timeoutid = clearTimeout(timeoutid);
        var newLoc = event.url;

        // When the location address starts with our redirect URL, we're done.
        if (newLoc.indexOf(exports.getRedirectURL()) == 0) {
            success = true;
        }

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


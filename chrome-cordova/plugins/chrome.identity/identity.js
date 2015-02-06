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
var cachedWebToken;
var cachedWebTokenExpiryTime;
var cachedWebTokenScopes;

var GOOGLE_PLAY_SERVICES_UNAVAILABLE = -1;
var ERROR_MESSAGES = {
    '-1': 'Google Play Services is unavailable on this device.',
    '-2': 'The request requires options.interactive=true.',
    '-3': 'The network error has occurred.',
    '-4': 'The user canceled the request.',
    '-5': 'There is already an outstanding identity request.'
};

// We use this constant to note when we don't know which account the token belongs to.  This happens when using the web auth flow.
var UNKNOWN_ACCOUNT = "Unknown account";

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

    // Fetch the OAuth details from either the passed-in `details` object or the manifest.
    var oAuthDetails = details.oauth2 || runtime && runtime.getManifest().oauth2;
    var scopes = details.scopes || oAuthDetails.scopes;

    function win(tokenData) {
        callback(tokenData.token, tokenData.account);
    }

    // If we failed because Google Play Services is unavailable, revert to the web auth flow.
    // On iOS, the Google+ Auth library takes care of web-flow fallback, so our In-App-Browser
    // fallback doens't apply for iOS.
    function fail(errorCode) {
        if (errorCode === GOOGLE_PLAY_SERVICES_UNAVAILABLE) {
            console.warn('Google Play Services is unavailable; falling back to web authentication flow.');
            getAuthTokenViaWeb(details, callback, oAuthDetails, scopes);
        } else {
            // toString for compatibility with older callbackWithError.
            var errObj = {message:ERROR_MESSAGES[errorCode], code: errorCode, toString:function() {return this.message;}};
            callbackWithError(errObj, callback);
        }
    }

    // Use the native implementation for logging into Google accounts.
    exec(win, fail, 'ChromeIdentity', 'getAuthToken', [!!details.interactive, oAuthDetails.client_id, scopes, details.accountHint]);
};

function getAuthTokenViaWeb(details, callback, oAuthDetails, scopes) {
    // If we have a cached token, send it along.
    if (cachedWebToken) {
        var currentTime = Date.now();
        // TODO: We should allow a subset of scopes to be fine.
        var scopesAreSame = scopes.concat().sort().join() == cachedWebTokenScopes.join();
        if (scopesAreSame && currentTime < cachedWebTokenExpiryTime) {
            // Our cached auth token hasn't expired yet, so use it.
            callback(cachedWebToken);
            return;
        } else {
            cachedWebToken = null;
        }
    }

    // Verify that oAuthDetails contains a client_id and scopes.
    // Since we're using the web auth flow as a fallback, we need the web client id.
    var manifest = runtime.getManifest();
    var webClientId = (details.oauth2 && details.oauth2.client_id) || manifest && ((manifest.web && manifest.web.oauth2 && manifest.web.oauth2.client_id) || (oAuthDetails.client_id));
    if (!webClientId) {
        callbackWithError('web.oauth2.client_id missing from mobile manifest.', callback);
        return;
    }
    if (!scopes) {
        callbackWithError('Scopes missing from manifest and not passed via details object.', callback);
        return;
    }

    // Add the appropriate URL to the `details` object.
    var scopesEncoded = encodeURIComponent(scopes.join(' '));
    // TODO: We should be asking for a refresh token instead so that we do not
    // need to re-prompt once the token expires.
    details.url = 'https://accounts.google.com/o/oauth2/auth?client_id=' + webClientId + '&redirect_uri=' + chrome.identity.getRedirectURL() + '&response_type=token&scope=' + scopesEncoded;

    function extractToken(url) {
        // This function is only used when using web authentication as a fallback from native Google authentication.
        // As a result, it's okay to search for "access_token", since that's what Google puts in the resulting URL.
        // The regular expression looks for "access_token=", followed by a lazy capturing of some string (the token).
        // This lazy capturing ends when either an ampersand (followed by more stuff) is reached or the end of the string is reached.
        var match = /\baccess_token=(.+?)(?:&.*)?$/.exec(url);
        return match && match[1];
    }
    function launchWebAuthFlowCallback(responseUrl) {
        // This function extracts a token from a given URL and returns it.
        var token = extractToken(responseUrl);

        // If we weren't able to extract a token, error out.
        if (!token) {
            callbackWithError('URL did not contain a token.', callback);
            return;
        }
        cachedWebToken = token;
        cachedWebTokenScopes = scopes.concat().sort();
        cachedWebTokenExpiryTime = Date.now() + (60 * 60 * 1000);
        callback(token);
    }

    // Launch the web auth flow!
    exports.launchWebAuthFlow(details, launchWebAuthFlowCallback);
}

exports.removeCachedAuthToken = function(details, callback) {
    // Remove the cached token locally.
    if (details && details.token === cachedWebToken) {
        cachedWebToken = null;
    }

    // Invalidate the token natively.
    exec(callback, null, 'ChromeIdentity', 'removeCachedAuthToken', [details.token]);
};

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
                    callbackWithError('Failed to revoke token. Got HTTP response ' + xhr.status, callback);
                } else {
                    exports.removeCachedAuthToken({ token: details.token }, callback);
                }
            }
        };
        // TODO: Add a timeout.
        xhr.send(null);
    } else {
        return callbackWithError('No token to revoke.', callback);
    }
};

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

exports.getProfileUserInfo = function(callback) {
    if (typeof callback !== 'function') {
        return callbackWithError('Callback function required');
    }

    // TODO: Implement.
    callback(/* email */ '', /* id */ '');
};

exports.getAccounts = function(callback) {
    exec(callback, null, 'ChromeIdentity', 'getAccounts', []);
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
    var openInAppBrowser = require('org.apache.cordova.inappbrowser.inappbrowser');
    var oAuthBrowser = openInAppBrowser(authURL, '_blank', 'hidden=yes');
    var success = false;
    var timeoutid;
    oAuthBrowser.addEventListener('loadstart', function(event) {
        if (success)
            return;
        if (timeoutid)
            timeoutid = clearTimeout(timeoutid);
        var newLoc = event.url;

        // When the location address starts with our redirect URL, we're done.
        if (newLoc.indexOf(exports.getRedirectURL()) === 0) {
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


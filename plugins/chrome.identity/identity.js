// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec');
var platformId = require('cordova/platform').id;
var callbackWithError = require('org.chromium.chrome-common.errors').callbackWithError;
try {
    var runtime = require('org.chromium.chrome-runtime.runtime');
} catch(e) {}

// TODO(maxw): Perhaps store the client secret in the manifest?
var clientSecret = 'Q_Jk5GKsGcA-Dp9GcqMKRnAP';
var clientId;
var scopes;
var accessToken;
var refreshToken;

var IDENTITY_PREFIX = 'id';
var REFRESH_TOKEN_KEY = IDENTITY_PREFIX + '-' + runtime.id + '-refresh_token';

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
    var fail = function() {
        callback();
    };

    // If we have a cached access token, send it along.
    if (accessToken) {
        callback(accessToken);
        return;
    }

    // If we have a refresh token, get a new access token.
    if (refreshToken) {
        refreshAccessToken(callback);
        return;
    }

    // If we've gotten this far, we're going to need to get data from the manifest.  Do it now.
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

    clientId = manifestJson.oauth2.client_id;
    scopes = manifestJson.oauth2.scopes;

    // If we have a refresh token in local storage, retrieve it and get a new access token.
    var getRefreshTokenCallback = function(items) {
        if (items[REFRESH_TOKEN_KEY]) {
            refreshToken = items[REFRESH_TOKEN_KEY];
            refreshAccessToken(callback);
            return;
        }

        // Since we have no refresh token, we need to get an access token without it.
        // Augment the callback so that it caches a received token.
        var augmentedCallback = function(tokenObject) {
            if (tokenObject) {
                if (tokenObject.access_token) {
                    accessToken = tokenObject.access_token;
                }
                if (tokenObject.refresh_token) {
                    refreshToken = tokenObject.refresh_token;

                    // Save the refresh token to local storage.
                    var refreshTokenObject = { };
                    refreshTokenObject[REFRESH_TOKEN_KEY] = refreshToken;
                    chrome.storage.internal.set(refreshTokenObject);

                    // Set a time to refresh the access token.
                    setTimeout(refreshAccessToken, tokenObject.expires_in * 1000, null);
                }
            }
            callback(accessToken);
        };

        // Get an access token.
        if (0 /*platformId === 'android'*/) {
            // Use native implementation for logging into google accounts
            exec(augmentedCallback, fail, 'ChromeIdentity', 'getAuthToken', [details]);
        } else {
            // Use web app oauth flow
            getAuthTokenJS(augmentedCallback, fail, details);
        }
    };

    // Attempt to get a refresh token from storage.
    chrome.storage.internal.get(REFRESH_TOKEN_KEY, getRefreshTokenCallback);
};

exports.removeCachedAuthToken = function(details, callback) {
    if (details && details.token === accessToken) {
        accessToken = null;
    }
    callback();
}

exports.launchWebAuthFlow = function(details, callback) {
    if (typeof callback !== 'function') {
        return callbackWithError('Callback function required');
    }
    if (typeof details !== 'object') {
        return callbackWithError('WebAuthFlowDetails object required', callback);
    }

    var augmentedCallback = function(url) {
        // If we're redirected to this ServiceLoginAuth page, try again; we should get the token.
        if (url === 'https://accounts.google.com/ServiceLoginAuth') {
            // Unfortunately, this timeout is necessary, or else the authentication page comes up again.
            // TODO(maxw): Find a better way to solve this issue.
            window.setTimeout(exports.launchWebAuthFlow, 1000, details, callback);
            return;
        }

        callback(url);
    };

    launchInAppBrowser(details.url, details.interactive, augmentedCallback);
};

function getAuthTokenJS(win, fail, details) {
    var authURLBase = 'https://accounts.google.com/o/oauth2/auth?response_type=code';
    var redirectUri = 'http://www.google.com';
    var finalURL = authURLBase + '&client_id=' + encodeURIComponent(clientId) + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&scope=' + encodeURIComponent(scopes.join(' ')) + '&access_type=offline';

    launchInAppBrowser(finalURL, details.interactive, function(newLoc) {
        // We should have a new location with an authorization code.
        var code = newLoc.substring(newLoc.indexOf('code=') + 5);
        if (code.length === 0) {
            return callbackWithError('The redirect uri did not have a code.', fail);
        }

        // Use the access code to get some tokens.
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://accounts.google.com/o/oauth2/token');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status < 200 || xhr.status > 300) {
                    console.log('Could not redeem code; status ' + xhr.status + '.');
                } else {
                    var responseData = JSON.parse(xhr.responseText);
                    win(responseData);
                }
            }
        }
        var data = 'code=' + code +
                   '&client_id=' + clientId +
                   '&client_secret=' + clientSecret +
                   '&redirect_uri=' + redirectUri +
                   '&grant_type=authorization_code';
        xhr.send(data);
    });
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
        if (newLoc.indexOf('code=') != -1) {
            success = true;
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

function refreshAccessToken(callback) {
    // Use the refresh code to get a new access token.
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://accounts.google.com/o/oauth2/token');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status === 400) {
                // Assume this is a bad refresh token.  Remove it.
                var removeRefreshTokenCallback = function() {
                    console.log('Failed to use stored refresh token!  It has been removed.');
                };
                refreshToken = null;
                chrome.storage.internal.remove(REFRESH_TOKEN_KEY, removeRefreshTokenCallback);
            } else if (xhr.status < 200 || xhr.status > 300) {
                console.log('Could not refresh access token; status ' + xhr.status + '.');
            } else {
                // Cache the refreshed access token.
                var responseData = JSON.parse(xhr.responseText);
                accessToken = responseData.access_token;

                // Schedule another access token refresh.
                setTimeout(refreshAccessToken, responseData.expires_in * 1000);

                // Send the refreshed token to the callback.
                if (callback) {
                    callback(accessToken);
                }
            }
        }
    }
    var data = 'refresh_token=' + refreshToken +
               '&client_id=' + clientId +
               '&client_secret=' + clientSecret +
               '&grant_type=refresh_token';
    xhr.send(data);
}


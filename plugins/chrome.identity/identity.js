// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exec = require('cordova/exec');
var platformId = require('cordova/platform').id;
var callbackWithError = require('org.chromium.chrome-common.errors').callbackWithError;
try {
var runtime = require('org.chromium.chrome-app-bootstrap.runtime');
} catch(e) {}

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

    if (platformId === 'android') {
        // Use native implementation for logging into google accounts
        exec(callback, fail, 'ChromeIdentity', 'getAuthToken', [details]);
    } else {
        // Use web app oauth flow
        getAuthTokenJS(callback, fail, details);
    }
};

exports.removeCachedAuthToken = function() {
    console.warn('chrome.identity.removeCachedAuthToken not implemented yet');
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

function getAuthTokenJS(win, fail , details) {
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
    var finalURL = authURLBase + '&redirect_uri=' + encodeURIComponent(redirect_uri) + '&client_id=' + encodeURIComponent(client_id) + '&scope=' + encodeURIComponent(scope.join('&'));

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
    var oAuthBrowser = window.open(authURL, '_blank', 'location=yes,hidden=yes');
    var success = false;
    oAuthBrowser.addEventListener('loadstart', function(event) {
        if (success)
            return;
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
        setTimeout(function() { // some sites use js redirects :(
            if (success)
                return;
            if (interactive)
                oAuthBrowser.show();
            else
                oAuthBrowser.close();
        }, 250);
    });
    oAuthBrowser.addEventListener('loaderror', function(event) {
        setTimeout(function() { // some sites use js redirects :(
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

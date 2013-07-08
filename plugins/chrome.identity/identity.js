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

exports.launchWebAuthFlow = function(details, callback) {
    if (typeof callback !== 'function') {
        return callbackWithError('Callback function required');
    }
    if (typeof details !== 'object') {
        return callbackWithError('WebAuthFlowDetails object required', callback);
    }

    var finalURL = details.url;
    launchInAppBrowserForOauth1and2(finalURL, callback);
};

function getAuthTokenJS(win, fail , details) {
    if (!details.interactive) {
        // We cannot support non interactive mode.
        // This requires the ability to use invisible InAppBrowser windows, which is not currently supported
        // TODO: this is supported now, right?
        return callbackWithError('Unsupported mode - Non interactive mode is not supported', fail);
    }

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

    launchInAppBrowser(finalURL, redirect_uri, function(newLoc) {
        var token = getParameterFromUrl(newLoc, 'access_token', '#');
        if (typeof token === 'undefined') {
            return callbackWithError('The redirect uri did not have the access token', fail);
        }
        win(token);
    });
}

function getAllParametersFromUrl(url, startString, endString) {
    var splitUrl = url;
    var urlParts;
    if (typeof startString !== 'undefined') {
        urlParts = splitUrl.split(startString);
        if (urlParts.length < 2)
            return {};
        splitUrl = urlParts[1];
    }
    if (typeof endString !== 'undefined') {
        urlParts = splitUrl.split(endString);
        splitUrl = urlParts[0];
    }
    var vars = splitUrl.split('&');
    var retObj = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        retObj[pair[0]] = decodeURIComponent(pair[1]);
    }
    return retObj;
}

function getParameterFromUrl(url, param, startString, endString) {
    var retObj = getAllParametersFromUrl(url, startString, endString);
    return retObj[param];
}

function launchInAppBrowser(authURL, redirectedURL, callback) {
    var oAuthBrowser = window.open(authURL, '_blank', 'location=yes');
    var listener = function(event) {
        var newLoc = event.url;
        if(newLoc.indexOf(redirectedURL) === 0 && newLoc.indexOf('#') !== -1) {
            oAuthBrowser.removeEventListener('loadstart', listener);
            oAuthBrowser.close();
            callback(newLoc);
        }
    };
    oAuthBrowser.addEventListener('loadstart', listener);
}

function launchInAppBrowserForOauth1and2(authURL, callback) {
    // TODO: see what the termination conditions are for desktop's implementation.
    var breakParams = [ 'access_token', 'oauth_verifier', 'token'];
    var oAuthBrowser = window.open(authURL, '_blank', 'location=yes');

    var listener = function(event) {
        var newLoc = event.url;
        var paramsAfterQuestion = getAllParametersFromUrl(newLoc, "?", "#");
        var paramsAfterPound = getAllParametersFromUrl(newLoc, "#");

        for (var i = 0; i < breakParams.length; i++) {
            if (paramsAfterQuestion.hasOwnProperty(breakParams[i]) || paramsAfterPound.hasOwnProperty(breakParams[i])) {
                oAuthBrowser.removeEventListener('loadstart', listener);
                oAuthBrowser.close();
                callback(newLoc);
                return;
            }
        }
    };

    oAuthBrowser.addEventListener('loadstart', function(e) {
        setTimeout(listener.bind(null, e), 0);
    });
}

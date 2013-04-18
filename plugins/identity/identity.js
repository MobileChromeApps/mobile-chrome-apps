// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var platformId = cordova.require('cordova/platform').id;
var runtime = require('chrome.runtime');

exports.TokenDetails = function(interactive) {
    this.interactive = interactive || false;
};

exports.WebAuthFlowDetails = function(url, interactive, width, height, left, top) {
    if (typeof url == 'undefined') {
        throw new Error('Url required');
    }
    this.url = url;
    this.interactive = interactive || false;
    this.width = width;
    this.height = height;
    this.left = left;
    this.top = top;
};

exports.getAuthToken = function(details, callback) {
    if(typeof details == 'function') {
        callback = details;
        details = new exports.TokenDetails();
    }
    if (typeof callback == 'undefined') {
        chrome.runtime.lastError = { 'message' : 'Callback function required' };
        // Not calling callback as it wasnt provided
        return;
    }
    var win = function(token) {
        callback(token);
    };
    var fail = function() {
        callback();
    };

    if (platformId == 'android') {
        // Use native implementation for logging into google accounts
        cordova.exec(win, fail, 'ChromeIdentity', 'getAuthToken', [details]);
    } else {
        // Use web app oauth flow
        _getAuthTokenJS(win, fail, details);
    }
};

exports.launchWebAuthFlow = function(details, callback) {
    var failed = false;
    var failMessage;
    if (typeof details == 'undefined') {
        failed = true;
        failMessage = 'WebAuthFlowDetails required';
    } else if (typeof callback == 'undefined') {
        failed = true;
        failMessage = 'Callback function required';
    }

    if(failed === true) {
        chrome.runtime.lastError = { 'message' : failMessage };
        // Not calling callback as it wasnt provided
        return;
    }

    var finalURL = details.url;
    _launchInAppBrowserForOauth1and2(finalURL, callback);
};

function _getAuthTokenJS(win, fail , details) {
    var failed = false;
    var failMessage;
    if(!details.interactive) {
        // We cannot support non interactive mode.
        // This requires the ability to use invisible InAppBrowser windows, which is not currently supported
        failed = true;
        failMessage = 'Unsupported mode - Non interactive mode is not supported';
    }
    var manifestJson = runtime.getManifest();
    if(typeof manifestJson == 'undefined') {
        failed = true;
        failMessage = 'manifest.json is not defined';
    } else if(typeof manifestJson.oauth2 == 'undefined') {
        failed = true;
        failMessage = 'oauth2 missing from manifest.json';
    } else if(typeof manifestJson.oauth2.client_id == 'undefined') {
        failed = true;
        failMessage = 'client_id missing from manifest.json';
    } else if(typeof manifestJson.oauth2.scopes == 'undefined') {
        failed = true;
        failMessage = 'scopes missing from manifest.json';
    }

    if(failed === true) {
        chrome.runtime.lastError = { 'message' : failMessage };
        fail();
    }

    var authURLBase = 'https://accounts.google.com/o/oauth2/auth?response_type=token';
    var redirect_uri = 'http://www.google.com';
    var client_id = manifestJson.oauth2.client_id;
    var scope = manifestJson.oauth2.scopes;
    var finalURL = authURLBase + '&redirect_uri=' + encodeURIComponent(redirect_uri) + '&client_id=' + encodeURIComponent(client_id) + '&scope=' + encodeURIComponent(scope.join('&'));

    _launchInAppBrowser(finalURL, redirect_uri, function(newLoc) {
        var token = _getParameterFromUrl(newLoc, 'access_token', '#');
        if(typeof token == 'undefined') {
            chrome.runtime.lastError = { 'message' : 'The redirect uri did not have the access token' };
            fail();
        } else {
            win(token);
        }
    });
}

function _getAllParametersFromUrl(url, startString, endString) {
    var splitUrl = url;
    var urlParts;
    if(typeof startString != 'undefined') {
        urlParts = splitUrl.split(startString);
        if(urlParts.length < 2) {
            return {};
        } else {
            splitUrl = urlParts[1];
        }
    }
    if(typeof endString != 'undefined') {
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

function _getParameterFromUrl(url, param, startString, endString) {
    var retObj = _getAllParametersFromUrl(url, startString, endString);
    return retObj[param];
}

function _launchInAppBrowser(authURL, redirectedURL, callback) {
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

function _launchInAppBrowserForOauth1and2(authURL, callback) {
    var breakParams = [ "access_token", "oauth_verifier"];
    var oAuthBrowser = window.open(authURL, '_blank', 'location=yes');

    var listener = function(event) {
        var newLoc = event.url;
        var paramsAfterQuestion = _getAllParametersFromUrl(newLoc, "?", "#");
        var paramsAfterPound = _getAllParametersFromUrl(newLoc, "#");

        for(var i = 0; i < breakParams.length; i++) {
            if(paramsAfterQuestion.hasOwnProperty(breakParams[i]) || paramsAfterPound.hasOwnProperty(breakParams[i])) {
                oAuthBrowser.removeEventListener('loadstart', listener);
                oAuthBrowser.close();
                callback(newLoc);
                return;
            }
        }
    };

    oAuthBrowser.addEventListener('loadstart', listener);
}


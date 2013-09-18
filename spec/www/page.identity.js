// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.identity', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  function addDropdown(text, id, values) {
    var dropdown = chromespec.createDropdown(text, id, values);
    rootEl.appendChild(dropdown);
  }

  function getUseNativeAuth() {
    var useNativeAuthDropdown = chromespec.fgDoc.getElementById('use-native-auth-dropdown');
    return useNativeAuthDropdown.options[useNativeAuthDropdown.selectedIndex].value;
  }

  addDropdown('(Android) Use native authentication? ', 'use-native-auth-dropdown', { 'yes' : true, 'no' : false });

  addButton('Get auth token', function() {
    var onGetAuthTokenSuccess = function(token) {
      chromespec.log('Token: ' + token);
    };

    chrome.identity.getAuthToken({ interactive: true, useNativeAuth: getUseNativeAuth() }, onGetAuthTokenSuccess);
  });

  addButton('Remove cached auth token', function() {
    var onRemoveCachedAuthTokenSuccess = function() {
      chromespec.log('Token removed from cache.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      chromespec.log('Removing token ' + token + ' from cache.');

      // Remove the token!
      chrome.identity.removeCachedAuthToken({ token: token }, onRemoveCachedAuthTokenSuccess);
    };

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true, useNativeAuth: getUseNativeAuth() }, onInitialGetAuthTokenSuccess);
  });

  addButton('Revoke access and refresh tokens', function() {
    var onRemoveCachedAuthTokenSuccess = function() {
      chromespec.log('Token revoked.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      // Revoke the access token.  The associated refresh token is automatically revoked as well.
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' + token);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status < 200 || xhr.status > 300) {
            chromespec.log('Could not revoke token; status ' + xhr.status + '.');
          } else {
            // Remove the cached access token.
            chrome.identity.removeCachedAuthToken({ token: token }, onRemoveCachedAuthTokenSuccess);
          }
        }
      }
      xhr.send(null);
    }

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true, useNativeAuth: getUseNativeAuth() }, onInitialGetAuthTokenSuccess);
  });

  addButton('Get name via Google\'s User Info API', function() {
    var onGetAuthTokenSuccess = function(token) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var responseText = JSON.parse(xhr.responseText);
                    chromespec.log('Name: ' + responseText.name);
                } else {
                    chromespec.log('Failed with status ' + xhr.status + '.');
                }
            }
        };
        xhr.open('GET', 'https://www.googleapis.com/oauth2/v3/userinfo')
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.send(null);
    };

    chromespec.log('Retrieving name...');
    chrome.identity.getAuthToken({ interactive: true, useNativeAuth: getUseNativeAuth() }, onGetAuthTokenSuccess);
  });

  addButton('Get name via Google\'s Drive API', function() {
    var onGetAuthTokenSuccess = function(token) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var responseText = JSON.parse(xhr.responseText);
                    chromespec.log('Name: ' + responseText.name);
                } else {
                    chromespec.log('Failed with status ' + xhr.status + '.');
                }
            }
        };
        xhr.open('GET', 'https://www.googleapis.com/drive/v2/about')
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.send(null);
    };

    chromespec.log('Retrieving name...');
    chrome.identity.getAuthToken({ interactive: true, useNativeAuth: getUseNativeAuth() }, onGetAuthTokenSuccess);
  });

  addButton('Launch Google web auth flow', function() {
    chromespec.log('launchWebAuthFlow (google.com): Waiting for callback');

    var webAuthDetails = {
      interactive: true,
      url: 'https://accounts.google.com/o/oauth2/auth?client_id=429153676186-efnn5o5otvpa75kpa82ee91qkd80evb3.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Fwww.google.com&response_type=token&scope=https%3A%2F%2Fwww.googleapis.com/auth/userinfo.profile'
    };

    var onLaunchWebAuthFlowSuccess = function(url) {
      chromespec.log('Resulting URL: ' + url);
    };

    chrome.identity.launchWebAuthFlow(webAuthDetails, onLaunchWebAuthFlowSuccess);
  });

  addButton('Launch Facebook web auth flow', function() {
    var FACEBOOK_PERMISSIONS='email';
    var FACEBOOK_APP_ID='218307504870310';
    var APPURL='https://'+chrome.runtime.id+'.chromiumapp.org/';
    var FACEBOOK_LOGIN_SUCCESS_URL= 'http://www.any.do/facebook_proxy/login_success?redirect='+encodeURIComponent(APPURL);
    var FACEBOOK_OAUTH_URL = 'http://www.facebook.com/dialog/oauth?display=popup&scope='+FACEBOOK_PERMISSIONS+'&client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_LOGIN_SUCCESS_URL;

    var webAuthDetails = {
        interactive: true,
        url:FACEBOOK_OAUTH_URL,
    };

    var onLaunchWebAuthFlowSuccess = function(url) {
        chromespec.log('Resulting URL: ' + url);
    };

    chrome.identity.launchWebAuthFlow(webAuthDetails, onLaunchWebAuthFlowSuccess);
  });
});


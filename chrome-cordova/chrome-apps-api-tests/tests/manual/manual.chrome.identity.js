// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.identity', function(rootEl, addButton) {
  function hitEndpoint(endpoint, callback) {
    var onGetAuthTokenSuccess = function(token) {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            callback(JSON.parse(xhr.responseText));
          } else {
            console.log('Failed with status ' + xhr.status + '.');
            console.log('Response text: ' + JSON.stringify(xhr.responseText));
          }
        }
      };
      xhr.open('GET', endpoint);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.send(null);
    };

    chrome.identity.getAuthToken({ interactive: true }, onGetAuthTokenSuccess);
  }

  addButton('Get auth token', function() {
    var callback = function(token) {
      if (!token) {
        console.log('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        console.log('Token: ' + token);
      }
    };

    chrome.identity.getAuthToken({ interactive: true }, callback);
  });

  addButton('Remove cached auth token', function() {
    var onRemoveCachedAuthTokenSuccess = function() {
      console.log('Token removed from cache.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      console.log('Removing token ' + token + ' from cache.');

      // Remove the token!
      chrome.identity.removeCachedAuthToken({ token: token }, onRemoveCachedAuthTokenSuccess);
    };

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true }, onInitialGetAuthTokenSuccess);
  });

  addButton('Revoke auth token', function() {
    var onRevokeAuthTokenSuccess = function() {
      console.log('Token revoked.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      console.log('Revoking token ' + token + '.');

      // Revoke the token!
      chrome.identity.revokeAuthToken({ token: token }, onRevokeAuthTokenSuccess);
    };

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true }, onInitialGetAuthTokenSuccess);
  });

  addButton('Get name via Google\'s User Info API', function() {
    hitEndpoint('https://www.googleapis.com/oauth2/v3/userinfo', function(response) {
      console.log('Name: ' + response.name);
    });
  });

  addButton('Get name via Google\'s Drive API', function() {
    hitEndpoint('https://www.googleapis.com/drive/v2/about', function(response) {
      console.log('Name: ' + response.name);
    });
  });

  addButton('Get files via Google\'s Drive API', function() {
    hitEndpoint('https://www.googleapis.com/drive/v2/files', function(response) {
      var fileCount = response.items.length;
      var cappedCount = (fileCount <= 3) ? fileCount : 3;
      console.log('Files (' + cappedCount + ' of ' + fileCount + '):');
      for (var i = 0; i < cappedCount; i++) {
          console.log('  ' + response.items[i].title);
      }
    });
  });

  addButton('Get calendars via Google\'s Calendar API', function() {
    hitEndpoint('https://www.googleapis.com/calendar/v3/users/me/calendarList', function(response) {
      var calendarCount = response.items.length;
      var cappedCount = (calendarCount <= 3) ? calendarCount : 3;
      console.log('Calendars (' + cappedCount + ' of ' + calendarCount + '):');
      for (var i = 0; i < cappedCount; i++) {
        console.log('  ' + response.items[i].summary);
      }
    });
  });

  addButton('Get playlists via Google\'s YouTube API', function() {
    hitEndpoint('https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true', function(response) {
      var playlistCount = response.items.length;
      var cappedCount = (playlistCount <= 3) ? playlistCount : 3;
      console.log('Playlists (' + cappedCount + ' of ' + playlistCount + '):');
      for (var i = 0; i < cappedCount; i++) {
        console.log('  ' + response.items[i].snippet.title);
      }
    });
  });

  addButton('Launch Google web auth flow', function() {
    console.log('launchWebAuthFlow (google.com): Waiting for callback');

    var webAuthDetails = {
      interactive: true,
      url: 'https://accounts.google.com/o/oauth2/auth?client_id=545713885199-pq7ffbv68ktqpv6qlg0nu62dh0f3n1f8.apps.googleusercontent.com&redirect_uri=' + chrome.identity.getRedirectURL() + '&response_type=token&scope=https%3A%2F%2Fwww.googleapis.com/auth/userinfo.profile'
    };

    var onLaunchWebAuthFlowSuccess = function(url) {
      if (!url) {
        console.log('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        console.log('Resulting URL: ' + url);
      }
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
      if (!url) {
        console.log('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        console.log('Resulting URL: ' + url);
      }
    };

    chrome.identity.launchWebAuthFlow(webAuthDetails, onLaunchWebAuthFlowSuccess);
  });
});


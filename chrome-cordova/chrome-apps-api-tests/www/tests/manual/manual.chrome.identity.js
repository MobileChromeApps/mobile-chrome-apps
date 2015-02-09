// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* global logger */

var CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

registerManualTests('chrome.identity', function(rootEl, addButton) {
  function hitEndpoint(endpoint, callback, /* optional */ scopes) {
    var onGetAuthToken = function(token) {
      if (!token) {
        console.log('Failed to get auth token: ' + JSON.stringify(chrome.runtime.lastError));
        return;
      }
      console.log('Using token: ' + token);
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            callback(JSON.parse(xhr.responseText));
          } else {
            logger('Failed with status ' + xhr.status + '.');
          }
        }
      };
      xhr.open('GET', endpoint);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.send(null);
    };

    chrome.identity.getAuthToken({ interactive: true, scopes: scopes }, onGetAuthToken);
  }

  function getWebClientId() {
    var manifest = chrome.runtime.getManifest();
    var webClientId = manifest && manifest.web && manifest.web.oauth2 && manifest.web.oauth2.client_id;
    return webClientId;
  }

  addButton('Get accounts', function() {
    var callback = function(accounts) {
      if (!accounts) {
        logger('Failed to get accounts. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        logger('Got ' + accounts.length + ' account(s):');
        for (var i = 0; i < accounts.length; i++) {
          logger('  ' + accounts[i].id);
        }
      }
    };

    chrome.identity.getAccounts(callback);
  });

  addButton('Get auth token (interactive)', function() {
    var callback = function(token, account) {
      if (!token) {
        logger('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        logger('Token: ' + token);
        logger('Account: ' + account);
      }
    };

    chrome.identity.getAuthToken({ interactive: true }, callback);
  });

  addButton('Get auth token (non-interactive)', function() {
    var callback = function(token, account) {
      if (!token) {
        logger('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        logger('Token: ' + token);
        logger('Account: ' + account);
      }
    };

    chrome.identity.getAuthToken(callback);
  });

  addButton('Get auth token with account hint', function() {
    var callback = function(token, account) {
      if (!token) {
        logger('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        logger('Token: ' + token);
        logger('Account: ' + account);
      }
    };

    chrome.identity.getAuthToken({ interactive: true, accountHint: 'cordovium1@gmail.com' }, callback);
  });

  addButton('Get profile user info', function() {
    var callback = function(email, id) {
      logger('Email: ' + email);
      logger('ID: ' + id);
    };

    chrome.identity.getProfileUserInfo(callback);
  });

  addButton('Remove cached auth token', function() {
    var onRemoveCachedAuthTokenSuccess = function() {
      logger('Token removed from cache.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      logger('Removing token ' + token + ' from cache.');

      // Remove the token!
      chrome.identity.removeCachedAuthToken({ token: token }, onRemoveCachedAuthTokenSuccess);
    };

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true }, onInitialGetAuthTokenSuccess);
  });

  addButton('Remove cached auth token (calendar)', function() {
    var onRemoveCachedAuthTokenSuccess = function() {
      logger('Token removed from cache.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      logger('Removing token ' + token + ' from cache.');

      // Remove the token!
      chrome.identity.removeCachedAuthToken({ token: token }, onRemoveCachedAuthTokenSuccess);
    };

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true, scopes: CALENDAR_SCOPES }, onInitialGetAuthTokenSuccess);
  });

  addButton('Revoke auth token', function() {
    var onRevokeAuthTokenSuccess = function() {
      logger('Token revoked.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      logger('Revoking token ' + token + '.');

      // Revoke the token!
      chrome.identity.revokeAuthToken({ token: token }, onRevokeAuthTokenSuccess);
    };

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true }, onInitialGetAuthTokenSuccess);
  });

  addButton('Revoke auth token (calendar)', function() {
    var onRevokeAuthTokenSuccess = function() {
      logger('Token revoked.');
    };

    var onInitialGetAuthTokenSuccess = function(token) {
      logger('Revoking token ' + token + '.');

      // Revoke the token!
      chrome.identity.revokeAuthToken({ token: token }, onRevokeAuthTokenSuccess);
    };

    // First, we need to get the existing auth token.
    chrome.identity.getAuthToken({ interactive: true, scopes: CALENDAR_SCOPES }, onInitialGetAuthTokenSuccess);
  });

  addButton('Get name via Google\'s User Info API', function() {
    hitEndpoint('https://www.googleapis.com/oauth2/v3/userinfo', function(response) {
      logger('Name: ' + response.name);
    });
  });

  addButton('Get name via Google\'s Drive API', function() {
    hitEndpoint('https://www.googleapis.com/drive/v2/about', function(response) {
      logger('Name: ' + response.name);
    });
  });

  addButton('Get files via Google\'s Drive API', function() {
    hitEndpoint('https://www.googleapis.com/drive/v2/files', function(response) {
      var fileCount = response.items.length;
      var cappedCount = (fileCount <= 3) ? fileCount : 3;
      logger('Files (' + cappedCount + ' of ' + fileCount + '):');
      for (var i = 0; i < cappedCount; i++) {
          logger('  ' + response.items[i].title);
      }
    });
  });

  addButton('Get calendars (passing custom scope)', function() {
    hitEndpoint('https://www.googleapis.com/calendar/v3/users/me/calendarList', function(response) {
      var calendarCount = response.items.length;
      var cappedCount = (calendarCount <= 3) ? calendarCount : 3;
      logger('Calendars (' + cappedCount + ' of ' + calendarCount + '):');
      for (var i = 0; i < cappedCount; i++) {
        logger('  ' + response.items[i].summary);
      }
    }, CALENDAR_SCOPES);
  });

  addButton('Get playlists via Google\'s YouTube API', function() {
    hitEndpoint('https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true', function(response) {
      var playlistCount = response.items.length;
      var cappedCount = (playlistCount <= 3) ? playlistCount : 3;
      logger('Playlists (' + cappedCount + ' of ' + playlistCount + '):');
      for (var i = 0; i < cappedCount; i++) {
        logger('  ' + response.items[i].snippet.title);
      }
    });
  });

  addButton('Launch Google web auth flow', function() {
    logger('launchWebAuthFlow (google.com): Waiting for callback');

    var webAuthDetails = {
      interactive: true,
      url: 'https://accounts.google.com/o/oauth2/auth?client_id=' + getWebClientId() + '&redirect_uri=' + chrome.identity.getRedirectURL() + '&response_type=token&scope=https%3A%2F%2Fwww.googleapis.com/auth/userinfo.profile'
    };

    var onLaunchWebAuthFlowSuccess = function(url) {
      if (!url) {
        logger('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        logger('Resulting URL: ' + url);
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
        logger('Failed to get a token. lastError = ' + JSON.stringify(chrome.runtime.lastError));
      } else {
        logger('Resulting URL: ' + url);
      }
    };

    chrome.identity.launchWebAuthFlow(webAuthDetails, onLaunchWebAuthFlowSuccess);
  });
});


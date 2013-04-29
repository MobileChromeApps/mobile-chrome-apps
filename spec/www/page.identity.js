// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.identity', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Test getAuthToken', function() {
    chromespec.log('getAuthToken: Waiting for callback');
    var tokenDetails = new chrome.identity.TokenDetails(true);
    chrome.identity.getAuthToken(tokenDetails, function(token) {
        if(typeof token === 'undefined'|| token === -1) {
            chromespec.log('getAuthToken Error');
        } else {
            try {
                var xhr = new XMLHttpRequest();
                var loc = "https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=" + token;
                xhr.open('GET', loc, false /* sync */);
                xhr.send(null);
                var resp = JSON.parse(xhr.responseText);
                chromespec.log("Attempted to retrieve name from the account: " + resp.name);
            } catch (e) {
                var str = "An error occurred while attempting to retrieve name from the account: " + e;
                chromespec.log(str);
            }
        }
    });
  });

  addButton('Test launchWebAuthFlow (google.com)', function() {
    chromespec.log('launchWebAuthFlow (google.com): Waiting for callback');
    var webAuthDetails = new chrome.identity.WebAuthFlowDetails('https://accounts.google.com/o/oauth2/auth?client_id=95499094623-0kel3jp6sp8l5jrfm3m5873h493uupvr.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Fwww.google.ca&response_type=token&scope=https%3A%2F%2Fmail.google.com%2Fmail%2Ffeed%2Fatom');
    chrome.identity.launchWebAuthFlow(webAuthDetails, function(url) {
      if (!b) {
        chromespec.log('Auth failed.');
      } else {
        b=b.split('token=')[1];
        chromespec.log('token is' + b);
      }
    });
  });

  addButton('Test launchWebAuthFlow (facebook.com)', function() {
    chromespec.log('launchWebAuthFlow (AnyDo+facebook): Waiting for callback');

    var FACEBOOK_PERMISSIONS='email,user_birthday,friends_birthday,user_relationships,read_friendlists,publish_stream,publish_actions,user_checkins,user_interests,user_religion_politics,user_events,friends_events,offline_access';
    var FACEBOOK_APP_ID='218307504870310';
    var APPURL='https://'+chrome.runtime.id+'.chromiumapp.org/';
    var FACEBOOK_LOGIN_SUCCESS_URL= 'http://www.any.do/facebook_proxy/login_success?redirect='+encodeURIComponent(APPURL);
    var FACEBOOK_OAUTH_URL = 'http://www.facebook.com/dialog/oauth?display=popup&scope='+FACEBOOK_PERMISSIONS+'&client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_LOGIN_SUCCESS_URL;
    chrome.identity.launchWebAuthFlow({
        url:FACEBOOK_OAUTH_URL,
        interactive:true
    }, function(b) {
      if (!b) {
        chromespec.log('Auth failed.');
      } else {
        b=b.split('token=')[1];
        chromespec.log('token is' + b);
      }
    });
  });
});

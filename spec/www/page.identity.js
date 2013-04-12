// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.identity', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Test getAuthToken', function() {
    console.log('getAuthToken: Waiting for callback');
    var tokenDetails = new chrome.identity.TokenDetails(true);
    chrome.identity.getAuthToken(tokenDetails, function(token) {
        if(typeof token === 'undefined'|| token === -1) {
            alert('getAuthToken Error');
        } else {
            try {
                var xhr = new XMLHttpRequest();
                var loc = "https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=" + token;
                xhr.open('GET', loc, false /* sync */);
                xhr.send(null);
                var resp = JSON.parse(xhr.responseText);
                alert("Attempted to retrieve name from the account: " + resp.name);
            } catch (e) {
                var str = "An error occurred while attempting to retrieve name from the account: " + e;
                console.error(str);
                alert(str);
            }
        }
    });
  });

  addButton('Test launchWebAuthFlow', function() {
    console.log('launchWebAuthFlow: Waiting for callback');
    var webAuthDetails = new chrome.identity.WebAuthFlowDetails('https://accounts.google.com/o/oauth2/auth?client_id=95499094623-0kel3jp6sp8l5jrfm3m5873h493uupvr.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Fwww.google.ca&response_type=token&scope=https%3A%2F%2Fmail.google.com%2Fmail%2Ffeed%2Fatom');
    chrome.identity.launchWebAuthFlow(webAuthDetails, function(url) {
        if(typeof url === 'undefined'|| url === '') {
            alert('launchWebAuthFlow Error');
        } else {
            alert('launchWebAuthFlow Success');
        }
    });
  });
});

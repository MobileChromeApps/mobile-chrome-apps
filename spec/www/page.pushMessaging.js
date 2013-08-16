// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Chrome app GCM credentials
var clientId = '429153676186-efnn5o5otvpa75kpa82ee91qkd80evb3.apps.googleusercontent.com';
var clientSecret = 'Q_Jk5GKsGcA-Dp9GcqMKRnAP';
var refreshToken = '1/8SBtOiPJYTKAMWmYlmrMZ4Xk0B_Z3c_86peQETRCzjM';

// Android GCM credentials
var serverApiKey = 'AIzaSyC75_iRkHOwMm1nnMrP8iv6BZRIvzQvKDQ';

chrome.pushMessaging.onMessage.addListener(function(message) {
  chromespec.log('push message arrived, round trip complete!');
  chromespec.log('subchannel - ' + message.subchannelId);
  chromespec.log('payload - ' + message.payload);
});

chromespec.registerSubPage('chrome.pushMessaging', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  function getAccessToken(callback) {
    var req = new XMLHttpRequest();
    req.open('POST', 'https://accounts.google.com/o/oauth2/token', true);
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    req.onreadystatechange = function() {
      if (req.readyState == 4) {
        if (req.status == 200) {
          var response = JSON.parse(req.responseText);
          callback(response.access_token);
        } else {
          console.error('Access token request failed with status ' + req.status);
        }
      }
    }
    var data = 'client_id=' + clientId + '&' +
               'client_secret=' + clientSecret + '&' +
               'refresh_token=' + refreshToken + '&' +
               'grant_type=refresh_token';
    req.send(data);
  }

  function sendPushMessage(channelId, subchannelId, payload) {
    if ('channelId' in channelId) {
      // Chrome app GCM request.
      getAccessToken(function(token) {
        var req = new XMLHttpRequest();
        req.open('POST', 'https://www.googleapis.com/gcm_for_chrome/v1/messages?access_token=' + token, true);
        req.setRequestHeader('Content-Type', 'application/json');
        req.onreadystatechange = function() {
          if (req.readyState == 4) {
            if (req.status < 200 || req.status > 300) {
              console.error('Chrome app GCM push message request failed with status ' + req.status);
            }
          }
        }
        var data = { 'channelId':channelId.channelId, 'subchannelId':subchannelId, 'payload':JSON.stringify(payload) };
        req.send(JSON.stringify(data));
      });
    }
    
    if ('registrationId' in channelId) {
      // Android GCM request.
      var req = new XMLHttpRequest();
      req.open('POST', 'https://android.googleapis.com/gcm/send', true);
      req.setRequestHeader('Content-Type', 'application/json');
      req.setRequestHeader('Authorization', 'key=' + serverApiKey);
      req.onreadystatechange = function() {
        if (req.readyState == 4) {
          if (req.status < 200 || req.status > 300) {
            console.error('Android GCM push message request failed with status ' + req.status);
          }
        }
      }
      var data = {'registration_ids':[channelId.registrationId], 'data':payload };
      req.send(JSON.stringify(data));
    }
  }

  addButton('Push Messaging Roundtrip', function() {
    chrome.pushMessaging.getChannelId(true, function(channelId) {
      sendPushMessage(channelId, '0', { message:'Hello World!' });
    });
  });
});

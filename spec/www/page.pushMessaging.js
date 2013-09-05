// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Chrome app GCM credentials.
var clientId = '429153676186-efnn5o5otvpa75kpa82ee91qkd80evb3.apps.googleusercontent.com';
var clientSecret = 'Q_Jk5GKsGcA-Dp9GcqMKRnAP';
var refreshToken = '1/8SBtOiPJYTKAMWmYlmrMZ4Xk0B_Z3c_86peQETRCzjM';

// Android GCM credentials.
var serverApiKey = 'AIzaSyC75_iRkHOwMm1nnMrP8iv6BZRIvzQvKDQ';

// We store the channel and registration ids.
var pushMessagingIds;

// Add a listener.
chrome.pushMessaging.onMessage.addListener(function(message) {
  chromespec.log('Push message arrived. Subchannel: ' + message.subchannelId + ', message: "' + JSON.parse(message.payload).message + '"');
});

chromespec.registerSubPage('chrome.pushMessaging', function(rootEl) {
  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  addButton('Get Channel Id', function() {
    var onGetChannelIdSuccess = function(channelId) {
      pushMessagingIds = channelId;
      chromespec.log('Channel id: ' + pushMessagingIds.channelId);
      chromespec.log('Registration id: ' + pushMessagingIds.registrationId);
    };

    chrome.pushMessaging.getChannelId(true /* interactive */, onGetChannelIdSuccess);
  });

  addButton('Send Push Message via Android', function() {
    if (!pushMessagingIds || !pushMessagingIds.registrationId) {
      chromespec.log('No registration id!');
      return;
    }

    chromespec.log('Sending push message...');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://android.googleapis.com/gcm/send');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'key=' + serverApiKey);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status < 200 || xhr.status > 300) {
          chromespec.log('Android GCM push message request failed with status ' + xhr.status + '.');
        }
      }
    }
    var data = {'registration_ids' : [ pushMessagingIds.registrationId ], 'data' : { 'message' : 'Push message sent via Android GCM.' } };
    xhr.send(JSON.stringify(data));

    chromespec.log('...push message sent.');
  });

  addButton('Send Push Message via Chrome', function() {
    if (!pushMessagingIds || !pushMessagingIds.channelId) {
      chromespec.log('No channel id!');
      return;
    }

    chromespec.log('Sending push message...');

    var getAuthTokenCallback = function(token) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/gcm_for_chrome/v1/messages');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status < 200 || xhr.status > 300) {
            chromespec.log('Chrome GCM push message request failed with status ' + xhr.status + '.');
            chromespec.log('Response text: ' + xhr.responseText);
          }
        }
      }
      var data = { 'channelId' : pushMessagingIds.channelId,
                   'subchannelId' : 0,
                   'payload' : JSON.stringify({ 'message' : 'Push message sent via Chrome GCM.' }) };
      xhr.send(JSON.stringify(data));

      chromespec.log('...push message sent.');
    };

    chrome.identity.getAuthToken({ interactive: true }, getAuthTokenCallback);
  });
});


// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.



registerManualTests('chrome.pushMessaging', function(rootEl, addButton) {
  console.log('This test requires a physical device (not an emulator)');
  console.log('Please ensure that oauth2 is configured for chrome.identity');
  console.log('See the README for details');

  // We store the channel and registration ids.
  var pushMessagingIds;

  // Add a listener.
  chrome.pushMessaging.onMessage.addListener(function(message) {
    console.log('Push message arrived. Subchannel: ' + message.subchannelId + ', message: "' + JSON.parse(message.payload).message + '"');
  });

  addButton('Get Channel Id', function() {
    var onGetChannelIdSuccess = function(channelId) {
      pushMessagingIds = channelId;
      console.log('Chrome Channel id: ' + pushMessagingIds.channelId);
      console.log('Android Registration id: ' + pushMessagingIds.registrationId);
      console.log('APNS Device Token: ' + pushMessagingIds.deviceToken);
    };

    chrome.pushMessaging.getChannelId(true /* interactive */, onGetChannelIdSuccess);
  });

  addButton('Send Push Message via Android', function() {
    if (!pushMessagingIds || !pushMessagingIds.registrationId) {
      console.log('No registration id!');
      return;
    }

    console.log('Sending push message...');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://android.googleapis.com/gcm/send');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'key=' + serverApiKey);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status < 200 || xhr.status > 300) {
          console.log('Android GCM push message request failed with status ' + xhr.status + '.');
        }
      }
    }
    var data = {'registration_ids' : [ pushMessagingIds.registrationId ], 'data' : { 'message' : 'Push message sent via Android GCM.' } };
    xhr.send(JSON.stringify(data));

    console.log('...push message sent.');
  });

  addButton('Send Push Message via Chrome', function() {
    if (!pushMessagingIds || !pushMessagingIds.channelId) {
      console.log('No channel id!');
      return;
    }

    console.log('Sending push message...');

    var getAuthTokenCallback = function(token) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/gcm_for_chrome/v1/messages');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status < 200 || xhr.status > 300) {
            console.log('Chrome GCM push message request failed with status ' + xhr.status + '.');
            console.log('Response text: ' + xhr.responseText);
          }
        }
      }
      var data = { 'channelId' : pushMessagingIds.channelId,
                   'subchannelId' : 0,
                   'payload' : JSON.stringify({ 'message' : 'Push message sent via Chrome GCM.' }) };
      xhr.send(JSON.stringify(data));

      console.log('...push message sent.');
    };

    chrome.identity.getAuthToken({ interactive: true }, getAuthTokenCallback);
  });
});


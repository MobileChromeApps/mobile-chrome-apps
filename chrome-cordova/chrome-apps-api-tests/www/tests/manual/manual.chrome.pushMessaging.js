// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.



registerManualTests('chrome.pushMessaging', function(rootEl, addButton) {
  logger('This test requires a physical device (not an emulator)');
  logger('Please ensure that oauth2 is configured for chrome.identity');
  logger('See the README for details');

  // We store the channel and registration ids.
  var pushMessagingIds;

  // Add a listener.
  chrome.pushMessaging.onMessage.addListener(function(message) {
    logger('Push message arrived. Subchannel: ' + message.subchannelId + ', message: "' + JSON.parse(message.payload).message + '"');
  });

  addButton('Get Channel Id', function() {
    var onGetChannelIdSuccess = function(channelId) {
      pushMessagingIds = channelId;
      logger('Chrome Channel id: ' + pushMessagingIds.channelId);
      logger('Android Registration id: ' + pushMessagingIds.registrationId);
      logger('APNS Device Token: ' + pushMessagingIds.deviceToken);
    };

    chrome.pushMessaging.getChannelId(true /* interactive */, onGetChannelIdSuccess);
  });

  addButton('Send Push Message via Android', function() {
    if (!pushMessagingIds || !pushMessagingIds.registrationId) {
      logger('No registration id!');
      return;
    }

    logger('Sending push message...');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://android.googleapis.com/gcm/send');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'key=' + serverApiKey);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status < 200 || xhr.status > 300) {
          logger('Android GCM push message request failed with status ' + xhr.status + '.');
        }
      }
    }
    var data = {'registration_ids' : [ pushMessagingIds.registrationId ], 'data' : { 'message' : 'Push message sent via Android GCM.' } };
    xhr.send(JSON.stringify(data));

    logger('...push message sent.');
  });

  addButton('Send Push Message via Chrome', function() {
    if (!pushMessagingIds || !pushMessagingIds.channelId) {
      logger('No channel id!');
      return;
    }

    logger('Sending push message...');

    var getAuthTokenCallback = function(token) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/gcm_for_chrome/v1/messages');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status < 200 || xhr.status > 300) {
            logger('Chrome GCM push message request failed with status ' + xhr.status + '.');
            logger('Response text: ' + xhr.responseText);
          }
        }
      }
      var data = { 'channelId' : pushMessagingIds.channelId,
                   'subchannelId' : 0,
                   'payload' : JSON.stringify({ 'message' : 'Push message sent via Chrome GCM.' }) };
      xhr.send(JSON.stringify(data));

      logger('...push message sent.');
    };

    chrome.identity.getAuthToken({ interactive: true }, getAuthTokenCallback);
  });
});


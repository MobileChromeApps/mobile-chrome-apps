// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var senderid = '90031296475';
var sender = senderid+ "@gcm.googleapis.com";
var containerElement;
var numIds = 0;

function createMessage(type) {
  if (!type) {
    type = 'ping';
  }
  var messageId = 'id' + numIds.toString();
  numIds++;

  var message = {
    'destinationId' : sender,
    'messageId' : messageId,
    'timeToLive' : 10,
    'data' : { 'type': type, 'message' : 'test' }
  };

  return message;
}

function getTimestamp() {
  return Date.now();
}

chrome.gcm.onMessage.addListener(function(message) {
  logger('onMessage fired (' + getTimestamp() + '). message = \n' + JSON.stringify(message, null, 4));
});

chrome.gcm.onMessagesDeleted.addListener(function(notificationId, byUser) {
  logger('onMessagesDeleted fired (' + getTimestamp() + ')');
});

chrome.gcm.onSendError.addListener(function(error) {
  logger('onSendError fired (' + getTimestamp() + '). error = \n' + JSON.stringify(error, null, 4));
});

registerManualTests('chrome.gcm', function(rootEl, addButton) {

  containerElement = rootEl;

  addButton('Send message with delayed response', function() {
    var message = createMessage('delay');
    try {
      chrome.gcm.send(message, function(msgid) {
        logger('Delay message "' + msgid + '" sent (' + getTimestamp() + ')');
      });
    } catch (e) {
      logger('Exception sending delay message: ' + e);
    }
  });

});

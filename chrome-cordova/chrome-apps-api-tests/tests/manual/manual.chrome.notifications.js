// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.notifications', function(rootEl, addButton) {
  chrome.notifications.onClosed.addListener(function(notificationId, byUser) {
    logger('onClosed fired. notificationId = ' + notificationId + ', byUser = ' + byUser);
  });

  chrome.notifications.onClicked.addListener(function(notificationId) {
    logger('onClicked fired. notificationId = ' + notificationId);
    chrome.notifications.clear(notificationId, function(wasCleared) {});
  });

  chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    logger('onButtonClicked fired. notificationId = ' + notificationId + ', buttonIndex = ' + buttonIndex);
  });

  var numIds = 0;

  function createNotification(options, callback) {
    var notificationId = 'id' + numIds;
    numIds++;
    if (!('iconUrl' in options)) {
      options.iconUrl = 'assets/inbox-64x64.png';
    }
    options.message = options.message || 'notificationId = ' + notificationId;
    chrome.notifications.create(notificationId, options, function(notificationId) {
      if (callback) callback(notificationId);
    });
  }

  addButton('Basic Notification', function() {
    createNotification({
      type:'basic',
      title:'Basic Notification',
    });
  });

  addButton('Long Basic Notification', function() {
    createNotification({
      type:'basic',
      title:'Basic Notification',
      message: 'the quick slick thick brown fox jumps over the gosh darned lazy hazy brazy mazy dog.'
    });
  });

  addButton('Image Notification', function() {
    createNotification({
      type:'image',
      title:'Image Notification',
      imageUrl:'assets/tahoe-320x215.png'
    });
  });

  addButton('Progress Notification', function() {
    var options = {
      type:'progress',
      title:'Progress Notification',
      progress: 0,
    };
    createNotification(options, function(notificationId) {
      var intervalId = setInterval(function() {
        if (options.progress <= 100) {
          options.progress = options.progress + 1;
          chrome.notifications.update(notificationId, options, function() {});
        } else {
          clearInterval(intervalId);
          chrome.notifications.clear(notificationId, function() {});
        }
      }, 60);
    });
  });

  addButton('List Notification', function() {
    createNotification({
      type:'list',
      title:'List Notification',
      items:[{title:'Item1', message:'This is item 1'},
             {title:'Item2', message:'This is item 2'},
             {title:'Item3', message:'This is item 3'},
             {title:'Item4', message:'This is item 4'},
             {title:'Item5', message:'This is item 5'},
             {title:'Item6', message:'This is item 6'}]
    });
  });

  addButton('Low Priority', function() {
    createNotification({
      type:'basic',
      title:'Low Priority',
      priority:-2
    });
  });

  addButton('High Priority', function() {
    createNotification({
      type:'basic',
      title:'High Priority',
      priority:2
    });
  });

  addButton('Custom Time', function() {
    createNotification({
      type:'basic',
      title:'Custom Time',
      eventTime:1357016400000
    });
  });

  addButton('Button Test', function() {
    createNotification({
      type:'basic',
      title:'Button Test',
      buttons:[{title:'Button 0'}, {title:'Button 1'}, {title:'Button 2'}]
    });
  });
});

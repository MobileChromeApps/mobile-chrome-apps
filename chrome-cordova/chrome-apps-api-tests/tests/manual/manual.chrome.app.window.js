// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.app.window', function(rootEl, addButton) {

  document.addEventListener("pause", function onPause() {
    console.log('Received the pause event');
  });

  document.addEventListener("resume", function onResume() {
    console.log('Received the resume event');
  });
  
  addButton('AppWindow.hide()', function() {
    chrome.app.window.current().hide();
  });

  addButton('AppWindow.show()', function() {
    chrome.app.window.current().show();
  });

  addButton('AppWindow.show() after alarm', function() {

    var expectedFireTime = Date.now() + 500;
    var myAlarmName = 'alarmtoshowafterhide';

    chrome.alarms.onAlarm.addListener(function showAlarmHandler(alarm) {
      console.log("Received alarm: " + alarm.name);
      chrome.alarms.onAlarm.removeListener(showAlarmHandler);
      if (alarm.name === myAlarmName) {
        chrome.app.window.current().show();
      }
    });

    chrome.alarms.create(myAlarmName, { when:expectedFireTime });
    chrome.app.window.current().hide();
  });

});

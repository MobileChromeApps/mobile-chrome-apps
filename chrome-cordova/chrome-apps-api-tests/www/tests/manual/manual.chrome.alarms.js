// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var SINGLE_ALARM_NAME_PREFIX = 'AlarmManualTests-OneTime';
var REPEATING_ALARM_NAME = 'AlarmManualTests-Repeating1';
var numAlarms = 0;

function createAlarm(delaySeconds, repeatSeconds) {
  var alarmName = SINGLE_ALARM_NAME_PREFIX + numAlarms;
  numAlarms++

  var expectedFireTime = Date.now() + (delaySeconds * 1000);
  var alarm = { when:expectedFireTime };
  if (repeatSeconds) {
    alarmName = REPEATING_ALARM_NAME;
    alarm.periodInMinutes = repeatSeconds / 60;
  }
  chrome.alarms.create(alarmName, alarm);
}

console.log('Alarms test registered for alarms');

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === REPEATING_ALARM_NAME ||
    alarm.name.indexOf(SINGLE_ALARM_NAME_PREFIX) > -1) {
    console.log("Received alarm: " + alarm.name);
  }
});


registerManualTests('chrome.alarms', function(rootEl, addButton) {
  addButton('One-time alarm', function() {
    createAlarm(5);
  });

  addButton('Repeating alarm', function() {
    createAlarm(5, 60);
  });

  addButton('Cancel repeating alarm', function() {
      chrome.alarms.clear(REPEATING_ALARM_NAME);
  });

});

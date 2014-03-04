// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.idle', function(rootEl, addButton) {
  addButton('Query state', function() {
    var detectionIntervalInSeconds = 10;
    var queryStateCallback = function(state) {
      logger('State: ' + state);
    };
    chrome.idle.queryState(detectionIntervalInSeconds, queryStateCallback);
  });

  // TODO(maxw): Allow the detection interval to be set in a textbox.
  addButton('Change detection interval to 10 seconds', function() {
    chrome.idle.setDetectionInterval(10);
    logger('Detection interval set to 10 seconds.');
  });

  addButton('Change detection interval to 60 seconds', function() {
    chrome.idle.setDetectionInterval(60);
    logger('Detection interval set to 60 seconds.');
  });

  // Add a status-change listener.
  var stateListener = function(state) {
    logger('State changed: ' + state);
  };
  chrome.idle.onStateChanged.addListener(stateListener);
});


// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.power', function(rootEl, addButton) {
  addButton('Request "System" Keep-Awake', function() {
    chrome.power.requestKeepAwake('system');
    logger('Requested "System" keep-awake.');
  });

  addButton('Request "Display" Keep-Awake', function() {
    chrome.power.requestKeepAwake('display');
    logger('Requested "Display" keep-awake.');
  });

  addButton('Release Keep-Awake', function() {
    chrome.power.releaseKeepAwake();
    logger('Released keep-awake.');
  });
});


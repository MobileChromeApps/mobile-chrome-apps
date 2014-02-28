// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.power', function(rootEl, addButton) {
  addButton('Request Keep-Awake', function() {
    chrome.power.requestKeepAwake('system');
    console.log('Requested keep-awake.');
  });

  addButton('Release Keep-Awake', function() {
    chrome.power.releaseKeepAwake();
    console.log('Released keep-awake.');
  });
});


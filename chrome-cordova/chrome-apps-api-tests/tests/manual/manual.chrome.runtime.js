// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.runtime', function(rootEl, addButton) {
  addButton('Attach onSuspend', function() {
    chrome.runtime.onSuspend.addListener(function() {
      logger('onSuspend fired.');
    });
  });

  addButton('chrome.runtime.reload()', function() {
    chrome.runtime.reload();
  });

  addButton('chrome.runtime.getPlatformInfo()', function() {
    chrome.runtime.getPlatformInfo(function(platformInfo) {
      logger("Platform OS: " + platformInfo.os);
      logger(JSON.stringify(platformInfo, null, 4));
    });
  });
});

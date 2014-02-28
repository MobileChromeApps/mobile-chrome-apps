// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.runtime', function(rootEl, addButton) {
  addButton('Attach onSuspend', function() {
    chrome.runtime.onSuspend.addListener(function() {
      console.log('onSuspend fired.');
    });
  });

  addButton('chrome.runtime.reload()', function() {
    chrome.runtime.reload();
  });

  addButton('chrome.runtime.getPlatformInfo()', function() {
    chrome.runtime.getPlatformInfo(function(platformInfo) {
      console.log("Platform OS: " + platformInfo.os);
      console.log(JSON.stringify(platformInfo, null, 4));
    });
  });
});

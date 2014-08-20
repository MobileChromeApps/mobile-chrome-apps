// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.system.storage', function(rootEl, addButton) {
  addButton('Get Storage Info', function() {
    chrome.system.storage.getInfo(function(storageInfo) {
      logger(JSON.stringify(storageInfo, null, 4));
    });
  });
});

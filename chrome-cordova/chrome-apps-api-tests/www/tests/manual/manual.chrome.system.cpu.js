// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.system.cpu', function(rootEl, addButton) {
  addButton('Get Info', function() {
    chrome.system.cpu.getInfo(function(info) {
      logger(JSON.stringify(info, null, 4));
    });
  });
});

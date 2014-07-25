// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.system.network', function(rootEl, addButton) {
  addButton('Get Network Interfaces', function() {
    chrome.system.network.getNetworkInterfaces(function(networkInterfaces) {
      logger(JSON.stringify(networkInterfaces, null, 4));
    });
  });
});
